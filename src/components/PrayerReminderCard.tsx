import React, { useState } from 'react';
import { Bell, Check, ShieldCheck, Send, Sparkles } from 'lucide-react';
import { prayerReminderService, PrayerReminderSettings } from '../services/prayerReminderService';
import { PrayerType } from '../types';

interface PrayerReminderCardProps {
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, msg: string) => void;
  userDistrict?: string;
  onDistrictChange?: (district: string) => void;
}

const PRAYER_LABELS: { type: PrayerType; nameBn: string }[] = [
  { type: 'fajr', nameBn: 'ফজর' },
  { type: 'dhuhr', nameBn: 'যোহর' },
  { type: 'asr', nameBn: 'আসর' },
  { type: 'maghrib', nameBn: 'মাগরিব' },
  { type: 'isha', nameBn: 'এশা' }
];

export const PrayerReminderCard: React.FC<PrayerReminderCardProps> = ({
  onShowToast
}) => {
  const [settings, setSettings] = useState<PrayerReminderSettings>(prayerReminderService.getSettings());
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  const handleToggleMaster = async (enabled: boolean) => {
    if (enabled) {
      const perm = await prayerReminderService.requestNotificationPermission();
      if (perm !== 'granted') {
        onShowToast('warning', 'অনুমতি প্রয়োজন', 'ব্রাউজার সেটিংসে গিয়ে নোটিফিকেশন অনুমতি Allow করে দিন।');
      }
    }
    const updated = prayerReminderService.saveSettings({ enabled, soundEnabled: false });
    setSettings(updated);
    if (enabled) {
      onShowToast('success', 'রিমাইন্ডার সক্রিয়', 'সালাতের ওয়াক্ত শুরু হওয়ার সাইলেন্ট পুশ নোটিফিকেশন চালু হয়েছে।');
    } else {
      onShowToast('info', 'রিমাইন্ডার স্থগিত', 'সালাতের নোটিফিকেশন সাময়িকভাবে বন্ধ করা হলো।');
    }
  };

  const handleTogglePrayer = (prayer: PrayerType) => {
    const current = settings.prayers[prayer] ?? true;
    const newPrayers = { ...settings.prayers, [prayer]: !current };
    const updated = prayerReminderService.saveSettings({ prayers: newPrayers });
    setSettings(updated);
  };

  const handleTestAlert = () => {
    setIsSendingTest(true);
    try {
      const testInfo = {
        type: 'dhuhr' as PrayerType,
        nameBn: 'যোহর',
        nameEn: 'Dhuhr',
        startTime: new Date(),
        formattedTimeBn: '১২:১৫ PM'
      };
      prayerReminderService.triggerReminderNotification(testInfo, false);
      onShowToast('success', 'টেস্ট নোটিফিকেশন প্রেরিত', 'শব্দবিহীন সাইলেন্ট পুশ নোটিফিকেশন পাঠানো হয়েছে।');
    } catch (e) {
      onShowToast('error', 'টেস্ট ব্যর্থ', 'নোটিফিকেশন অনুমতি নিশ্চিত করুন।');
    } finally {
      setTimeout(() => setIsSendingTest(false), 1200);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#06281e]/40 border border-[#0c4334]/50 p-4 text-white space-y-3.5">
      {/* Decorative subtle ambient glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar with Master Toggle */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-900/80 border border-emerald-600/40 flex items-center justify-center text-amber-300 shrink-0 shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                সালাত পুশ রিমাইন্ডার
              </h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-900/90 text-amber-300 border border-emerald-600/50 font-semibold shadow-xs">
                Silent
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/80 truncate mt-0.5">
              {settings.enabled ? 'ওয়াক্ত শুরু হলে শব্দবিহীন সাইলেন্ট নোটিফিকেশন' : 'নোটিফিকেশন বর্তমানে বন্ধ রয়েছে'}
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <button
          type="button"
          onClick={() => handleToggleMaster(!settings.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 cursor-pointer shadow-inner ${
            settings.enabled ? 'bg-gradient-to-r from-emerald-500 to-teal-500 ring-2 ring-amber-400/40' : 'bg-slate-800 border border-slate-700'
          }`}
          title={settings.enabled ? 'নোটিফিকেশন চালু আছে' : 'নোটিফিকেশন বন্ধ আছে'}
        >
          <span
            className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform shadow-md ${
              settings.enabled ? 'translate-x-5.5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* When Enabled: Compact 5-Prayer Chips & Test Action */}
      {settings.enabled && (
        <div className="space-y-3 pt-1 relative z-10 border-t border-emerald-800/40">
          {/* Individual Prayer Selection Chips */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {PRAYER_LABELS.map(p => {
              const isSelected = settings.prayers[p.type] ?? true;
              return (
                <button
                  key={p.type}
                  onClick={() => handleTogglePrayer(p.type)}
                  className={`py-1.5 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-900/80 border-amber-400/50 text-amber-300 shadow-xs'
                      : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-500/50 line-through'
                  }`}
                  title={`${p.nameBn} ওয়াক্ত রিমাইন্ডার`}
                >
                  <span>{p.nameBn}</span>
                  {isSelected && <Check className="w-3 h-3 text-amber-400 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Test Silent Notification + Info */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-300/80 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">ব্রাউজারে নোটিফিকেশন Allow নিশ্চিত রাখুন</span>
            </div>

            <button
              onClick={handleTestAlert}
              disabled={isSendingTest}
              className="py-1 px-3 rounded-xl border border-emerald-600/50 bg-emerald-900/60 hover:bg-emerald-800/80 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 shadow-xs"
            >
              <Send className={`w-3 h-3 ${isSendingTest ? 'animate-bounce text-amber-400' : ''}`} />
              <span>{isSendingTest ? 'পাঠানো হচ্ছে...' : 'টেস্ট এলার্ট'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
