import React, { useState, useEffect } from 'react';
import { Truck, Check, AlertCircle, Save, History, Search } from 'lucide-react';
import { api } from '../services/api';
import { DeliveryChargeLogItem } from '../types';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshGeo';

export const AdminDeliveryChargeView: React.FC = () => {
  const [districtCharges, setDistrictCharges] = useState<Record<string, number>>({});
  const [editedCharges, setEditedCharges] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [logs, setLogs] = useState<DeliveryChargeLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveryCharge();
  }, []);

  const fetchDeliveryCharge = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDeliveryCharge();
      if (res.success) {
        setDistrictCharges(res.charges || {});
        setEditedCharges({});
        setLogs(res.logs || []);
      }
    } catch (err: any) {
      console.error('Error fetching delivery charge:', err);
      setErrorMsg(err.message || 'ডেলিভারি চার্জের তথ্য লোড করতে ব্যর্থ।');
    } finally {
      setLoading(false);
    }
  };

  const handleChargeChange = (district: string, value: string) => {
    const num = Number(value);
    if (!isNaN(num)) {
      setEditedCharges(prev => ({ ...prev, [district]: num }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(editedCharges).length === 0) {
      setErrorMsg('কোনো পরিবর্তন করা হয়নি।');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.updateAdminDeliveryCharge({ updates: editedCharges });
      if (res.success) {
        setDistrictCharges(res.charges || {});
        setEditedCharges({});
        setSuccessMsg(`ডেলিভারি চার্জ সফলভাবে আপডেট করা হয়েছে।`);
        fetchDeliveryCharge();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ডেলিভারি চার্জ আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const filteredDistricts = BANGLADESH_DISTRICTS.filter(d => 
    d.district.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.districtBn.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header & Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">জেলা-ভিত্তিক ডেলিভারি চার্জ (District-Wise Delivery Charges)</h3>
            <p className="text-xs text-slate-500">
              ৬৪টি জেলার জন্য আলাদা আলাদা ফিক্সড ডেলিভারি চার্জ নির্ধারণ করুন।
            </p>
          </div>
        </div>

        {/* Informational note on financial separation */}
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            গুরুত্বপূর্ণ হিসাব নীতি (Financial Accounting Policy):
          </p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            ডেলিভারি চার্জ পণ্যের আর্থিক হিসাব ও লভ্যাংশ কমিশন (Online হিসাব) থেকে সম্পূর্ণ আলাদা সংরক্ষিত হয়।
            এটি শপের বিক্রয়, শপের প্রাপ্যতা বা কেভ কম্প্যানিয়ন্স এর পণ্যের কমিশন হিসেবে গণনা করা হয় না।
          </p>
        </div>

        {/* Update Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          
          <div className="relative mb-4 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="জেলা খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto p-1">
            {filteredDistricts.map(d => {
              const currentValue = districtCharges[d.district] ?? (d.district === 'Dhaka' ? 60 : 120);
              const isEdited = editedCharges[d.district] !== undefined;
              const displayValue = isEdited ? editedCharges[d.district] : currentValue;

              return (
                <div key={d.district} className={`p-3 rounded-xl border transition-colors ${isEdited ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {d.district} ({d.districtBn})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={displayValue}
                      onChange={e => handleChargeChange(d.district, e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {Object.keys(editedCharges).length > 0 ? (
                <span className="text-emerald-600 font-bold">{Object.keys(editedCharges).length} জেলার চার্জ পরিবর্তন করা হয়েছে</span>
              ) : 'কোনো পরিবর্তন করা হয়নি'}
            </div>
            <button
              type="submit"
              disabled={saving || Object.keys(editedCharges).length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2"
            >
              {saving ? (
                'সংরক্ষণ হচ্ছে...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  পরিবর্তন সংরক্ষণ করুন
                </>
              )}
            </button>
          </div>
        </form>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Delivery Charge History / Order Logs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h4 className="text-sm font-bold text-slate-900">ডেলিভারি চার্জ রেকর্ড ও অর্ডার লগ</h4>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">লগ লোড হচ্ছে...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">এখনও কোনো ডেলিভারি চার্জ অর্ডার লগ নেই।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                  <th className="py-2.5 px-3">অর্ডার নম্বর</th>
                  <th className="py-2.5 px-3">গ্রাহক</th>
                  <th className="py-2.5 px-3">ডেলিভারি ঠিকানা</th>
                  <th className="py-2.5 px-3 text-right">ডেলিভারি চার্জ</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log: any) => (
                  <tr key={log.orderId || log.orderNumber} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">#{log.orderNumber}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div>{log.customerName}</div>
                      <div className="text-[10px] text-slate-400">{log.customerPhone}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{log.deliveryAddress}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">৳{log.deliveryCharge}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                        {log.orderStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleDateString('bn-BD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
