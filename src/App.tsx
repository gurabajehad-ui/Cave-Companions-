import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { ActiveTab, Mosque, PrayerInfo, TodayPrayerStatus } from './types';
import { api } from './services/api';
import { PRAYERS_CONFIG, getTodayPrayerOrder, HADITHS, toBnNumber } from './data/prayerConfig';
import { prayerReminderService } from './services/prayerReminderService';
import { offlineSyncService } from './services/offlineSyncService';
import { Sparkles, BookOpen, Landmark, RefreshCw, CloudUpload, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

// Dynamic confetti celebration helper
const triggerConfettiCelebration = async () => {
  try {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default;
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10b981', '#fbbf24', '#34d399', '#ffffff']
    });
  } catch (e) {}
};

// Core Initial Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { DailyProgressCard } from './components/DailyProgressCard';
import { SehriIftarCard } from './components/SehriIftarCard';
import { CompactPrayersCard } from './components/CompactPrayersCard';
import { DailyNasihaCard } from './components/DailyNasihaCard';
import { DigitalTasbihModal } from './components/DigitalTasbihModal';
import { MosqueDirectoryModal } from './components/MosqueDirectoryModal';
import { LegalModal } from './components/LegalModals';
import { QiblaFinderModal } from './components/QiblaFinderModal';
import AdBanner from './components/AdBanner';
import { ToastContainer, ToastMessage } from './components/Toast';

// Dynamically imported views with React.lazy to reduce initial bundle size & load time
const ShopsView = React.lazy(() => import('./components/ShopsView').then(m => ({ default: m.ShopsView })));
const AdminDashboardView = React.lazy(() => import('./components/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })));
const SalahJourneyView = React.lazy(() => import('./components/SalahJourneyView').then(m => ({ default: m.SalahJourneyView })));
const ProfileView = React.lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const MyTokenView = React.lazy(() => import('./components/MyTokenView').then(m => ({ default: m.MyTokenView })));
const MerchantPortalView = React.lazy(() => import('./components/MerchantPortalView').then(m => ({ default: m.MerchantPortalView })));
const NotificationsView = React.lazy(() => import('./components/NotificationsView').then(m => ({ default: m.NotificationsView })));
const CaveCirclesView = React.lazy(() => import('./components/CaveCirclesView').then(m => ({ default: m.CaveCirclesView })));
const SupportView = React.lazy(() => import('./components/SupportView').then(m => ({ default: m.SupportView })));
const CaveMarketView = React.lazy(() => import('./components/CaveMarketView').then(m => ({ default: m.CaveMarketView })));
const QuranMajidView = React.lazy(() => import('./components/quran/QuranMajidView').then(m => ({ default: m.QuranMajidView })));
const HisnulMuslimView = React.lazy(() => import('./components/hisnulMuslim/HisnulMuslimView').then(m => ({ default: m.HisnulMuslimView })));
const BlogView = React.lazy(() => import('./components/BlogView').then(m => ({ default: m.BlogView })));

// Lightweight Fallback for Lazy Views
const ViewLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3 py-16">
    <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
    <p className="text-xs text-emerald-400 font-medium">লোড হচ্ছে...</p>
  </div>
);

const SPLASH_SEEN_KEY = 'cave_splash_shown_session';
const SPLASH_TIME_KEY = 'cave_splash_last_shown_time';

const hasSeenSplashInSession = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    if (sessionStorage.getItem(SPLASH_SEEN_KEY) === 'true') {
      return true;
    }
    const lastShown = localStorage.getItem(SPLASH_TIME_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown, 10);
      if (!isNaN(elapsed) && elapsed < 12 * 60 * 60 * 1000) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
};

