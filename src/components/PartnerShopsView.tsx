import React, { useState, useEffect, useMemo } from 'react';
import { Search, Store, RefreshCw, ChevronRight, Plus, Loader2, MapPin, Building2, X } from 'lucide-react';
import { api } from '../services/api';
import { MerchantVerificationRecord } from '../types';
import { BANGLADESH_DISTRICTS, isLocationMatchingDistrict, isLocationMatchingUpazila } from '../data/bangladeshGeo';
import { useLanguage } from '../context/LanguageContext';

interface PartnerShopsViewProps {
  onSelectShop: (shop: MerchantVerificationRecord) => void;
  onAddShopClick: () => void;
  initialStatus?: 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'ACTIVE';
  hideStatusFilter?: boolean;
}

export function PartnerShopsView({ onSelectShop, onAddShopClick, initialStatus = 'ACTIVE', hideStatusFilter = false }: PartnerShopsViewProps) {
  const { t, language } = useLanguage();
  const [shops, setShops] = useState<MerchantVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'ACTIVE'>(initialStatus);

  useEffect(() => {
    fetchShops();
  }, [statusFilter]);

  const fetchShops = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminMerchants(statusFilter);
      if (res.success) {
        setShops(res.verifications || []);
      } else {
        setError('Failed to load shops.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading shops.');
    } finally {
      setLoading(false);
    }
  };

  const availableUpazilas = useMemo(() => {
    if (!selectedDistrict) return [];
    const found = BANGLADESH_DISTRICTS.find(
      d => d.district.toLowerCase() === selectedDistrict.toLowerCase() || 
           d.districtBn === selectedDistrict
    );
    return found ? found.upazilas : [];
  }, [selectedDistrict]);

  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    setSelectedUpazila('');
  };

  const filteredShops = useMemo(() => {
    let list = [...shops];

    if (search.trim()) {
      const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(shop => {
        const combined = [
          shop.shopName,
          shop.ownerName,
          shop.phone,
          shop.businessType,
          shop.district,
          shop.upazilaThana,
          shop.shopAddress,
          shop.businessDescription
        ].filter(Boolean).join(' ').toLowerCase();
        
        // Also check if search query matches district bn/en name
        return terms.every(term => combined.includes(term));
      });
    }

    if (selectedDistrict) {
      list = list.filter(shop => isLocationMatchingDistrict(shop as any, selectedDistrict));
    }

    if (selectedUpazila) {
      list = list.filter(shop => isLocationMatchingUpazila(shop as any, selectedUpazila));
    }

    return list;
  }, [shops, search, selectedDistrict, selectedUpazila]);

  return (
    <div className="space-y-4">
      {/* Action & Filter Bar */}
      <div className="flex flex-col gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!hideStatusFilter && (
              <div className="flex gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                {(['ACTIVE', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      statusFilter === status
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {status === 'ACTIVE'
                      ? 'সক্রিয় শপ'
                      : status === 'PENDING'
                      ? 'পেন্ডিং আবেদন'
                      : status === 'APPROVED'
                      ? 'অনুমোদিত'
                      : 'বাতিলকৃত'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!hideStatusFilter && (
              <button
                onClick={onAddShopClick}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন পার্টনার শপ যুক্ত করুন' : 'Add New Partner Shop'}</span>
              </button>
            )}
            
            <button
              onClick={fetchShops}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={language === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh List'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search and Location Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('shop.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl focus-within:border-amber-500 transition">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">জেলা (District)</label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer truncate"
              >
                <option value="" className="bg-slate-900 text-slate-300">সব জেলা</option>
                {BANGLADESH_DISTRICTS.slice()
                  .sort((a, b) => a.districtBn.localeCompare(b.districtBn, 'bn'))
                  .map(d => (
                    <option key={d.district} value={d.district} className="bg-slate-900 text-slate-200">
                      {d.districtBn} ({d.district})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1 bg-slate-950 border rounded-xl transition ${selectedDistrict ? 'border-slate-800 focus-within:border-amber-500' : 'border-slate-800/60 opacity-60'}`}>
            <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">উপজেলা (Upazila)</label>
              <select
                value={selectedUpazila}
                onChange={(e) => setSelectedUpazila(e.target.value)}
                disabled={!selectedDistrict}
                className="w-full bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer disabled:cursor-not-allowed truncate"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  {selectedDistrict ? 'সব উপজেলা' : 'প্রথমে জেলা সিলেক্ট করুন'}
                </option>
                {availableUpazilas.map(upazila => (
                  <option key={upazila} value={upazila} className="bg-slate-900 text-slate-200">
                    {upazila}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>মোট: {shops.length} টি, ফিল্টারকৃত: <strong className="text-amber-400">{filteredShops.length}</strong> টি</span>
          {(search || selectedDistrict || selectedUpazila) && (
            <button
              onClick={() => { setSearch(''); setSelectedDistrict(''); setSelectedUpazila(''); }}
              className="text-rose-400 hover:text-rose-300 font-bold"
            >
              রিসেট ফিল্টার
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-2xl text-rose-400 text-sm font-bold text-center">
          {error}
        </div>
      )}

      {/* Shop List Cards */}
      <div className="space-y-3">
        {loading && shops.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading partner shops...</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-6 text-slate-500 text-sm">
            No partner shops found matching your criteria.
          </div>
        ) : (
          filteredShops.map(shop => (
            <div
              key={shop.id || shop.merchantId}
              onClick={() => {
                onSelectShop(shop);
              }}
              className="group bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 rounded-2xl p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between shadow-sm hover:shadow-md gap-4"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors shrink-0 shadow-inner">
                  <Store className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-bold text-white truncate">{shop.shopName}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase tracking-wide ${
                        shop.verificationStatus === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                          : shop.verificationStatus === 'PENDING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-900/50'
                          : shop.verificationStatus === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-900/50'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {shop.verificationStatus || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="truncate">{shop.ownerName || 'Unknown Owner'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700 shrink-0" />
                    <span className="font-mono">{shop.phone || 'No phone'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700 shrink-0" />
                    <span className="capitalize truncate">{shop.businessType || 'General'}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-600" />
                    <span>{shop.district ? `${shop.upazilaThana ? shop.upazilaThana + ', ' : ''}${shop.district}` : 'No address'}</span>
                  </div>
                </div>
                
                <div className="shrink-0 pl-4 hidden md:flex flex-col items-end">
                  <div className="text-slate-500 group-hover:text-amber-400 transition-colors flex items-center text-xs font-medium">
                    <span>View Details</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
