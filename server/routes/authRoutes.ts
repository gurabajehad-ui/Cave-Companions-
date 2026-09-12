import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, UserRecord } from '../db.js';
import { generateToken, requireAuth, AuthRequest } from '../auth.js';
import { getTodayDateString, isFriday } from '../timezone.js';
import { otpRequestRateLimiter, authRateLimiter } from '../rateLimiter.js';

export { getTodayDateString };

const router = Router();

function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    gender: (user.gender || 'male').toLowerCase(),
    age: user.age,
    dateOfBirth: user.dateOfBirth,
    maritalStatus: user.maritalStatus,
    district: user.district,
    upazila: user.upazila,
    address: user.address,
    isVerified: user.isVerified ?? true,
    photoUrl: user.photoUrl,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

// 1. Password-Based Login: Email or Phone + Password
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    console.log('[Backend Route Reached: POST /api/auth/login]', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      identifierProvided: !!req.body?.identifier,
      identifierLength: typeof req.body?.identifier === 'string' ? req.body.identifier.trim().length : 0,
      passwordProvided: !!req.body?.password,
      passwordLength: typeof req.body?.password === 'string' ? req.body.password.trim().length : 0
    });

    const { identifier, password } = req.body || {};

    if (!identifier || typeof identifier !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'ইমেইল/মোবাইল নম্বর এবং পাসওয়ার্ড উভয়ই প্রদান করুন।'
      });
      return;
    }

    const cleanIdentifier = identifier.trim();

    // Lookup user by identifier (phone or email)
    const user = await db.getUserByIdentifier(cleanIdentifier);

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'মোবাইল নম্বর/ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।'
      });
      return;
    }

    // Migration Check: If existing user created under old OTP system without password
    if (!user.passwordHash) {
      res.status(400).json({
        success: false,
        error: 'PASSWORD_NOT_SET',
        requireMigration: true,
        phone: user.phone,
        message: 'আপনার অ্যাকাউন্টে পাসওয়ার্ড সেট করা নেই। দয়া করে পাসওয়ার্ড রিসেট/সেট অপশন ব্যবহার করে নতুন পাসওয়ার্ড সেট করুন।'
      });
      return;
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password.trim(), user.passwordHash);

    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'মোবাইল নম্বর/ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।'
      });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'আপনার অ্যাকাউন্টটি স্থগিত করা হয়েছে। অনুগ্রহ করে সাপোর্ট টিমের সাথে যোগাযোগ করুন।'
      });
      return;
    }

    // Update last login timestamp
    await db.updateUserLastLogin(user.id);

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'সফলভাবে লগইন সম্পন্ন হয়েছে!',
      token,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    console.error('[Auth API] Login exception:', {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code,
      stack: err?.stack
    });
    const isJwtError = err?.code === 'JWT_SECRET_MISSING' || err?.message?.includes('JWT_SECRET') || err?.message?.includes('jwt') || err?.name === 'JsonWebTokenError';
    const isDbError = err?.message?.includes('database') || err?.code?.startsWith('57') || err?.code?.startsWith('08');
    
    res.status(500).json({
      success: false,
      error: isJwtError ? 'JWT_SECRET_MISSING' : isDbError ? 'DATABASE_ERROR' : 'SERVER_ERROR',
      message: isJwtError
        ? 'সার্ভার সিকিউরিটি কনফিগারেশন ত্রুটি (JWT Secret)। অনুগ্রহ করে অ্যাডমিনকে জানান।'
        : 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
      debugDetail: process.env.NODE_ENV !== 'production' ? err?.message : undefined
    });
  }
});

