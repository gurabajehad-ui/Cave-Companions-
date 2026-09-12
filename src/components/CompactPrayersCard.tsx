import React, { useState, useEffect, useMemo } from 'react';
import { Coordinates, CalculationMethod, PrayerTimes as AdhanPrayerTimes, Madhab } from 'adhan';
import { 
  CheckCircle2, 
  Clock, 
  Sunrise, 
  Sun, 
  CloudSun, 
  Sunset, 
  Moon, 
  Loader2, 
  CloudUpload, 
  RefreshCw, 
  MapPin,
  CalendarDays
} from 'lucide-react';
import { PrayerInfo, TodayPrayerStatus, PrayerType } from '../types';
import { PRAYERS_CONFIG, toBnNumber, formatBnTime } from '../data/prayerConfig';
import { getSavedOrGpsLocation, getFastInitialLocation, getDhakaDateClient, isFridayClient } from '../services/prayerTimeService';
import { offlineSyncService, PendingCheckIn } from '../services/offlineSyncService';

interface CompactPrayersCardProps {
  todayStatus: TodayPrayerStatus | null;
  userDistrict?: string;
  userGender?: string;
  onCompletePrayer: (prayer: PrayerInfo) => void;
  actionLoadingPrayerType: string | null;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  todayDateStr: string;
}

