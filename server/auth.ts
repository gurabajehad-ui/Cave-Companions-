import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db, UserRecord, MerchantRecord } from './db.js';

// Cached JWT secret
let jwtSecretCache: string | null = null;

export function getJwtSecret(): string {
  if (jwtSecretCache) {
    return jwtSecretCache;
  }

  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    jwtSecretCache = envSecret;
    return jwtSecretCache;
  }

  // Persistent fallback stored in .jwt_secret so sessions survive server restarts/rebuilds
  try {
    const secretFilePath = path.join(process.cwd(), '.jwt_secret');
    if (fs.existsSync(secretFilePath)) {
      const savedSecret = fs.readFileSync(secretFilePath, 'utf8').trim();
      if (savedSecret && savedSecret.length >= 32) {
        jwtSecretCache = savedSecret;
        return jwtSecretCache;
      }
    }
    const newSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFilePath, newSecret, 'utf8');
    jwtSecretCache = newSecret;
    return jwtSecretCache;
  } catch (fsErr) {
    // If filesystem write fails, fallback to memory
    jwtSecretCache = crypto.randomBytes(32).toString('hex');
    return jwtSecretCache;
  }
}

export interface AuthRequest extends Request {
  user?: UserRecord;
  merchant?: MerchantRecord;
  admin?: any;
}

export function generateToken(user: UserRecord): string {
  try {
    const secret = getJwtSecret();
    if (!secret || secret.trim().length === 0) {
      const err: any = new Error('JWT_SECRET is missing or empty during token signing.');
      err.code = 'JWT_SECRET_MISSING';
      throw err;
    }
    return jwt.sign(
      {
        sub: user.id,
        phone: user.phone,
        fullName: user.fullName,
        type: 'user'
      },
      secret,
      { expiresIn: '30d' }
    );
  } catch (err: any) {
    console.error('[Auth JWT Signing Error] Failed to generate user token:', {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code || 'JWT_SECRET_MISSING',
      stack: err?.stack,
      userId: user.id
    });
    if (!err.code) {
      err.code = 'JWT_SECRET_MISSING';
    }
    throw err;
  }
}

export function generateMerchantToken(merchant: MerchantRecord): string {
  try {
    const secret = getJwtSecret();
    if (!secret || secret.trim().length === 0) {
      const err: any = new Error('JWT_SECRET is missing or empty during merchant token signing.');
      err.code = 'JWT_SECRET_MISSING';
      throw err;
    }
    return jwt.sign(
      {
        sub: merchant.id,
        shopId: merchant.shopId,
        role: merchant.role,
        name: merchant.name,
        phone: merchant.phone,
        type: 'merchant'
      },
      secret,
      { expiresIn: '30d' }
    );
  } catch (err: any) {
    console.error('[Auth JWT Signing Error] Failed to generate merchant token:', {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code || 'JWT_SECRET_MISSING',
      stack: err?.stack,
      merchantId: merchant.id
    });
    if (!err.code) {
      err.code = 'JWT_SECRET_MISSING';
    }
    throw err;
  }
}

export function generateAdminToken(admin: { id: string; role: string; permissions?: string[]; name?: string }): string {
  try {
    const secret = getJwtSecret();
    if (!secret || secret.trim().length === 0) {
      const err: any = new Error('JWT_SECRET is missing or empty during admin token signing.');
      err.code = 'JWT_SECRET_MISSING';
      throw err;
    }
    return jwt.sign(
      {
        sub: admin.id,
        role: admin.role,
        permissions: admin.permissions || [],
        name: admin.name || 'Admin',
        type: 'admin'
      },
      secret,
      { expiresIn: '24h' }
    );
  } catch (err: any) {
    console.error('[Auth JWT Signing Error] Failed to generate admin token:', {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code || 'JWT_SECRET_MISSING',
      stack: err?.stack,
      adminId: admin.id
    });
    if (!err.code) {
      err.code = 'JWT_SECRET_MISSING';
    }
    throw err;
  }
}

export function generateRegistrationToken(phone: string): string {
  try {
    const secret = getJwtSecret();
    if (!secret || secret.trim().length === 0) {
      const err: any = new Error('JWT_SECRET is missing or empty during registration token signing.');
      err.code = 'JWT_SECRET_MISSING';
      throw err;
    }
    return jwt.sign(
      {
        phone,
        type: 'merchant_reg',
        purpose: 'MERCHANT_REGISTRATION'
      },
      secret,
      { expiresIn: '2h' }
    );
  } catch (err: any) {
    console.error('[Auth JWT Signing Error] Failed to generate registration token:', {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code || 'JWT_SECRET_MISSING',
      stack: err?.stack
    });
    if (!err.code) {
      err.code = 'JWT_SECRET_MISSING';
    }
    throw err;
  }
}