// 2. User Registration Request (Sends OTP for Registration Verification)
router.post('/register-request', otpRequestRateLimiter, async (req, res) => {
  try {
    const { fullName, phone, email, gender, dateOfBirth, maritalStatus, district, upazila, address, password, confirmPassword } = req.body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'INVALID_NAME',
        message: 'অনুগ্রহ করে আপনার পুরো নাম প্রদান করুন।'
      });
      return;
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
      res.status(400).json({
        success: false,
        error: 'INVALID_PHONE',
        message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।'
      });
      return;
    }

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'MISSING_ADDRESS',
        message: 'অনুগ্রহ করে আপনার ঠিকানা লিখুন।'
      });
      return;
    }

    if (!dateOfBirth || typeof dateOfBirth !== 'string' || isNaN(Date.parse(dateOfBirth))) {
      res.status(400).json({
        success: false,
        error: 'INVALID_DOB',
        message: 'অনুগ্রহ করে একটি সঠিক জন্ম তারিখ প্রদান করুন।'
      });
      return;
    }

    const dob = new Date(dateOfBirth);
    const today = new Date();
    if (dob > today) {
      res.status(400).json({
        success: false,
        error: 'FUTURE_DOB',
        message: 'ভবিষ্যতের তারিখ জন্ম তারিখ হতে পারে না।'
      });
      return;
    }

    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }

    if (calculatedAge < 5) {
      res.status(400).json({
        success: false,
        error: 'TOO_YOUNG',
        message: 'কমপক্ষে ৫ বছর বয়স হতে হবে।'
      });
      return;
    }
    if (calculatedAge > 120) {
      res.status(400).json({
        success: false,
        error: 'TOO_OLD',
        message: 'অনুগ্রহ করে একটি সঠিক জন্ম তারিখ প্রদান করুন।'
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
      });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: 'পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।'
      });
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const normGender = gender && String(gender).toLowerCase() === 'female' ? 'female' : 'male';

    // Check if user with phone or email already exists and is verified
    const existingByPhone = await db.getUserByPhone(cleanPhone);
    if (existingByPhone && existingByPhone.isVerified) {
      res.status(400).json({
        success: false,
        error: 'USER_EXISTS',
        message: 'এই মোবাইল নম্বরটি দিয়ে ইতোমধ্যে একটি সক্রিয় অ্যাকাউন্ট রয়েছে। লগইন করুন।'
      });
      return;
    }

    if (cleanEmail) {
      const existingByEmail = await db.getUserByEmail(cleanEmail);
      if (existingByEmail && existingByEmail.isVerified) {
        res.status(400).json({
          success: false,
          error: 'USER_EXISTS',
          message: 'এই ইমেইলটি দিয়ে ইতোমধ্যে একটি সক্রিয় অ্যাকাউন্ট রয়েছে। লগইন করুন।'
        });
        return;
      }
    }

    // Hash the password securely
    const passwordHash = bcrypt.hashSync(password, 10);

    // Generate cryptographically secure 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Save OTP with purpose = REGISTRATION_VERIFICATION
    await db.saveOtp(cleanPhone, otpCode, 'REGISTRATION_VERIFICATION', 10, {
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      gender: normGender,
      dateOfBirth,
      maritalStatus,
      district: district ? String(district).trim() : undefined,
      upazila: upazila ? String(upazila).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      passwordHash
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] Registration OTP for ${cleanPhone}: ${otpCode}`);
    }

    res.json({
      success: true,
      message: 'আপনার নম্বরে ৬ ডিজিটের অ্যাকাউন্ট ভেরিফিকেশন কোড পাঠানো হয়েছে।',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}),
      identifier: cleanPhone
    });
  } catch (err: any) {
    console.error('register-request error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'রেজিস্ট্রেশন প্রক্রিয়ায় সমস্যা হয়েছে।'
    });
  }
});

// 3. User Registration OTP Verification & Account Creation
router.post('/register-verify', authRateLimiter, async (req, res) => {
  try {
    const { identifier, code } = req.body;

    if (!identifier || !code) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'মোবাইল নম্বর/ইমেইল এবং ভেরিফিকেশন কোড উভয়ই প্রয়োজন।'
      });
      return;
    }

    const cleanIdentifier = String(identifier).trim();
    const cleanCode = String(code).trim();

    const verification = await db.verifyOtp(cleanIdentifier, cleanCode, 'REGISTRATION_VERIFICATION');

    if (!verification.valid || !verification.registrationData) {
      let errMsg = 'ভেরিফিকেশন কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে।';
      if (verification.error === 'MAX_ATTEMPTS') {
        errMsg = 'সর্বোচ্চ ৫ বার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে পুনরায় কোড পাঠান।';
      } else if (verification.error === 'EXPIRED') {
        errMsg = 'ভেরিফিকেশন কোডের মেয়াদ শেষ হয়ে গেছে (১০ মিনিট)। পুনরায় চেষ্টা করুন।';
      }
      res.status(400).json({
        success: false,
        error: 'INVALID_OTP',
        message: errMsg
      });
      return;
    }

    const regData = verification.registrationData;

    // Check if user already exists
    let user = await db.getUserByPhone(regData.phone);
    if (user) {
      // Update existing unverified user with registration data & password
      await db.updateUserProfile(user.id, {
        fullName: regData.fullName,
        email: regData.email,
        gender: regData.gender,
        dateOfBirth: regData.dateOfBirth,
        maritalStatus: regData.maritalStatus,
        district: regData.district,
        upazila: regData.upazila,
        address: regData.address
      });
      if (regData.passwordHash) {
        await db.updateUserPassword(user.id, regData.passwordHash);
      }
      await db.updateUserLastLogin(user.id);
      user = await db.getUserById(user.id);
    } else {
      // Create new user
      user = await db.createUser({
        fullName: regData.fullName,
        phone: regData.phone,
        email: regData.email,
        passwordHash: regData.passwordHash,
        gender: regData.gender,
        dateOfBirth: regData.dateOfBirth,
        maritalStatus: regData.maritalStatus,
        district: regData.district,
        upazila: regData.upazila,
        address: regData.address
      });
    }

    if (!user) {
      res.status(500).json({
        success: false,
        error: 'USER_CREATION_FAILED',
        message: 'ব্যবহারকারী তৈরি করতে ব্যর্থ হয়েছে।'
      });
      return;
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'অ্যাকাউন্ট ভেরিফিকেশন ও রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে!',
      token,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    console.error('register-verify error:', {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code,
      stack: err?.stack
    });
    const isJwtError = err?.code === 'JWT_SECRET_MISSING' || err?.message?.includes('JWT_SECRET') || err?.message?.includes('jwt') || err?.name === 'JsonWebTokenError';
    res.status(500).json({
      success: false,
      error: isJwtError ? 'JWT_SECRET_MISSING' : 'SERVER_ERROR',
      message: isJwtError
        ? 'সার্ভার সিকিউরিটি কনফিগারেশন ত্রুটি (JWT Secret)। অনুগ্রহ করে অ্যাডমিনকে জানান।'
        : 'ভেরিফিকেশনে সমস্যা হয়েছে।'
    });
  }
});

// 4. Forgot Password Request (Sends OTP for Password Reset)
router.post('/forgot-password-request', otpRequestRateLimiter, async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'INVALID_IDENTIFIER',
        message: 'আপনার ইমেইল বা মোবাইল নম্বর প্রদান করুন।'
      });
      return;
    }

    const clean = identifier.trim();
    const user = await db.getUserByIdentifier(clean);

    const otpCode = crypto.randomInt(100000, 1000000).toString();

    if (user) {
      await db.saveOtp(user.phone, otpCode, 'PASSWORD_RESET', 10);
      if (user.email) {
        await db.saveOtp(user.email, otpCode, 'PASSWORD_RESET', 10);
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUTH] Password Reset OTP for ${clean}: ${otpCode}`);
      }
    }

    // Generic safe response to prevent user enumeration
    res.json({
      success: true,
      message: 'যদি এই তথ্যে কোনো অ্যাকাউন্ট থেকে থাকে, তবে আপনার মোবাইল/ইমেইলে ভেরিফিকেশন কোড পাঠানো হয়েছে।',
      ...(process.env.NODE_ENV !== 'production' && user ? { devOtp: otpCode } : {}),
      identifier: clean
    });
  } catch (err: any) {
    console.error('forgot-password-request error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'পাসওয়ার্ড রিসেট অনুরোধে সমস্যা হয়েছে।'
    });
  }
});

