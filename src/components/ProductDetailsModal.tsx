import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  X,
  MessageSquare,
  Send,
  Trash2,
  Store,
  MapPin,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Award,
  Check,
  FileText
} from 'lucide-react';
import { Product, User } from '../types';
import { api } from '../services/api';
import { toBnNumber } from '../data/prayerConfig';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: (Product & {
    goldDiscount?: number;
    silverDiscount?: number;
    bronzeDiscount?: number;
  }) | null;
  currentUser?: User | null;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onBuyClick: (product: any) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
  currentUser,
  onShowToast,
  onBuyClick
}) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Review form state
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product?.id) {
      loadReviews();
      setSelectedImage(product.imageUrl || (product.gallery && product.gallery.length > 0 ? product.gallery[0] : null));
    }
  }, [isOpen, product?.id]);

  const loadReviews = async () => {
    if (!product?.id) return;
    try {
      setIsLoading(true);
      const res = await api.getProductReviews(product.id);
      if (res.success) {
        setReviews(res.reviews || []);
        setAverageRating(res.averageRating || 0);
        setTotalReviews(res.totalReviews || 0);
        setRatingDistribution(res.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

        if (currentUser) {
          const myRev = (res.reviews || []).find((r: any) => r.userId === currentUser.id);
          if (myRev) {
            setUserRating(myRev.rating);
            setComment(myRev.comment);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load product reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasToken = localStorage.getItem('cave_companions_auth_token');
    if (!currentUser && !hasToken) {
      onShowToast('error', 'লগইন প্রয়োজন', 'রিভিউ দিতে অনুগ্রহ করে আগে লগইন করুন।');
      return;
    }

    if (!comment.trim()) {
      onShowToast('error', 'মন্তব্য লিখুন', 'দয়া করে আপনার মন্তব্য বা রিভিউ লিখুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.submitProductReview(product.id, userRating, comment.trim());
      if (res.success) {
        onShowToast('success', 'সফল', res.message || 'আপনার রিভিউ সফলভাবে সংরক্ষিত হয়েছে।');
        await loadReviews();
        setComment('');
      }
    } catch (err: any) {
      console.error('Error submitting product review:', err);
      onShowToast('error', 'ব্যর্থ', err.message || 'রিভিউ সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই রিভিউটি মুছে ফেলতে চান?')) return;
    try {
      setDeletingReviewId(reviewId);
      const res = await api.deleteProductReview(product.id, reviewId);
      if (res.success) {
        onShowToast('success', 'মুছে ফেলা হয়েছে', res.message || 'রিভিউ মুছে ফেলা হয়েছে।');
        await loadReviews();
      }
    } catch (err: any) {
      onShowToast('error', 'ব্যর্থ', err.message || 'রিভিউ মুছতে সমস্যা হয়েছে।');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const maxDiscount = Math.max(product.goldDiscount || 0, product.silverDiscount || 0, product.bronzeDiscount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/75 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">পণ্যের বিস্তারিত ও রিভিউ</h3>
              <p className="text-[11px] text-slate-400">কেভ মার্কেট পার্টনার শপ পণ্য</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Image Gallery Section */}
          <div className="space-y-3">
            <div className="aspect-square sm:aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-inner">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-contain p-2"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ShoppingBag className="w-12 h-12 text-slate-700" />
              )}
              
              <div className="absolute top-3 right-3">
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg shadow-lg ${product.isAvailable ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                  {product.isAvailable ? 'স্টকে আছে' : 'অনুপলব্ধ'}
                </span>
              </div>
            </div>
            
            {/* Gallery Thumbnails */}
            {product.gallery && product.gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {product.gallery.map((url, idx) => (
                  <button 
                    key={`${product.id}-thumb-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedImage(url);
                    }}
                    className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                      selectedImage === url 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 scale-95 opacity-100 shadow-lg shadow-emerald-500/20' 
                        : 'border-slate-800 opacity-50 hover:opacity-100 hover:border-slate-600'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {selectedImage === url && (
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                        <div className="bg-emerald-500 rounded-full p-0.5">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Info & Price Section */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                <Store className="w-4 h-4" />
                <span>{product.shopName || 'পার্টনার শপ'}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {product.name}
              </h2>
              
              {maxDiscount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[11px] font-black w-fit animate-pulse">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>সর্বোচ্চ {toBnNumber(maxDiscount)}% টোকেন ছাড় প্রযোজ্য</span>
                </div>
              )}
            </div>

            <div className="flex items-end justify-between gap-4 pt-4 border-t border-slate-800/50">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">মূল্য</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono flex items-baseline gap-1">
                  <span className="text-lg">৳</span>
                  {Number(product.originalPrice || 0).toLocaleString('bn-BD')}
                </span>
              </div>

              <button
                disabled={!product.isAvailable}
                onClick={() => {
                  onClose();
                  onBuyClick(product);
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black rounded-2xl transition shadow-xl shadow-emerald-950/40 cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>{product.isAvailable ? 'এখনই কিনুন' : 'স্টক আউট'}</span>
              </button>
            </div>
          </div>

          {/* PRODUCT DESCRIPTION BOX (Highly Prominent) */}
          {product.description && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>মার্চেন্ট কর্তৃক পণ্যের বিবরণ</span>
                </h4>
              </div>
              <div className="bg-slate-950/60 p-5 sm:p-6 rounded-3xl border border-amber-500/20 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <Sparkles className="w-24 h-24 text-amber-500" />
                </div>
                <div className="relative z-10 space-y-4">
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                    {product.description}
                  </p>
                  
                  <div className="pt-3 border-t border-slate-800/50 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">📦</div>
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">✨</div>
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">💯</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Premium Quality Product</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rating Summary Box */}
          <div className="bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
            <div className="text-center sm:border-r sm:border-slate-800 sm:pr-6 shrink-0 w-full sm:w-auto">
              <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
                {averageRating > 0 ? toBnNumber(averageRating.toFixed(1)) : toBnNumber('০.০')}
              </div>
              <div className="flex items-center justify-center gap-1 my-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${star <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                সর্বমোট {toBnNumber(totalReviews)} টি রেটিং ও রিভিউ
              </span>
            </div>

            {/* Breakdown bars */}
            <div className="flex-1 w-full space-y-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingDistribution[stars] || 0;
                const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="w-10 text-[11px] font-bold text-slate-300 flex items-center gap-0.5">
                      {toBnNumber(stars)} <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-12 text-right text-[10px] text-slate-400 font-mono">
                      {toBnNumber(count)} ({toBnNumber(percent)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Submission Form */}
          <form onSubmit={handleSubmitReview} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60 space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>এই পণ্যের ওপর আপনার রেটিং ও রিভিউ দিন</span>
            </h4>

            {/* Interactive Stars */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setUserRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= (hoverRating || userRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-amber-400">
                {toBnNumber(hoverRating || userRating)} স্টার
              </span>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="পণ্যের মান, কোয়ালিটি এবং ব্যবহার সম্পর্কে আপনার অভিজ্ঞতা লিখুন..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                {isSubmitting ? 'প্রসেসিং...' : <><Send className="w-3.5 h-3.5" /> রিভিউ জমা দিন</>}
              </button>
            </div>
          </form>

          {/* Reviews List */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-300">
              গ্রাহক মতামত ({toBnNumber(reviews.length)})
            </h4>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">রিভিউ লোড হচ্ছে...</div>
            ) : reviews.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                এই পণ্যে এখনও কোনো রিভিউ দেওয়া হয়নি। প্রথম রিভিউটি আপনিই দিন!
              </div>
            ) : (
              <div className="space-y-2.5">
                {reviews.map((rev) => {
                  const isMyReview = currentUser && rev.userId === currentUser.id;
                  const isAdmin = currentUser && ((currentUser as any).role === 'ADMIN' || (currentUser as any).role === 'SUPER_ADMIN');
                  const canDelete = isMyReview || isAdmin;

                  return (
                    <div key={rev.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                            {rev.userName ? rev.userName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">{rev.userName || 'গ্রাহক'}</span>
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(rev.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{toBnNumber(rev.rating)}</span>
                          </div>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              disabled={deletingReviewId === rev.id}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                              title="রিভিউ মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                        {rev.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </motion.div>
    </div>
  );
};