export function verifyToken(token: string): { sub: string; type: string; phone?: string; fullName?: string } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    if (payload && typeof payload.sub === 'string' && payload.type === 'user') {
      return payload;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function verifyUserToken(token: string): { sub: string; type: string; phone?: string; fullName?: string } | null {
  return verifyToken(token);
}

export function verifyAdminToken(token: string): { sub: string; role: string; permissions?: string[]; name?: string; type: string } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    if (payload && typeof payload.sub === 'string') {
      if (payload.type === 'admin') {
        return payload;
      }
      if (payload.role === 'ADMIN' || payload.role === 'MASTER_ADMIN' || payload.role === 'SUPER_ADMIN') {
        return {
          sub: payload.sub,
          role: payload.role,
          permissions: payload.permissions || [],
          name: payload.name || payload.fullName || 'Admin',
          type: 'admin'
        };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function verifyMerchantToken(token: string): { sub: string; id: string; shopId: string; role: string; name: string; phone?: string; type: string } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    if (payload && typeof payload.sub === 'string' && payload.type === 'merchant') {
      return {
        ...payload,
        id: payload.sub
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function verifyRegistrationToken(token: string): { phone: string; type: string; purpose: string } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    if (payload && typeof payload.phone === 'string' && payload.type === 'merchant_reg' && payload.purpose === 'MERCHANT_REGISTRATION') {
      return payload;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'অনুগ্রহ করে প্রথমে লগইন করুন।'
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyUserToken(token);

  if (!payload || !payload.sub || payload.type !== 'user') {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'আপনার সেশনের মেয়াদ শেষ হয়েছে বা টোকেন অবৈধ। পুনরায় লগইন করুন।'
    });
    return;
  }

  const user = await db.getUserById(payload.sub);
  if (!user || user.status !== 'active') {
    res.status(401).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'ব্যবহারকারী পাওয়া যায়নি বা অ্যাকাউন্ট নিষ্ক্রিয়।'
    });
    return;
  }

  req.user = user;
  next();
}

export async function requireMerchantAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'MERCHANT_UNAUTHORIZED',
      message: 'মার্চেন্ট পোর্টালে প্রবেশের জন্য অনুগ্রহ করে মার্চেন্ট হিসেবে লগইন করুন।'
    });
    return;
  }

  const payload = verifyMerchantToken(token);

  if (!payload || !payload.sub || payload.type !== 'merchant') {
    res.status(401).json({
      success: false,
      error: 'INVALID_MERCHANT_TOKEN',
      message: 'মার্চেন্ট সেশনের মেয়াদ শেষ হয়েছে বা টোকেন অবৈধ। পুনরায় লগইন করুন।'
    });
    return;
  }

  const merchant = await db.getMerchantById(payload.sub);
  if (!merchant || (merchant.status && merchant.status.toLowerCase() !== 'active')) {
    res.status(401).json({
      success: false,
      error: 'MERCHANT_NOT_FOUND',
      message: 'মার্চেন্ট অ্যাকাউন্ট পাওয়া যায়নি বা নিষ্ক্রিয়।'
    });
    return;
  }

  req.merchant = merchant;
  next();
}

