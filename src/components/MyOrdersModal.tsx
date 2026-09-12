import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Clock, CheckCircle2, AlertCircle, Truck, XCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';
import { DigitalCashMemoModal } from './DigitalCashMemoModal';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedMemoOrder, setSelectedMemoOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyOrders();
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err: any) {
      console.error('Error fetching my orders:', err);
      setError(err.message || 'অর্ডারের তথ্য লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full">
            <Clock className="w-3 h-3" />
            অপেক্ষারত
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            অনুমোদিত
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
            <Truck className="w-3 h-3" />
            ডেলিভারি সম্পন্ন
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-full">
            <XCircle className="w-3 h-3" />
            বাতিল
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">আমার সকল অর্ডার</h3>
                <p className="text-[11px] text-slate-500 font-medium">ক্যাশ অন ডেলিভারি কেনাকাটার ইতিহাস</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 animate-bounce text-emerald-500 opacity-60" />
                অর্ডারের তালিকা লোড হচ্ছে...
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                <p className="text-xs text-rose-700">{error}</p>
                <button
                  onClick={fetchOrders}
                  className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg"
                >
                  আবার চেষ্টা করুন
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">আপনার কোনো অর্ডার পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-400">আপনি এখনও অনলাইন মার্কেটপ্লেসে কোনো অর্ডার করেননি।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => {
                  const isExpanded = expandedOrderId === order.id;
                  const dateStr = new Date(order.createdAt).toLocaleDateString('bn-BD', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  const orderTotalPayable = order.totalCodAmount ?? 0;
                  const orderProductPayable = order.productTotalPayable ?? 0;
                  const orderDeliveryCharge = order.deliveryCharge ?? 0;

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden transition hover:border-slate-300"
                    >
                      {/* Order Card Summary */}
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="p-4 cursor-pointer flex items-center justify-between gap-3 bg-slate-50/40 hover:bg-slate-50 transition"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900">
                              #{order.orderNumber}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            তারিখ: {dateStr} • {order.items?.length || 0} টি আইটেম
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-medium text-slate-500 block">মোট প্রদেয়</span>
                            <span className="text-sm font-extrabold text-emerald-700">
                              ৳{Number(orderTotalPayable).toLocaleString('bn-BD')}
                            </span>
                          </div>
                          <div className="p-1 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Order Items */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              অর্ডারকৃত পণ্যসমূহ
                            </span>
                            {order.items?.map(item => {
                              const qty = item.quantity || 1;
                              const itemSubtotal = item.customerProductPayable ?? (item.originalPrice * qty);
                              const unitPrice = qty > 0 ? (itemSubtotal / qty) : item.originalPrice;

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
                                >
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">{item.shopName}</span>
                                    <h5 className="font-bold text-slate-900">{item.productName}</h5>
                                    {item.tokenType && item.tokenType !== 'NONE' && (
                                      <span className="text-[10px] text-emerald-700 font-semibold block">
                                        টোকেন ডিসকাউন্ট: {item.tokenType} (-৳{item.tokenDiscountAmount || 0})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0 ml-2">
                                    <span className="font-bold text-slate-900 block">
                                      ৳{Math.round(unitPrice)} × {qty}
                                    </span>
                                    <span className="text-xs font-extrabold text-emerald-700">
                                      = ৳{Math.round(itemSubtotal)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Financial Details */}
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs text-slate-600">
                            <div className="flex justify-between">
                              <span>পণ্যের মূল্য:</span>
                              <span className="font-semibold text-slate-800">৳{orderProductPayable}</span>
                            </div>
                            {order.couponCode && (order.couponDiscountAmount || 0) > 0 && (
                              <div className="flex justify-between text-rose-600">
                                <span>কুপন ডিসকাউন্ট ({order.couponCode}):</span>
                                <span className="font-semibold">-৳{order.couponDiscountAmount}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>ডেলিভারি চার্জ:</span>
                              <span className="font-semibold text-slate-800">৳{orderDeliveryCharge}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900">
                              <span>সর্বমোট (ক্যাশ অন ডেলিভারি):</span>
                              <span className="text-emerald-700">৳{orderTotalPayable}</span>
                            </div>
                          </div>

                          {/* Delivery info & Actions */}
                          <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                            <p><strong className="text-slate-700">প্রাপকের নাম:</strong> {order.customerName}</p>
                            <p><strong className="text-slate-700">মোবাইল:</strong> {order.customerPhone}</p>
                            <p><strong className="text-slate-700">ঠিকানা:</strong> {order.deliveryAddress}</p>
                            {order.deliveryNotes && (
                              <p><strong className="text-slate-700">নোট:</strong> {order.deliveryNotes}</p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMemoOrder(order);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              ডিজিটাল ক্যাশ মেমো / ইনভয়েস
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Digital Cash Memo Modal */}
      {selectedMemoOrder && (
        <DigitalCashMemoModal
          isOpen={!!selectedMemoOrder}
          onClose={() => setSelectedMemoOrder(null)}
          order={selectedMemoOrder}
        />
      )}
    </AnimatePresence>
  );
};