// 5. Forgot Password Verification & Password Reset
router.post('/forgot-password-verify', authRateLimiter, async (req, res) => {
  try {
    const { identifier, code, newPassword, confirmPassword } = req.body;

    if (!identifier || !code || !newPassword || !confirmPassword) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'সকল তথ্য সঠিকভাবে প্রদান করুন।'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: 'নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।'
      });
      return;
    }

    const cleanIdentifier = String(identifier).trim();
    const cleanCode = String(code).trim();

    const verification = await db.verifyOtp(cleanIdentifier, cleanCode, 'PASSWORD_RESET');

    if (!verification.valid) {
      let errMsg = 'ভেরিফিকেশন কোডটি সঠিক নয় বা মেয়াদ শেষ হয়েছে।';
      if (verification.error === 'MAX_ATTEMPTS') {
        errMsg = 'সর্বোচ্চ ৫ বার ভুল কোড দেওয়া হয়েছে। পুনরায় চেষ্টা করুন।';
      }
      res.status(400).json({
        success: false,
        error: 'INVALID_OTP',
        message: errMsg
      });
      return;
    }

    const user = await db.getUserByIdentifier(cleanIdentifier);
    if (!user) {
      res.status(400).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'ব্যবহারকারীকে খুঁজে পাওয়া যায়নি।'
      });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword.trim(), 10);
    await db.updateUserPassword(user.id, newHash);

    res.json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
    });
  } catch (err: any) {
    console.error('forgot-password-verify error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।'
    });
  }
});

