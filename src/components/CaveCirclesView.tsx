import React, { useState, useEffect } from 'react';
import { Users, Plus, Link as LinkIcon, LogOut, Trash2, ArrowLeft, Heart, MessageCircle, Bell } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CaveCirclesViewProps {
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const CaveCirclesView: React.FC<CaveCirclesViewProps> = ({ onBack, onShowToast }) => {
  const { user } = useAuth();
  const [circles, setCircles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);

  // Modals / forms
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleDesc, setNewCircleDesc] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Active Circle Details
  const [circleDetails, setCircleDetails] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [aggregateProgress, setAggregateProgress] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchCircles();
  }, []);

  useEffect(() => {
    if (activeCircleId) {
      fetchCircleDetails(activeCircleId);
    }
  }, [activeCircleId]);

  const fetchCircles = async () => {
    setLoading(true);
    try {
      const res = await api.getCircles();
      if (res.success) setCircles(res.circles);
    } catch (err) {
      console.error(err);
      onShowToast('error', 'ত্রুটি', 'সার্কেল লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  const fetchCircleDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await api.getCircleDetails(id);
      if (res.success) {
        setCircleDetails(res.circle);
        setMembers(res.members);
        setAggregateProgress(res.aggregateProgress);
      }
    } catch (err) {
      console.error(err);
      onShowToast('error', 'ত্রুটি', 'সার্কেল বিস্তারিত লোড করা যায়নি');
      setActiveCircleId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCircleName.trim()) {
      onShowToast('error', 'সতর্কতা', 'সার্কেলের নাম দিন');
      return;
    }
    try {
      const res = await api.createCircle({ name: newCircleName, description: newCircleDesc });
      if (res.success) {
        onShowToast('success', 'সফল', res.message);
        setShowCreate(false);
        setNewCircleName('');
        setNewCircleDesc('');
        fetchCircles();
        setActiveCircleId(res.circleId);
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'সার্কেল তৈরি করা যায়নি');
    }
  };

  const handleJoin = async () => {
    if (!inviteCodeInput.trim()) {
      onShowToast('error', 'সতর্কতা', 'ইনভাইট কোড দিন');
      return;
    }
    try {
      const res = await api.joinCircle(inviteCodeInput.trim());
      if (res.success) {
        onShowToast('success', 'সফল', res.message);
        setShowJoin(false);
        setInviteCodeInput('');
        fetchCircles();
        setActiveCircleId(res.circleId);
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'যুক্ত হওয়া যায়নি');
    }
  };

  const handleLeave = async () => {
    if (!activeCircleId) return;
    if (!window.confirm('আপনি কি এই সার্কেল থেকে বের হতে চান?')) return;
    try {
      const res = await api.leaveCircle(activeCircleId);
      if (res.success) {
        onShowToast('success', 'সফল', res.message);
        setActiveCircleId(null);
        fetchCircles();
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'বের হওয়া যায়নি');
    }
  };

  const handleDelete = async () => {
    if (!activeCircleId) return;
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই সার্কেল মুছে ফেলতে চান?')) return;
    try {
      const res = await api.deleteCircle(activeCircleId);
      if (res.success) {
        onShowToast('success', 'সফল', res.message);
        setActiveCircleId(null);
        fetchCircles();
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'মুছে ফেলা যায়নি');
    }
  };

  const handleInvite = async () => {
    if (!activeCircleId) return;
    try {
      const res = await api.createCircleInvite(activeCircleId);
      if (res.success) {
        // copy to clipboard
        navigator.clipboard.writeText(res.inviteCode);
        onShowToast('info', 'কপি করা হয়েছে', `ইনভাইট কোড: ${res.inviteCode}`);
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'ইনভাইট তৈরি করা যায়নি');
    }
  };

  const sendNotification = async (type: 'REMINDER' | 'ENCOURAGEMENT' | 'NOSIHA') => {
    if (!activeCircleId) return;
    let message = '';
    if (type === 'ENCOURAGEMENT') message = 'মাশাআল্লাহ, চালিয়ে যান। 🌱';
    if (type === 'NOSIHA') message = 'ভাই, সালাতের সময় হয়ে এসেছে। 🕌';
    
    try {
      const res = await api.notifyCircle(activeCircleId, { type, message });
      if (res.success) {
        onShowToast('success', 'সফল', 'বার্তা পাঠানো হয়েছে');
      }
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err.message || 'বার্তা পাঠানো যায়নি');
    }
  };

  if (activeCircleId && circleDetails) {
    const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'ADMIN';

    return (
      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 pb-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveCircleId(null)} className="p-2 rounded-xl bg-slate-800 text-white cursor-pointer hover:bg-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🏕️ {circleDetails.name}
            </h2>
            <p className="text-sm text-emerald-400">{members.length} Companions</p>
          </div>
        </div>

        {circleDetails.description && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-sm">
            {circleDetails.description}
          </div>
        )}

        {/* Collective Progress */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#021812] to-[#01140e] border border-emerald-800/40 space-y-4 shadow-xl">
          <h3 className="text-emerald-300 font-bold text-sm flex items-center gap-2">
            🕌 আজকের Circle Progress
          </h3>
          <p className="text-xs text-slate-400 italic">এখানে শুধুমাত্র Circle-এর মোট সালাত প্রদর্শন করা হয়, কারো ব্যক্তিগত তথ্য নয়।</p>
          
          <div className="grid grid-cols-5 gap-2">
            {['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((p) => {
              const nameMap: any = { fajr: 'ফজর', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'ইশা' };
              const count = aggregateProgress ? aggregateProgress[p] || 0 : 0;
              return (
                <div key={p} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/50">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{nameMap[p]}</span>
                  <span className="text-lg font-black text-emerald-400">{count}<span className="text-xs text-slate-500">/{members.length}</span></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button 
            onClick={() => sendNotification('REMINDER')}
            className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex flex-col items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Bell className="w-6 h-6 text-emerald-200" />
            <span className="font-bold text-sm">চলো মসজিদে</span>
          </button>
          
          <button 
            onClick={() => sendNotification('ENCOURAGEMENT')}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex flex-col items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Heart className="w-6 h-6 text-rose-400" />
            <span className="font-bold text-sm">উৎসাহ দিন</span>
          </button>
          
          <button 
            onClick={() => sendNotification('NOSIHA')}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex flex-col items-center justify-center gap-2 transition cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-6 h-6 text-amber-400" />
            <span className="font-bold text-sm">Nosiha</span>
          </button>
        </div>

        {/* Admin Actions */}
        <div className="flex flex-wrap gap-2 pt-4">
          {isAdmin && (
            <button onClick={handleInvite} className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 text-sm font-semibold hover:bg-emerald-900 flex items-center gap-2 cursor-pointer transition">
              <LinkIcon className="w-4 h-4" />
              ইনভাইট কোড
            </button>
          )}
          
          <button onClick={handleLeave} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 flex items-center gap-2 cursor-pointer transition">
            <LogOut className="w-4 h-4" />
            Circle ত্যাগ করুন
          </button>

          {isAdmin && (
            <button onClick={handleDelete} className="px-4 py-2 rounded-xl bg-rose-950/30 text-rose-400 border border-rose-900/50 text-sm font-semibold hover:bg-rose-900/50 flex items-center gap-2 cursor-pointer transition">
              <Trash2 className="w-4 h-4" />
              মুছে ফেলুন
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-slate-800 text-white cursor-pointer hover:bg-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-400" />
          Cave Circles
        </h2>
      </div>

      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-slate-900 border border-emerald-800/30 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-950/50 flex items-center justify-center mx-auto mb-2 border border-emerald-800/50">
          <Users className="w-8 h-8 text-emerald-400" />
        </div>
        <p className="text-emerald-100 font-medium">বন্ধু ও পরিবারের সাথে ভালো কাজে একে অপরকে উৎসাহিত করুন।</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer">
            <Plus className="w-5 h-5" />
            নতুন Circle তৈরি করুন
          </button>
          <button onClick={() => setShowJoin(true)} className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer">
            <LinkIcon className="w-5 h-5" />
            Circle-এ যোগ দিন
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-white font-bold">নতুন Circle তৈরি</h3>
          <input 
            type="text" 
            value={newCircleName} 
            onChange={(e) => setNewCircleName(e.target.value)} 
            placeholder="Circle-এর নাম (উদাঃ আমাদের পরিবার)" 
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
          />
          <input 
            type="text" 
            value={newCircleDesc} 
            onChange={(e) => setNewCircleDesc(e.target.value)} 
            placeholder="বিবরণ (ঐচ্ছিক)" 
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-slate-400 font-medium hover:bg-slate-800 cursor-pointer">বাতিল</button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 cursor-pointer">তৈরি করুন</button>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-white font-bold">Circle-এ যোগ দিন</h3>
          <input 
            type="text" 
            value={inviteCodeInput} 
            onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())} 
            placeholder="ইনভাইট কোড দিন" 
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 uppercase tracking-widest font-mono"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowJoin(false)} className="px-4 py-2 rounded-xl text-slate-400 font-medium hover:bg-slate-800 cursor-pointer">বাতিল</button>
            <button onClick={handleJoin} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 cursor-pointer">যোগ দিন</button>
          </div>
        </div>
      )}

      {/* Circle List */}
      {loading ? (
        <p className="text-slate-500 text-center py-10 animate-pulse text-sm">লোড হচ্ছে...</p>
      ) : circles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider pl-1">আমার Circles</h3>
          <div className="grid gap-3">
            {circles.map(c => (
              <div 
                key={c.id} 
                onClick={() => setActiveCircleId(c.id)}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-600/50 hover:bg-slate-800/80 transition cursor-pointer flex justify-between items-center group"
              >
                <div>
                  <h4 className="text-white font-bold text-base group-hover:text-emerald-400 transition">🏕️ {c.name}</h4>
                  <p className="text-sm text-slate-500">{c.member_count} Companions</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-emerald-900/50 group-hover:text-emerald-400 transition">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
