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
  JourneyMilestone,
  ChartDataPoint
} from '../types';
import { toBnNumber, formatBnDate, getHijriDate } from '../data/prayerConfig';
import { useLanguage } from '../context/LanguageContext';

interface SalahJourneyViewProps {
  onBack?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, msg: string) => void;
}

export const SalahJourneyView: React.FC<SalahJourneyViewProps> = ({ onBack, onShowToast }) => {
  const { language, t } = useLanguage();
  const formatNum = (val: number | string) => language === 'bn' ? toBnNumber(val) : String(val);

  const getChartItemLabel = (item: ChartDataPoint | undefined) => {
    if (!item) return '';
    if (language === 'bn') return item.label;
    if (item.date) {
      const d = new Date(item.date + 'T12:00:00Z');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return item.label;
  };

  const localizeInsight = (insight: string) => {
    if (language === 'bn') return insight;
    if (insight.includes('আপনার সালাত জার্নিতে স্বাগতম')) return 'Welcome to your Salah Journey. Record your consistency by verifying Jama\'ah prayers at the mosque.';
    if (insight.includes('আপনি আজ ৫/৫ ওয়াক্ত সালাত সম্পন্ন করেছেন')) return 'You completed all 5 prayers today. Alhamdulillah!';
    if (insight.includes('আজ আপনি')) {
      return insight.replace('আজ আপনি', 'You completed ').replace('ওয়াক্ত সালাত আদায় করেছেন। বাকি ওয়াক্তগুলোতে জামাতে উপস্থিত থাকুন।', 'prayers today. Stay steadfast for the remaining prayers.');
    }
    if (insight.includes('মাশাআল্লাহ! আপনার টানা')) {
      return insight.replace('মাশাআল্লাহ! আপনার টানা', 'MashaAllah! You have maintained a ').replace('দিনের পূর্ণ ধারাবাহিকতা বজায় রয়েছে 🔥', '-day streak 🔥');
    }
    if (insight.includes('আপনি গত সপ্তাহের তুলনায়')) {
      return insight.replace('আপনি গত সপ্তাহের তুলনায়', 'You completed ').replace('% বেশি সালাত আদায় করেছেন।', '% more prayers compared to last week.');
    }
    if (insight.includes('এই সপ্তাহে আপনি')) {
      return insight.replace('এই সপ্তাহে আপনি', 'You completed ').replace('ওয়াক্ত সালাত আদায় করেছেন, যা অত্যন্ত প্রশংসনীয়।', 'prayers this week, which is highly commendable.');
    }
    if (insight.includes('সালাতে আপনার উপস্থিতি সবচেয়ে বেশি')) {
      return insight.replace('সালাতে আপনার উপস্থিতি সবচেয়ে বেশি', 'has highest Jama\'ah attendance');
    }
    if (insight.includes('সালাতের জামাতে নিয়মিততায় কিছুটা বাড়তি মনোযোগ প্রয়োজন')) {
      return insight.replace('সালাতের জামাতে নিয়মিততায় কিছুটা বাড়তি মনোযোগ প্রয়োজন।', 'needs extra attention for regular Jama\'ah attendance.');
    }
    if (insight.includes('টি পূর্ণ দিনে')) {
      return insight.replace('আপনি মোট', 'You completed ').replace('টি পূর্ণ দিনে (৫/৫ ওয়াক্ত) সালাত আদায় সম্পন্ন করেছেন ⭐', 'perfect days (5/5 prayers) ⭐');
    }
    return insight;
  };

  const localizeRecommendation = (rec: string) => {
    if (language === 'bn') return rec;
    if (rec.includes('আজকের প্রথম ওয়াক্তের')) return 'Start your spiritual journey today from the very next prayer.';
    if (rec.includes('ফজরের জামাত ধরতে')) return 'To catch Fajr in Jama\'ah, try sleeping early and set an alarm.';
    if (rec.includes('আপনার ধারাবাহিকতা দুর্দান্ত!')) return 'Your consistency is excellent! May Allah accept your deeds and keep you steadfast.';
    if (rec.includes('ধারাবাহিকতা কিছুটা কমলেও')) return 'Do not be discouraged by minor drops in consistency. Focus on today\'s prayers.';
    if (rec.includes('প্রতিটি সালাতের জন্য')) return 'Aim to reach the mosque early for every prayer.';
    if (rec.includes('সালাত শেষে আত্মশুদ্ধি')) return 'Pray regularly after prayer for self-purification and steadfastness in faith.';
    return rec;
  };

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
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err?.message || (language === 'bn' ? 'সালাত জার্নি তথ্য লোড করা সম্ভব হয়নি।' : 'Failed to load Salah Journey data.'));
    } finally {
      setLoadingSummary(false);
    }
  }, [onShowToast, language]);

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
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'ক্যালেন্ডার তথ্য লোড করা যায়নি।' : 'Failed to load calendar data.');
    } finally {
      setLoadingCalendar(false);
    }
  }, [onShowToast, language]);

  // 3. Fetch Day Detail
  const fetchDayDetail = useCallback(async (dateStr: string) => {
    try {
      setLoadingDayDetail(true);
      setSelectedDate(dateStr);
      const res = await api.getJourneyDayDetail(dateStr);
      setDayDetail(res);
    } catch (err: any) {
      console.error('Failed to load day detail:', err);
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'দিনের বিস্তারিত তথ্য লোড করা যায়নি।' : 'Failed to load day details.');
    } finally {
      setLoadingDayDetail(false);
    }
  }, [onShowToast, language]);

  // 4. Fetch Analytics Data
  const fetchAnalytics = useCallback(async (period: 'week' | 'month' | 'year' | 'custom', start?: string, end?: string) => {
    try {
      setLoadingAnalytics(true);
      const res = await api.getJourneyAnalytics(period, start, end);
      setAnalyticsData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      if (err.message?.includes('আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।') || err.status === 403) {
        onShowToast('error', language === 'bn' ? 'অ্যাকাউন্ট স্থগিত' : 'Account Suspended', language === 'bn' ? 'আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।' : 'Your account has been suspended.');
      } else {
        onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'অ্যানালিটিক্স তথ্য লোড করা যায়নি।' : 'Failed to load analytics data.');
      }
    } finally {
      setLoadingAnalytics(false);
    }
  }, [onShowToast, language]);

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
    if (!window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে নতুন সালাত জার্নি শুরু করতে চান? আপনার পূর্ববর্তী জার্নি আর্কাইভ হিসেবে সংরক্ষিত থাকবে।' : 'Are you sure you want to start a new Salah journey? Your previous journey will be archived.')) {
      return;
    }
    try {
      setActionInProgress(true);
      const res = await api.startNewJourney();
      onShowToast('success', language === 'bn' ? 'সফল' : 'Success', res.message || (language === 'bn' ? 'নতুন সালাত জার্নি শুরু হয়েছে!' : 'New Salah Journey started!'));
      setShowManageModal(false);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      await fetchAnalytics(analyticsPeriod);
    } catch (err: any) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err?.message || (language === 'bn' ? 'নতুন জার্নি শুরু করা যায়নি।' : 'Failed to start new journey.'));
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete Day History
  const handleDeleteDay = async (dateStr: string) => {
    try {
      setActionInProgress(true);
      const res = await api.deleteJourneyHistoryDay(dateStr);
      onShowToast('success', language === 'bn' ? 'সফল' : 'Success', res.message);
      setShowDeleteConfirm(null);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      if (selectedDate === dateStr) {
        await fetchDayDetail(dateStr);
      }
      await fetchAnalytics(analyticsPeriod);
    } catch (err: any) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err?.message || (language === 'bn' ? 'ইতিহাস মুছতে ব্যর্থ হয়েছে।' : 'Failed to delete history.'));
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete Range History
  const handleDeleteRange = async () => {
    if (!deleteRangeStart || !deleteRangeEnd) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', language === 'bn' ? 'শুরু ও শেষের তারিখ নির্বাচন করুন।' : 'Please select start and end dates.');
      return;
    }
    try {
      setActionInProgress(true);
      const res = await api.deleteJourneyHistoryRange(deleteRangeStart, deleteRangeEnd);
      onShowToast('success', language === 'bn' ? 'সফল' : 'Success', res.message);
      setShowDeleteConfirm(null);
      setShowManageModal(false);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      await fetchAnalytics(analyticsPeriod);
    } catch (err: any) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err?.message || (language === 'bn' ? 'ইতিহাস মুছতে ব্যর্থ হয়েছে।' : 'Failed to delete history.'));
    } finally {
      setActionInProgress(false);
    }
  };

  // Delete All History
  const handleDeleteAll = async () => {
    try {
      setActionInProgress(true);
      const res = await api.deleteJourneyHistoryAll();
      onShowToast('success', language === 'bn' ? 'সফল' : 'Success', res.message);
      setShowDeleteConfirm(null);
      setShowManageModal(false);
      await fetchSummary();
      await fetchCalendar(currentYear, currentMonth);
      await fetchAnalytics(analyticsPeriod);
      setDayDetail(null);
    } catch (err: any) {
      onShowToast('error', language === 'bn' ? 'ত্রুটি' : 'Error', err?.message || (language === 'bn' ? 'সম্পূর্ণ ইতিহাস মুছতে ব্যর্থ হয়েছে।' : 'Failed to delete all history.'));
    } finally {
      setActionInProgress(false);
    }
  };

  const monthNamesBn = [
    '', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const monthNamesEn = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
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
              title={language === 'bn' ? 'ফিরে যান' : 'Go Back'}
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
                {language === 'bn' ? 'সালাত জার্নি ও আত্মিক উন্নতি' : 'Salah Journey & Spiritual Growth'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {language === 'bn' ? 'ধারাবাহিকতা, বিশ্লেষণ ও অনুপ্রেরণামূলক ট্র্যাকার' : 'Consistency, analytics & inspirational tracker'}
            </p>
          </div>
        </div>

        {/* Options / Management Button */}
        <button
          onClick={() => setShowManageModal(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-700/60 text-xs font-bold text-slate-300 hover:text-emerald-400 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'bn' ? 'অপশন' : 'Options'}</span>
        </button>
      </div>

      {/* Main Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
        {[
          { id: 'dashboard', label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard', icon: Zap },
          { id: 'calendar', label: language === 'bn' ? 'ক্যালেন্ডার' : 'Calendar', icon: CalendarIcon },
          { id: 'analytics', label: language === 'bn' ? 'গ্রাফ ও বিশ্লেষণ' : 'Analytics', icon: BarChart3 },
          { id: 'milestones', label: language === 'bn' ? 'মাইলফলক' : 'Milestones', icon: Trophy }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
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
                <h3 className="text-sm font-bold text-white">
                  {language === 'bn' ? 'আজ থেকেই আবার নতুন উদ্যমে শুরু করুন!' : 'Start fresh with renewed zeal today!'}
                </h3>
              </div>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                {language === 'bn'
                  ? 'অতীতের দিনগুলোতে কোনো ওয়াক্ত ছুটে গিয়ে থাকলে হতাশ হবেন না। আজকের সালাতের জামাত থেকেই নতুনভাবে আপনার আত্মিক জার্নি শুরু করুন। আল্লাহ তওবাকারী ও সচেষ্ট বান্দাদের ভালোবাসেন।'
                  : 'Do not lose heart if prayers were missed in the past. Renew your spiritual journey starting with today\'s Jama\'ah. Allah loves those who strive and return to Him.'}
              </p>
            </motion.div>
          )}

          {/* Hero Streak & Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Current Streak */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-orange-300">
                  {language === 'bn' ? 'বর্তমান স্ট্রিক' : 'Current Streak'}
                </span>
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {formatNum(summary?.currentStreak || 0)}
                </span>
                <span className="text-xs font-bold text-orange-400">
                  {language === 'bn' ? 'দিন' : 'Days'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {language === 'bn' ? 'টানা ৫/৫ ওয়াক্ত' : '5/5 prayers streak'}
              </span>
            </div>

            {/* 2. Best Streak */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-300">
                  {language === 'bn' ? 'সেরা স্ট্রিক' : 'Best Streak'}
                </span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">
                  {formatNum(summary?.bestStreak || 0)}
                </span>
                <span className="text-xs font-bold text-amber-400">
                  {language === 'bn' ? 'দিন' : 'Days'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {language === 'bn' ? 'সর্বোচ্চ রেকর্ড' : 'Personal Best'}
              </span>
            </div>

            {/* 3. Perfect Days */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-300">
                  {language === 'bn' ? 'পারফেক্ট দিন' : 'Perfect Days'}
                </span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {formatNum(summary?.perfectDaysCount || 0)}
                </span>
                <span className="text-xs font-bold text-emerald-500">
                  {language === 'bn' ? 'টি' : ''}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {language === 'bn' ? 'পূর্ণ ৫ ওয়াক্ত' : 'Full 5/5 daily'}
              </span>
            </div>

            {/* 4. Total Completed Jama'at */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-700/40 rounded-3xl p-3.5 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-teal-300">
                  {language === 'bn' ? 'মোট জামাত' : 'Total Jama\'ah'}
                </span>
                <ShieldCheck className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-teal-300">
                  {formatNum(summary?.totalCompletedPrayers || 0)}
                </span>
                <span className="text-xs font-bold text-teal-400">
                  {language === 'bn' ? 'ওয়াক্ত' : 'prayers'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {language === 'bn' ? 'যাচাইকৃত সালাত' : 'Verified prayers'}
              </span>
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
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn' ? 'সালাত ধারাবাহিকতা ও হেলথ স্কোর' : 'Salah Consistency & Health Score'}
                  </h3>
                  <p className="text-[11px] text-emerald-300/80 font-medium">
                    {language === 'bn' 
                      ? (summary?.consistencyScore?.ratingBn || 'অগ্রগতি বিশ্লেষণ')
                      : (summary?.consistencyScore?.ratingEn || 'Progress Analysis')}
                  </p>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-emerald-900/90 border border-emerald-600/50 text-white text-xs font-black">
                {formatNum(summary?.consistencyScore?.score || 0)}%
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
              {language === 'bn'
                ? (summary?.consistencyScore?.messageBn || 'সালাতে নিয়মিত উপস্থিতির মাধ্যমে আপনার স্কোর বৃদ্ধি পাবে।')
                : (summary?.consistencyScore?.messageEn || 'Attending regular prayers will increase your spiritual health score.')}
            </p>
          </div>

          {/* Weekly & Monthly Performance Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Week Card */}
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {language === 'bn' ? 'এই সপ্তাহের অগ্রগতি' : 'This Week\'s Progress'}
                </span>
                <span className="text-xs font-black text-emerald-400">
                  {formatNum(summary?.weekStats?.thisWeekCompleted || 0)}/{formatNum(summary?.weekStats?.totalPossible || 35)} {language === 'bn' ? 'ওয়াক্ত' : 'prayers'}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, summary?.weekStats?.completionPercentage || 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {language === 'bn' ? `সমাপ্তির হার: ${formatNum(summary?.weekStats?.completionPercentage || 0)}%` : `Completion Rate: ${formatNum(summary?.weekStats?.completionPercentage || 0)}%`}
                </span>
                <span className={`font-bold ${summary?.weekStats?.direction === 'UP' ? 'text-emerald-400' : summary?.weekStats?.direction === 'DOWN' ? 'text-amber-400' : 'text-slate-400'}`}>
                  {language === 'bn' ? summary?.weekStats?.textBn : (summary?.weekStats?.direction === 'UP' ? 'Improving' : summary?.weekStats?.direction === 'DOWN' ? 'Decreasing' : 'Steady')}
                </span>
              </div>
            </div>

            {/* Month Card */}
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {language === 'bn' ? 'এই মাসের অগ্রগতি (৩০ দিন)' : 'This Month\'s Progress (30 Days)'}
                </span>
                <span className="text-xs font-black text-teal-400">
                  {formatNum(summary?.monthStats?.thisMonthCompleted || 0)}/{formatNum(summary?.monthStats?.totalPossible || 150)} {language === 'bn' ? 'ওয়াক্ত' : 'prayers'}
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${Math.min(100, summary?.monthStats?.completionPercentage || 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {language === 'bn' ? `সমাপ্তির হার: ${formatNum(summary?.monthStats?.completionPercentage || 0)}%` : `Completion Rate: ${formatNum(summary?.monthStats?.completionPercentage || 0)}%`}
                </span>
                <span className={`font-bold ${summary?.monthStats?.direction === 'UP' ? 'text-emerald-400' : summary?.monthStats?.direction === 'DOWN' ? 'text-amber-400' : 'text-slate-400'}`}>
                  {language === 'bn' ? summary?.monthStats?.textBn : (summary?.monthStats?.direction === 'UP' ? 'Improving' : summary?.monthStats?.direction === 'DOWN' ? 'Decreasing' : 'Steady')}
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
              <h3 className="text-sm font-bold text-white">
                {language === 'bn' ? 'স্মার্ট সালাত ইনসাইটস ও দিকনির্দেশনা' : 'Smart Salah Insights & Recommendations'}
              </h3>
            </div>

            {summary?.insights && summary.insights.length > 0 ? (
              <div className="space-y-2">
                {summary.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <p className="leading-relaxed">{localizeInsight(insight)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'পর্যাপ্ত সালাত ভেরিফাই হলে ইনসাইট তৈরি হবে।' : 'Insights will appear once prayers are verified.'}
              </p>
            )}

            {/* Recommendations */}
            {summary?.recommendations && summary.recommendations.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-amber-300 block">
                  {language === 'bn' ? '💡 ইসলামিক পরামর্শ:' : '💡 Islamic Guidance:'}
                </span>
                {summary.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-xs text-slate-300/90 italic flex items-center gap-2">
                    <span>•</span>
                    <span>{localizeRecommendation(rec)}</span>
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
                {language === 'bn' ? `${monthNamesBn[currentMonth]} ${formatNum(currentYear)}` : `${monthNamesEn[currentMonth]} ${formatNum(currentYear)}`}
              </h2>
              <button
                onClick={handleJumpToToday}
                className="text-[11px] font-semibold text-emerald-400 hover:underline mt-0.5 inline-block cursor-pointer"
              >
                {language === 'bn' ? 'আজকে যান' : 'Go to Today'}
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
              {(language === 'bn' 
                ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'] 
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              ).map((d, i) => (
                <div key={d} className={i === 5 ? 'text-amber-400' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            {loadingCalendar ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {language === 'bn' ? 'ক্যালেন্ডার লোড হচ্ছে...' : 'Loading calendar...'}
              </div>
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

                  if (day.level === 'EXCELLENT') {
                    bgStyle = 'bg-emerald-950/90 border-emerald-600 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
                  } else if (day.level === 'VERY_GOOD') {
                    bgStyle = 'bg-emerald-950/60 border-teal-700 text-emerald-200';
                  } else if (day.level === 'MODERATE') {
                    bgStyle = 'bg-amber-950/40 border-amber-800 text-amber-200';
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
                          {formatNum(day.dayNumber)}
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
                          {day.completedCount > 0 ? `${formatNum(day.completedCount)}/5` : '-'}
                        </span>
                        {day.isFriday && (
                          <span className="text-[8px] text-amber-300 font-bold">
                            {language === 'bn' ? 'জুমআ' : 'Jum\'ah'}
                          </span>
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
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {language === 'bn' ? '৫/৫ ওয়াক্ত (গোল্ড)' : '5/5 Prayers (Gold)'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> {language === 'bn' ? '৪/৫ ওয়াক্ত (সিলভার)' : '4/5 Prayers (Silver)'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {language === 'bn' ? '৩/৫ ওয়াক্ত (ব্রোঞ্জ)' : '3/5 Prayers (Bronze)'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> {language === 'bn' ? '১-২ ওয়াক্ত' : '1-2 Prayers'}
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
                    {language === 'bn' ? formatBnDate(selectedDate) : selectedDate}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'bn' 
                      ? `${getHijriDate(selectedDate)?.bengali || ''} • ${dayDetail?.summaryText || ''}`
                      : `${getHijriDate(selectedDate)?.english || ''} • Completed ${dayDetail?.completedCount || 0}/5 prayers in Jama'ah`
                    }
                  </p>
                </div>

                {/* Day token badge */}
                {dayDetail?.tokenEarned && (
                  <div className="px-3 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-xs font-bold flex items-center gap-1">
                    <span>{dayDetail.tokenEarned === 'GOLD' ? '🥇' : dayDetail.tokenEarned === 'SILVER' ? '🥈' : '🥉'}</span>
                    <span>{dayDetail.tokenEarned} {language === 'bn' ? 'টোকেন' : 'Token'}</span>
                  </div>
                )}
              </div>

              {loadingDayDetail ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {language === 'bn' ? 'দিনের তথ্য লোড হচ্ছে...' : 'Loading day details...'}
                </div>
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
                          <span className="font-bold text-sm block text-white">
                            {language === 'bn' ? prayer.nameBn : prayer.nameEn || prayer.nameBn}
                          </span>
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
                            <span className="text-[11px] font-semibold text-slate-300 block">
                              {language === 'bn' ? prayer.timeBn : prayer.timeEn || prayer.timeBn}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              {language === 'bn' ? 'যাচাইকৃত' : 'Verified'}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {language === 'bn' ? 'আদায় হয়নি' : 'Not prayed'}
                          </span>
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
                        <span>{language === 'bn' ? 'এই দিনের ইতিহাস মুছুন' : 'Delete this day\'s history'}</span>
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
              { id: 'week', label: language === 'bn' ? 'এই সপ্তাহ (৭ দিন)' : 'This Week (7 Days)' },
              { id: 'month', label: language === 'bn' ? 'এই মাস (৩০ দিন)' : 'This Month (30 Days)' },
              { id: 'year', label: language === 'bn' ? 'বাৎসরিক (৩৬৫ দিন)' : 'Yearly (365 Days)' },
              { id: 'custom', label: language === 'bn' ? 'কাস্টম রেঞ্জ' : 'Custom Range' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAnalyticsPeriod(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
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
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  {language === 'bn' ? 'শুরু' : 'Start'}
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  {language === 'bn' ? 'শেষ' : 'End'}
                </label>
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
                {language === 'bn' ? 'ফিল্টার করুন' : 'Apply Filter'}
              </button>
            </div>
          )}

          {/* Period Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                {language === 'bn' ? 'মোট আদায়কৃত সালাত' : 'Total Prayers Completed'}
              </span>
              <span className="text-xl font-black text-emerald-400">
                {formatNum(analyticsData?.totalCompleted || 0)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {language === 'bn' ? `সম্ভাব্য ${formatNum(analyticsData?.totalPossible || 0)} ওয়াক্তের মধ্যে` : `Out of ${formatNum(analyticsData?.totalPossible || 0)} possible`}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                {language === 'bn' ? 'সমাপ্তির হার' : 'Completion Rate'}
              </span>
              <span className="text-xl font-black text-amber-400">
                {formatNum(analyticsData?.completionPercentage || 0)}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {language === 'bn' ? 'ধারাবাহিকতা সূচক' : 'Consistency Index'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                {language === 'bn' ? 'উন্নতি / অবনতি' : 'Growth / Trend'}
              </span>
              <div className="flex items-center justify-center gap-1">
                {analyticsData?.improvementRate?.direction === 'UP' ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : analyticsData?.improvementRate?.direction === 'DOWN' ? (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-sm font-bold text-white">
                  {language === 'bn' ? (analyticsData?.improvementRate?.textBn || 'অপরিবর্তিত') : (analyticsData?.improvementRate?.direction === 'UP' ? 'Improving' : analyticsData?.improvementRate?.direction === 'DOWN' ? 'Decreasing' : 'Steady')}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Bar Graph */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                {language === 'bn' ? 'সালাত ধারাবাহিকতা গ্রাফ' : 'Salah Consistency Chart'}
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {language === 'bn' ? 'দৈনিক ৫ ওয়াক্ত স্কেল' : 'Daily 5 Prayer Scale'}
              </span>
            </div>

            {loadingAnalytics ? (
              <div className="py-16 text-center text-xs text-slate-400">
                {language === 'bn' ? 'গ্রাফ তথ্য লোড হচ্ছে...' : 'Loading chart data...'}
              </div>
            ) : !analyticsData?.chartData || analyticsData.chartData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                {language === 'bn' ? 'কোনো তথ্য পাওয়া যায়নি।' : 'No records found.'}
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
                            <span className="font-bold text-amber-300">{getChartItemLabel(item)}</span>: {formatNum(item.completed)}/5 {language === 'bn' ? 'ওয়াক্ত' : 'prayers'} ({formatNum(item.percentage)}%)
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
                  <span>{getChartItemLabel(analyticsData.chartData[0])}</span>
                  {analyticsData.chartData.length > 2 && (
                    <span>{getChartItemLabel(analyticsData.chartData[Math.floor(analyticsData.chartData.length / 2)])}</span>
                  )}
                  <span>{getChartItemLabel(analyticsData.chartData[analyticsData.chartData.length - 1])}</span>
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
                {language === 'bn' ? 'সালাত মাইলফলক ও অর্জন' : 'Salah Milestones & Achievements'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'bn' ? 'আপনার আধ্যাত্মিক ধারাবাহিকতার স্বীকৃতি' : 'Recognizing your spiritual persistence'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 text-xs font-bold">
              {formatNum(summary?.milestones.filter(m => m.unlocked).length || 0)} / {formatNum(summary?.milestones.length || 8)} {language === 'bn' ? 'আনলকড' : 'Unlocked'}
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
                          <span>{language === 'bn' ? m.titleBn : m.titleEn || m.titleBn}</span>
                          {m.unlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                              {language === 'bn' ? 'অর্জিত' : 'Unlocked'}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {language === 'bn' ? m.descBn : m.descEn || m.descBn}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">
                        {language === 'bn' ? 'অগ্রগতি' : 'Progress'}
                      </span>
                      <span className="font-bold text-emerald-400">
                        {formatNum(m.current)} / {formatNum(m.target)}
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
                {language === 'bn' ? 'সালাত জার্নি ও হিস্ট্রি অপশন' : 'Salah Journey & History Options'}
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* 1. Start New Journey */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">
                    {language === 'bn' ? 'নতুন সালাত জার্নি শুরু করুন' : 'Start New Salah Journey'}
                  </h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'bn' 
                    ? 'বর্তমান অগ্রগতি আর্কাইভ হয়ে যাবে এবং আজ থেকে নতুন জার্নির স্ট্রিক ও পরিসংখ্যান গণনা শুরু হবে।'
                    : 'Current progress will be archived, and new streak/statistics calculation will start from today.'}
                </p>
                <button
                  disabled={actionInProgress}
                  onClick={handleStartNewJourney}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {actionInProgress 
                    ? (language === 'bn' ? 'প্রসেস হচ্ছে...' : 'Processing...') 
                    : (language === 'bn' ? 'নতুন জার্নি শুরু করুন' : 'Start New Journey')}
                </button>
              </div>

              {/* 2. Delete Range History */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">
                    {language === 'bn' ? 'তারিখ সীমার ইতিহাস মুছুন' : 'Delete Date Range History'}
                  </h4>
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
                  {language === 'bn' ? 'সীমার ইতিহাস মুছুন' : 'Delete Range History'}
                </button>
              </div>

              {/* 3. Delete All History */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-rose-950/60 space-y-2">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <h4 className="text-xs font-bold">
                    {language === 'bn' ? 'সম্পূর্ণ সালাত ইতিহাস মুছুন' : 'Delete All Salah History'}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'আপনার অ্যাকাউন্টের সম্পূর্ণ সালাতের ইতিহাস স্থায়ীভাবে মুছে ফেলা হবে।'
                    : 'All recorded prayer history in your account will be permanently deleted.'}
                </p>
                <button
                  disabled={actionInProgress}
                  onClick={() => setShowDeleteConfirm('all')}
                  className="w-full py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {language === 'bn' ? 'সম্পূর্ণ ইতিহাস মুছুন' : 'Delete All History'}
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
              <h3 className="text-base font-bold text-white">
                {language === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {showDeleteConfirm === 'all'
                  ? (language === 'bn' 
                    ? 'আপনার সম্পূর্ণ সালাত হিস্ট্রি এবং অর্জিত অগ্রগতি মুছে ফেলা হবে। এই কাজটি আর ফিরিয়ে আনা সম্ভব নয়।'
                    : 'All your prayer history and achievements will be deleted. This action cannot be undone.')
                  : (language === 'bn'
                    ? `${selectedDate} তারিখের সালাত রেকর্ড মুছে ফেলা হবে।`
                    : `Prayer records for ${selectedDate} will be deleted.`)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                disabled={actionInProgress}
                onClick={() => {
                  if (showDeleteConfirm === 'all') handleDeleteAll();
                  else if (showDeleteConfirm === 'day') handleDeleteDay(selectedDate);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-lg disabled:opacity-50"
              >
                {actionInProgress 
                  ? (language === 'bn' ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...') 
                  : (language === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
