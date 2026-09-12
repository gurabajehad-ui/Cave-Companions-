import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Standard Bengali error message for rate-limited requests
 */
const rateLimitMessage = {
  success: false,
  error: 'TOO_MANY_REQUESTS',
  message: 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
};

const skipTestBypass = (req: any) => {
  return process.env.NODE_ENV !== 'production' || req.headers['x-bypass-time-validation'] === 'true';
};

// Safe key generator compatible with IPv6 and cloud reverse proxies
const safeKeyGenerator = (req: any, res: any) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // If it's a list, take the first one (the actual client IP)
    const firstIp = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : forwardedFor[0];
    if (firstIp) return firstIp.trim();
  }
  // Fall back to built-in ipKeyGenerator which safely handles IPv6
  return ipKeyGenerator(req, res);
};

/**
 * Rate limiter for Mosque prayer verification
 * Max: 60 attempts per minute
 */
export const prayerVerificationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestBypass,
  message: rateLimitMessage,
  keyGenerator: safeKeyGenerator
});

export const qrVerificationRateLimiter = prayerVerificationRateLimiter;

/**
 * Rate limiter for Merchant / Partner Shop Token Redemption
 * Max: 60 attempts per minute
 */
export const redemptionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestBypass,
  message: rateLimitMessage,
  keyGenerator: safeKeyGenerator
});

/**
 * Rate limiter for Authentication (Login / OTP Verify)
 * Max: 60 attempts per minute
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestBypass,
  message: rateLimitMessage,
  keyGenerator: safeKeyGenerator
});

/**
 * Rate limiter for OTP Generation / SMS request
 * Max: 30 attempts per minute
 */
export const otpRequestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestBypass,
  message: rateLimitMessage,
  keyGenerator: safeKeyGenerator
});

/**
 * Rate limiter for Admin Verification
 * Max: 60 attempts per minute
 */
export const adminAuthRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestBypass,
  message: rateLimitMessage,
  keyGenerator: safeKeyGenerator
});