export const CompactPrayersCard: React.FC<CompactPrayersCardProps> = React.memo(({
  todayStatus,
  userDistrict,
  userGender = 'male',
  onCompletePrayer,
  actionLoadingPrayerType,
  onShowToast,
  todayDateStr
}) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number; source: 'gps' | 'district' | 'default'; name: string } | null>(() => {
    const init = getFastInitialLocation(userDistrict);
    return {
      lat: init.latitude,
      lng: init.longitude,
      source: init.source,
      name: init.locationName || 'ঢাকা'
    };
  });
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offlinePendingState, setOfflinePendingState] = useState<Record<string, PendingCheckIn | undefined>>({});

  const isFemale = userGender.toLowerCase() === 'female';

  // Monitor offline queue updates
  useEffect(() => {
    const checkOfflineQueue = () => {
      const pending: Record<string, PendingCheckIn | undefined> = {};
      const types: PrayerType[] = ['fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha'];
      types.forEach(t => {
        pending[t] = offlineSyncService.isPrayerPendingInOfflineQueue(t);
      });
      setOfflinePendingState(pending);
    };

    checkOfflineQueue();
    window.addEventListener('cave_offline_queue_updated', checkOfflineQueue);
    return () => {
      window.removeEventListener('cave_offline_queue_updated', checkOfflineQueue);
    };
  }, []);

  const fetchLocation = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setLoadingCoords(true);

    try {
      const loc = await getSavedOrGpsLocation(userDistrict);
      setCoords(prev => {
        if (
          prev &&
          Math.abs(prev.lat - loc.latitude) < 0.0001 &&
          Math.abs(prev.lng - loc.longitude) < 0.0001 &&
          prev.source === loc.source &&
          prev.name === (loc.locationName || 'ঢাকা')
        ) {
          return prev;
        }
        return {
          lat: loc.latitude,
          lng: loc.longitude,
          source: loc.source,
          name: loc.locationName || 'ঢাকা'
        };
      });
      if (manual && onShowToast) {
        onShowToast(
          'success',
          'লোকেশন আপডেট সফল',
          loc.source === 'gps' ? 'জিপিএস (GPS) অনুযায়ী সময়সূচী সেট করা হয়েছে।' : `আপনার জেলা (${loc.locationName}) অনুযায়ী সেট করা হয়েছে।`
        );
      }
    } catch (err) {
      console.error('Error fetching location for CompactPrayersCard:', err);
      setCoords({
        lat: 23.8103,
        lng: 90.4125,
        source: 'default',
        name: 'ঢাকা (ডিফল্ট)'
      });
    } finally {
      setLoadingCoords(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [userDistrict]);

  // Update clock every minute for active prayer tracking
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute exact calculated prayer times using Adhan
  const calculatedTimes = useMemo(() => {
    if (!coords) return null;

    const dhakaDate = getDhakaDateClient(currentTime);
    const coordinates = new Coordinates(coords.lat, coords.lng);
    const params = CalculationMethod.Karachi();
    params.madhab = Madhab.Hanafi;

    const pt = new AdhanPrayerTimes(coordinates, dhakaDate, params);
    const tomorrow = new Date(dhakaDate.getTime() + 24 * 60 * 60 * 1000);
    const ptTomorrow = new AdhanPrayerTimes(coordinates, tomorrow, params);

    const formatTime = (date: Date) => {
      const h = date.getHours() % 12 || 12;
      const m = date.getMinutes();
      const hStr = h < 10 ? `0${h}` : `${h}`;
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${toBnNumber(hStr)}:${toBnNumber(mStr)}`;
    };

    return {
      fajr: { start: pt.fajr, end: pt.sunrise, str: `${formatTime(pt.fajr)} - ${formatTime(pt.sunrise)}` },
      dhuhr: { start: pt.dhuhr, end: pt.asr, str: `${formatTime(pt.dhuhr)} - ${formatTime(pt.asr)}` },
      jumuah: { start: pt.dhuhr, end: pt.asr, str: `${formatTime(pt.dhuhr)} - ${formatTime(pt.asr)}` },
      asr: { start: pt.asr, end: pt.maghrib, str: `${formatTime(pt.asr)} - ${formatTime(pt.maghrib)}` },
      maghrib: { start: pt.maghrib, end: pt.isha, str: `${formatTime(pt.maghrib)} - ${formatTime(pt.isha)}` },
      isha: { start: pt.isha, end: ptTomorrow.fajr, str: `${formatTime(pt.isha)} - ${formatTime(ptTomorrow.fajr)}` }
    };
  }, [coords, currentTime]);

  const activePrayerType = useMemo(() => {
    if (!calculatedTimes) return null;
    const nowUtc = currentTime;
    const isFriday = isFridayClient(currentTime);

    if (nowUtc >= calculatedTimes.fajr.start && nowUtc < calculatedTimes.fajr.end) return 'fajr';
    if (nowUtc >= calculatedTimes.dhuhr.start && nowUtc < calculatedTimes.dhuhr.end) {
      return isFriday ? 'jumuah' : 'dhuhr';
    }
    if (nowUtc >= calculatedTimes.asr.start && nowUtc < calculatedTimes.asr.end) return 'asr';
    if (nowUtc >= calculatedTimes.maghrib.start && nowUtc < calculatedTimes.maghrib.end) return 'maghrib';
    if (nowUtc >= calculatedTimes.isha.start && nowUtc < calculatedTimes.isha.end) return 'isha';
    return null;
  }, [calculatedTimes, currentTime]);

  const prayerRows = useMemo(() => {
    const isFriday = isFridayClient(currentTime);
    const standardOrder: PrayerType[] = isFriday 
      ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha'] 
      : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    return standardOrder.map(type => {
      const config = PRAYERS_CONFIG[type];
      const calTime = calculatedTimes ? (calculatedTimes as any)[type] : null;
      
      const statusItem = (todayStatus?.prayers && (todayStatus.prayers as any)[type]) || {
        completed: false,
        attendance: null
      };

      const pendingOffline = offlinePendingState[type];
      const isCompleted = statusItem.completed || !!pendingOffline;
      const isActive = activePrayerType === type;

      const getIcon = () => {
        switch (type) {
          case 'fajr': return <Sunrise className="w-4 h-4" />;
          case 'dhuhr':
          case 'jumuah': return <Sun className="w-4 h-4" />;
          case 'asr': return <CloudSun className="w-4 h-4" />;
          case 'maghrib': return <Sunset className="w-4 h-4" />;
          case 'isha': return <Moon className="w-4 h-4" />;
          default: return <Clock className="w-4 h-4" />;
        }
      };

      return {
        type,
        nameBn: config?.nameBn || (type === 'jumuah' ? 'জুম\'আহ' : 'যোহর'),
        nameEn: config?.nameEn || '',
        rakats: config?.rakats || '',
        timeRangeStr: calTime ? calTime.str : config?.timeWindowBn || '',
        isCompleted,
        pendingOffline,
        attendance: statusItem.attendance,
        isActive,
        icon: getIcon(),
        isVerifying: actionLoadingPrayerType === type,
        config
      };
    });
  }, [calculatedTimes, todayStatus, offlinePendingState, activePrayerType, currentTime, actionLoadingPrayerType]);

  return (
    <div 
      style={{ contain: 'layout style', transform: 'translateZ(0)' }}
      className="w-full rounded-2xl border border-[#0c4334] bg-[#022119] text-white shadow-sm overflow-hidden"
    >
      {/* Timeline Header */}
      <div className="px-4 py-3 border-b border-[#0a4838] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-slate-100">
            আজকের সালাত সময়সূচী ও ট্র্যাকিং
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-200/90 font-bold shrink-0">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate max-w-[120px] text-amber-300 font-semibold">{coords?.name}</span>
          <button
            onClick={() => fetchLocation(true)}
            disabled={isRefreshing}
            className="p-1 rounded bg-[#033024] border border-[#0a4838] text-emerald-300 hover:text-amber-300 transition-colors ml-0.5 cursor-pointer shrink-0"
            title="লোকেশন রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Timeline Rows */}
      <div className="divide-y divide-[#0a4838]/60">
        {loadingCoords ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-1.5 text-emerald-300/70 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>সময়সূচী লোড হচ্ছে...</span>
          </div>
        ) : (
          prayerRows.map(row => (
            <div
              key={row.type}
              className={`p-3 sm:px-4 transition-colors ${
                row.isActive 
                  ? 'bg-[#033628] border-l-2 border-l-amber-400' 
                  : 'hover:bg-[#033024]/40'
              }`}
            >
              {/* Main Prayer Line */}
              <div className="flex items-center justify-between gap-2.5">
                {/* Left: Icon + Bengali Name + Rakats */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    row.isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : row.isActive
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'bg-[#033024] text-emerald-300/80 border border-[#0a4838]'
                  }`}>
                    {row.icon}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold truncate ${
                        row.isActive ? 'text-amber-300' : 'text-slate-100'
                      }`}>
                        {row.nameBn}
                      </span>
                      {row.isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                      {row.rakats && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#033024] text-emerald-200 border border-[#0a4838]">
                          {row.rakats}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-300/80 font-mono">
                      {row.timeRangeStr}
                    </span>
                  </div>
                </div>

                {/* Right: Action or Status */}
                <div className="shrink-0 flex items-center">
                  {row.isCompleted ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-[#033024] border border-[#0a4838] px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{row.pendingOffline ? 'অফলাইন' : (row.attendance?.attendanceType === 'home' || isFemale ? 'সম্পন্ন' : 'জামাতে')}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => !row.isVerifying && onCompletePrayer(row.config)}
                      disabled={row.isVerifying}
                      className={`py-1.5 px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                        row.isVerifying
                          ? 'bg-[#033024] text-emerald-400 opacity-80 cursor-not-allowed border border-[#0a4838]'
                          : row.isActive
                            ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs'
                            : 'bg-[#033024] hover:bg-[#043f2f] text-emerald-100 border border-[#0a4838]'
                      }`}
                    >
                      {row.isVerifying ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                          <span>যাচাই হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>সালাত পড়েছি</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
