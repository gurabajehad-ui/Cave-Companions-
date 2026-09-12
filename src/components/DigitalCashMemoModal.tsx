import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Receipt,
  X,
  Printer,
  Copy,
  Check,
  Store,
  User as UserIcon,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
  Building2,
  Calendar,
  Phone,
  MapPin,
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { UserRedemptionRecord, Order, TokenType } from '../types';
import { toBnNumber } from '../data/prayerConfig';

interface DigitalCashMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  redemption?: UserRedemptionRecord | any;
  order?: Order | any;
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const DigitalCashMemoModal: React.FC<DigitalCashMemoModalProps> = ({
  isOpen,
  onClose,
  redemption,
  order,
  onShowToast
}) => {
  const [copied, setCopied] = useState(false);
  const memoRef = useRef<HTMLDivElement>(null);

  if (!isOpen || (!redemption && !order)) return null;

  const isRedemption = !!redemption;

  // Format date helper in Bengali
  const formatBnDateTime = (dateStr?: string) => {
    if (!dateStr) return 'তারিখ পাওয়া যায়নি';
    try {
      const d = new Date(dateStr);
      const months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const day = toBnNumber(d.getDate());
      const month = months[d.getMonth()];
      const year = toBnNumber(d.getFullYear());
      
      let hours = d.getHours();
      const minutes = toBnNumber(d.getMinutes().toString().padStart(2, '0'));
      const period = hours >= 12 ? 'বিকাল/রাত' : 'সকাল';
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      const hoursBn = toBnNumber(hours);

      return `${day} ${month}, ${year} • ${period} ${hoursBn}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Calculations for Redemption
  const purchaseAmount = Number(redemption?.purchaseAmount || redemption?.billAmount || 0);
  const discountPercent = Number(redemption?.discountPercentage || redemption?.discountPercent || 0);
  const discountAmount = Number(redemption?.discountAmount || (purchaseAmount * discountPercent) / 100);
  const isDonated = !!redemption?.isDonated;
  const donatedAmount = isDonated ? Number(redemption?.donatedAmount || discountAmount) : 0;
  const finalPayable = isDonated ? purchaseAmount : Math.max(0, purchaseAmount - discountAmount);
  const tokenType: TokenType = redemption?.tokenType || 'GOLD';

  // Calculations for Order
  const orderSubtotal = Number(order?.productTotalOriginal || order?.totalOriginalPrice || order?.totalAmount || 0);
  const deliveryCharge = Number(order?.deliveryCharge || 0);
  const grandTotal = Number(order?.totalPayable || order?.totalCodAmount || order?.grandTotal || 0);
  const orderDiscount = Number(order?.productTotalDiscount || order?.totalTokenDiscount || order?.totalDiscount || 0);
  const couponDiscountAmount = Number(order?.couponDiscountAmount || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let summary = '';
    if (isRedemption) {
      summary = `🧾 [Cave Companions ডিজিটাল ক্যাশ মেমো]\n` +
        `মেমো নং: MEMO-${redemption.id || 'N/A'}\n` +
        `তারিখ: ${formatBnDateTime(redemption.redeemedAt || redemption.createdAt)}\n` +
        `দোকান: ${redemption.shopName || 'পার্টনার শপ'}\n` +
        `গ্রাহক: ${redemption.userName || 'সম্মানিত গ্রাহক'}\n` +
        `মোট বিল: ৳${toBnNumber(purchaseAmount)}\n` +
        `সালাত ডিসকাউন্ট (${toBnNumber(discountPercent)}%): -৳${toBnNumber(discountAmount)}\n` +
        (isDonated ? `মসজিদ ফান্ডে দান: ৳${toBnNumber(donatedAmount)}\n` : '') +
        `পরিশোধযোগ্য বিল: ৳${toBnNumber(finalPayable)}\n` +
        `-- সালাত কায়েম করুন, হালাল বরকত অর্জন করুন --`;
    } else {
      summary = `🧾 [Cave Companions অনলাইন অর্ডার ইনভয়েস]\n` +
        `ইনভয়েস নং: INV-${order.id || 'N/A'}\n` +
        `তারিখ: ${formatBnDateTime(order.createdAt)}\n` +
        `গ্রাহক: ${order.customerName} (${order.customerPhone})\n` +
        `ঠিকানা: ${order.deliveryAddress}, ${order.upazila || ''}, ${order.district || ''}\n` +
        `আইটেম সংখ্যা: ${order.items?.length || 1}টি\n` +
        `পণ্যের মূল্য: ৳${toBnNumber(orderSubtotal)}\n` +
        `ডেলিভারি চার্জ: ৳${toBnNumber(deliveryCharge)}\n` +
        `সর্বমোট প্রদেয় (COD): ৳${toBnNumber(grandTotal)}\n` +
        `-- Cave Companions হালাল মার্কেটপ্লেস --`;
    }

    navigator.clipboard.writeText(summary);
    setCopied(true);
    if (onShowToast) {
      onShowToast('success', 'কপি সম্পন্ন', 'ক্যাশ মেমোর বিবরণ সফলভাবে কপি হয়েছে।');
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-memo, #printable-memo * {
            visibility: visible;
          }
          #printable-memo {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Top Bar (Screen Only) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isRedemption ? 'ডিজিটাল ক্যাশ মেমো' : 'অনলাইন ক্যাশ ইনভয়েস'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isRedemption ? 'অফলাইন পার্টনার শপ লেনদেনের অফিসিয়াল রসিদ' : 'ক্যাশ অন ডেলিভারি (COD) ভেরিফাইড রসিদ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="memo-print-btn"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="প্রিন্ট বা PDF সেভ করুন"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">প্রিন্ট / PDF</span>
            </button>

            <button
              id="memo-copy-btn"
              onClick={handleCopyText}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="মেমোর টেক্সট কপি করুন"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              id="close-memo-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Memo Container */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
          <div
            id="printable-memo"
            ref={memoRef}
            className="bg-white text-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5"
          >
            {/* Header / Brand */}
            <div className="flex items-start justify-between border-b-2 border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <AppLogo className="w-12 h-12 rounded-xl border border-amber-500/30 shrink-0 bg-slate-950 flex items-center justify-center p-0.5" />
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    Cave Companions
                    <ShieldCheck className="w-4 h-4 text-emerald-600 inline shrink-0" />
                  </h1>
                  <p className="text-[11px] font-bold text-amber-600">
                    {isRedemption ? 'অফলাইন পার্টনার শপ ডিজিটাল ক্যাশ মেমো' : 'অনলাইন ক্যাশ অন ডেলিভারি (COD) ইনভয়েস'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    হালাল জীবন ও বরকতময় কেনাকাটার প্ল্যাটফর্ম
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-md uppercase tracking-wider mb-1 border border-emerald-200">
                  ভেরিফাইড রসিদ
                </span>
                <p className="text-[11px] font-bold text-slate-700">
                  রসিদ নং: #{toBnNumber(isRedemption ? (redemption.id?.slice(0, 10) || 'N/A') : (order.id?.slice(0, 10) || 'N/A'))}
                </p>
              </div>
            </div>

            {/* Date & Meta Info Row */}
            <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <p className="text-slate-500 font-medium">ইস্যু তারিখ ও সময়:</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {formatBnDateTime(isRedemption ? (redemption.redeemedAt || redemption.createdAt) : order.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-medium">পেমেন্ট মেথড:</p>
                <p className="font-bold text-emerald-700 mt-0.5">
                  {isRedemption ? 'দোকানে সরাসরি নগদ (Cash at Shop)' : 'ক্যাশ অন ডেলিভারি (COD)'}
                </p>
              </div>
            </div>

            {/* Customer & Merchant/Delivery Details Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Customer Info */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1 pb-1 border-b border-slate-200">
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>সম্মানিত গ্রাহকের বিবরণ</span>
                </div>
                <p className="font-bold text-slate-900 text-sm">
                  {isRedemption ? (redemption.userName || 'সম্মানিত গ্রাহক') : (order.customerName || 'সম্মানিত গ্রাহক')}
                </p>
                <p className="text-slate-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {isRedemption ? toBnNumber(redemption.userPhone || 'N/A') : toBnNumber(order.customerPhone || 'N/A')}
                </p>
                {!isRedemption && order.deliveryAddress && (
                  <p className="text-slate-600 flex items-start gap-1 text-[11px] mt-1 leading-snug">
                    <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                    <span>{order.deliveryAddress}, {order.upazila ? `${order.upazila}, ` : ''}{order.district || ''}</span>
                  </p>
                )}
              </div>

              {/* Shop / Partner Info */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1 pb-1 border-b border-slate-200">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isRedemption ? 'পার্টনার শপ বিবরণ' : 'মার্কেটপ্লেস অর্ডার তথ্য'}</span>
                </div>
                {isRedemption ? (
                  <>
                    <p className="font-bold text-slate-900 text-sm">
                      {redemption.shopName || 'পার্টনার শপ'}
                    </p>
                    {redemption.shopAddress && (
                      <p className="text-slate-600 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {redemption.shopAddress}
                      </p>
                    )}
                    {redemption.earnedMosqueName && (
                      <p className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1 pt-0.5">
                        <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        মসজিদ: {redemption.earnedMosqueName}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-sm">Cave Companions Marketplace</p>
                    <p className="text-slate-600 text-[11px]">
                      অর্ডার স্ট্যাটাস:{' '}
                      <span className="font-bold text-emerald-700">
                        {order.status === 'PENDING' ? 'অপেক্ষারত' : order.status === 'DELIVERED' ? 'ডেলিভারি সম্পন্ন' : order.status}
                      </span>
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      মোট আইটেম: {toBnNumber(order.items?.length || 1)}টি
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Items / Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">বিবরণ / আইটেম</th>
                    <th className="p-2.5 text-center">পরিমাণ</th>
                    <th className="p-2.5 text-right">মূল্য (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {isRedemption ? (
                    <>
                      <tr>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">দোকান থেকে কেনাকাটা (Offline Purchase)</p>
                          <p className="text-[11px] text-slate-500">
                            ব্যবহৃত সালাত টোকেন: {tokenType === 'GOLD' ? '🥇 গোল্ড (১৫% ছাড়)' : tokenType === 'SILVER' ? '🥈 সিলভার (১০% ছাড়)' : '🥉 ব্রোঞ্জ (৭% ছাড়)'}
                          </p>
                        </td>
                        <td className="p-2.5 text-center">১টি বিল</td>
                        <td className="p-2.5 text-right font-bold">৳{toBnNumber(purchaseAmount)}</td>
                      </tr>
                    </>
                  ) : (
                    order.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{item.productName || item.name || 'পণ্য'}</p>
                          {item.shopName && (
                            <p className="text-[10px] text-slate-500">বিক্রেতা: {item.shopName}</p>
                          )}
                        </td>
                        <td className="p-2.5 text-center">{toBnNumber(item.quantity || 1)}</td>
                        <td className="p-2.5 text-right font-semibold">
                          ৳{toBnNumber((item.unitPrice || item.price || 0) * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              {isRedemption ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>মূল বিলের পরিমাণ:</span>
                    <span className="font-bold text-slate-800">৳{toBnNumber(purchaseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      সালাত রিওয়ার্ড ডিসকাউন্ট ({toBnNumber(discountPercent)}%):
                    </span>
                    <span>- ৳{toBnNumber(discountAmount)}</span>
                  </div>

                  {isDonated && (
                    <div className="flex justify-between text-amber-700 font-semibold bg-amber-50/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="flex items-center gap-1">
                        <HeartHandshake className="w-3.5 h-3.5" />
                        মসজিদ ফান্ডে অনুদান (Donated):
                      </span>
                      <span>+ ৳{toBnNumber(donatedAmount)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>দোকানে নগদ প্রদেয় সর্বমোট:</span>
                    <span className="text-base text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">
                      ৳{toBnNumber(finalPayable)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>পণ্যের সাবটোটাল:</span>
                    <span className="font-bold text-slate-800">৳{toBnNumber(orderSubtotal)}</span>
                  </div>
                  {orderDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>টোকেন ডিসকাউন্ট ছাড়:</span>
                      <span>- ৳{toBnNumber(orderDiscount)}</span>
                    </div>
                  )}
                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>কুপন ডিসকাউন্ট ছাড় ({order?.couponCode || 'কুপন'}):</span>
                      <span>- ৳{toBnNumber(couponDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>হোম ডেলিভারি চার্জ:</span>
                    <span className="font-bold text-slate-800">৳{toBnNumber(deliveryCharge)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                    <span>ক্যাশ অন ডেলিভারি (COD) মোট প্রদেয়:</span>
                    <span className="text-base text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">
                      ৳{toBnNumber(grandTotal)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Official Footer / Seal */}
            <div className="border-t-2 border-dashed border-slate-200 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-slate-500">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-700">
                  ডিজিটাল সিস্টেম জেনারেটেড মেমো • কোনো স্বাক্ষরের প্রয়োজন নেই
                </p>
                <p className="text-[10px]">
                  সালাত আদায় করুন, সাশ্রয়ী কেনাকাটায় হালাল বরকত উপভোগ করুন।
                </p>
              </div>

              <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 text-center shrink-0">
                <div className="font-mono text-[9px] tracking-widest text-slate-600 uppercase">
                  VERIFIED • {isRedemption ? 'REDEEMED' : 'COD_ORDER'}
                </div>
                <div className="text-[9px] font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cave Companions
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0 no-print">
          <p className="text-xs text-slate-400 hidden sm:block">
            প্রিন্ট বাটনে ক্লিক করে রসিদটি প্রিন্ট বা PDF আকারে সেভ করুন
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট / PDF মেমো
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