export default function App() {
  const { user, isLoading, logout, refreshUser } = useAuth();

  const getInitialTab = (): ActiveTab => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Explicit admin portal route
    if (path.startsWith('/admin') || hash === '#admin' || hash.startsWith('#admin-')) {
      return 'admin';
    }
    
    // Specific shop item deep link
    if (hash.startsWith('#shop-')) {
      return 'shops';
    }

    // Explicit Quran or Hisnul Muslim direct route or hash
    if (path === '/quran' || hash === '#quran') {
      return 'quran';
    }
    if (path === '/hisnul-muslim' || hash === '#hisnul_muslim') {
      return 'hisnul_muslim';
    }
    
    // Explicit hash navigation
    if (hash.startsWith('#') && hash.length > 1) {
      const cleanHash = hash.substring(1);
      const validTabs: ActiveTab[] = ['home', 'quran', 'hisnul_muslim', 'tokens', 'shops', 'market', 'profile', 'prayer_journey', 'notifications', 'support', 'merchant', 'admin', 'cave_circle'];
      if (validTabs.includes(cleanHash as ActiveTab)) {
        return cleanHash as ActiveTab;
      }
    }

    // Check saved tab in localStorage so refreshing stays on the active page
    try {
      const savedTab = localStorage.getItem('cave_active_tab_current');
      const validTabs: ActiveTab[] = ['home', 'quran', 'hisnul_muslim', 'tokens', 'shops', 'market', 'profile', 'prayer_journey', 'notifications', 'support', 'merchant', 'admin', 'cave_circle'];
      if (savedTab && validTabs.includes(savedTab as ActiveTab)) {
        return savedTab as ActiveTab;
      }
    } catch (e) {
      // ignore
    }
    
    return 'home';
  };

  // Navigation & Screen states
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);

  // Sync activeTab with localStorage and URL hash on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('cave_active_tab_current', activeTab);
      if (!window.location.hash.startsWith('#shop-') && !window.location.hash.startsWith('#admin-')) {
        if (activeTab === 'home') {
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          window.history.replaceState(null, '', `#${activeTab}`);
        }
      }
    } catch (e) {
      console.warn('Failed to save activeTab state', e);
    }
  }, [activeTab]);
  const [showSplash, setShowSplash] = useState<boolean>(() => !hasSeenSplashInSession());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Modals
  const [showMosqueModal, setShowMosqueModal] = useState<boolean>(false);
  const [showTasbihModal, setShowTasbihModal] = useState<boolean>(false);
  const [showQiblaModal, setShowQiblaModal] = useState<boolean>(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'about' | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Check if the prompt event was already captured globally in index.html
    if ((window as any).deferredPrompt) {
      const evt = (window as any).deferredPrompt;
      setDeferredPrompt(evt);
      setShowInstallPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      setShowInstallPrompt(true);
    };

    const handleCustomPromptAvailable = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
        (window as any).deferredPrompt = e.detail;
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handleCustomPromptAvailable as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handleCustomPromptAvailable as EventListener);
    };
  }, []);

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || (window as any).deferredPrompt;
    if (!activePrompt) {
      showToast('info', 'ইন্সটল', 'আপনি ব্রাউজারের "Add to Home Screen" বা "Install App" অপশন ব্যবহার করে ইন্সটল করতে পারেন।');
      return;
    }

    try {
      // Show the native install prompt
      await activePrompt.prompt();
      // Wait for the user choice
      const choiceResult = await activePrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('success', 'ইন্সটল সফল', 'অ্যাপটি সফলভাবে ডিভাইসে ইনস্টল করা হয়েছে।');
      }
    } catch (err: any) {
      console.error('[PWA] Error triggering install prompt:', err);
    } finally {
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      setShowInstallPrompt(false);
    }
  };

  // Notifications State
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [actionLoadingPrayerType, setActionLoadingPrayerType] = useState<string | null>(null);

  // Offline Sync State
  const [pendingOfflineItems, setPendingOfflineItems] = useState(offlineSyncService.getPendingCheckIns());
  const [isSyncingOffline, setIsSyncingOffline] = useState(offlineSyncService.getIsSyncing());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Prayer state
  const [todayStatus, setTodayStatus] = useState<TodayPrayerStatus | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loadingPrayers, setLoadingPrayers] = useState<boolean>(true);
  const [randomHadithIndex, setRandomHadithIndex] = useState<number>(0);
  const [nasihaList, setNasihaList] = useState<any[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch notification count
  const fetchNotificationCount = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('cave_companions_auth_token');
    if (!token) return;
    try {
      const data = await api.getNotifications(true);
      setUnreadNotificationsCount(data.unreadCount || 0);
    } catch (err: any) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const isNetworkOrTimeout = isOffline || err.isNetworkError || err.isTimeout || (err.message && (
        err.message.includes('নেটওয়ার্ক') || 
        err.message.includes('সংযোগ') || 
        err.message.includes('fetch') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('AbortError') ||
        err.message.includes('timeout')
      ));
      if (isNetworkOrTimeout) {
        console.warn('Network issue fetching notification count:', err);
        return;
      }
      if (err.message && (err.message.includes('লগইন') || err.message.includes('সেশন') || err.message.includes('UNAUTHORIZED') || err.message.includes('INVALID_TOKEN'))) {
        logout();
        return;
      }
      console.error('Failed to fetch notification count:', err);
    }
  }, [user, logout]);

  // Fetch today's prayer status
  const fetchTodayStatus = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('cave_companions_auth_token');
    if (!token) return;
    try {
      setLoadingPrayers(true);
      const data = await api.getTodayPrayers();
      setTodayStatus(data);
    } catch (err: any) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const isNetworkOrTimeout = isOffline || err.isNetworkError || err.isTimeout || (err.message && (
        err.message.includes('নেটওয়ার্ক') || 
        err.message.includes('সংযোগ') || 
        err.message.includes('fetch') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('AbortError') ||
        err.message.includes('timeout')
      ));
      if (isNetworkOrTimeout) {
        console.warn('Network issue fetching today prayers:', err);
        return;
      }
      if (err.message && (err.message.includes('লগইন') || err.message.includes('সেশন') || err.message.includes('UNAUTHORIZED') || err.message.includes('INVALID_TOKEN'))) {
        logout();
        return;
      }
      console.error('Failed to fetch today prayers:', err);
    } finally {
      setLoadingPrayers(false);
    }
  }, [user, logout]);

  // Fetch registered mosques
  const fetchMosques = useCallback(async () => {
    try {
      const data = await api.getMosques();
      if (data && Array.isArray(data.mosques)) {
        setMosques(data.mosques);
        offlineSyncService.cacheMosques(data.mosques);
      }
    } catch (err: any) {
      const cached = offlineSyncService.getCachedMosques();
      if (cached && cached.length > 0) {
        setMosques(cached);
      }
      console.warn('[App] Could not fetch mosques from server, using local cache:', err?.message || err);
    }
  }, []);

  const handleDismissSplash = useCallback(() => {
    setShowSplash(false);
    setActiveTab('home');
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SPLASH_SEEN_KEY, 'true');
      } catch (e) {}
      try {
        localStorage.setItem(SPLASH_TIME_KEY, Date.now().toString());
      } catch (e) {}
      if (!window.location.pathname.startsWith('/admin') && window.location.pathname !== '/quran') {
        window.history.replaceState(null, '', `/${window.location.search}`);
      }
    }
  }, []);

  const fetchNasiha = useCallback(async () => {
    try {
      const res = await api.getPublicNasihaList();
      if (res && res.success && Array.isArray(res.list) && res.list.length > 0) {
        setNasihaList(res.list);
      }
    } catch (err: any) {
      console.warn('[App] Could not fetch public nasiha:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    if (!showSplash) return;

    // Immediately mark as seen so rapid refresh or returning doesn't re-trigger splash
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, 'true');
      localStorage.setItem(SPLASH_TIME_KEY, Date.now().toString());
    } catch (e) {}

    // Show splash screen for a fixed duration on first session startup
    const timer = setTimeout(() => {
      handleDismissSplash();
    }, 2500);

    return () => clearTimeout(timer);
  }, [showSplash, handleDismissSplash]);

  useEffect(() => {
    // Fire API calls immediately in parallel without staggered timeouts
    fetchNasiha();
    
    if (user) {
      Promise.allSettled([
        fetchTodayStatus(),
        fetchMosques(),
        fetchNotificationCount()
      ]);
      setShowAuthModal(false);
    }
  }, [user, fetchNasiha, fetchTodayStatus, fetchMosques, fetchNotificationCount]);

  // Daily Hadith rotator
  useEffect(() => {
    const dayIndex = new Date().getDate() % HADITHS.length;
    setRandomHadithIndex(dayIndex);
  }, []);

  // Initialize Offline Sync Service
  useEffect(() => {
    offlineSyncService.init(
      () => {
        fetchTodayStatus();
        refreshUser();
      },
      (type, title, msg) => {
        showToast(type, title, msg);
      }
    );

    const updateOfflineStatus = () => {
      setPendingOfflineItems(offlineSyncService.getPendingCheckIns());
      setIsSyncingOffline(offlineSyncService.getIsSyncing());
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    };

    window.addEventListener('cave_offline_queue_updated', updateOfflineStatus);
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);

    return () => {
      window.removeEventListener('cave_offline_queue_updated', updateOfflineStatus);
      window.removeEventListener('online', updateOfflineStatus);
      window.removeEventListener('offline', updateOfflineStatus);
    };
  }, [showToast, fetchTodayStatus, refreshUser]);

  // Initialize Prayer Push Reminder Service (local notifications when prayer time starts)
  useEffect(() => {
    prayerReminderService.setInAppReminderCallback((prayerType, nameBn, startTimeStr) => {
      showToast(
        'info',
        `🕌 ${nameBn} সালাতের ওয়াক্ত শুরু হয়েছে`,
        `এখন ${nameBn} সালাতের ওয়াক্ত শুরু হয়েছে (${startTimeStr})। সালাত আদায় করে নিন।`
      );
    });

    prayerReminderService.startScheduler();

    return () => {
      prayerReminderService.stopScheduler();
    };
  }, [showToast]);

  // Global routing, popstate, and hash change navigation listener
  useEffect(() => {
    (window as any).setAppActiveTab = (tab: any) => {
      setActiveTab(tab);
    };

    const handleUrlNavigation = () => {
      const currentTab = getInitialTab();
      setActiveTab(currentTab);
    };

    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (!hash) return;
      
      if (hash.startsWith('#shop-')) {
        setActiveTab('shops');
      } else {
        handleUrlNavigation();
      }
    };

    window.addEventListener('hashchange', handleHashNavigation);
    window.addEventListener('popstate', handleUrlNavigation);
    
    // Run immediately on mount
    handleUrlNavigation();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin') && window.location.pathname !== '/' && window.location.pathname !== '/quran') {
      window.history.replaceState(null, '', `/${window.location.search}`);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
      window.removeEventListener('popstate', handleUrlNavigation);
    };
  }, []);

  // Track user login transition to always default to 'home' upon login
  const userLoggedInRef = useRef<boolean>(!!user);
  useEffect(() => {
    if (!userLoggedInRef.current && user) {
      setActiveTab('home');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
    }
    userLoggedInRef.current = !!user;
  }, [user]);

  // Synchronize activeTab state changes to URL path
  useEffect(() => {
    if (activeTab) {
      const currentPath = window.location.pathname;
      const search = window.location.search;
      let targetPath = '/';
      
      if (activeTab === 'admin') {
        // Let AdminDashboardView handle sub-paths, but ensure we are on /admin...
        if (!currentPath.startsWith('/admin')) {
          targetPath = '/admin/analytics';
        } else {
          return;
        }
      } else if (activeTab !== 'home') {
        targetPath = `/${activeTab}`;
      }
      
      if (currentPath !== targetPath) {
        window.history.pushState(null, '', `${targetPath}${search}`);
      }
    }
  }, [activeTab]);

  // User cached location ref with timestamp to prevent repeated GPS requests within 45 seconds
  const lastKnownLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Stable navigation & modal handlers to preserve React.memo across renders
  const handleOpenMosques = useCallback(() => setShowMosqueModal(true), []);
  const handleOpenNotifications = useCallback(() => setActiveTab('notifications'), []);
  const handleOpenTasbih = useCallback(() => setShowTasbihModal(true), []);
  const handleOpenJourney = useCallback(() => setActiveTab('prayer_journey'), []);
  const handleOpenTokens = useCallback(() => setActiveTab('tokens'), []);

  // Handler for 1-Click Salat recording:
  // - User taps "আলহামদুলিল্লাহ, সালাত সম্পন্ন করেছি" ONCE.
  // - Female users: Instant prayer time validation -> save attendance -> small toast.
  // - Male users: Instant prayer time validation -> obtain location (cached/fast) -> auto mosque-radius validation -> save attendance -> small toast.
  // - ZERO modals, ZERO popups, ZERO screens. The user stays on the normal Salat page.
  const handlePrayerAction = useCallback(async (prayer: PrayerInfo) => {
    if (actionLoadingPrayerType) return; // Prevent double tap

    const gender = (user?.gender || 'male').toLowerCase();
    const isFemale = gender === 'female';

    setActionLoadingPrayerType(prayer.type);

    try {
      if (isFemale) {
        // FEMALE FLOW:
        const result = await api.verifyPrayer(prayer.type, {
          mosqueId: 'FEMALE_DIRECT'
        });

        triggerConfettiCelebration();

        showToast(
          'success',
          'আলহামদুলিল্লাহ!',
          'আলহামদুলিল্লাহ! সালাতের রেকর্ড সংরক্ষণ হয়েছে।'
        );

        if ((result as any)?.tokenResult?.message) {
          showToast('info', '🪙 টোকেন রিওয়ার্ড', (result as any).tokenResult.message);
        }

        await Promise.allSettled([
          fetchTodayStatus(),
          refreshUser()
        ]);
      } else {
        // MALE FLOW:
        if (!navigator.geolocation) {
          showToast('error', 'লোকেশন প্রয়োজন', 'লোকেশন যাচাই করা যাচ্ছে না। Location চালু আছে কিনা দেখুন।');
          return;
        }

        let coords: { lat: number; lng: number } | null = null;
        const now = Date.now();
        if (lastKnownLocationRef.current && (now - lastKnownLocationRef.current.timestamp) < 45000) {
          coords = {
            lat: lastKnownLocationRef.current.lat,
            lng: lastKnownLocationRef.current.lng
          };
        } else {
          coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                lastKnownLocationRef.current = { ...loc, timestamp: Date.now() };
                resolve(loc);
              },
              (geoErr) => {
                console.warn('[GPS Acquisition Warning]', geoErr);
                resolve(null);
              },
              {
                enableHighAccuracy: true,
                timeout: 6000,
                maximumAge: 30000
              }
            );
          });
        }

        if (!coords) {
          showToast('error', 'লোকেশন প্রয়োজন', 'লোকেশন যাচাই করা যাচ্ছে না। Location চালু আছে কিনা দেখুন।');
          return;
        }

        const result = await api.verifyPrayer(prayer.type, {
          lat: coords.lat,
          lng: coords.lng
        });

        triggerConfettiCelebration();

        showToast(
          'success',
          'আলহামদুলিল্লাহ!',
          'আলহামদুলিল্লাহ! সালাতের রেকর্ড সংরক্ষণ হয়েছে।'
        );

        if ((result as any)?.tokenResult?.message) {
          showToast('info', '🪙 টোকেন রিওয়ার্ড', (result as any).tokenResult.message);
        }

        await Promise.allSettled([
          fetchTodayStatus(),
          refreshUser()
        ]);
      }
    } catch (err: any) {
      const msg = err.message || 'সালাতের রেকর্ড সংরক্ষণ করা সম্ভব হয়নি।';
      showToast('error', 'যাচাই ব্যর্থ', msg);
    } finally {
      setActionLoadingPrayerType(null);
    }
  }, [actionLoadingPrayerType, user, showToast, fetchTodayStatus, refreshUser]);

  // Show Splash Screen first on fresh session startup
  if (showSplash) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <SplashScreen
          onStart={handleDismissSplash}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-emerald-300">কেভ কম্প্যানিয়ন্স লোড হচ্ছে...</p>
      </div>
    );
  }

  // Not logged in: Show Auth Screen
  if (!user) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <AuthScreen
          onSuccess={() => {
            setActiveTab('home');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
            showToast('success', 'স্বাগতম', 'সফলভাবে লগইন সম্পন্ন হয়েছে!');
          }}
        />
      </>
    );
  }

  const todayDateStr = todayStatus ? todayStatus.date : new Date().toISOString().split('T')[0];
  const completedCount = todayStatus ? todayStatus.completedCount : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-app)] flex flex-col selection:bg-emerald-600 selection:text-white pb-16">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Header */}
      {activeTab === 'home' && (
        <Header
          onOpenNotifications={handleOpenNotifications}
          unreadNotificationsCount={unreadNotificationsCount}
          showInstallPrompt={showInstallPrompt}
          onInstallClick={handleInstallClick}
          onOpenTasbih={handleOpenTasbih}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-2xl mx-auto px-4 pb-5 ${activeTab === 'home' ? 'pt-1.5' : 'pt-5'}`}>
        {/* Tab 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            <AdBanner pageName="HOME" placementSlot="TOP" />
            
            {/* Daily Progress Counter Card with Built-In Arc Countdown Timer */}
            <DailyProgressCard
              todayStatus={todayStatus}
              completedCount={completedCount}
              totalPrayers={5}
              dateStr={todayDateStr}
              userDistrict={user?.district}
              userGender={user?.gender}
              onOpenJourney={handleOpenJourney}
              onOpenTokens={handleOpenTokens}
            />

            <AdBanner pageName="HOME" placementSlot="BEFORE_PRODUCTS" />

            {/* Offline Sync Banner (Visible when offline, syncing, or when offline items are pending) */}
            {(pendingOfflineItems.length > 0 || isSyncingOffline || !isOnline) && (
              <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
                isSyncingOffline
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : !isOnline
                  ? 'bg-slate-800/10 border-slate-700/30 text-slate-800 dark:text-slate-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isSyncingOffline
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : !isOnline
                      ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isSyncingOffline ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : !isOnline ? (
                      <WifiOff className="w-4 h-4" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold leading-tight truncate">
                      {isSyncingOffline
                        ? 'সার্ভারের সাথে সিঙ্ক হচ্ছে...'
                        : !isOnline
                        ? `ডিভাইস অফলাইনে আছে (${pendingOfflineItems.length}টি পেন্ডিং)`
                        : `অফলাইনে সংরক্ষিত চেক-ইন: ${pendingOfflineItems.length}টি`}
                    </h4>
                    <p className="text-[11px] opacity-80 mt-0.5 leading-snug">
                      {isSyncingOffline
                        ? 'অনুগ্রহ করে অপেক্ষা করুন, সার্ভারে উপস্থিতি যাচাই করা হচ্ছে'
                        : !isOnline
                        ? 'ইন্টারনেট সংযোগ ফিরলে স্বয়ংক্রিয়ভাবে সার্ভারের সাথে সিঙ্ক হবে'
                        : 'ইন্টারনেট চালু হয়েছে। সবগুলো চেক-ইন সার্ভারে পাঠাতে সিঙ্ক করুন'}
                    </p>
                  </div>
                </div>

                {isOnline && !isSyncingOffline && pendingOfflineItems.length > 0 && (
                  <button
                    onClick={() => offlineSyncService.syncPendingCheckIns(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>সিঙ্ক করুন</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Features Grid */}

            {/* Five Daily Prayers Section */}
            <CompactPrayersCard
              todayStatus={todayStatus}
              userDistrict={user?.district}
              userGender={user?.gender}
              onCompletePrayer={handlePrayerAction}
              actionLoadingPrayerType={actionLoadingPrayerType}
              onShowToast={showToast}
              todayDateStr={todayDateStr}
            />

            {/* Daily Nasiha Inspiration Card */}
            <DailyNasihaCard
              nasihaList={nasihaList}
              randomHadithIndex={randomHadithIndex}
            />

            {/* Sahri and Iftar Timetable Card (Salafi Principles, GPS-based) */}
            <SehriIftarCard userDistrict={user?.district} onShowToast={showToast} />

            {/* Registered Mosques Banner Quick Link (Compact Secondary Section) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowMosqueModal(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowMosqueModal(true); }}
              className="p-3 rounded-2xl bg-[#031d16] hover:bg-emerald-950/70 border border-emerald-800/40 transition-colors cursor-pointer flex items-center justify-between gap-3 text-white shadow-sm select-none"
              style={{ contain: 'layout style', transform: 'translateZ(0)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/40 text-amber-300 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <h4 className="text-xs font-bold text-slate-100 truncate">
                    অনুমোদিত মসজিদ
                  </h4>
                  <span className="text-[11px] text-emerald-300/80 font-medium truncate">
                    • {toBnNumber(mosques.length || 4)}টি সক্রিয়
                  </span>
                </div>
              </div>
              <span className="text-xs text-amber-300 font-bold shrink-0">
                তালিকা দেখুন →
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: MY TOKENS (Phase 4 & 5) */}
        {activeTab === 'tokens' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <MyTokenView
              onShowToast={showToast}
              onNavigateToHome={() => setActiveTab('home')}
              onNavigateToShops={() => setActiveTab('shops')}
            />
          </React.Suspense>
        )}

        {/* Tab 3: SHOPS (Phase 6) */}
        {activeTab === 'shops' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <ShopsView
              onShowToast={showToast}
              onNavigateToTokens={() => setActiveTab('tokens')}
              onNavigateToMerchant={() => setActiveTab('merchant')}
            />
          </React.Suspense>
        )}

        {/* Tab 3.5: CAVE MARKET */}
        {activeTab === 'market' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <CaveMarketView />
          </React.Suspense>
        )}

        {/* Tab 4: MERCHANT PORTAL (Phase 7) */}
        {activeTab === 'merchant' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <MerchantPortalView
              onShowToast={showToast}
              onExitMerchant={() => setActiveTab('shops')}
            />
          </React.Suspense>
        )}

        {/* Tab 5: PROFILE */}
        {activeTab === 'profile' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <ProfileView
              onLogout={() => {
                setActiveTab('home');
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', '/');
                }
                logout();
                showToast('info', 'লগআউট', 'আপনি সফলভাবে লগআউট করেছেন।');
              }}
              onShowToast={showToast}
              onNavigateTab={tab => setActiveTab(tab as ActiveTab)}
              onOpenTasbih={() => setShowTasbihModal(true)}
              onOpenQibla={() => setShowQiblaModal(true)}
              onOpenLegal={type => setLegalModalType(type)}
              onOpenMosques={handleOpenMosques}
            />
          </React.Suspense>
        )}

        {/* Tab 5.5: QURAN MAJID MODULE */}
        {activeTab === 'quran' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <QuranMajidView
              onBack={() => setActiveTab('profile')}
              onShowToast={(msg, type) => showToast(type, 'কুরআন মাজীদ', msg)}
            />
          </React.Suspense>
        )}

        {/* Tab 5.6: HISNUL MUSLIM MODULE */}
        {activeTab === 'hisnul_muslim' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <HisnulMuslimView
              onBack={() => setActiveTab('profile')}
              onShowToast={(msg, type) => showToast(type, 'হিসনুল মুসলিম', msg)}
            />
          </React.Suspense>
        )}

        {/* Tab 5.7: CAVE CIRCLES MODULE */}
        {activeTab === 'cave_circle' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <CaveCirclesView
              onBack={() => setActiveTab('profile')}
              onShowToast={showToast}
            />
          </React.Suspense>
        )}

        {/* Tab 6: NOTIFICATIONS (Phase 8) */}
        {activeTab === 'notifications' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <NotificationsView
              onBack={() => setActiveTab('home')}
              onShowToast={showToast}
              onNotificationReadChange={count => setUnreadNotificationsCount(count)}
            />
          </React.Suspense>
        )}

        {/* Tab: BLOG */}
        {activeTab === 'blog' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <BlogView onBack={() => setActiveTab('profile')} />
          </React.Suspense>
        )}

        {/* Tab 7: SALAH JOURNEY & GROWTH (Dedicated Full-Screen View) */}
        {(activeTab === 'prayer_journey' || activeTab === 'prayer_history' || activeTab === 'history') && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <SalahJourneyView
              onBack={() => setActiveTab('home')}
              onShowToast={showToast}
            />
          </React.Suspense>
        )}

        {/* Tab 8: HELP & SUPPORT (Phase 8) */}
        {activeTab === 'support' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <SupportView
              onBack={() => setActiveTab('profile')}
              onShowToast={showToast}
            />
          </React.Suspense>
        )}

        {/* Tab 9: ADMIN DASHBOARD (Phase 9 & 10) */}
        {activeTab === 'admin' && (
          <React.Suspense fallback={<ViewLoadingFallback />}>
            <AdminDashboardView
              onBack={() => setActiveTab('profile')}
              onShowToast={showToast}
            />
          </React.Suspense>
        )}
      </main>

      {/* Bottom Navigation */}
      {['home', 'tokens', 'shops', 'market', 'profile'].includes(activeTab) && (
        <BottomNav
          activeTab={activeTab as any}
          onChangeTab={setActiveTab}
        />
      )}

      {/* Dynamic Modals loaded in Suspense */}
      <React.Suspense fallback={null}>
        {/* Legal Policy & Terms Modal */}
        {legalModalType && (
          <LegalModal
            isOpen={!!legalModalType}
            type={legalModalType}
            onClose={() => setLegalModalType(null)}
          />
        )}

        {/* Mosque Directory Modal */}
        {showMosqueModal && (
          <MosqueDirectoryModal
            onClose={() => setShowMosqueModal(false)}
          />
        )}

        {/* Digital Tasbih Modal */}
        {showTasbihModal && (
          <DigitalTasbihModal
            isOpen={showTasbihModal}
            onClose={() => setShowTasbihModal(false)}
            onShowToast={(msg, t) => showToast(t, 'তাসবীহ', msg)}
          />
        )}

        {/* Qibla Finder Modal */}
        <QiblaFinderModal
          isOpen={showQiblaModal}
          onClose={() => setShowQiblaModal(false)}
          userDistrict={user?.district || ''}
          onShowToast={showToast}
        />
      </React.Suspense>
    </div>
  );
}
