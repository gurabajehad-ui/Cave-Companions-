import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '../db.js';
import {
  generateMerchantToken,
  requireMerchantAuth,
  AuthRequest,
  generateRegistrationToken,
  verifyRegistrationToken,
  verifyAdminToken,
  verifyMerchantToken
} from '../auth.js';
import { getTodayDateString } from '../timezone.js';
import { authRateLimiter } from '../rateLimiter.js';
import { normalizePhoneNumber } from '../timezone.js';
import {
  generatePDFReport,
  generateExcelReport,
  generateCSVReport,
  buildPeriodLabel,
  buildReportFilename,
  FinancialReportData
} from '../reports/financialReportGenerator.js';

export const merchantRoutes = Router();

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * POST /api/merchant/request-otp
 * Step 1: Send OTP for mobile verification
 */
merchantRoutes.post('/request-otp', authRateLimiter, async (req, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, message: 'মোবাইল নম্বর প্রদান করুন।' });
      return;
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      res.status(400).json({ success: false, message: 'সঠিক ১০/১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর প্রদান করুন।' });
      return;
    }

    const existingMerchant = await db.getMerchantByPhone(cleanPhone);
    if (existingMerchant) {
      res.status(400).json({ success: false, message: 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি মার্চেন্ট অ্যাকাউন্ট রয়েছে।' });
      return;
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    await db.saveOtp(cleanPhone, otpCode, 'MERCHANT_REGISTRATION', 10);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[MERCHANT AUTH] Registration OTP for ${cleanPhone}: ${otpCode}`);
    }

    res.json({
      success: true,
      message: 'আপনার মোবাইল নম্বরে ৬ ডিজিটের ওটিপি পাঠানো হয়েছে।',
      ...(process.env.NODE_ENV !== 'production' ? { devOtpCode: otpCode } : {})
    });
  } catch (err: any) {
    console.error('Merchant request OTP error:', err);
    res.status(500).json({ success: false, message: 'ওটিপি পাঠাতে ব্যর্থ হয়েছে।' });
  }
});

/**
 * POST /api/merchant/verify-otp
 * Step 1: Verify OTP code & return temporary registration token
 */
merchantRoutes.post('/verify-otp', authRateLimiter, async (req, res: Response) => {
  try {
    const { phone, otpCode } = req.body;
    if (!phone || !otpCode) {
      res.status(400).json({ success: false, message: 'মোবাইল নম্বর এবং ওটিপি কোড প্রদান করুন।' });
      return;
    }

    const cleanPhone = normalizePhoneNumber(phone);
    const result = await db.verifyOtp(cleanPhone, otpCode, 'MERCHANT_REGISTRATION');

    if (!result.valid) {
      let errorMsg = 'ভুল ওটিপি কোড।';
      if (result.error === 'EXPIRED') errorMsg = 'ওটিপির মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন।';
      if (result.error === 'MAX_ATTEMPTS') errorMsg = 'সর্বোচ্চ চেষ্টার সীমা অতিক্রম করেছে। নতুন ওটিপি অনুরোধ করুন।';
      res.status(400).json({ success: false, message: errorMsg });
      return;
    }

    const registrationToken = generateRegistrationToken(cleanPhone);

    res.json({
      success: true,
      message: 'মোবাইল নম্বর সফলভাবে যাচাই করা হয়েছে।',
      registrationToken
    });
  } catch (err: any) {
    console.error('Merchant verify OTP error:', err);
    res.status(500).json({ success: false, message: 'ওটিপি যাচাইয়ে ত্রুটি হয়েছে।' });
  }
});

/**
 * POST /api/merchant/upload-document
 * Securely upload document images (NID, Trade License, Selfie, Shop Photo)
 */
merchantRoutes.post('/upload-document', async (req, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const regHeader = req.headers['x-registration-token'];

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : (typeof regHeader === 'string' ? regHeader.trim() : null);

    // Verify authorized context (Registration token, Merchant token, or Admin session token)
    let isAuthorized = false;
    let creatorIdentity: string = 'merchant_registration';

    if (token) {
      const regPayload = verifyRegistrationToken(token);
      const merchantPayload = verifyMerchantToken(token);
      const adminPayload = verifyAdminToken(token);

      if (regPayload && regPayload.phone) {
        isAuthorized = true;
        creatorIdentity = regPayload.phone;
      } else if (merchantPayload && merchantPayload.sub) {
        isAuthorized = true;
        creatorIdentity = merchantPayload.phone || merchantPayload.sub;
      } else if (adminPayload && adminPayload.sub) {
        isAuthorized = true;
        creatorIdentity = `admin:${adminPayload.sub}`;
      }
    }

    if (!isAuthorized) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_UPLOAD',
        message: 'ডকুমেন্ট আপলোড করার পূর্বে মোবাইল নম্বর যাচাই বা মার্চেন্ট অ্যাকাউন্টে লগইন করুন।'
      });
      return;
    }

    const { fileData, fileName, documentType } = req.body;

    if (!fileData) {
      res.status(400).json({ success: false, message: 'ফাইল ডাটা পাওয়া যায়নি।' });
      return;
    }

    // Base64 upload support
    let buffer: Buffer;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ success: false, message: 'অবৈধ ফাইল ফরম্যাট।' });
        return;
      }

      mimeType = matches[1];
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType)) {
        res.status(400).json({ success: false, message: 'শুধুমাত্র JPG, PNG, WEBP বা PDF ফাইল গ্রহণযোগ্য।' });
        return;
      }

      ext = mimeType.split('/')[1] || 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      res.status(400).json({ success: false, message: 'অবৈধ ফাইল স্ট্রিং।' });
      return;
    }

    // Validate size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'ফাইল সাইজ সর্বোচ্চ ৫ মেগাবাইটের মধ্যে হতে হবে।' });
      return;
    }

    const docPrefix = documentType || 'doc';
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const uniqueName = `${docPrefix}_${Date.now()}_${randomSuffix}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    fs.writeFileSync(filePath, buffer);

    // Save to persistent database uploaded_media as well
    await db.saveUploadedMedia({
      id: uniqueName,
      filename: uniqueName,
      mimeType,
      buffer,
      createdBy: creatorIdentity
    }).catch(err => {
      console.warn('[Doc Upload DB Warning]', err);
    });

    const publicUrl = `/api/merchant/documents/${uniqueName}`;

    res.json({
      success: true,
      url: publicUrl,
      fileName: uniqueName,
      message: 'ফাইল আপলোড সফল হয়েছে।'
    });
  } catch (err: any) {
    console.error('Upload document error:', err);
    res.status(500).json({ success: false, message: 'ফাইল আপলোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/merchant/documents/:filename
 * Serve document with strict authorization and ownership check
 */
merchantRoutes.get('/documents/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOAD_DIR, filename);

    // 1. Check authorization
    const authHeader = req.headers.authorization;
    const regHeader = req.headers['x-registration-token'];

    let token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : (typeof regHeader === 'string' ? regHeader.trim() : null);

    if (!token && (req.query.token || req.query.adminToken || req.query.registrationToken)) {
      token = String(req.query.token || req.query.adminToken || req.query.registrationToken).trim();
    }

    let authorized = false;

    if (token) {
      // Check Admin Session Token
      if (verifyAdminToken(token)) {
        authorized = true;
      }
      // Check Merchant Token with document ownership verification
      else {
        const merchant = verifyMerchantToken(token);
        if (merchant) {
          const isOwner = await db.isMerchantDocumentOwner(merchant.id, merchant.phone || '', merchant.shopId, filename);
          if (isOwner) {
            authorized = true;
          }
        } else {
          // Check Registration Token with strict identity ownership verification (phone match)
          const regPayload = verifyRegistrationToken(token);
          if (regPayload && regPayload.phone) {
            const isRegOwner = await db.isRegistrationDocumentOwner(regPayload.phone, filename);
            if (isRegOwner) {
              authorized = true;
            }
          }
        }
      }
    }

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_DOCUMENT',
        message: 'এই সংবেদনশীল ডকুমেন্টটি দেখার অনুমতি আপনার নেই।'
      });
    }

    if (!fs.existsSync(filePath)) {
      // Try restoring from DB if file exists in uploaded_media
      const media = await db.getUploadedMedia(filename);
      if (media && media.data) {
        res.setHeader('Content-Type', media.mimeType || 'application/octet-stream');
        return res.send(media.data);
      }
      res.status(404).json({ success: false, message: 'ফাইল পাওয়া যায়নি।' });
      return;
    }

    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'ফাইল সার্ভ করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/commission-policy
 * Read current commission policy breakdown for Step 5
 */
merchantRoutes.get('/commission-policy', async (req, res) => {
  try {
    const policy = await db.getCommissionPolicy();
    res.json({ success: true, policy });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'কমিশন পলিসি লোড করা যায়নি।' });
  }
});

/**
 * POST /api/merchant/register
 * POST /api/merchant/submit-registration
 * Complete multi-step self-registration submit
 */
const handleMerchantRegistration = async (req: any, res: Response) => {
  try {
    const {
      ownerName, phone, email, password, pin,
      shopName, businessType, shopAddress, district, upazilaThana, latitude, longitude, shopPhotoUrl, businessDescription,
      nidNumber, nidFrontUrl, nidBackUrl, ownerSelfieUrl,
      tradeLicenseNumber, tradeLicenseUrl, tinNumber, binVatNumber,
      agreementAccepted, agreementVersion,
      acceptedTotalCommission, acceptedGoldUserBenefit, acceptedGoldPlatformCommission,
      acceptedSilverUserBenefit, acceptedSilverPlatformCommission,
      acceptedBronzeUserBenefit, acceptedBronzePlatformCommission
    } = req.body;

    // Support legacy field names if sent
    const finalOwnerName = ownerName || req.body.managerName;
    const finalPassword = password || pin;
    const finalAddress = shopAddress || req.body.address;

    if (!finalOwnerName || !phone || !finalPassword || !shopName || !finalAddress) {
      res.status(400).json({ success: false, message: 'প্রয়োজনীয় ফিল্ডসমূহ পূরণ করুন (মালিকের নাম, ফোন, পাসওয়ার্ড, শপের নাম, ঠিকানা)।' });
      return;
    }

    if (!nidNumber || !nidFrontUrl || !nidBackUrl || !ownerSelfieUrl) {
      res.status(400).json({ success: false, message: 'জাতীয় পরিচয়পত্র নম্বর, এনআইডি সামনের অংশ, পেছনের অংশ এবং নিজের ছবি আবশ্যক।' });
      return;
    }

    if (!tradeLicenseNumber || !tradeLicenseUrl) {
      res.status(400).json({ success: false, message: 'ট্রেড লাইসেন্স নম্বর ও ছবি আবশ্যক।' });
      return;
    }

    if (!agreementAccepted) {
      res.status(400).json({ success: false, message: 'মার্চেন্ট চুক্তি ও কমিশন পলিসিতে সম্মত হওয়া আবশ্যক।' });
      return;
    }

    const cleanPhone = normalizePhoneNumber(phone);

    // Call full registration
    const result = await db.registerMerchantFull({
      ownerName: finalOwnerName,
      phone: cleanPhone,
      email,
      password: finalPassword,
      shopName,
      businessType: businessType || 'others',
      shopAddress: finalAddress,
      district: district || 'Dhaka',
      upazilaThana: upazilaThana || 'Central',
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      shopPhotoUrl,
      businessDescription,
      nidNumber,
      nidFrontUrl,
      nidBackUrl,
      ownerSelfieUrl,
      tradeLicenseNumber,
      tradeLicenseUrl,
      tinNumber,
      binVatNumber,
      agreementAccepted: Boolean(agreementAccepted),
      agreementVersion: agreementVersion || 'v1.0',
      acceptedTotalCommission: Number(acceptedTotalCommission) || 10,
      acceptedGoldUserBenefit: Number(acceptedGoldUserBenefit) || 5,
      acceptedGoldPlatformCommission: Number(acceptedGoldPlatformCommission) || 5,
      acceptedSilverUserBenefit: Number(acceptedSilverUserBenefit) || 4,
      acceptedSilverPlatformCommission: Number(acceptedSilverPlatformCommission) || 6,
      acceptedBronzeUserBenefit: Number(acceptedBronzeUserBenefit) || 3,
      acceptedBronzePlatformCommission: Number(acceptedBronzePlatformCommission) || 7
    });

    const token = generateMerchantToken(result.merchant);

    res.json({
      success: true,
      token,
      message: 'আপনার মার্চেন্ট রেজিস্ট্রেশন আবেদন সফলভাবে জমা দেওয়া হয়েছে। অ্যাডমিন টিম পর্যালোচনার পর অ্যাকাউন্ট সক্রিয় করবে।',
      merchant: {
        id: result.merchant.id,
        name: result.merchant.name,
        phone: result.merchant.phone,
        role: result.merchant.role,
        shopId: result.merchant.shopId
      },
      shop: result.shop,
      verification: result.verification
    });
  } catch (err: any) {
    console.error('Merchant registration error:', err);
    res.status(400).json({ success: false, message: err.message || 'রেজিস্ট্রেশন জমা দিতে ব্যর্থ হয়েছে।' });
  }
};

merchantRoutes.post('/register', authRateLimiter, handleMerchantRegistration);
merchantRoutes.post('/submit-registration', authRateLimiter, handleMerchantRegistration);

/**
 * POST /api/merchant/login
 * Merchant phone + password/PIN login
 */
merchantRoutes.post('/login', authRateLimiter, async (req, res: Response) => {
  try {
    const { phone, pin, password } = req.body;
    const inputPass = password || pin;

    if (!phone || !inputPass) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'মার্চেন্ট মোবাইল নম্বর এবং পাসওয়ার্ড/পিন প্রদান করুন।'
      });
      return;
    }

    const cleanPhone = normalizePhoneNumber(phone);
    const merchant = await db.getMerchantByPhone(cleanPhone);

    if (!merchant) {
      res.status(401).json({
        success: false,
        code: 'PHONE_NOT_FOUND',
        message: 'এই মোবাইল নম্বর দিয়ে কোনো মার্চেন্ট অ্যাকাউন্ট পাওয়া যায়নি।'
      });
      return;
    }

    const isPassValid = await db.verifyMerchantPin(merchant.id, inputPass);
    if (!isPassValid) {
      res.status(401).json({
        success: false,
        code: 'INVALID_PIN',
        message: 'আপনার PIN সঠিক নয়। আবার চেষ্টা করুন।'
      });
      return;
    }

    const shop = await db.getShopById(merchant.shopId);
    const verification = await db.getMerchantVerificationByMerchantId(merchant.id);
    const token = generateMerchantToken(merchant);
    
    // Check shop status for access
    if (shop.status === 'PENDING') {
      res.status(401).json({
        success: false,
        code: 'ACCOUNT_PENDING',
        message: 'আপনার মার্চেন্ট অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অনুমোদনের জন্য অপেক্ষা করুন।'
      });
      return;
    }
    if (shop.status === 'INACTIVE') {
      res.status(401).json({
        success: false,
        code: 'ACCOUNT_REJECTED',
        message: 'আপনার মার্চেন্ট আবেদন অনুমোদিত হয়নি। বিস্তারিত জানতে প্রশাসকের সাথে যোগাযোগ করুন।'
      });
      return;
    }
    if (shop.status === 'SUSPENDED') {
      res.status(401).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'আপনার মার্চেন্ট অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে। বিস্তারিত জানতে প্রশাসকের সাথে যোগাযোগ করুন।'
      });
      return;
    }

    const safeShop = shop;
    res.json({
      success: true,
      token,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        phone: merchant.phone,
        role: merchant.role,
        shopId: merchant.shopId
      },
      shop: safeShop,
      verification,
      message: 'লগইন সফল হয়েছে।'
    });
  } catch (err: any) {
    console.error('Merchant login error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'লগইন প্রক্রিয়ায় সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/merchant/me
 */
merchantRoutes.get('/me', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = await db.getMerchantById(req.merchant!.id);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'মার্চেন্ট অ্যাকাউন্ট পাওয়া যায়নি।' });
      return;
    }

    const shop = await db.getShopById(merchant.shopId);
    const verification = await db.getMerchantVerificationByMerchantId(merchant.id);

    const safeShop = shop;
    res.json({
      success: true,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        phone: merchant.phone,
        role: merchant.role,
        shopId: merchant.shopId
      },
      shop: safeShop,
      verification
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'তথ্য লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/registration-status
 */
merchantRoutes.get('/registration-status', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const verification = await db.getMerchantVerificationByMerchantId(req.merchant!.id);
    const shop = await db.getShopById(req.merchant!.shopId);

    const safeShop = shop;
    res.json({
      success: true,
      verificationStatus: verification?.verificationStatus || shop?.status || 'PENDING',
      verification,
      shop: safeShop
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'স্ট্যাটাস লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/registration-details
 */
merchantRoutes.get('/registration-details', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const verification = await db.getMerchantVerificationByMerchantId(req.merchant!.id);
    const shop = await db.getShopById(req.merchant!.shopId);

    const safeShop = shop;
    res.json({
      success: true,
      verification,
      shop: safeShop
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'আবেদন ডিটেইলস লোড করতে ব্যর্থ।' });
  }
});

/**
 * PUT /api/merchant/registration
 * Resubmit application after correction request
 */
merchantRoutes.put('/registration', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await db.resubmitMerchantVerification(req.merchant!.id, req.body);
    const shop = await db.getShopById(req.merchant!.shopId);

    res.json({
      success: true,
      message: 'আপনার তথ্য সফলভাবে পুনরায় জমা দেওয়া হয়েছে। অ্যাডমিন পর্যালোচনা করবে।',
      verification: updated,
      shop
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'পুনরায় জমা দিতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/dashboard
 */
merchantRoutes.get('/dashboard', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shop = await db.getShopById(req.merchant!.shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: 'শপ পাওয়া যায়নি।' });
      return;
    }

    if (shop.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: 'SHOP_PENDING',
        message: 'আপনার অ্যাকাউন্টটি এখনও সক্রিয় নয়।',
        shopStatus: shop.status
      });
      return;
    }

    const todayDateStr = getTodayDateString();
    const stats = await db.getMerchantDashboardStats(shop.id, todayDateStr);

    const safeShop = shop;
    const safeRates = stats.rates;

    res.json({
      success: true,
      stats: {
        ...stats,
        shop: safeShop,
        rates: safeRates
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'ড্যাশবোর্ড ডাটা লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/redemption-requests
 * Retrieve token redemption requests for the merchant's shop (Pending, Approved, Rejected)
 */
merchantRoutes.get('/redemption-requests', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { status } = req.query;

    const requests = await db.getRedemptionRequestsForShop(shopId, status as string);
    const pendingCount = await db.getPendingRedemptionRequestsCountForShop(shopId);

    res.json({
      success: true,
      count: requests.length,
      pendingCount,
      requests
    });
  } catch (err: any) {
    console.error('Merchant redemption requests error:', err);
    res.status(500).json({ success: false, message: 'টোকেন অফার অনুরোধ তালিকা লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/redemption-requests/pending-count
 * Quick badge count of pending token redemption requests for merchant header/tab
 */
merchantRoutes.get('/redemption-requests/pending-count', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const pendingCount = await db.getPendingRedemptionRequestsCountForShop(shopId);

    res.json({
      success: true,
      pendingCount
    });
  } catch (err: any) {
    console.error('Merchant pending count error:', err);
    res.status(500).json({ success: false, message: 'অপেক্ষমান অনুরোধ গণনা করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/merchant/redemption-requests/:requestId/approve
 * Merchant approves customer's token redemption request.
 * Atomically marks token USED, generates the Cash Memo, and completes accounting.
 */
merchantRoutes.post('/redemption-requests/:requestId/approve', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { requestId } = req.params;

    const result = await db.approveTokenRedemptionRequest({
      requestId,
      merchantId: merchant.id,
      merchantShopId: merchant.shopId
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      redemption: result.redemption,
      request: result.request
    });
  } catch (err: any) {
    console.error('Merchant approve redemption error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'অনুরোধ অনুমোদন করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * POST /api/merchant/approve-redemption (Alternative alias)
 */
merchantRoutes.post('/approve-redemption', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { requestId } = req.body;

    if (!requestId) {
      res.status(400).json({ success: false, message: 'অনুরোধ আইডি আবশ্যক।' });
      return;
    }

    const result = await db.approveTokenRedemptionRequest({
      requestId,
      merchantId: merchant.id,
      merchantShopId: merchant.shopId
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      redemption: result.redemption,
      request: result.request
    });
  } catch (err: any) {
    console.error('Merchant approve redemption error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'অনুরোধ অনুমোদন করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * POST /api/merchant/redemption-requests/:requestId/reject
 * Merchant rejects customer's token redemption request.
 * Atomically restores customer's token to AVAILABLE. Never destroys the token.
 */
merchantRoutes.post('/redemption-requests/:requestId/reject', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { requestId } = req.params;
    const { reason } = req.body;

    const result = await db.rejectTokenRedemptionRequest({
      requestId,
      merchantId: merchant.id,
      merchantShopId: merchant.shopId,
      reason
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      request: result.request
    });
  } catch (err: any) {
    console.error('Merchant reject redemption error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'অনুরোধ প্রত্যাখ্যান করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * POST /api/merchant/reject-redemption (Alternative alias)
 */
merchantRoutes.post('/reject-redemption', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const merchant = req.merchant!;
    const { requestId, reason } = req.body;

    if (!requestId) {
      res.status(400).json({ success: false, message: 'অনুরোধ আইডি আবশ্যক।' });
      return;
    }

    const result = await db.rejectTokenRedemptionRequest({
      requestId,
      merchantId: merchant.id,
      merchantShopId: merchant.shopId,
      reason
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      request: result.request
    });
  } catch (err: any) {
    console.error('Merchant reject redemption error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'অনুরোধ প্রত্যাখ্যান করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * GET /api/merchant/transactions
 * Retrieve filtered transactions for the logged-in merchant's own shop only
 */
merchantRoutes.get('/transactions', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { date, dateFrom, dateTo, tokenType } = req.query;

    let redemptions;
    if (dateFrom || dateTo || tokenType) {
      redemptions = await db.getAdminAccountsShopRedemptions(shopId, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        tokenType: tokenType as string
      });
    } else if (date) {
      redemptions = await db.getShopRedemptions(shopId, date as string);
    } else {
      redemptions = await db.getShopRedemptions(shopId);
    }

    res.json({
      success: true,
      count: redemptions.length,
      transactions: redemptions
    });
  } catch (err: any) {
    console.error('Merchant transactions error:', err);
    res.status(500).json({ success: false, message: 'লেনদেন তালিকা লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/transactions/summary
 * Retrieve financial summary for the logged-in merchant's own shop
 */
merchantRoutes.get('/transactions/summary', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { dateFrom, dateTo, tokenType } = req.query;

    const summary = await db.getAdminAccountsShopSummary(shopId, {
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      tokenType: tokenType as string
    });

    res.json({
      success: true,
      summary
    });
  } catch (err: any) {
    console.error('Merchant financial summary error:', err);
    res.status(500).json({ success: false, message: 'হিসাব সারসংক্ষেপ লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/merchant/transactions/export
 * Export financial accounting report for the logged-in merchant's own shop (PDF, XLSX, CSV)
 */
merchantRoutes.get('/transactions/export', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Authenticated merchant's own shop - ignores any frontend attempt to manipulate shop ID
    const shopId = req.merchant!.shopId;
    const format = String(req.query.format || 'pdf').toLowerCase();
    const dateFrom = (req.query.dateFrom || req.query.from) as string | undefined;
    const dateTo = (req.query.dateTo || req.query.to) as string | undefined;
    const tokenType = req.query.tokenType as string | undefined;

    // 1. Verify shop exists
    const shop = await db.getShopById(shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: 'দোকান পাওয়া যায়নি।' });
      return;
    }

    // 2. Fetch authoritative database records
    const [summary, transactions] = await Promise.all([
      db.getAdminAccountsShopSummary(shopId, { dateFrom, dateTo, tokenType }),
      db.getAdminAccountsShopRedemptions(shopId, { dateFrom, dateTo, tokenType })
    ]);

    const shopName = shop.nameBn || shop.name || 'Merchant Shop';
    const periodLabel = buildPeriodLabel(dateFrom, dateTo);
    const now = new Date();
    const generatedAt = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const reportData: FinancialReportData = {
      shopName,
      shopAddress: shop.address,
      periodLabel,
      generatedAt,
      hideInternalFinances: true,
      summary,
      transactions
    };

    const filename = buildReportFilename(shop.name || shop.nameBn || 'shop', dateFrom, dateTo, format);

    // 3. Generate requested export format
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    if (format === 'xlsx' || format === 'excel') {
      const buffer = generateExcelReport(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } else if (format === 'csv') {
      const buffer = generateCSVReport(reportData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } else {
      // Default: PDF
      const pdfBuffer = await generatePDFReport(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    }
  } catch (err: any) {
    console.error('Merchant export error:', err);
    res.status(500).json({ success: false, message: 'আর্থিক রিপোর্ট তৈরি করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/merchant/settings
 */
merchantRoutes.put('/settings', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { phone, openingHours, description, address, goldDiscount, silverDiscount, bronzeDiscount } = req.body;
    
    // 1. Update basic shop info
    const updatedShop = await db.updateShopInfo(req.merchant!.shopId, {
      phone,
      openingHours,
      description,
      address
    });

    // 2. Handle discount updates as pending requests (Phase 4 requirement)
    if (goldDiscount !== undefined || silverDiscount !== undefined || bronzeDiscount !== undefined) {
      // If any discount is provided, we create/update a pending offer request
      // We take the current values if some are missing, but here the frontend sends all 3
      const currentShop = await db.getShopById(req.merchant!.shopId);
      if (currentShop) {
        await db.updateShopOfferRequest(req.merchant!.shopId, {
          goldDiscount: goldDiscount !== undefined ? Number(goldDiscount) : currentShop.goldDiscount,
          silverDiscount: silverDiscount !== undefined ? Number(silverDiscount) : currentShop.silverDiscount,
          bronzeDiscount: bronzeDiscount !== undefined ? Number(bronzeDiscount) : currentShop.bronzeDiscount
        });
      }
    }

    // Fetch latest shop state after all updates
    const finalShop = await db.getShopById(req.merchant!.shopId);

    res.json({
      success: true,
      shop: finalShop,
      message: 'শপ তথ্য সফলভাবে আপডেট করা হয়েছে। ডিসকাউন্ট পরিবর্তনের অনুরোধ থাকলে তা অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে।'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'তথ্য আপডেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/merchant/location
 * Sets or updates partner shop geographic coordinates & address.
 */
merchantRoutes.put('/location', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, formattedAddress, locationAddress } = req.body;

    if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      res.status(400).json({
        success: false,
        message: 'সঠিক অক্ষাংশ (Latitude) ও দ্রাঘিমাংশ (Longitude) প্রদান করুন।'
      });
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({
        success: false,
        message: 'অক্ষাংশ বা দ্রাঘিমাংশের মান অবৈধ।'
      });
      return;
    }

    const shopId = req.merchant!.shopId;
    const addr = (formattedAddress || locationAddress || '').trim();
    const updatedShop = await db.updateShopLocation(shopId, {
      latitude: lat,
      longitude: lng,
      locationAddress: addr || undefined
    });

    if (!updatedShop) {
      res.status(404).json({
        success: false,
        message: 'দোকানটি খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    res.json({
      success: true,
      shop: updatedShop,
      message: 'দোকানের লোকেশন সফলভাবে সেট করা হয়েছে'
    });
  } catch (err: any) {
    console.error('Update shop location error:', err);
    res.status(500).json({
      success: false,
      message: 'দোকানের লোকেশন সংরক্ষণ করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * GET /api/merchant/me/qr and GET /api/merchant/qr
 * Retrieve active authoritative shop QR Code for logged-in merchant.
 */
const getMerchantQrHandler = async (req: AuthRequest, res: Response) => {
  try {
    const shop = await db.getShopById(req.merchant!.shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: 'দোকান পাওয়া যায়নি।' });
      return;
    }

    res.json({
      success: true,
      shopId: shop.id,
      shopName: shop.name,
      shopNameBn: shop.nameBn,
      qrIdentifier: shop.qrIdentifier || '',
      qrSecret: shop.qrSecret || '',
      status: shop.status === 'ACTIVE' ? 'active' : 'inactive',
      updatedAt: shop.updatedAt,
      createdAt: shop.createdAt,
      qr: {
        exists: !!shop.qrIdentifier,
        status: shop.status === 'ACTIVE' ? 'active' : 'inactive',
        qrIdentifier: shop.qrIdentifier || '',
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt,
        shopId: shop.id,
        shopName: shop.nameBn || shop.name
      }
    });
  } catch (err: any) {
    console.error('Merchant QR error:', err);
    res.status(500).json({ success: false, message: 'QR কোড লোড করতে ব্যর্থ।' });
  }
};

merchantRoutes.get('/me/qr', requireMerchantAuth, getMerchantQrHandler);
merchantRoutes.get('/qr', requireMerchantAuth, getMerchantQrHandler);

/**
 * POST /api/merchant/offer-change-request
 * Submit an offer change request for admin review and approval.
 */
merchantRoutes.post('/offer-change-request', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const shop = await db.getShopById(shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: 'দোকান পাওয়া যায়নি।' });
      return;
    }

    // Check if target shopId matches authenticated merchant's shop
    if (req.body.shopId && req.body.shopId !== shopId) {
      res.status(403).json({ success: false, message: 'অন্য দোকানের জন্য অফার পরিবর্তন অনুরোধ করতে পারবেন না।' });
      return;
    }

    // Check whether an existing pending request is already awaiting admin approval
    if (shop.pendingGoldDiscount != null || shop.pendingSilverDiscount != null || shop.pendingBronzeDiscount != null) {
      res.status(400).json({
        success: false,
        error: 'ALREADY_PENDING',
        message: 'আপনার একটি অফার পরিবর্তনের অনুরোধ ইতিমধ্যেই অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে।',
        pendingOffer: {
          goldDiscount: shop.pendingGoldDiscount,
          silverDiscount: shop.pendingSilverDiscount,
          bronzeDiscount: shop.pendingBronzeDiscount
        }
      });
      return;
    }

    const offerData = req.body.requestedOffer || req.body;
    const goldDiscount = offerData.goldDiscount !== undefined ? Number(offerData.goldDiscount) : shop.goldDiscount;
    const silverDiscount = offerData.silverDiscount !== undefined ? Number(offerData.silverDiscount) : shop.silverDiscount;
    const bronzeDiscount = offerData.bronzeDiscount !== undefined ? Number(offerData.bronzeDiscount) : shop.bronzeDiscount;

    if (isNaN(goldDiscount) || isNaN(silverDiscount) || isNaN(bronzeDiscount) ||
        goldDiscount < 0 || goldDiscount > 100 ||
        silverDiscount < 0 || silverDiscount > 100 ||
        bronzeDiscount < 0 || bronzeDiscount > 100) {
      res.status(400).json({ success: false, message: 'ডিসকাউন্ট অবশ্যই ০ থেকে ১০০ এর মধ্যে হতে হবে।' });
      return;
    }

    const updatedShop = await db.updateShopOfferRequest(shopId, {
      goldDiscount,
      silverDiscount,
      bronzeDiscount
    });

    res.json({
      success: true,
      message: 'অফার পরিবর্তনের অনুরোধ সফলভাবে জমা দেওয়া হয়েছে। অ্যাডমিন অনুমোদনের পর এটি কার্যকর হবে।',
      request: {
        id: `REQ-${shopId}`,
        shopId,
        shopName: shop.nameBn || shop.name,
        currentOffer: {
          goldDiscount: shop.goldDiscount,
          silverDiscount: shop.silverDiscount,
          bronzeDiscount: shop.bronzeDiscount
        },
        requestedOffer: {
          goldDiscount,
          silverDiscount,
          bronzeDiscount
        },
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      shop: updatedShop
    });
  } catch (err: any) {
    console.error('Merchant offer request error:', err);
    res.status(500).json({ success: false, message: 'অফার পরিবর্তনের অনুরোধ পাঠাতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/offers
 * Retrieve current active shop offers and commission, plus pending commission request.
 */
merchantRoutes.get('/offers', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const shop = await db.getShopById(shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: 'দোকান পাওয়া যায়নি।' });
      return;
    }

    const requests = await db.getCommissionChangeRequests(shopId);
    const pendingRequest = requests.find(r => r.status === 'pending');

    res.json({
      success: true,
      shop: shop,
      requests: requests,
      pendingCommissionRequests: requests.filter(r => r.status === 'pending'),
      pendingCommissionRequest: pendingRequest || null
    });
  } catch (err: any) {
    console.error('Get merchant offers error:', err);
    res.status(500).json({ success: false, message: 'অফার ও কমিশন তথ্য লোড করতে ব্যর্থ।' });
  }
});

/**
 * GET /api/merchant/commission-requests
 * Get all commission change requests for this merchant's shop
 */
merchantRoutes.get('/commission-requests', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const requests = await db.getCommissionChangeRequests(shopId);
    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err: any) {
    console.error('Get merchant commission requests error:', err);
    res.status(500).json({ success: false, message: 'কমিশন অনুরোধ তালিকা লোড করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/merchant/commission-change-request
 * Submit a commission change request for admin review and approval. Unlimited submissions allowed.
 */
merchantRoutes.post('/commission-change-request', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { requestedCommissionPercent, reason } = req.body;

    const parsedCommission = Number(requestedCommissionPercent);
    if (isNaN(parsedCommission) || parsedCommission < 0 || parsedCommission > 100) {
      res.status(400).json({ success: false, message: 'কমিশন শতাংশ অবশ্যই ০ থেকে ১০০ এর মধ্যে হতে হবে।' });
      return;
    }

    const newReq = await db.createCommissionChangeRequest(shopId, parsedCommission, typeof reason === 'string' ? reason.trim() : undefined);

    res.json({
      success: true,
      message: 'কমিশন পরিবর্তনের অনুরোধ সফলভাবে জমা দেওয়া হয়েছে। অ্যাডমিন অনুমোদনের পর এটি কার্যকর হবে।',
      request: newReq
    });
  } catch (err: any) {
    console.error('Merchant commission request error:', err);
    res.status(500).json({ success: false, message: 'কমিশন পরিবর্তনের অনুরোধ পাঠাতে ব্যর্থ।' });
  }
});

// ==========================================
// MERCHANT PRODUCTS MANAGEMENT
// ==========================================

/**
 * POST /api/merchant/products/upload-image
 * Upload a product image from Android phone gallery or camera capture.
 * Stores binary data in durable PostgreSQL uploaded_media table and writes to local disk cache.
 */
merchantRoutes.post('/products/upload-image', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fileData, fileName } = req.body;

    if (!fileData) {
      res.status(400).json({ success: false, message: 'ছবির ফাইল ডাটা পাওয়া যায়নি।' });
      return;
    }

    let buffer: Buffer;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ success: false, message: 'অবৈধ ইমেজ ডাটা ফরম্যাট।' });
        return;
      }

      mimeType = matches[1];
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(mimeType)) {
        res.status(400).json({ success: false, message: 'শুধুমাত্র JPG, PNG, WEBP বা GIF ছবি আপলোড করা যাবে।' });
        return;
      }

      ext = mimeType.split('/')[1]?.replace('+xml', '') || 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      res.status(400).json({ success: false, message: 'অবৈধ ফাইল স্ট্রিং।' });
      return;
    }

    // Limit to 5MB max size
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারবে।' });
      return;
    }

    const uniqueId = `prod_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const safeFileName = fileName || uniqueId;

    // 1. Save to persistent PostgreSQL storage table (uploaded_media)
    const saved = await db.saveUploadedMedia({
      id: uniqueId,
      filename: safeFileName,
      mimeType,
      buffer,
      createdBy: req.merchant?.id || 'merchant'
    });

    // 2. Also write to local cache for high-speed streaming
    const cacheDir = path.join(process.cwd(), 'uploads', 'media');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(path.join(cacheDir, uniqueId), buffer);

    res.json({
      success: true,
      imageUrl: saved.url,
      mediaId: saved.id,
      fileName: safeFileName,
      message: 'পণ্যের ছবি সফলভাবে আপলোড হয়েছে।'
    });
  } catch (err: any) {
    console.error('Merchant product image upload error:', err);
    res.status(500).json({ success: false, message: 'ছবি আপলোড করতে ব্যর্থ হয়েছে।' });
  }
});

/**
 * GET /api/merchant/products
 * Get all products for the logged in merchant's shop (includes PENDING, APPROVED, REJECTED).
 */
merchantRoutes.get('/products', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const products = await db.getProductsByShop(shopId, false, false);
    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err: any) {
    console.error('Merchant get products error:', err);
    res.status(500).json({ success: false, message: 'পণ্য তালিকা লোড করতে ব্যর্থ।' });
  }
});

/**
 * POST /api/merchant/products
 * Add a new product (requires Admin approval).
 */
merchantRoutes.post('/products', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { name, description, category, originalPrice, imageUrl, gallery, isAvailable } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'পণ্যের নাম প্রদান করুন।' });
      return;
    }

    const price = Number(originalPrice);
    if (isNaN(price) || price < 0) {
      res.status(400).json({ success: false, message: 'সঠিক মূল্য প্রদান করুন।' });
      return;
    }

    const product = await db.createProduct(shopId, {
      name,
      description,
      category,
      originalPrice: price,
      imageUrl,
      gallery,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
    });

    res.json({
      success: true,
      message: 'নতুন পণ্য যোগ করার রিকোয়েস্ট জমা দেওয়া হয়েছে। এডমিন অনুমোদনের পর পণ্যটি লাইভ হবে।',
      product
    });
  } catch (err: any) {
    console.error('Merchant add product error:', err);
    res.status(500).json({ success: false, message: 'পণ্য যোগ করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/merchant/products/:productId
 * Update existing product (price changes require Admin approval).
 */
merchantRoutes.put('/products/:productId', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { productId } = req.params;
    const { name, description, category, originalPrice, imageUrl, gallery, isAvailable } = req.body;

    const updated: any = await db.updateProduct(productId, shopId, {
      name,
      description,
      category,
      originalPrice: originalPrice !== undefined ? Number(originalPrice) : undefined,
      imageUrl,
      gallery,
      isAvailable
    }, req.merchant?.id);

    if (!updated) {
      res.status(404).json({ success: false, message: 'পণ্যটি খুঁজে পাওয়া যায়নি বা আপনার পরিবর্তন করার অনুমতি নেই।' });
      return;
    }

    let customMsg = 'পণ্যের তথ্য সফলভাবে আপডেট হয়েছে।';
    if (updated.priceChangeRequested) {
      customMsg = 'মূল্য পরিবর্তনের রিকোয়েস্ট এডমিন অনুমোদনের জন্য জমা দেওয়া হয়েছে। বর্তমান মূল্য অপরিবর্তিত থাকবে।';
    } else if (updated.status === 'PENDING') {
      customMsg = 'পণ্য সংশোধিত তথ্য এডমিন অনুমোদনের জন্য পুনরায় জমা দেওয়া হয়েছে।';
    }

    res.json({
      success: true,
      message: customMsg,
      product: updated
    });
  } catch (err: any) {
    console.error('Merchant update product error:', err);
    res.status(500).json({ success: false, message: 'পণ্য আপডেট করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PATCH /api/merchant/products/:productId/toggle-availability
 * Toggle product availability (instant, does NOT require Admin approval).
 */
merchantRoutes.patch('/products/:productId/toggle-availability', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { productId } = req.params;

    const updated = await db.toggleProductAvailability(productId, shopId);
    if (!updated) {
      res.status(404).json({ success: false, message: 'পণ্যটি পাওয়া যায়নি।' });
      return;
    }

    res.json({
      success: true,
      message: `পণ্যটির স্ট্যাটাস "${updated.isAvailable ? 'উপলব্ধ' : 'অনুপলব্ধ'}" হিসেবে পরিবর্তন করা হয়েছে।`,
      product: updated
    });
  } catch (err: any) {
    console.error('Merchant toggle product availability error:', err);
    res.status(500).json({ success: false, message: 'স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/merchant/products/:productId
 * Request product delete (requires Admin approval).
 */
merchantRoutes.delete('/products/:productId', requireMerchantAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.merchant!.shopId;
    const { productId } = req.params;

    const result = await db.requestProductDelete(productId, shopId, req.merchant?.id);

    res.json(result);
  } catch (err: any) {
    console.error('Merchant delete product request error:', err);
    res.status(500).json({ success: false, message: 'পণ্য ডিলেট রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে।' });
  }
});

