import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RegistrationView, RegistrationData } from './RegistrationView';
import { AppLogo } from './AppLogo';
import {
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type AuthMode = 'login' | 'register' | 'register-otp' | 'forgot' | 'forgot-verify';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onCancel }) => {
  const { login, registerRequest, registerVerify, forgotPasswordRequest, forgotPasswordVerify, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Registration Payload State for resending verification code
  const [phone, setPhone] = useState('');
  const [registrationPayload, setRegistrationPayload] = useState<RegistrationData | null>(null);

  // OTP Fields
  const [otpCode, setOtpCode] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | undefined>();
  const [countdown, setCountdown] = useState(0);

  // Countdown timer helper
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const resetAlerts = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // --- 1. HANDLE LOGIN ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    console.log('[AuthScreen handleSubmit]', {
      timestamp: new Date().toISOString(),
      identifierLength: identifier.trim().length,
      identifierProvided: !!identifier.trim(),
      passwordProvided: !!password.trim(),
      passwordLength: password.trim().length
    });
    
    // Immediately set loading state upon first click
    setIsLoading(true);
    resetAlerts();

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage(t('auth.enterBothCredentialsErr'));
      setIsLoading(false);
      return;
    }

    try {
      const ok = await login(identifier.trim(), password.trim());
      if (ok) {
        if (onSuccess) onSuccess();
        // On success: maintain loading state through navigation/transition to prevent multiple submissions
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      let friendlyMessage = t('auth.invalidCredentialsErr');
      const errorMessageStr = err.message || '';
      
      if (errorMessageStr.includes('PHONE_NOT_FOUND')) {
        friendlyMessage = t('auth.phoneNotFoundErr');
      } else if (errorMessageStr.includes('INVALID_PIN')) {
        friendlyMessage = t('auth.invalidPinErr');
      } else if (errorMessageStr.includes('ACCOUNT_PENDING')) {
        friendlyMessage = t('auth.accountPendingErr');
      } else if (errorMessageStr.includes('SUSPENDED') || errorMessageStr.includes('ACCOUNT_SUSPENDED') || errorMessageStr.includes('403') || errorMessageStr.includes('স্থগিত') || errorMessageStr.includes('সাসপেন্ড')) {
        friendlyMessage = t('auth.accountSuspendedErr');
      } else {
        friendlyMessage = errorMessageStr || friendlyMessage;
      }

      setErrorMessage(friendlyMessage);
      setIsLoading(false);
    }
  };


  // --- 2. HANDLE REGISTER REQUEST (VIA REGISTRATION VIEW) ---
  const handleRegistrationViewSubmit = async (data: RegistrationData) => {
    if (isLoading) return;
    resetAlerts();
    setIsLoading(true);
    try {
      const res = await registerRequest({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        maritalStatus: data.maritalStatus,
        district: data.district,
        upazila: data.upazila,
        address: data.address,
        password: data.password,
        confirmPassword: data.confirmPassword
      });

      // Save payload for resending if necessary
      setRegistrationPayload(data);

      // Update phone/identifier states so they're accessible during OTP verification
      setPhone(data.phone);
      setIdentifier(data.phone);

      setSuccessMessage(res.message);
      setDevOtpHint(res.devOtp);
      setMode('register-otp');
      setCountdown(60);
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.regReqErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2.1 RESEND REGISTRATION OTP CODE ---
  const handleResendRegisterCode = async () => {
    if (!registrationPayload) return;
    resetAlerts();
    setIsLoading(true);
    try {
      const res = await registerRequest({
        fullName: registrationPayload.fullName,
        phone: registrationPayload.phone,
        email: registrationPayload.email,
        gender: registrationPayload.gender,
        dateOfBirth: registrationPayload.dateOfBirth,
        maritalStatus: registrationPayload.maritalStatus,
        district: registrationPayload.district,
        upazila: registrationPayload.upazila,
        address: registrationPayload.address,
        password: registrationPayload.password,
        confirmPassword: registrationPayload.confirmPassword
      });
      setSuccessMessage(t('auth.newCodeSentMessage'));
      setDevOtpHint(res.devOtp);
      setCountdown(60);
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.codeResendErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. HANDLE REGISTER OTP VERIFY ---
  const handleRegisterOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    resetAlerts();

    if (!otpCode || otpCode.length < 4) {
      setErrorMessage(t('auth.otpReqErr'));
      return;
    }

    setIsLoading(true);
    try {
      const ok = await registerVerify(phone.trim() || identifier.trim(), otpCode.trim());
      if (ok) {
        logout(); // Force logout to prevent immediate auto-dashboard access
        setSuccessMessage(t('auth.verifySuccessMessage'));
        setIdentifier(phone.trim());
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.otpVerifyErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. HANDLE FORGOT PASSWORD REQUEST ---
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();

    if (!identifier.trim()) {
      setErrorMessage(t('auth.identifierReqErr'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPasswordRequest(identifier.trim());
      setSuccessMessage(res.message);
      setDevOtpHint(res.devOtp);
      setMode('forgot-verify');
      setCountdown(60);
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.forgotReqErr'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. HANDLE FORGOT PASSWORD VERIFY & RESET ---
  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();

    if (!otpCode || otpCode.length < 4) {
      setErrorMessage(t('auth.otpReqErr'));
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t('auth.minPasswordLengthErr'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.passwordMismatchErr'));
      return;
    }

    setIsLoading(true);
    try {
      const ok = await forgotPasswordVerify(identifier.trim(), otpCode.trim(), password, confirmPassword);
      if (ok) {
        setSuccessMessage(t('auth.resetSuccessMessage'));
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setOtpCode('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('auth.forgotVerifyErr'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-emerald-900/60 backdrop-blur-md border border-emerald-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        
        {/* Language Selection Selector Bar */}
        <div id="auth-language-selector" className="flex justify-center items-center gap-1.5 mb-5 bg-emerald-950/80 p-1 rounded-xl border border-emerald-700/60 w-fit mx-auto shadow-inner">
          <button
            id="auth-lang-bn-btn"
            type="button"
            onClick={() => setLanguage('bn')}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
              language === 'bn'
                ? 'bg-amber-400 text-emerald-950 shadow-md scale-105'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-800/40'
            }`}
          >
            বাংলা
          </button>
          <button
            id="auth-lang-en-btn"
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-amber-400 text-emerald-950 shadow-md scale-105'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-800/40'
            }`}
          >
            English
          </button>
        </div>

        {/* Top Header/Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <AppLogo className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-amber-500/40 bg-slate-950 flex items-center justify-center" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t('auth.appTitle')}</h1>
          <p className="text-xs text-emerald-200/80 mt-1">{t('auth.loginHeaderSubtitle')}</p>
        </div>

        {/* Global Alert Banners */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ================= MODE 1: LOGIN ================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">
                {t('auth.emailOrPhone')} <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400/70">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={t('auth.emailOrPhonePlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-emerald-200">
                  {t('auth.password')} <span className="text-amber-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    resetAlerts();
                    setMode('forgot');
                  }}
                  className="text-[11px] text-amber-300/90 hover:text-amber-300 underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400/70">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.enterPasswordPlaceholder')}
                  className="w-full pl-10 pr-10 py-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-400/60 hover:text-emerald-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 font-bold rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.login')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-emerald-300/80">{t('auth.noAccount')}{' '}</span>
              <button
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('register');
                }}
                className="text-xs text-amber-300 font-bold hover:underline ml-1"
              >
                {t('auth.createNewAccount')}
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE 2: REGISTER ================= */}
        {mode === 'register' && (
          <RegistrationView
            onSubmit={handleRegistrationViewSubmit}
            onBackToLogin={() => {
              resetAlerts();
              setMode('login');
            }}
            isLoading={isLoading}
            externalError={errorMessage}
          />
        )}

        {/* ================= MODE 3: REGISTER OTP VERIFICATION ================= */}
        {mode === 'register-otp' && (
          <form onSubmit={handleRegisterOtpVerify} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-amber-300">{t('auth.enterOtpTitle')}</h2>
              <p className="text-xs text-emerald-200/80 mt-1">
                <span className="font-mono text-amber-200">{phone || identifier}</span> {t('auth.codeSentTo')}
              </p>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400/60">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full pl-10 pr-4 py-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-xl font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>

            {/* Dev Helper Hint (only visible in development environment) */}
            {import.meta.env.DEV && devOtpHint && (
              <div className="p-2.5 bg-amber-950/80 border border-amber-500/40 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-200">
                <div>
                  <span>{t('auth.testCode')} </span>
                  <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{devOtpHint}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint)}
                  className="px-2.5 py-1 bg-amber-500 text-emerald-950 text-[11px] font-bold rounded hover:bg-amber-400"
                >
                  {t('auth.useCode')}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-emerald-300/80 pt-1">
              <button
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('register');
                }}
                className="flex items-center gap-1 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.editInfo')}
              </button>

              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleResendRegisterCode}
                className={`text-amber-400 font-medium ${
                  countdown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:underline'
                }`}
              >
                {countdown > 0 
                  ? t('auth.resendCodeCountdown').replace('{count}', countdown.toString()) 
                  : t('auth.resendCode')}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 4}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t('auth.verifyAndActivate')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= MODE 4: FORGOT PASSWORD REQUEST ================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-amber-300">{t('auth.forgotTitle')}</h2>
              <p className="text-xs text-emerald-200/80 mt-1">
                {t('auth.forgotSubtitle')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">
                {t('auth.emailOrPhone')} <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400/70">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={t('auth.emailOrPhonePlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 font-bold rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.sendResetCode')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetAlerts();
                  setMode('login');
                }}
                className="text-xs text-emerald-300 hover:text-white flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        )}

        {/* ================= MODE 5: FORGOT PASSWORD VERIFY & RESET ================= */}
        {mode === 'forgot-verify' && (
          <form onSubmit={handleForgotVerify} className="space-y-3.5">
            <div className="text-center mb-1">
              <h2 className="text-sm font-bold text-amber-300">{t('auth.setNewPasswordTitle')}</h2>
              <p className="text-xs text-emerald-200/80 mt-1">{t('auth.setNewPasswordSubtitle')}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">{t('auth.verificationCodeLabel')}</label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="w-full px-4 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            {import.meta.env.DEV && devOtpHint && (
              <div className="p-2 bg-amber-950/80 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-200">
                <span>{t('auth.testCode')} <span className="font-mono font-bold text-amber-300">{devOtpHint}</span></span>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint)}
                  className="px-2 py-0.5 bg-amber-500 text-emerald-950 text-[11px] font-bold rounded"
                >
                  {t('auth.useCode')}
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">{t('auth.newPasswordLabel')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.newPasswordPlaceholder')}
                className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">{t('auth.confirmNewPasswordLabel')}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmNewPasswordPlaceholder')}
                className="w-full px-3 py-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-white placeholder-emerald-400/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 4}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 font-bold rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('auth.setPasswordAndLogin')}</span>
                </>
              )}
            </button>
          </form>
        )}

        {onCancel && (
          <div className="mt-4 text-center border-t border-emerald-800/40 pt-3">
            <button onClick={onCancel} className="text-xs text-emerald-400/70 hover:text-emerald-300">
              {t('auth.goBack')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
