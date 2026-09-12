import React, { useState, useEffect } from 'react';
import { Store, Percent, Save, Loader2, ChevronRight, QrCode as QrCodeIcon, Download, RefreshCw, Eye, X } from 'lucide-react';
import { api } from '../services/api';
import { MerchantVerificationRecord } from '../types';
import QRCode from 'qrcode';
import { CommissionChangeHistory } from './CommissionChangeHistory';

interface ShopDetailsViewProps {
  shopId: string;
  verificationRecord?: MerchantVerificationRecord;
  onBack: () => void;
}

export function ShopDetailsView({ shopId, verificationRecord, onBack }: ShopDetailsViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offers, setOffers] = useState({
    commissionPercent: 0,
    goldDiscountPercent: 0,
    silverDiscountPercent: 0,
    bronzeDiscountPercent: 0
  });

  const [qrData, setQrData] = useState<{ exists: boolean; qrIdentifier: string } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [generatingQr, setGeneratingQr] = useState(false);
  const [showFullQr, setShowFullQr] = useState(false);

  useEffect(() => {
    fetchOffers();
    fetchQr();
  }, [shopId]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminShopOffers(shopId);
      if (res.success) {
        setOffers({
          commissionPercent: res.commissionPercent || 0,
          goldDiscountPercent: res.goldDiscountPercent || 0,
          silverDiscountPercent: res.silverDiscountPercent || 0,
          bronzeDiscountPercent: res.bronzeDiscountPercent || 0
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQr = async () => {
    try {
      const res = await api.getAdminShopQr(shopId);
      if (res.success && res.qr) {
        setQrData(res.qr);
        if (res.qr.qrIdentifier) {
          generateQrImage(res.qr.qrIdentifier);
        }
      }
    } catch (err) {
      console.error('Failed to fetch QR:', err);
    }
  };

  const generateQrImage = async (identifier: string) => {
    try {
      const url = await QRCode.toDataURL(identifier, {
        width: 600,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      setQrImageUrl(url);
    } catch (err) {
      console.error('Failed to generate QR image:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateAdminShopOffers(shopId, offers);
      if (res.success) {
        alert(res.message || 'Settings saved!');
      } else {
        alert(res.message || 'Failed to save!');
      }
    } catch (err: any) {
      console.error('Save settings error:', err);
      alert(err.message || 'Failed to save settings. Please ensure discounts are not higher than commission.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQr = async () => {
    setGeneratingQr(true);
    try {
      const res = await api.generateAdminShopQr(shopId);
      if (res.success && res.shop && res.shop.qrIdentifier) {
        setQrData({ exists: true, qrIdentifier: res.shop.qrIdentifier });
        generateQrImage(res.shop.qrIdentifier);
      }
    } catch (err) {
      console.error('Failed to generate QR:', err);
      alert('Failed to generate QR Code');
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleRegenerateQr = async () => {
    if (!window.confirm('বর্তমান QR Code বাতিল করে নতুন QR Code তৈরি করতে চান?')) return;
    setGeneratingQr(true);
    try {
      const res = await api.regenerateAdminShopQr(shopId);
      if (res.success && res.shop && res.shop.qrIdentifier) {
        setQrData({ exists: true, qrIdentifier: res.shop.qrIdentifier });
        generateQrImage(res.shop.qrIdentifier);
      }
    } catch (err) {
      console.error('Failed to regenerate QR:', err);
      alert('Failed to regenerate QR Code');
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl) return;
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `shop-${(verificationRecord?.shopName || 'qr').replace(/[^a-z0-9]/gi, '_').toLowerCase()}-qr-code.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-amber-400 flex items-center gap-1">
        <ChevronRight className="rotate-180" /> Back
      </button>
      
      {verificationRecord && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-8 text-white">
            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">SHOP INFORMATION</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p><strong>Shop Name:</strong> {verificationRecord.shopName || 'Not provided'}</p>
                  <p><strong>Shop Phone:</strong> {verificationRecord.shopPhone || 'Not provided'}</p>
                  <p><strong>Business Type:</strong> {verificationRecord.businessType || 'Not provided'}</p>
                  <p><strong>Shop Address:</strong> {verificationRecord.shopAddress || 'Not provided'}</p>
                  <p><strong>District:</strong> {verificationRecord.district || 'Not provided'}</p>
                  <p><strong>Upazila/Thana:</strong> {verificationRecord.upazilaThana || 'Not provided'}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">OWNER INFORMATION</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p><strong>Owner Name:</strong> {verificationRecord.ownerName || 'Not provided'}</p>
                  <p><strong>Owner Phone:</strong> {verificationRecord.phone || 'Not provided'}</p>
                  <p><strong>Owner Email:</strong> {verificationRecord.email || 'Not provided'}</p>
                  <p><strong>NID Number:</strong> {verificationRecord.nidNumber || 'Not provided'}</p>
                  <p><strong>Trade License Number:</strong> {verificationRecord.tradeLicenseNumber || 'Not provided'}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">REGISTRATION DOCUMENTS</h2>
              <div className="space-y-3 text-sm">
                  {[
                    { label: 'Shop Photo', url: verificationRecord.shopPhotoUrl },
                    { label: 'NID Front', url: verificationRecord.nidFrontUrl },
                    { label: 'NID Back', url: verificationRecord.nidBackUrl },
                    { label: 'Owner Selfie (Merchant Photo)', url: verificationRecord.ownerSelfieUrl },
                    { label: 'Trade License', url: verificationRecord.tradeLicenseUrl },
                  ].map((doc, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <span className="font-medium mb-2 sm:mb-0">{doc.label}</span>
                      {doc.url ? (
                        <div className="flex gap-3">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="bg-slate-700 hover:bg-slate-600 px-4 py-1.5 rounded-md text-amber-400 transition-colors">View</a>
                          <button onClick={() => api.downloadAdminDocument(doc.url, doc.url.split('/').pop() || 'document')} className="bg-amber-500/10 hover:bg-amber-500/20 px-4 py-1.5 rounded-md text-amber-400 border border-amber-500/30 transition-colors">Download</button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Not Provided</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {verificationRecord.commissionChangeRequests && verificationRecord.commissionChangeRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">COMMISSION CHANGE REQUEST HISTORY</h2>
                <div className="space-y-3">
                  {verificationRecord.commissionChangeRequests.map((req) => (
                    <div key={req.id} className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-400">অনুরোধকৃত কমিশন: {req.requestedCommissionPercent}%</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          req.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-300">বর্তমান কমিশন ছিল: {req.currentCommissionPercent}%</p>
                      {req.reason && <p className="text-slate-400 italic">কারণ: {req.reason}</p>}
                      <p className="text-slate-500 text-[11px]">তারিখ: {new Date(req.createdAt).toLocaleString('bn-BD')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* SHOP QR CODE Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
          <QrCodeIcon className="text-amber-400" /> SHOP QR CODE
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-48 h-48 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center p-2 shrink-0 relative overflow-hidden">
            {generatingQr ? (
              <div className="flex flex-col items-center text-amber-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-mono">GENERATING...</span>
              </div>
            ) : qrImageUrl ? (
              <img src={qrImageUrl} alt="Shop QR Code" className="w-full h-full rounded-xl object-contain bg-white" />
            ) : (
              <div className="text-center text-slate-500">
                <QrCodeIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <span className="text-xs">No QR Code</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-slate-300">
                Status: {qrData?.exists ? (
                  <span className="text-emerald-400 font-bold">Active</span>
                ) : (
                  <span className="text-slate-500 font-bold">Not Generated</span>
                )}
              </p>
              {qrData?.exists && qrData.qrIdentifier && (
                <p className="text-xs font-mono text-slate-500 mt-1">
                  ID: {qrData.qrIdentifier}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {qrData?.exists ? (
                <>
                  <button onClick={() => setShowFullQr(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-colors border border-slate-700">
                    <Eye className="w-4 h-4" /> View Full QR Code
                  </button>
                  <button onClick={handleDownloadQr} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold transition-colors border border-amber-500/30">
                    <Download className="w-4 h-4" /> Download QR Code
                  </button>
                  <button onClick={handleRegenerateQr} disabled={generatingQr} className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-bold transition-colors border border-rose-500/30">
                    <RefreshCw className={`w-4 h-4 ${generatingQr ? 'animate-spin' : ''}`} /> Regenerate QR Code
                  </button>
                </>
              ) : (
                <button onClick={handleGenerateQr} disabled={generatingQr} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-sm font-bold transition-colors">
                  {generatingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCodeIcon className="w-4 h-4" />} Generate QR Code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Store className="text-amber-400" /> Commission & Token Offers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm">Cave Companions Commission (%)</label>
            <input type="number" value={offers.commissionPercent} onChange={e => setOffers({...offers, commissionPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Gold Token Discount (%)</label>
            <input type="number" value={offers.goldDiscountPercent} onChange={e => setOffers({...offers, goldDiscountPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Silver Token Discount (%)</label>
            <input type="number" value={offers.silverDiscountPercent} onChange={e => setOffers({...offers, silverDiscountPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Bronze Token Discount (%)</label>
            <input type="number" value={offers.bronzeDiscountPercent} onChange={e => setOffers({...offers, bronzeDiscountPercent: Number(e.target.value)})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="bg-amber-500 text-slate-900 p-2 rounded font-bold flex items-center gap-2">
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Save Settings
        </button>
      </div>

      {showFullQr && qrImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full relative shadow-2xl">
            <button 
              onClick={() => setShowFullQr(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 text-center">Shop QR Code</h3>
            <div className="bg-white p-4 rounded-2xl w-full aspect-square max-w-sm mx-auto mb-6 flex items-center justify-center">
              <img src={qrImageUrl} alt="Full Shop QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-4">
                ID: {qrData?.qrIdentifier}
              </p>
              <button onClick={handleDownloadQr} className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mx-auto">
                <Download className="w-4 h-4" /> Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      <CommissionChangeHistory shopId={shopId} />
    </div>
  );
}