// Backward Compatible Legacy OTP Request (maps to registration-request)
router.post('/request-otp', otpRequestRateLimiter, async (req, res) => {
  try {
    const { phone, fullName } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, message: 'মোবাইল নম্বর প্রদান করুন।' });
      return;
    }
    const cleanPhone = String(phone).trim().replace(/[\s-]/g, '');
    const existingUser = await db.getUserByPhone(cleanPhone);
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // If existing user has password, inform them to use login with password
    if (existingUser && existingUser.passwordHash) {
      res.json({
        success: true,
        isExistingUser: true,
        hasPassword: true,
        message: 'আপনার অ্যাকাউন্টে পাসওয়ার্ড সেট করা আছে। পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।'
      });
      return;
    }

    await db.saveOtp(cleanPhone, otpCode, 'REGISTRATION_VERIFICATION', 10, {
      fullName: fullName || (existingUser ? existingUser.fullName : 'মুসাল্লী'),
      phone: cleanPhone,
      gender: existingUser ? existingUser.gender : 'male',
      passwordHash: existingUser?.passwordHash || bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10)
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] Legacy OTP for ${cleanPhone}: ${otpCode}`);
    }

    res.json({
      success: true,
      message: 'আপনার মোবাইল নম্বরে ভেরিফিকেশন কোড পাঠানো হয়েছে।',
      isExistingUser: !!existingUser,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}),
      phone: cleanPhone
    });
  } catch (err: any) {
    console.error('request-otp error:', err);
    res.status(500).json({ success: false, message: 'OTP পাঠাতে ব্যর্থ হয়েছে।' });
  }
});

// Backward Compatible Legacy OTP Verification
router.post('/verify-otp', authRateLimiter, async (req, res) => {
  try {
    const { phone, code, fullName } = req.body;
    if (!phone || !code) {
      res.status(400).json({ success: false, message: 'মোবাইল নম্বর ও ভেরিফিকেশন কোড দিন।' });
      return;
    }
    const cleanPhone = String(phone).trim().replace(/[\s-]/g, '');
    const verification = await db.verifyOtp(cleanPhone, String(code).trim(), 'REGISTRATION_VERIFICATION');

    if (!verification.valid) {
      res.status(400).json({ success: false, message: 'ভেরিফিকেশন কোডটি সঠিক নয়।' });
      return;
    }

    let user = await db.getUserByPhone(cleanPhone);
    if (!user) {
      user = await db.createUser({
        fullName: fullName || verification.registrationData?.fullName || 'মুসাল্লী',
        phone: cleanPhone,
        passwordHash: verification.registrationData?.passwordHash || bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10),
        gender: 'male'
      });
    } else {
      await db.updateUserLastLogin(user.id);
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'লগইন প্রক্রিয়াকরণে সমস্যা হয়েছে।' });
      return;
    }

    const token = generateToken(user);
    res.json({
      success: true,
      message: 'সফলভাবে প্রবেশ করেছেন!',
      token,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    console.error('verify-otp error:', {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code,
      stack: err?.stack
    });
    const isJwtError = err?.code === 'JWT_SECRET_MISSING' || err?.message?.includes('JWT_SECRET') || err?.message?.includes('jwt') || err?.name === 'JsonWebTokenError';
    res.status(500).json({
      success: false,
      error: isJwtError ? 'JWT_SECRET_MISSING' : 'SERVER_ERROR',
      message: isJwtError
        ? 'সার্ভার সিকিউরিটি কনফিগারেশন ত্রুটি (JWT Secret)। অনুগ্রহ করে অ্যাডমিনকে জানান।'
        : 'ভেরিফিকেশন ত্রুটি ঘটেছে।'
    });
  }
});

// Get Current Logged-In User Profile
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const todayStr = getTodayDateString();
    const isTodayFri = isFriday(todayStr);
    const todayAttendances = await db.getUserTodayAttendances(user.id, todayStr);
    const stats = await db.getUserLifetimeStats(user.id);

    const dayPrayers = isTodayFri
      ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha']
      : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    const prayerStatusMap: Record<string, any> = {};
    dayPrayers.forEach(p => {
      prayerStatusMap[p] = { completed: false, attendance: null };
    });

    todayAttendances.forEach(att => {
      const pType = att.prayerType as string;
      if (prayerStatusMap[pType]) {
        prayerStatusMap[pType] = {
          completed: true,
          attendance: att
        };
      } else if (isTodayFri && pType === 'dhuhr' && prayerStatusMap['jumuah']) {
        prayerStatusMap['jumuah'] = {
          completed: true,
          attendance: att
        };
      } else if (!isTodayFri && pType === 'jumuah' && prayerStatusMap['dhuhr']) {
        prayerStatusMap['dhuhr'] = {
          completed: true,
          attendance: att
        };
      }
    });

    res.json({
      success: true,
      user: sanitizeUser(user),
      todayStatus: {
        date: todayStr,
        isFriday: isTodayFri,
        completedCount: todayAttendances.length,
        totalPrayers: 5,
        prayers: prayerStatusMap,
        attendances: todayAttendances
      },
      stats
    });
  } catch (err: any) {
    console.error('me route error:', err);
    res.status(500).json({ success: false, message: 'প্রোফাইল তথ্য লোড করতে ব্যর্থ হয়েছে।' });
  }
});

// Update Profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { fullName, photoUrl, gender, age, dateOfBirth, maritalStatus, district, upazila, address, email } = req.body;

    if (fullName !== undefined && (typeof fullName !== 'string' || fullName.trim().length === 0)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_NAME',
        message: 'সঠিক পুরো নাম প্রদান করুন।'
      });
      return;
    }

    const updated = await db.updateUserProfile(user.id, {
      fullName: fullName ? fullName.trim() : undefined,
      photoUrl: photoUrl !== undefined ? photoUrl : undefined,
      gender: gender ? String(gender).toLowerCase() : undefined,
      age: age ? Number(age) : undefined,
      dateOfBirth: dateOfBirth || undefined,
      maritalStatus: maritalStatus || undefined,
      district: district ? String(district).trim() : undefined,
      upazila: upazila ? String(upazila).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      email
    });

    if (!updated) {
      res.status(404).json({ success: false, message: 'ইউজার পাওয়া যায়নি।' });
      return;
    }

    res.json({
      success: true,
      message: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে।',
      user: sanitizeUser(updated)
    });
  } catch (err: any) {
    console.error('profile update error:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।'
    });
  }
});

// User Lookup Details for Transactions / Accounts Views
router.get('/lookup/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    if (!identifier) {
      res.status(400).json({ success: false, message: 'আইডেন্টিফায়ার প্রয়োজন।' });
      return;
    }
    const user = await db.getUserDetailsByIdOrPhone(identifier);
    if (!user) {
      res.status(404).json({ success: false, message: 'ইউজারের বিস্তারিত তথ্য পাওয়া যায়নি।' });
      return;
    }
    res.json({ success: true, user });
  } catch (err: any) {
    console.error('user lookup error:', err);
    res.status(500).json({ success: false, message: 'ইউজার তথ্য লোড করতে ব্যর্থ হয়েছে।' });
  }
});

// User Account Deletion System
const handleDeleteAccount = async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { password, confirmText } = req.body || {};

    // If user has a password set, verify it
    if (user.passwordHash) {
      if (!password || typeof password !== 'string' || !password.trim()) {
        res.status(400).json({
          success: false,
          error: 'MISSING_PASSWORD',
          message: 'অ্যাকাউন্ট মুছে ফেলার জন্য আপনার পাসওয়ার্ড প্রদান করুন।'
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password.trim(), user.passwordHash);
      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'INVALID_PASSWORD',
          message: 'প্রদত্ত পাসওয়ার্ডটি সঠিক নয়।'
        });
        return;
      }
    } else {
      // If user has no password set (legacy OTP user), require confirmText
      if (!confirmText || (confirmText.trim() !== 'DELETE' && confirmText.trim() !== 'মুছে ফেলুন')) {
        res.status(400).json({
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: 'অ্যাকাউন্ট মুছে ফেলা নিশ্চিত করতে "DELETE" অথবা "মুছে ফেলুন" লিখুন।'
        });
        return;
      }
    }

    const { getClient } = await import('../pg.js');
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const userId = user.id;

      // 1. Anonymize Orders
      await client.query(
        `UPDATE orders 
         SET customer_name = 'Deleted User', 
             customer_phone = '00000000000', 
             delivery_address = 'DELETED', 
             full_address = 'DELETED', 
             delivery_notes = NULL, 
             user_id = NULL 
         WHERE user_id = $1`,
        [userId]
      );

      // 2. Anonymize Redemptions
      await client.query(
        `UPDATE redemptions 
         SET user_name = 'Deleted User', 
             user_phone = '00000000000' 
         WHERE user_id = $1`,
        [userId]
      );

      // 3. Anonymize Online Financial Records
      await client.query(
        `UPDATE online_financial_records 
         SET customer_name = 'Deleted User', 
             customer_phone = '00000000000', 
             delivery_address = 'DELETED' 
         WHERE user_id = $1`,
        [userId]
      );

      // 4. Anonymize Support Tickets
      await client.query(
        `UPDATE support_tickets 
         SET user_name = 'Deleted User', 
             user_phone = '00000000000' 
         WHERE user_id = $1`,
        [userId]
      );

      // 5. Anonymize Mosque Submission Requests
      await client.query(
        `UPDATE mosques 
         SET requested_by_user_id = NULL, 
             requested_by_name = 'Deleted User', 
             requested_by_phone = '00000000000' 
         WHERE requested_by_user_id = $1`,
        [userId]
      );

      // 6. Delete User's Notifications
      await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);

      // 7. Delete User's Carts & Cart Items
      await client.query('DELETE FROM carts WHERE user_id = $1', [userId]);

      // 8. Delete User Salah Journeys
      await client.query('DELETE FROM user_salah_journeys WHERE user_id = $1', [userId]);

      // 9. Delete QR Verifications
      await client.query('DELETE FROM qr_verifications WHERE user_id = $1', [userId]);

      // 10. Delete Shop & Product Reviews
      await client.query('DELETE FROM shop_reviews WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM product_reviews WHERE user_id = $1', [userId]);

      // 11. Delete Tokens
      await client.query('DELETE FROM tokens WHERE user_id = $1', [userId]);

      // 12. Delete Prayer Attendances
      await client.query('DELETE FROM prayer_attendances WHERE user_id = $1', [userId]);

      // 13. Anonymize Security Audit Logs (Disassociate user while preserving security/fraud history)
      await client.query('UPDATE security_audit_logs SET user_id = NULL WHERE user_id = $1', [userId]);

      // 14. Delete Analytics Events for User
      await client.query('DELETE FROM analytics_events WHERE user_id = $1', [userId]);

      // 15. Delete User Record
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');

      console.log(`[Account Deletion Audit] User account permanently deleted and anonymized. UserId: ${userId}`);

      res.json({
        success: true,
        message: 'আপনার অ্যাকাউন্টটি স্থায়ীভাবে মুছে ফেলা হয়েছে।'
      });
    } catch (dbErr: any) {
      await client.query('ROLLBACK');
      console.error('[Account Deletion DB Transaction Error]:', dbErr);
      res.status(500).json({
        success: false,
        error: 'DELETION_FAILED',
        message: 'অ্যাকাউন্ট মুছে ফেলতে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Account Deletion Route Error]:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'সার্ভারে অভ্যন্তরীণ ত্রুটি দেখা দিয়েছে।'
    });
  }
};

router.delete('/delete-account', requireAuth, handleDeleteAccount);
router.post('/delete-account', requireAuth, handleDeleteAccount);

export default router;
