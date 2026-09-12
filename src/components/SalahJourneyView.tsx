import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MapPin,
  Sparkles,
  Flame,
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  ShieldCheck,
  Zap,
  BarChart3,
  Check,
  AlertTriangle,
  HeartHandshake
} from 'lucide-react';
import { api } from '../services/api';
import {
  JourneySummaryResponse,
  JourneyAnalyticsResponse,
  JourneyCalendarResponse,
  JourneyDayDetailResponse,
  CalendarDayInfo,
  DayPrayerItem,
  JourneyMilestone
} from '../types';
import { toBnNumber, formatBnDate, getHijriDate } from '../data/prayerConfig';

interface SalahJourneyViewProps {
  onBack?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const SalahJourneyView: React.FC<SalahJourneyViewProps> = ({ onBack, onShowToast }) => {
  // Main view states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'analytics' | 'milestones'>('dashboard');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<JourneySummaryResponse | null>(null);

  // Calendar states
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<JourneyCalendarResponse | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dayDetail, setDayDetail] = useState<JourneyDayDetailResponse | null>(null);
  const [loadingDayDetail, setLoadingDayDetail] = useState(false);

  // Analytics states
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState<JourneyAnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [chartHoverIndex, setChartHoverIndex] = useState<number | null>(null);

  // Management modals
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'day' | 'range' | 'all' | null>(null);
  const [deleteRangeStart, setDeleteRangeStart] = useState('');
  const [deleteRangeEnd, setDeleteRangeEnd] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // 1. Fetch Journey Summary
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await api.getJourneySummary();
      setSummary(res);
    } catch (err: any) {
      console.error('Failed to load journey summary:', err);
      onShowToast('error', 'ত্রুটি', err?.message || 'সালাত জার্নি তথ্য লোড করা সম্ভব হয়নি।');
    } finally {
      setLoadingSummary(false);
    }
  }, [onShowToast]);

  // 2. Fetch Calendar Data
  const fetchCalendar = useCallback(async (year: number, month: number) => {
    try {
      setLoadingCalendar(true);
      const res = await api.getJourneyCalendar(year, month);
      setCalendarData(res);
      if (res?.days && res.days.length > 0) {
        setSelectedDate(prev => {
          if (!prev) {
            const todayDay = res.days.find(d => d.isToday);
            const targetDate = todayDay ? todayDay.date : res.days[0].date;
            api.getJourneyDayDetail(targetDate).then(detail => {
              setDayDetail(detail);
            }).catch(console.error);
            return targetDate;
          }
          return prev;
        });
      }
    } catch (err: any) {
      console.error('Failed to load calendar data:', err);
      onShowToast('error', 'ত্রুটি', 'ক্যালেন্ডার তথ্য লোড করা যায়নি।');
    } finally {
      setLoadingCalendar(false);
    }
  }, [onShowToast]);

  // 3. Fetch Day Detail
  const fetchDayDetail = useCallback(async (dateStr: string) => {
    try {
      setLoadingDayDetail(true);
      setSelectedDate(dateStr);
      const res = await api.getJourneyDayDetail(dateStr);
      setDayDetail(res);
    } catch (err: any) {
      console.error('Failed to load day detail:', err);
      onShowToast('error', 'ত্রুটি', 'দিনের বিস্তারিত তথ্য লোড করা যায়নি।');
    } finally {
      setLoadingDayDetail(false);
    }
  }, [onShowToast]);

  // 4. Fetch Analytics Data
  const fetchAnalytics = useCallback(async (period: 'week' | 'month' | 'year' | 'custom', start?: string, end?: string) => {
    try {
      setLoadingAnalytics(true);
      const res = await api.getJourneyAnalytics(period, start, end);
      setAnalyticsData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      if (err.message?.includes('আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।') || err.status === 403) {
        onShowToast('error', 'অ্যাকাউন্ট স্থগিত', 'আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।');
      } else {
        onShowToast('error', 'ত্রুটি', 'অ্যানালিটিক্স তথ্য লোড করা যায়নি।');
      }
    } finally {
      setLoadingAnalytics(false);
    }
  }, [onShowToast]);

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Load calendar when year/month changes or tab opens
  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendar(currentYear, currentMonth);
    }
  }, [activeTab, currentYear, currentMonth, fetchCalendar]);

  // Load analytics when period changes or tab opens
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics(analyticsPeriod, customStartDate, customEndDate);
    }
  }, [activeTab, analyticsPeriod, fetchAnalytics, customStartDate, customEndDate]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    const todayStr = now.toISOString().split('T')[0];
    fetchDayDetail(todayStr);
  };

  // Start New Journey
  const handleStartNewJourney = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে নতুন সালাত জার্নি শুরু করতে চান? আপনার পূর্ববর্তী জার্নি আর্কাইভ হিসেবে সংরক্ষিত থাকবে।')) {
      return;
    }
    try {
      setActionInProgress(true);
      const res = await api.startNewJourney();
      onShowToast('success', 'সফল', res.message || 'নতুন সালাত জার্নি শুরু হয়েছে!');
      setShowManageModal(false);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      await fetchAnalytics(analyticsPeriod);
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err?.message || 'নতুন জার্নি শুরু করা যায়নি।');
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete Day History
  const handleDeleteDay = async (dateStr: string) => {
    try {
      setActionInProgress(true);
      const res = await api.deleteJourneyHistoryDay(dateStr);
      onShowToast('success', 'সফল', res.message);
      setShowDeleteConfirm(null);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      if (selectedDate === dateStr) {
        await fetchDayDetail(dateStr);
      }
      await fetchAnalytics(analyticsPeriod);
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err?.message || 'ইতিহাস মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete Range History
  const handleDeleteRange = async () => {
    if (!deleteRangeStart || !deleteRangeEnd) {
      onShowToast('error', 'ত্রুটি', 'শুরু ও শেষের তারিখ নির্বাচন করুন।');
      return;
    }
    try {
      setActionInProgress(true);
      const res = await api.deleteJourneyHistoryRange(deleteRangeStart, deleteRangeEnd);
      onShowToast('success', 'সফল', res.message);
      setShowDeleteConfirm(null);
      setShowManageModal(false);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      await fetchAnalytics(analyticsPeriod);
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err?.message || 'ইতিহাস মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete All History
  const handleDeleteAll = async () => {
    try {
      setActionInProgress(true);
      const res = await api.deleteJourneyHistoryAll();
      onShowToast('success', 'সফল', res.message);
      setShowDeleteConfirm(null);
      setShowManageModal(false);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      await fetchAnalytics(analyticsPeriod);
      setDayDetail(null);
    } catch (err: any) {
      onShowToast('error', 'ত্রুটি', err?.message || 'সম্পূর্ণ ইতিহাস মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setActionInProgress(false);
    }
  };

  const monthNamesBn = [
    '', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5 pb-28 text-slate-100 min-h-screen">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              title="ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <Sparkles className="w-4 h-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                সালাত জার্নি ও আত্মিক উন্নতি
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              ধারাবাহিকতা, বিশ্লেষণ ও অনুপ্রেরণামূলক ট্র্যাকার
            </p>
          </div>
        </div>

        {/* Options / Management Button */}
        <button
          onClick={() => setShowManageModal(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-700/60 text-xs font-bold text-slate-300 hover:text-emerald-400 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
          <span>অপশন</span>
        </button>
      </div>

      {/* Main Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
        {[
          { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: Zap },
          { id: 'calendar', label: 'ক্যালেন্ডার', icon: CalendarIcon },
          { id: 'analytics', label: 'গ্রাফ ও বিশ্লেষণ', icon: BarChart3 },
          { id: 'milestones', label: 'মাইলফলক', icon: Trophy }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Recovery Mode Banner (if user attendance dropped significantly) */}
          {summary?.showRecoveryMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 border border-amber-600/40 text-amber-200 space-y-2 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm font-bold text-white">আজ থেকেই আবার নতুন উদ্যমে শুরু করুন!</h3>
              </div>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                অতীতের দিনগুলোতে কোনো ওয়াক্ত ছুটে গিয়ে থাকলে হতাশ হবেন না। আজকের সালাতের জামাত থেকেই নতুনভাবে আপনার আত্মিক জার্নি শুরু করুন। আল্লাহ তওবাকারী ও সচেষ্ট বান্দাদের ভালোবাসেন।
              </p>
            </motion.div>
          )}

          {/* Hero Streak & Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Current Streak */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-orange-300">বর্তমান স্ট্রিক</span>
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {toBnNumber(summary?.currentStreak || 0)}
                </span>
                <span className="text-xs font-bold text-orange-400">দিন</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">টানা ৫/৫ ওয়াক্ত</span>
            </div>

            {/* 2. Best Streak */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-300">সেরা স্ট্রিক</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">
                  {toBnNumber(summary?.bestStreak || 0)}
                </span>
                <span className="text-xs font-bold text-amber-400">দিন</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">সর্বোচ্চ রেকর্ড</span>
            </div>

            {/* 3. Perfect Days */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-300">পারফেক্ট দিন</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {toBnNumber(summary?.perfectDaysCount || 0)}
                </span>
                <span className="text-xs font-bold text-emerald-500">টি</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">পূর্ণ ৫ ওয়াক্ত</span>
            </div>

            {/* 4. Total Completed Jama'at */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-teal-300">মোট জামাত</span>
                <ShieldCheck className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-teal-300">
                  {toBnNumber(summary?.totalCompletedPrayers || 0)}
                </span>
                <span className="text-xs font-bold text-teal-400">ওয়াক্ত</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">যাচাইকৃত সালাত</span>
            </div>
          </div>

          {/* Salah Health & Consistency Score Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-800/60 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-900/80 text-amber-300 border border-emerald-700/50">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">সালাত ধারাবাহিকতা ও হেলথ স্কোর</h3>
                  <p className="text-[11px] text-emerald-300/80 font-medium">
                    {summary?.consistencyScore?.ratingBn || 'অগ্রগতি বিশ্লেষণ'}
                  </p>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-emerald-900/90 border border-emerald-600/50 text-white text-xs font-black">
                {toBnNumber(summary?.consistencyScore?.score || 0)}%
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="w-full bg-slate-950/80 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 transition-all duration-1000"
                style={{ width: `${Math.max(5, summary?.consistencyScore?.score || 0)}%` }}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {summary?.consistencyScore?.messageBn || 'সালাতে নিয়মিত উপস্থিতির মাধ্যমে আপনার স্কোর বৃদ্ধি পাবে।'}
            </p>
          </div>

          {/* Weekly & Monthly Performance Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Week Card */}
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">এই সপ্তাহের অগ্রগতি</span>
                <span className="text-xs font-black text-emerald-400">
                  {toBnNumber(summary?.weekStats?.thisWeekCompleted || 0)}/{toBnNumber(summary?.weekStats?.totalPossible || 35)} ওয়াক্ত
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, summary?.weekStats?.completionPercentage || 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>সমাপ্তির হার: {toBnNumber(summary?.weekStats?.completionPercentage || 0)}%</span>
                <span className={`font-bold ${summary?.weekStats?.direction === 'UP' ? 'text-emerald-400' : summary?.weekStats?.direction === 'DOWN' ? 'text-amber-400' : 'text-slate-400'}`}>
                  {summary?.weekStats?.textBn}
                </span>
              </div>
            </div>

            {/* Month Card */}
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">এই মাসের অগ্রগতি (৩০ দিন)</span>
                <span className="text-xs font-black text-teal-400">
                  {toBnNumber(summary?.monthStats?.thisMonthCompleted || 0)}/{toBnNumber(summary?.monthStats?.totalPossible || 150)} ওয়াক্ত
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${Math.min(100, summary?.monthStats?.completionPercentage || 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>সমাপ্তির হার: {toBnNumber(summary?.monthStats?.completionPercentage || 0)}%</span>
                <span className={`font-bold ${summary?.monthStats?.direction === 'UP' ? 'text-emerald-400' : summary?.monthStats?.direction === 'DOWN' ? 'text-amber-400' : 'text-slate-400'}`}>
                  {summary?.monthStats?.textBn}
                </span>
              </div>
            </div>
          </div>

          {/* Smart Insights & Personalized Recommendations */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-teal-950 text-teal-300 border border-teal-800">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">স্মার্ট সালাত ইনসাইটস ও দিকনির্দেশনা</h3>
            </div>

            {summary?.insights && summary.insights.length > 0 ? (
              <div className="space-y-2">
                {summary.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">পর্যাপ্ত সালাত ভেরিফাই হলে ইনসাইট তৈরি হবে।</p>
            )}

            {/* Recommendations */}
            {summary?.recommendations && summary.recommendations.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-amber-300 block">💡 ইসলামিক পরামর্শ:</span>
                {summary.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-xs text-slate-300/90 italic flex items-center gap-2">
                    <span>•</span>
                    <span>{rec}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTERACTIVE CALENDAR & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Month Navigator */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h2 className="text-sm sm:text-base font-bold text-white">
                {monthNamesBn[currentMonth]} {toBnNumber(currentYear)}
              </h2>
              <button
                onClick={handleJumpToToday}
                className="text-[11px] font-semibold text-emerald-400 hover:underline mt-0.5 inline-block"
              >
                আজকে যান
              </button>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 pb-2 border-b border-slate-800">
              {['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'].map((d, i) => (
                <div key={d} className={i === 5 ? 'text-amber-400' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            {loadingCalendar ? (
              <div className="py-12 text-center text-xs text-slate-400">ক্যালেন্ডার লোড হচ্ছে...</div>
            ) : calendarData?.days ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {/* Empty offset padding for the first day of month */}
                {(() => {
                  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
                  const offsetCells = [];
                  for (let i = 0; i < firstDayOfWeek; i++) {
                    offsetCells.push(<div key={`offset-${i}`} className="p-2" />);
                  }
                  return offsetCells;
                })()}

                {calendarData.days.map(day => {
                  const isSelected = selectedDate === day.date;
                  let bgStyle = 'bg-slate-950/60 border-slate-800/80 text-slate-400';
                  let badgeColor = '';

                  if (day.level === 'EXCELLENT') {
                    bgStyle = 'bg-emerald-950/90 border-emerald-600 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
                    badgeColor = 'bg-amber-400 text-amber-950';
                  } else if (day.level === 'VERY_GOOD') {
                    bgStyle = 'bg-emerald-950/60 border-teal-700 text-emerald-200';
                    badgeColor = 'bg-slate-300 text-slate-950';
                  } else if (day.level === 'MODERATE') {
                    bgStyle = 'bg-amber-950/40 border-amber-800 text-amber-200';
                    badgeColor = 'bg-amber-600 text-amber-100';
                  } else if (day.level === 'NEEDS_IMPROVEMENT') {
                    bgStyle = 'bg-slate-900 border-slate-700 text-slate-300';
                  }

                  return (
                    <button
                      key={day.date}
                      onClick={() => fetchDayDetail(day.date)}
                      className={`p-1.5 sm:p-2 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[52px] sm:min-h-[58px] cursor-pointer ${bgStyle} ${
                        isSelected ? 'ring-2 ring-amber-400 scale-[1.03] z-10' : 'hover:border-emerald-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${day.isToday ? 'text-amber-300 underline' : ''}`}>
                          {toBnNumber(day.dayNumber)}
                        </span>
                        {day.tokenEarned && (
                          <span className="text-[10px]">
                            {day.tokenEarned === 'GOLD' ? '🥇' : day.tokenEarned === 'SILVER' ? '🥈' : '🥉'}
                          </span>
                        )}
                      </div>

                      {/* Mini indicator */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-semibold opacity-90">
                          {day.completedCount > 0 ? `${toBnNumber(day.completedCount)}/৫` : '-'}
                        </span>
                        {day.isFriday && (
                          <span className="text-[8px] text-amber-300 font-bold">জুমআ</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ৫/৫ ওয়াক্ত (গোল্ড)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> ৪/৫ ওয়াক্ত (সিলভার)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ৩/৫ ওয়াক্ত (ব্রোঞ্জ)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> ১-২ ওয়াক্ত
              </span>
            </div>
          </div>

          {/* Selected Day Detail Card */}
          {selectedDate && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-emerald-400" />
                    {formatBnDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {getHijriDate(selectedDate)?.bengali || ''} • {dayDetail?.summaryText || ''}
                  </p>
                </div>

                {/* Day token badge */}
                {dayDetail?.tokenEarned && (
                  <div className="px-3 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-xs font-bold flex items-center gap-1">
                    <span>{dayDetail.tokenEarned === 'GOLD' ? '🥇' : dayDetail.tokenEarned === 'SILVER' ? '🥈' : '🥉'}</span>
                    <span>{dayDetail.tokenEarned} টোকেন</span>
                  </div>
                )}
              </div>

              {loadingDayDetail ? (
                <div className="py-6 text-center text-xs text-slate-400">দিনের তথ্য লোড হচ্ছে...</div>
              ) : dayDetail?.prayers ? (
                <div className="space-y-2">
                  {dayDetail.prayers.map(prayer => (
                    <div
                      key={prayer.type}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all ${
                        prayer.completed
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-white'
                          : 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            prayer.completed
                              ? 'bg-emerald-900 text-emerald-400 border border-emerald-600'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}
                        >
                          {prayer.completed ? <Check className="w-4 h-4" /> : <Minus className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm block text-white">{prayer.nameBn}</span>
                          {prayer.mosqueName && (
                            <p className="text-[11px] text-emerald-300 flex items-center gap-1 truncate mt-0.5">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{prayer.mosqueName}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {prayer.completed ? (
                          <>
                            <span className="text-[11px] font-semibold text-slate-300 block">{prayer.timeBn}</span>
                            <span className="text-[10px] text-emerald-400 font-bold">যাচাইকৃত</span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">আদায় হয়নি</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Day Action: Delete Day Record */}
                  {dayDetail.completedCount > 0 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setShowDeleteConfirm('day')}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>এই দিনের ইতিহাস মুছুন</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ANALYTICS & GROWTH GRAPH */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* Period Filter Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'week', label: 'এই সপ্তাহ (৭ দিন)' },
              { id: 'month', label: 'এই মাস (৩০ দিন)' },
              { id: 'year', label: 'বাৎসরিক (৩৬৫ দিন)' },
              { id: 'custom', label: 'কাস্টম রেঞ্জ' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAnalyticsPeriod(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                  analyticsPeriod === tab.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Input (if selected) */}
          {analyticsPeriod === 'custom' && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">শুরু</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">শেষ</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <button
                onClick={() => fetchAnalytics('custom', customStartDate, customEndDate)}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ফিল্টার করুন
              </button>
            </div>
          )}

          {/* Period Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">মোট আদায়কৃত সালাত</span>
              <span className="text-xl font-black text-emerald-400">
                {toBnNumber(analyticsData?.totalCompleted || 0)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                সম্ভাব্য {toBnNumber(analyticsData?.totalPossible || 0)} ওয়াক্তের মধ্যে
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">সমাপ্তির হার</span>
              <span className="text-xl font-black text-amber-400">
                {toBnNumber(analyticsData?.completionPercentage || 0)}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">ধারাবাহিকতা সূচক</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">উন্নতি / অবনতি</span>
              <div className="flex items-center justify-center gap-1">
                {analyticsData?.improvementRate?.direction === 'UP' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : analyticsData?.improvementRate?.direction === 'DOWN' ? (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-bold text-white">
                  {analyticsData?.improvementRate?.textBn || 'অপরিবর্তিত'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Bar Graph */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                সালাত ধারাবাহিকতা গ্রাফ
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">দৈনিক ৫ ওয়াক্ত স্কেল</span>
            </div>

            {loadingAnalytics ? (
              <div className="py-16 text-center text-xs text-slate-400">গ্রাফ তথ্য লোড হচ্ছে...</div>
            ) : !analyticsData?.chartData || analyticsData.chartData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                কোনো তথ্য পাওয়া যায়নি।
              </div>
            ) : (
              <div className="space-y-2">
                {/* SVG Visual Graph */}
                <div className="h-44 sm:h-52 w-full flex items-end gap-1.5 sm:gap-2 px-1 pt-6 pb-2 relative border-b border-slate-800">
                  {/* Grid background lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-slate-600 w-full" />
                    <div className="border-b border-slate-600 w-full" />
                    <div className="border-b border-slate-600 w-full" />
                  </div>

                  {analyticsData.chartData.map((item, index) => {
                    const heightPercent = Math.max(8, (item.completed / 5) * 100);
                    const isHovered = chartHoverIndex === index;

                    return (
                      <div
                        key={item.date}
                        onMouseEnter={() => setChartHoverIndex(index)}
                        onMouseLeave={() => setChartHoverIndex(null)}
                        onClick={() => fetchDayDetail(item.date)}
                        className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
                      >
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-10 bg-slate-950 border border-emerald-600 px-2 py-1 rounded-lg text-[10px] text-white shadow-xl whitespace-nowrap z-20 pointer-events-none">
                            <span className="font-bold text-amber-300">{item.label}</span>: {toBnNumber(item.completed)}/৫ ওয়াক্ত ({toBnNumber(item.percentage)}%)
                          </div>
                        )}

                        {/* Bar */}
                        <div
                          className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                            item.completed >= 5
                              ? 'bg-gradient-to-t from-emerald-600 to-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                              : item.completed >= 3
                              ? 'bg-gradient-to-t from-teal-700 to-emerald-500'
                              : item.completed > 0
                              ? 'bg-gradient-to-t from-slate-700 to-slate-500'
                              : 'bg-slate-800/40'
                          } ${isHovered ? 'brightness-125 scale-y-105' : ''}`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between text-[10px] text-slate-400 px-1 pt-1 font-medium overflow-hidden">
                  <span>{analyticsData.chartData[0]?.label}</span>
                  {analyticsData.chartData.length > 2 && (
                    <span>{analyticsData.chartData[Math.floor(analyticsData.chartData.length / 2)]?.label}</span>
                  )}
                  <span>{analyticsData.chartData[analyticsData.chartData.length - 1]?.label}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MILESTONES & ACHIEVEMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                সালাত মাইলফলক ও অর্জন
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">আপনার আধ্যাত্মিক ধারাবাহিকতার স্বীকৃতি</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 text-xs font-bold">
              {toBnNumber(summary?.milestones.filter(m => m.unlocked).length || 0)} / {toBnNumber(summary?.milestones.length || 8)} আনলকড
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary?.milestones?.map(m => {
              const progressPct = Math.min(100, Math.round((m.current / m.target) * 100));

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-3xl border transition-all space-y-3 relative overflow-hidden ${
                    m.unlocked
                      ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-amber-500/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                        {m.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{m.titleBn}</span>
                          {m.unlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                              অর্জিত
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{m.descBn}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">অগ্রগতি</span>
                      <span className="font-bold text-emerald-400">
                        {toBnNumber(m.current)} / {toBnNumber(m.target)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.unlocked
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPTIONS & HISTORY MANAGEMENT MODAL */}
      {/* ========================================================================= */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl text-slate-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
                সালাত জার্নি ও হিস্ট্রি অপশন
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* 1. Start New Journey */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">নতুন সালাত জার্নি শুরু করুন</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  বর্তমান অগ্রগতি আর্কাইভ হয়ে যাবে এবং আজ থেকে নতুন জার্নির স্ট্রিক ও পরিসংখ্যান গণনা শুরু হবে।
                </p>
                <button
                  disabled={actionInProgress}
                  onClick={handleStartNewJourney}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {actionInProgress ? 'প্রসেস হচ্ছে...' : 'নতুন জার্নি শুরু করুন'}
                </button>
              </div>

              {/* 2. Delete Range History */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">তারিখ সীমার ইতিহাস মুছুন</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={deleteRangeStart}
                    onChange={e => setDeleteRangeStart(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="date"
                    value={deleteRangeEnd}
                    onChange={e => setDeleteRangeEnd(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white"
                  />
                </div>
                <button
                  disabled={actionInProgress || !deleteRangeStart || !deleteRangeEnd}
                  onClick={handleDeleteRange}
                  className="w-full py-2 bg-slate-800 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                >
                  সীমার ইতিহাস মুছুন
                </button>
              </div>

              {/* 3. Delete All History */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-rose-950/60 space-y-2">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <h4 className="text-xs font-bold">সম্পূর্ণ সালাত ইতিহাস মুছুন</h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  আপনার অ্যাকাউন্টের সম্পূর্ণ সালাতের ইতিহাস স্থায়ীভাবে মুছে ফেলা হবে।
                </p>
                <button
                  disabled={actionInProgress}
                  onClick={() => setShowDeleteConfirm('all')}
                  className="w-full py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  সম্পূর্ণ ইতিহাস মুছুন
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Alert Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-rose-800/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-950 border border-rose-700 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">আপনি কি নিশ্চিত?</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {showDeleteConfirm === 'all'
                  ? 'আপনার সম্পূর্ণ সালাত হিস্ট্রি এবং অর্জিত অগ্রগতি মুছে ফেলা হবে। এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়।'
                  : `${selectedDate} তারিখের সালাত রেকর্ড মুছে ফেলা হবে।`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                বাতিল
              </button>
              <button
                disabled={actionInProgress}
                onClick={() => {
                  if (showDeleteConfirm === 'all') handleDeleteAll();
                  else if (showDeleteConfirm === 'day') handleDeleteDay(selectedDate);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg disabled:opacity-50"
              >
                {actionInProgress ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
