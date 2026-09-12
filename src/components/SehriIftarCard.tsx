import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Coordinates, CalculationMethod, PrayerTimes as AdhanPrayerTimes, Madhab } from 'adhan';
import { MapPin, RefreshCw, Moon, Sunset } from 'lucide-react';
import { getSavedOrGpsLocation, getFastInitialLocation, getDhakaDateClient } from '../services/prayerTimeService';
import { toBnNumber } from '../data/prayerConfig';

interface SehriIftarCardProps {
  userDistrict?: string;
  onShowToast?: (type: string, title: string, message: string) => void;
}

const SehriIftarCountdown: React.FC<{ targetDate: Date; isFasting: boolean }> = React.memo(({ targetDate, isFasting }) => {
  const countdownRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      if (countdownRef.current) {
        countdownRef.current.textContent = `${toBnNumber(hours.toString().padStart(2, '0'))}:${toBnNumber(mins.toString().padStart(2, '0'))}:${toBnNumber(secs.toString().padStart(2, '0'))}`;
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
      <span className="text-[10px] text-slate-300 font-sans font-medium">
        {isFasting ? 'ইফতারের বাকি:' : 'সাহরির বাকি:'}
      </span>
      <span ref={countdownRef} className="text-amber-400">
        00:00:00
      </span>
    </div>
  );
});

export const SehriIftarCard: React.FC<SehriIftarCardProps> = React.memo(({ userDistrict, onShowToast }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number; source: 'gps' | 'district' | 'default'; name: string } | null>(() => {
    const init = getFastInitialLocation(userDistrict);
    return {
      lat: init.latitude,
      lng: init.longitude,
      source: init.source,
      name: init.locationName || 'ঢাকা'
    };
  });
  const [loading, setLoading] = useState(false);
  const [tickerTime, setTickerTime] = useState<Date>(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLocation = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setLoading(true);

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
      console.error('Error fetching location for Sehri/Iftar:', err);
      setCoords({
        lat: 23.8103,
        lng: 90.4125,
        source: 'default',
        name: 'ঢাকা (ডিফল্ট)'
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [userDistrict]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const sehriIftarData = useMemo(() => {
    if (!coords) return null;

    const localNow = getDhakaDateClient(tickerTime);
    const coordinates = new Coordinates(coords.lat, coords.lng);
    const params = CalculationMethod.Karachi();
    params.madhab = Madhab.Shafi;
    
    const ptToday = new AdhanPrayerTimes(coordinates, localNow, params);
    const tomorrow = new Date(localNow.getTime() + 24 * 60 * 60 * 1000);
    const ptTomorrow = new AdhanPrayerTimes(coordinates, tomorrow, params);

    const nowUtc = tickerTime;

    let nextSehriTime = new Date();
    let nextIftarTime = new Date();
    let countdownTarget = new Date();
    let isFastingNow = false;

    if (nowUtc >= ptToday.fajr && nowUtc < ptToday.maghrib) {
      isFastingNow = true;
      nextSehriTime = ptTomorrow.fajr;
      nextIftarTime = ptToday.maghrib;
      countdownTarget = ptToday.maghrib;
    } else if (nowUtc >= ptToday.maghrib) {
      isFastingNow = false;
      nextSehriTime = ptTomorrow.fajr;
      nextIftarTime = ptTomorrow.maghrib;
      countdownTarget = ptTomorrow.fajr;
    } else {
      isFastingNow = false;
      nextSehriTime = ptToday.fajr;
      nextIftarTime = ptToday.maghrib;
      countdownTarget = ptToday.fajr;
    }

    const formatTimeOnly = (date: Date) => {
      const h = date.getHours() % 12 || 12;
      const m = date.getMinutes();
      const hStr = h < 10 ? `0${h}` : `${h}`;
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${toBnNumber(hStr)}:${toBnNumber(mStr)}`;
    };

    return {
      nextSehri: formatTimeOnly(nextSehriTime),
      nextIftar: formatTimeOnly(nextIftarTime),
      countdownTarget,
      isFastingNow
    };
  }, [coords, tickerTime]);

  return (
    <div 
      style={{ contain: 'layout style', transform: 'translateZ(0)' }}
      className="w-full rounded-2xl border border-[#0c4334] bg-[#022119] p-3.5 shadow-sm text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#0a4838] text-xs">
        <span className="font-bold text-slate-100 flex items-center gap-1.5">
          সাহরি ও ইফতার
        </span>

        {sehriIftarData && (
          <SehriIftarCountdown 
            targetDate={sehriIftarData.countdownTarget} 
            isFasting={sehriIftarData.isFastingNow} 
          />
        )}
      </div>

      {/* 2-Column Time Summary */}
      {loading ? (
        <div className="py-3 text-center text-xs text-emerald-300/70">
          সময়সূচী হিসেব হচ্ছে...
        </div>
      ) : sehriIftarData ? (
        <div className="grid grid-cols-2 gap-3 pt-2.5">
          {/* Sehri */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#033024] border border-[#0a4838]">
            <div className="p-1.5 rounded-lg bg-[#043f2f] text-amber-300 shrink-0">
              <Moon className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-emerald-200/80 font-medium">
                পরবর্তী সাহরি
              </span>
              <span className="text-sm font-black font-mono text-white">
                {sehriIftarData.nextSehri} AM
              </span>
            </div>
          </div>

          {/* Iftar */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#033024] border border-[#0a4838]">
            <div className="p-1.5 rounded-lg bg-[#043f2f] text-amber-300 shrink-0">
              <Sunset className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-emerald-200/80 font-medium">
                পরবর্তী ইফতার
              </span>
              <span className="text-sm font-black font-mono text-white">
                {sehriIftarData.nextIftar} PM
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

