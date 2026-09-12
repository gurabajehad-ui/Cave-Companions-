import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Store,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Receipt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  Check,
  ChevronDown,
  Camera,
  RefreshCw,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { PartnerShop, UserToken, UserRedemptionRecord, TokenType, TokenRedemptionRequest } from '../types';
import { toBnNumber } from '../data/prayerConfig';
import { ErrorBoundary } from './ErrorBoundary';
import { DigitalCashMemoModal } from './DigitalCashMemoModal';

interface ShopRedemptionModalProps {
  shop?: PartnerShop | null;
  initialToken?: UserToken | null;
  availableTokens: UserToken[];
  onClose: () => void;
  onSuccess: (redemption: UserRedemptionRecord) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onNavigateToMarket?: () => void;
}

export const ShopRedemptionModal: React.FC<ShopRedemptionModalProps> = (props) => {
  return (
    <ErrorBoundary>
      <ShopRedemptionModalContent {...props} />
    </ErrorBoundary>
  );
};

const ShopRedemptionModalContent: React.FC<ShopRedemptionModalProps> = ({
  shop,
  initialToken,
  availableTokens,
  onClose,
  onSuccess,
  onShowToast,
  onNavigateToMarket
}) => {
  const [selectedToken, setSelectedToken] = useState<UserToken | null>(
    initialToken || (availableTokens.length > 0 ? availableTokens[0] : null)
  );

  const handleOpenCaveMarket = async () => {
    await stopCameraSafely();
    onClose();
    if (onNavigateToMarket) {
      onNavigateToMarket();
    } else if ((window as any).setAppActiveTab) {
      (window as any).setAppActiveTab('market');
    }
    window.location.hash = '#market';
  };

  useEffect(() => {
    if (!selectedToken && availableTokens.length > 0) {
      setSelectedToken(initialToken || availableTokens[0]);
    }
  }, [availableTokens, initialToken, selectedToken]);

  const [purchaseAmount, setPurchaseAmount] = useState<string>('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<UserRedemptionRecord | null>(null);
  const [showDigitalMemo, setShowDigitalMemo] = useState(false);

  // Redemption flow state: SCANNING -> VERIFYING -> FORM -> PENDING_APPROVAL -> (COMPLETED | REJECTED | ERROR)
  const [redemptionStep, setRedemptionStep] = useState<
    'SCANNING' | 'VERIFYING' | 'ERROR' | 'FORM' | 'PENDING_APPROVAL' | 'REJECTED' | 'COMPLETED'
  >('SCANNING');

  const [activeRequest, setActiveRequest] = useState<TokenRedemptionRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [detectedShop, setDetectedShop] = useState<PartnerShop | null>(null);
  const [isVerifyingShop, setIsVerifyingShop] = useState(false);
  const [verificationErrorMsg, setVerificationErrorMsg] = useState<string>('এই QR কোডটি কোনো বৈধ Cave Companions পার্টনার শপের QR কোড নয়।');

  // Camera scanner state
  const [showCameraScanner, setShowCameraScanner] = useState(true); // Always show scanner initially
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const shopScannerContainerId = 'shop-qr-scanner-container';

  // Fallback for manual entry if camera fails
  const [manualQrInput, setManualQrInput] = useState<string>('');

  const stopCameraSafely = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Safe stop camera warning:', err);
      }
      html5QrCodeRef.current = null;
    }
  };

  // Start / Stop camera scanner
  useEffect(() => {
    let isMounted = true;

    if (showCameraScanner && redemptionStep === 'SCANNING') {
      setCameraError(null);
      const startCamera = async () => {
        try {
          await stopCameraSafely();
          if (!isMounted) return;

          const html5QrCode = new Html5Qrcode(shopScannerContainerId);
          html5QrCodeRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
            (decodedText) => {
              if (isMounted) {
                setShowCameraScanner(false);
                handleVerifyQr(decodedText);
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.warn('Shop camera start error:', err);
          if (isMounted) {
            setCameraError('ক্যামেরা চালু করা যায়নি। ক্যামেরার পারমিশন নিশ্চিত করুন অথবা নিচের টেক্সট বক্স ব্যবহার করুন।');
          }
        }
      };

      // Slight delay for container rendering
      const timer = setTimeout(startCamera, 300);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopCameraSafely();
      };
    } else {
      stopCameraSafely();
    }
  }, [showCameraScanner, redemptionStep]);

  // Real-time polling for Merchant Approval when in PENDING_APPROVAL step
  useEffect(() => {
    if (redemptionStep !== 'PENDING_APPROVAL' || !activeRequest?.id) return;

    let isPollingActive = true;

    const pollInterval = setInterval(async () => {
      if (!isPollingActive) return;
      try {
        const res = await api.getRedemptionRequest(activeRequest.id);
        if (!isPollingActive || !res.success || !res.request) return;

        const currentStatus = res.request.status;
        if (currentStatus === 'APPROVED') {
          if (res.request.redemption) {
            setCompletedReceipt(res.request.redemption);
            onSuccess(res.request.redemption);
          }
          setRedemptionStep('COMPLETED');
          onShowToast('success', 'মার্চেন্ট অনুমোদন সম্পন্ন!', 'দোকানদার আপনার টোকেন অফার অনুমোদন করেছেন।');
        } else if (currentStatus === 'REJECTED') {
          setRejectionReason(res.request.rejectionReason || 'দোকানদার কর্তৃক অনুরোধটি প্রত্যাখ্যান করা হয়েছে।');
          setRedemptionStep('REJECTED');
          onShowToast('error', 'অনুরোধ প্রত্যাখ্যাত', 'দোকানদার অনুরোধটি প্রত্যাখ্যান করেছেন। আপনার টোকেন অক্ষত রয়েছে।');
        } else if (currentStatus === 'EXPIRED') {
          setVerificationErrorMsg('অনুরোধটির ১৫ মিনিটের সময়সীমা পার হয়ে গেছে। আপনার টোকেন অক্ষত রয়েছে।');
          setRedemptionStep('ERROR');
          onShowToast('error', 'সময়সীমা অতিক্রান্ত', 'অনুরোধের সময়সীমা অতিক্রান্ত হয়েছে।');
        } else if (currentStatus === 'CANCELLED') {
          setRedemptionStep('FORM');
          onShowToast('info', 'অনুরোধ বাতিল', 'অনুরোধটি বাতিল করা হয়েছে।');
        }
      } catch (err) {
        console.warn('Polling redemption request status error:', err);
      }
    }, 2500);

    return () => {
      isPollingActive = false;
      clearInterval(pollInterval);
    };
  }, [redemptionStep, activeRequest?.id, onSuccess, onShowToast]);

  const handleVerifyQr = async (payloadToVerify: string) => {
    await stopCameraSafely();
    setShowCameraScanner(false);

    console.log('[TRACE] handleVerifyQr payloadToVerify:', payloadToVerify);

    if (!payloadToVerify || !payloadToVerify.trim()) {
      setVerificationErrorMsg('ভুল বা অকার্যকর দোকানের QR কোড স্ক্যান করা হয়েছে। অনুগ্রহ করে সঠিক দোকানের QR কোড স্ক্যান করুন।');
      setRedemptionStep('ERROR');
      onShowToast('error', 'ত্রুটি', 'ভুল বা অকার্যকর দোকানের QR কোড স্ক্যান করা হয়েছে।');
      return;
    }
    try {
      setIsVerifyingShop(true);
      setRedemptionStep('VERIFYING');
      const res = await api.verifyShopQr(payloadToVerify.trim());
      console.log('[TRACE] api.verifyShopQr response:', JSON.stringify(res, null, 2));

      if (res && res.success === true && res.shop && res.verificationId && res.shop.id) {
        setDetectedShop(res.shop);
        setVerificationId(res.verificationId);
        setRedemptionStep('FORM');
        onShowToast('success', 'দোকান শনাক্ত হয়েছে', `${res.shop.nameBn || res.shop.name} শনাক্ত করা হয়েছে।`);
      } else {
        console.warn('[TRACE] verifyShopQr validation failed on response:', res);
        throw new Error(res?.message || 'এই QR কোডটি কোনো বৈধ Cave Companions পার্টনার শপের QR কোড নয়।');
      }
    } catch (err: any) {
      console.error('[TRACE] Verify QR error caught:', err);
      const isNetworkError = err.message?.includes('নেটওয়ার্ক') || err.message?.includes('সার্ভার') || err.message?.includes('সাড়া');
      const errorMsg = isNetworkError
        ? 'QR কোড যাচাই করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
        : (err.message || 'এই QR কোডটি কোনো বৈধ Cave Companions পার্টনার শপের QR কোড নয়।');

      setVerificationErrorMsg(errorMsg);
      setDetectedShop(null);
      setVerificationId(null);
      setRedemptionStep('ERROR');
      onShowToast('error', 'ত্রুটি', errorMsg);
    } finally {
      setIsVerifyingShop(false);
    }
  };

  // Discount percentage helper
  const getDiscountPercentage = (tokenType: TokenType, targetShop: PartnerShop | null): number => {
    if (!targetShop) return 0;
    if (tokenType === 'GOLD') return targetShop.goldDiscount;
    if (tokenType === 'SILVER') return targetShop.silverDiscount;
    if (tokenType === 'BRONZE') return targetShop.bronzeDiscount;
    return 0;
  };

  const amountNum = Math.max(0, parseFloat(purchaseAmount) || 0);
  const currentDiscountPct = selectedToken ? getDiscountPercentage(selectedToken.tokenType, detectedShop) : 0;
  const isSelectedTokenDonated = !!selectedToken?.isDonated;
  const customerDiscountPct = isSelectedTokenDonated ? 0 : currentDiscountPct;
  const calculatedDiscountAmount = Math.round((amountNum * customerDiscountPct) / 100);
  const finalPayable = Math.max(0, amountNum - calculatedDiscountAmount);
  const donationAmount = isSelectedTokenDonated ? Math.round((amountNum * currentDiscountPct) / 100) : 0;

  /**
   * User confirms token offer -> Creates PENDING REDEMPTION REQUEST requiring Merchant Approval
   */
  const handleSubmitRedemption = async () => {
    const currentAmountNum = Math.max(0, parseFloat(purchaseAmount) || 0);

    if (!selectedToken) {
      onShowToast('error', 'টোকেন নির্বাচন করুন', 'অনুগ্রহ করে একটি ব্যবহারযোগ্য টোকেন নির্বাচন করুন।');
      return;
    }

    if (!verificationId) {
      onShowToast('error', 'QR স্ক্যান আবশ্যক', 'টোকেন রিডিম করতে আগে সঠিক দোকানের QR কোড স্ক্যান করতে হবে।');
      setRedemptionStep('SCANNING');
      return;
    }

    if (currentAmountNum <= 0) {
      onShowToast('error', 'ভুল পরিমাণ', 'অনুগ্রহ করে ক্রয়ের পরিমাণ (টাকা) প্রদান করুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.requestTokenRedemption(selectedToken.id, verificationId, currentAmountNum);

      if (res.success && res.request) {
        setActiveRequest(res.request);
        setRedemptionStep('PENDING_APPROVAL');
        onShowToast('success', 'অনুরোধ পাঠানো হয়েছে', 'দোকানের অনুমোদনের জন্য অপেক্ষা করুন।');
      } else {
        throw new Error(res.message || 'টোকেন অফার রিকোয়েস্ট পাঠানো সম্ভব হয়নি।');
      }
    } catch (err: any) {
      console.error('Redemption request error:', err);
      onShowToast('error', 'অনুরোধ ব্যর্থ', err.message || 'টোকেন অফার রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে।');
      if (err.error === 'QR_VERIFICATION_INVALID') {
        setVerificationId(null);
        setRedemptionStep('SCANNING');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * User cancels their pending request
   */
  const handleCancelRequest = async () => {
    if (!activeRequest?.id) return;
    try {
      setIsCancelling(true);
      const res = await api.cancelRedemptionRequest(activeRequest.id);
      if (res.success) {
        setActiveRequest(null);
        setRedemptionStep('FORM');
        onShowToast('info', 'অনুরোধ বাতিল করা হয়েছে', 'আপনার টোকেন অক্ষত রয়েছে এবং পুনরায় ব্যবহারযোগ্য।');
      } else {
        throw new Error(res.message || 'অনুরোধ বাতিল করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      console.error('Cancel request error:', err);
      onShowToast('error', 'ত্রুটি', err.message || 'অনুরোধ বাতিল করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsCancelling(false);
    }
  };

  const getTokenTierLabel = (type: TokenType) => {
    switch (type) {
      case 'GOLD':
        return { name: 'গোল্ড টোকেন', icon: '🥇', color: 'text-amber-300', bg: 'from-amber-900/60 to-yellow-900/40 border-amber-500/50' };
      case 'SILVER':
        return { name: 'সিলভার টোকেন', icon: '🥈', color: 'text-slate-200', bg: 'from-slate-800/60 to-slate-900/40 border-slate-400/50' };
      case 'BRONZE':
        return { name: 'ব্রোঞ্জ টোকেন', icon: '🥉', color: 'text-amber-500', bg: 'from-amber-950/60 to-orange-950/40 border-amber-700/50' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 relative my-auto max-h-[90vh] overflow-y-auto"
      >
        {/* If Completed Receipt Screen */}
        {redemptionStep === 'COMPLETED' && completedReceipt ? (
          <div className="space-y-6 text-center py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                Redemption Successful
              </span>
              <h3 className="text-xl font-black text-white pt-1">
                টোকেন রিডেম্পশন রসিদ (Receipt)
              </h3>
              <p className="text-xs text-slate-300">
                পার্টনার শপে সফলভাবে ছাড় গ্রহণ করা হয়েছে
              </p>
            </div>

            {/* Receipt Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 text-left space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">দোকানের নাম</span>
                  <span className="font-bold text-white text-sm font-sans">{completedReceipt.shopName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">রসিদ নম্বর</span>
                  <span className="font-bold text-amber-400">{completedReceipt.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-1">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ব্যবহৃত টোকেন</span>
                  <span className="font-bold text-amber-300 font-sans">
                    {completedReceipt.tokenType} TOKEN ({toBnNumber(completedReceipt.discountPercentage)}% ছাড়)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">তারিখ ও সময়</span>
                  <span className="text-slate-300 font-sans text-[11px]">
                    {new Date(completedReceipt.createdAt).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="space-y-2 pt-3 border-t border-slate-800 font-sans">
                <div className="flex justify-between text-slate-300">
                  <span>মোট ক্রয়ের পরিমাণ:</span>
                  <span className="font-bold">৳ {toBnNumber(completedReceipt.purchaseAmount)}</span>
                </div>
                {completedReceipt.isDonated ? (
                  <div className="flex justify-between text-rose-400 font-semibold">
                    <span>কল্যাণ তহবিলে দানকৃত ({toBnNumber(completedReceipt.discountPercentage)}%):</span>
                    <span>৳ {toBnNumber(completedReceipt.donatedAmount || 0)} ❤️</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>টোকেন ডিসকাউন্ট ({toBnNumber(completedReceipt.discountPercentage)}%):</span>
                    <span>- ৳ {toBnNumber(completedReceipt.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>পরিশোধযোগ্য বিল (Final Payable):</span>
                  <span className="text-amber-400 font-black text-base">৳ {toBnNumber(completedReceipt.finalPayableAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200/90 leading-relaxed text-left">
              <strong>বিশেষ নিয়ম:</strong> আপনার টোকেন রিডিম সফল হয়েছে! ওয়ালেটে আরও ব্যবহারযোগ্য টোকেন থাকলে আপনি আজই ব্যবহার করতে পারবেন।
            </div>

            <div className="space-y-2">
              <button
                id="receipt-memo-btn"
                type="button"
                onClick={() => setShowDigitalMemo(true)}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                📄 ডিজিটাল ক্যাশ মেমো দেখুন (View Cash Memo)
              </button>

              <button
                id="receipt-done-btn"
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                সম্পন্ন (Done)
              </button>
            </div>
          </div>
        ) : redemptionStep === 'PENDING_APPROVAL' && activeRequest ? (
          /* Step: PENDING_APPROVAL (Merchant Approval Gate) */
          <div className="space-y-6 text-center py-2">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-amber-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Store className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase animate-pulse">
                মার্চেন্ট অনুমোদনের অপেক্ষায় (Pending Approval)
              </span>
              <h3 className="text-xl font-black text-white pt-1">
                দোকানদারের অনুমোদনের জন্য অপেক্ষা করুন
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                আপনার অনুরোধটি <strong className="text-amber-300">{activeRequest.shopName}</strong> এ পাঠানো হয়েছে। দোকানদার বিল ও টোকেন অফার অনুমোদন করলেই ছাড়টি চূড়ান্ত হবে।
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 text-left space-y-3.5 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">দোকান</span>
                  <span className="font-bold text-white text-sm">{activeRequest.shopName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">টোকেন</span>
                  <span className="font-bold text-amber-300">{activeRequest.tokenType} TOKEN</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>মোট ক্রয়ের পরিমাণ:</span>
                  <span className="font-bold">৳ {toBnNumber(activeRequest.purchaseAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>টোকেন ছাড় ({toBnNumber(activeRequest.discountPercentage)}%):</span>
                  <span>- ৳ {toBnNumber(activeRequest.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-slate-800">
                  <span>চূড়ান্ত পরিশোধযোগ্য বিল:</span>
                  <span className="text-amber-400 font-black text-base">
                    ৳ {toBnNumber(activeRequest.finalPayableAmount)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                🛡️ <strong>টোকেন নিরাপত্তা নিশ্চয়তা:</strong> দোকানদার অনুমোদন না দেওয়া পর্যন্ত আপনার টোকেন ব্যবহার হবে না। যেকোনো কারণে বাতিল বা প্রত্যাখ্যাত হলে আপনার টোকেন সম্পূর্ণ অক্ষত থাকবে।
              </div>
            </div>

            {/* Cancel Button */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={isCancelling}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 disabled:opacity-50"
              >
                {isCancelling ? (
                  <span>বাতিল করা হচ্ছে...</span>
                ) : (
                  <span>অনুরোধ বাতিল করুন (Cancel Request)</span>
                )}
              </button>
            </div>
          </div>
        ) : redemptionStep === 'REJECTED' ? (
          /* Step: REJECTED */
          <div className="space-y-6 text-center py-2">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                Request Rejected
              </span>
              <h3 className="text-xl font-black text-white pt-1">
                অনুরোধটি দোকানদার কর্তৃক প্রত্যাখ্যাত হয়েছে
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {rejectionReason || 'দোকানদার এই মুহূর্তে অফারটি অনুমোদন করতে পারেননি।'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>আপনার টোকেন অক্ষত রয়েছে!</span>
              </div>
              <p className="text-[11px] text-slate-300">
                কোনো পয়েন্ট বা টোকেন কাটা হয়নি। আপনি পরবর্তীতে যেকোনো সময় এই টোকেনটি ব্যবহার করতে পারবেন।
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setRedemptionStep('FORM');
                  setActiveRequest(null);
                  setRejectionReason(null);
                }}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-xl active:scale-95 transition-all"
              >
                আবার চেষ্টা করুন (Try Again)
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        ) : redemptionStep === 'ERROR' ? (
          /* Error Screen for Invalid QR */
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                অকার্যকর QR কোড (Invalid QR)
              </span>
              <h3 className="text-base font-bold text-white px-2 leading-relaxed">
                {verificationErrorMsg}
              </h3>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  setRedemptionStep('SCANNING');
                  setShowCameraScanner(true);
                  setManualQrInput('');
                }}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>আবার স্ক্যান করুন (Scan Again)</span>
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                বাতিল করুন (Cancel)
              </button>
            </div>
          </div>
        ) : redemptionStep === 'VERIFYING' ? (
          /* Verifying Screen */
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-amber-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <QrCode className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">দোকান যাচাই করা হচ্ছে...</h3>
              <p className="text-sm text-slate-400">অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন।</p>
            </div>
          </div>
        ) : redemptionStep === 'SCANNING' ? (
          /* Scanning Screen */
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">QR কোড স্ক্যান করুন</h3>
                  <p className="text-[11px] text-slate-400">পার্টনার শপের QR কোড স্ক্যান করুন</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-3xl space-y-4">
              <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border-2 border-slate-700 bg-black shadow-inner">
                <div id={shopScannerContainerId} className="w-full h-full" />
                <div className="absolute inset-0 border-2 border-amber-500/30 pointer-events-none rounded-2xl" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-amber-500/50 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              </div>

              {cameraError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <p className="text-[10px] text-rose-400 leading-relaxed">{cameraError}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">অথবা আইডি লিখুন</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualQrInput}
                    onChange={(e) => setManualQrInput(e.target.value)}
                    placeholder="দোকান আইডি বা QR টেক্সট"
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                  />
                  <button
                    onClick={() => handleVerifyQr(manualQrInput)}
                    disabled={!manualQrInput.trim() || isVerifyingShop}
                    className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-extrabold transition-all active:scale-95 shadow-lg"
                  >
                    যাচাই
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              পিছনে যান (Back)
            </button>
          </div>
        ) : (
          /* Redemption Input Form (Step: FORM) */
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    টোকেন ব্যবহার করুন (Redeem Token)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    পার্টনার শপে ডিসকাউন্ট গ্রহণ করুন
                  </p>
                </div>
              </div>

              <button
                id="close-redemption-modal-btn"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shop Information Card */}
            {detectedShop && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-white text-sm">
                      {detectedShop.nameBn || detectedShop.name}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ACTIVE PARTNER
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {detectedShop.address}, {detectedShop.area}, {detectedShop.district}
                </p>

                {/* Available Discounts in this shop */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] text-center">
                  <div className="p-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                    <span className="text-amber-300 font-extrabold block">🥇 {toBnNumber(detectedShop.goldDiscount)}%</span>
                    <span className="text-[10px] text-slate-400">গোল্ড ছাড়</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-slate-200 font-extrabold block">🥈 {toBnNumber(detectedShop.silverDiscount)}%</span>
                    <span className="text-[10px] text-slate-400">সিলভার ছাড়</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-amber-950/20 border border-amber-800/40">
                    <span className="text-amber-400 font-extrabold block">🥉 {toBnNumber(detectedShop.bronzeDiscount)}%</span>
                    <span className="text-[10px] text-slate-400">ব্রোঞ্জ ছাড়</span>
                  </div>
                </div>
              </div>
            )}

            {/* Token Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>ব্যবহারের জন্য Token নির্বাচন করুন:</span>
                <span className="text-[11px] text-amber-400 font-normal">
                  {toBnNumber(availableTokens.length)} টি ব্যবহারযোগ্য
                </span>
              </label>

              {availableTokens.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                  আপনার কোনো সক্রিয় AVAILABLE টোকেন নেই।
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {availableTokens.map((token) => {
                    const tier = getTokenTierLabel(token.tokenType);
                    const isSelected = selectedToken?.id === token.id;
                    const discount = detectedShop ? getDiscountPercentage(token.tokenType, detectedShop) : 0;

                    return (
                      <button
                        key={token.id}
                        id={`select-token-option-${token.id}`}
                        type="button"
                        onClick={() => setSelectedToken(token)}
                        className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? `bg-gradient-to-r ${tier.bg} border-amber-400 ring-2 ring-amber-400/30`
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{tier.icon}</span>
                          <div>
                            <span className={`text-xs font-extrabold ${tier.color} flex items-center gap-1.5 flex-wrap`}>
                              {tier.name}
                              {token.isDonated && (
                                <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[9px] font-black rounded border border-rose-500/40 animate-pulse">
                                  দান করার জন্য বাছাইকৃত
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ID: {token.id} • অর্জিত: {token.earnedDate}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-emerald-400 block">
                            {token.isDonated ? 'দান হবে' : `${toBnNumber(discount)}% ছাড়`}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-amber-300 font-bold flex items-center gap-0.5 justify-end">
                              <Check className="w-3 h-3" /> নির্বাচিত
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Purchase Amount Input & Live Calculation */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  মোট ক্রয়ের পরিমাণ (৳ Purchase Amount)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                    ৳
                  </span>
                  <input
                    id="purchase-amount-input"
                    type="number"
                    min="1"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="টাকার পরিমাণ লিখুন"
                    className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-white font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Fair Price Warning in Red with Cave Market Link */}
                <div className="mt-2 flex items-center justify-between gap-1 text-[11.5px] text-rose-400 font-semibold px-0.5">
                  <span className="flex items-center gap-1 text-rose-400">
                    <span>💡</span>
                    <span>পণ্য কেনার আগে পণ্যের ন্যায্য মূল্য যাচাই করুন</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCaveMarket}
                    className="text-rose-400 hover:text-rose-300 font-bold underline underline-offset-2 hover:no-underline inline-flex items-center gap-0.5 cursor-pointer shrink-0 transition"
                    title="কেভ মার্কেটে যান"
                  >
                    <span>(কেভ মার্কেট)</span>
                  </button>
                </div>
              </div>

              {/* Instant Calculation Preview */}
              {amountNum > 0 && selectedToken && (
                <div className="space-y-2">
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>ক্রয়ের পরিমাণ:</span>
                      <span className="font-bold">৳ {toBnNumber(amountNum)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>
                        টোকেন ছাড় ({toBnNumber(customerDiscountPct)}% {selectedToken.tokenType}):
                      </span>
                      <span>- ৳ {toBnNumber(calculatedDiscountAmount)}</span>
                    </div>
                    {isSelectedTokenDonated && (
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>কল্যাণ তহবিলে দানকৃত ({toBnNumber(currentDiscountPct)}%):</span>
                        <span>৳ {toBnNumber(donationAmount)} ❤️</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-slate-800">
                      <span>চূড়ান্ত পরিশোধযোগ্য বিল:</span>
                      <span className="text-amber-400 font-black text-base">
                        ৳ {toBnNumber(finalPayable)}
                      </span>
                    </div>
                  </div>
                  {isSelectedTokenDonated && (
                    <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/20 text-[10px] text-rose-300 font-bold flex items-start gap-1.5 leading-relaxed">
                      <span>❤️</span>
                      <span>এই টোকেনটি ব্যবহার করলে ডিসকাউন্ট সরাসরি মসজিদ কল্যাণ তহবিলে চলে যাবে (আপনি রেগুলার মূল্যে পণ্য কিনবেন)।</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                id="confirm-token-redemption-btn"
                type="button"
                onClick={handleSubmitRedemption}
                disabled={isSubmitting || !selectedToken || amountNum <= 0}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-sm shadow-xl hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2 text-white">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>অনুরোধ পাঠানো হচ্ছে...</span>
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-slate-950" />
                    <span>অনুমোদনের অনুরোধ পাঠান (Send for Approval)</span>
                  </>
                )}
              </button>

              <button
                id="cancel-redemption-btn"
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                বাতিল করুন (Cancel)
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* Digital Cash Memo Modal */}
      {showDigitalMemo && completedReceipt && (
        <DigitalCashMemoModal
          isOpen={showDigitalMemo}
          onClose={() => setShowDigitalMemo(false)}
          redemption={completedReceipt}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