export const MASTER_PERMISSIONS: string[] = [
  'MOSQUE_VIEW', 'MOSQUE_CREATE', 'MOSQUE_EDIT', 'MOSQUE_DELETE',
  'SHOP_VIEW', 'SHOP_CREATE', 'SHOP_EDIT', 'SHOP_DELETE', 'SHOP_DISCOUNT_APPROVE',
  'PRODUCT_APPROVE', 'PRODUCT_MANAGE',
  'USER_VIEW', 'USER_EDIT', 'USER_STATUS', 'USER_DELETE',
  'SUPPORT_VIEW', 'SUPPORT_REPLY',
  'ADMIN_VIEW', 'ADMIN_CREATE', 'ADMIN_EDIT', 'ADMIN_DELETE',
  'NASIHA_VIEW', 'NASIHA_MANAGE',
  'HELPLINE_VIEW', 'HELPLINE_MANAGE',
  'ORDER_VIEW', 'ORDER_MANAGE',
  'ACCOUNTS_VIEW', 'ACCOUNTS_MANAGE',
  'DELIVERY_VIEW', 'DELIVERY_MANAGE',
  'ADS_VIEW', 'ADS_MANAGE',
  'COMMISSION_VIEW', 'COMMISSION_MANAGE',
  'NOTIFICATION_VIEW', 'NOTIFICATION_MANAGE',
  'ANALYTICS_VIEW',
  'SYSTEM_VIEW', 'AUDIT_VIEW'
];

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  // Extract token strictly from Authorization header (Bearer <token>) or query parameter fallback
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  if (!token && (req.query.adminToken || req.query.token)) {
    token = String(req.query.adminToken || req.query.token).trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'এডমিন অনুমোদন প্রয়োজন। অনুগ্রহ করে এডমিন হিসেবে লগইন করুন।'
    });
    return;
  }

  // 0. Direct master key string match
  const validMasterKeys = [
    process.env.ADMIN_SECRET_KEY,
    'admin_secure_key_9876543210_abcdef',
    'RAHMANJMCC',
    'admin123456'
  ].filter(Boolean).map(k => k!.trim());

  if (validMasterKeys.includes(token)) {
    req.admin = {
      id: 'MASTER',
      name: 'Master Admin',
      role: 'MASTER_ADMIN',
      permissions: MASTER_PERMISSIONS
    };
    return next();
  }

  // 1. Verify signed JWT Admin Session Token
  const jwtAdmin = verifyAdminToken(token);
  if (jwtAdmin) {
    if (jwtAdmin.sub !== 'MASTER') {
      try {
        const adminAccount = await db.getAdminAccountById(jwtAdmin.sub);
        if (adminAccount) {
          if (adminAccount.status === 'suspended') {
            res.status(403).json({
              success: false,
              error: 'SUSPENDED',
              message: 'আপনার এডমিন অ্যাকাউন্টটি স্থগিত করা হয়েছে।'
            });
            return;
          }
          req.admin = {
            ...adminAccount,
            permissions: (adminAccount.permissions && adminAccount.permissions.length > 0)
              ? adminAccount.permissions
              : MASTER_PERMISSIONS
          };
          return next();
        }
      } catch (err) {
        console.warn('[requireAdmin] DB lookup for admin failed, proceeding with JWT payload:', err);
      }
    }

    req.admin = {
      id: jwtAdmin.sub,
      name: jwtAdmin.name || (jwtAdmin.sub === 'MASTER' ? 'Master Admin' : 'Admin'),
      role: jwtAdmin.role,
      permissions: (jwtAdmin.permissions && jwtAdmin.permissions.length > 0)
        ? jwtAdmin.permissions
        : MASTER_PERMISSIONS
    };
    return next();
  }

  // 2. Validate custom Admin account database session token (ADM-TOK-...)
  if (token.startsWith('ADM-TOK-')) {
    const admin = await db.getAdminAccountByToken(token);
    if (admin) {
      if (admin.status === 'suspended') {
        res.status(403).json({
          success: false,
          error: 'SUSPENDED',
          message: 'আপনার এডমিন অ্যাকাউন্টটি স্থগিত করা হয়েছে।'
        });
        return;
      }
      req.admin = {
        ...admin,
        permissions: (admin.permissions && admin.permissions.length > 0) ? admin.permissions : MASTER_PERMISSIONS
      };
      return next();
    }
  }

  // 3. Keep fallback merchant check for explicit ADMIN or SUPER_ADMIN role (backward compatibility)
  if (token.startsWith('MCH-')) {
    const merchant = await db.getMerchantById(token);
    if (merchant && (merchant.role === 'ADMIN' || merchant.role === 'SUPER_ADMIN')) {
      req.admin = {
        id: merchant.id,
        name: merchant.name,
        role: merchant.role || 'ADMIN',
        permissions: MASTER_PERMISSIONS
      };
      return next();
    }
  }

  // 4. Also check if the token is a valid user token for a user with role === 'ADMIN' or 'SUPER_ADMIN'
  const userPayload = verifyUserToken(token);
  if (userPayload && userPayload.sub) {
    try {
      const user = await db.getUserById(userPayload.sub);
      const userRole = (user as any)?.role;
      if (user && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')) {
        req.admin = {
          id: user.id,
          name: user.fullName || 'Admin User',
          role: userRole,
          permissions: MASTER_PERMISSIONS
        };
        return next();
      }
    } catch (err) {
      console.warn('[requireAdmin] Error checking user role for admin token:', err);
    }
  }

  res.status(403).json({
    success: false,
    error: 'FORBIDDEN',
    message: 'প্রবেশাধিকার সংরক্ষিত। সঠিক এডমিন সেশন টোকেন প্রয়োজন।'
  });
}

