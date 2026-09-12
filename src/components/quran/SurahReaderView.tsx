import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bookmark,
  Share2,
  Copy,
  Settings,
  X,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  MessageSquareText
} from 'lucide-react';
import { SurahDetail, AyahItem, QuranReadingSettings } from '../../types/quran';
import { quranService } from '../../services/quranService';
import { QuranSettingsModal } from './QuranSettingsModal';
import { AyahExplanationModal } from './AyahExplanationModal';

interface SurahReaderViewProps {
  surahNumber: number;
  initialAyahNumber?: number;
  settings: QuranReadingSettings;
  onBack: () => void;
  onNavigateSurah: (surahNumber: number, ayahNumber?: number) => void;
  onSaveSettings: (settings: QuranReadingSettings) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SurahReaderView: React.FC<SurahReaderViewProps> = ({
  surahNumber,
  initialAyahNumber = 1,
  settings,
  onBack,
  onNavigateSurah,
  onSaveSettings,
  onShowToast
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [activeAyah, setActiveAyah] = useState<number>(initialAyahNumber);
  const [isBookmarkedState, setIsBookmarkedState] = useState<Record<number, boolean>>({});
  const [jumpMenuOpen, setJumpMenuOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [explanationModalOpen, setExplanationModalOpen] = useState<boolean>(false);
  const [selectedExplanationAyah, setSelectedExplanationAyah] = useState<AyahItem | null>(null);
  const [targetFootnoteNumber, setTargetFootnoteNumber] = useState<string | null>(null);

  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleOpenExplanation = (ayah: AyahItem, footnoteNum?: string) => {
    setSelectedExplanationAyah(ayah);
    setTargetFootnoteNumber(footnoteNum || null);
    setExplanationModalOpen(true);
  };

  const renderBengaliTextWithBadges = (
    text: string,
    ayah: AyahItem
  ) => {
    if (!text) return null;
    const regex = /(\[[০-৯0-9]+\])/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        const match = part.match(/[০-৯0-9]+/);
        const numStr = match ? match[0] : '';
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenExplanation(ayah, numStr);
            }}
            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/25 border border-amber-400/80 text-amber-300 font-bold text-xs cursor-pointer hover:bg-amber-400 hover:text-emerald-950 transition-all shadow-xs active:scale-95"
            title={`টীকা ${part} ব্যাখ্যা দেখতে ট্যাপ করুন`}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Load Surah Content
  useEffect(() => {
    let active = true;
    const fetchSurah = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await quranService.getSurahDetail(surahNumber);
        if (active) {
          setSurah(data);
          // Initialize bookmark states
          const bookmarkMap: Record<number, boolean> = {};
          data.ayahs.forEach((a) => {
            bookmarkMap[a.ayahNumber] = quranService.isBookmarked(surahNumber, a.ayahNumber);
          });
          setIsBookmarkedState(bookmarkMap);
          setLoading(false);

          // If initial ayah is set, jump to it after render
          setTimeout(() => {
            scrollToAyah(initialAyahNumber);
            setActiveAyah(initialAyahNumber);
            quranService.saveLastRead(surahNumber, initialAyahNumber);
          }, 400);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'কুরআনের ডেটা লোড করতে ব্যর্থ হয়েছে।');
          setLoading(false);
        }
      }
    };

    fetchSurah();
    return () => {
      active = false;
    };
  }, [surahNumber]);

  const scrollToAyah = (ayahNum: number) => {
    const ref = ayahRefs.current[ayahNum];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveAyah(ayahNum);
      quranService.saveLastRead(surahNumber, ayahNum);
    }
  };

  const handleCopyAyah = (ayah: AyahItem) => {
    const textToCopy = `${ayah.arabicText}\n\n[বাংলা অনুবাদ: ${ayah.bengaliText}]\n\n— সূরা ${surah?.meta.nameBn} (আয়াত: ${ayah.ayahNumber})`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => onShowToast('আয়াত কপি করা হয়েছে!', 'success'))
      .catch(() => onShowToast('কপি করতে ব্যর্থ হয়েছে।', 'error'));
  };

  const handleToggleBookmark = (ayah: AyahItem) => {
    if (!surah) return;
    const isBookmarked = quranService.isBookmarked(surahNumber, ayah.ayahNumber);

    quranService.addBookmark({
      surahNumber,
      ayahNumber: ayah.ayahNumber,
      surahNameBn: surah.meta.nameBn,
      surahNameAr: surah.meta.nameAr,
      arabicExcerpt: ayah.arabicText.slice(0, 100),
      bengaliExcerpt: ayah.bengaliText.slice(0, 100)
    });

    const isNowBookmarked = !isBookmarked;
    setIsBookmarkedState((prev) => ({
      ...prev,
      [ayah.ayahNumber]: isNowBookmarked
    }));

    if (isNowBookmarked) {
      onShowToast(`আয়াত ${ayah.ayahNumber} বুকমার্ক করা হয়েছে`, 'success');
    } else {
      onShowToast(`আয়াত ${ayah.ayahNumber} বুকমার্ক থেকে সরানো হয়েছে`, 'info');
    }
  };

  const handleShareAyah = (ayah: AyahItem) => {
    if (!surah) return;
    const textToShare = `পবিত্র কুরআন মাজীদ • সূরা ${surah.meta.nameBn} • আয়াত ${ayah.ayahNumber}\n\n${ayah.arabicText}\n\nঅর্থ: ${ayah.bengaliText}\n\n— কেভ কম্প্যানিয়ন্স ডাউনলোড করুন এবং জামাতে নামাজে অভ্যস্ত হোন।`;

    if (navigator.share) {
      navigator.share({
        title: `সূরা ${surah.meta.nameBn} - আয়াত ${ayah.ayahNumber}`,
        text: textToShare
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(textToShare);
      onShowToast('শেয়ার করার লিংক ও টেক্সট কপি করা হয়েছে!', 'success');
    }
  };

  // Safe Bengali Number Convertor
  const toBnNum = (num: number): string => {
    const en = num.toString();
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return en.replace(/[0-9]/g, (w) => bn[parseInt(w, 10)]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
        <p className="text-sm font-semibold text-emerald-300">পবিত্র সূরা লোড হচ্ছে...</p>
      </div>
    );
  }

  if (error || !surah) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-900/60 flex items-center justify-center text-red-400">
          <X className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-base font-bold text-red-400">ত্রুটি দেখা দিয়েছে</p>
          <p className="text-xs text-emerald-300/80">{error || 'কোনো অজানা সমস্যা দেখা দিয়েছে।'}</p>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-emerald-900 border border-emerald-800 text-white font-bold text-xs cursor-pointer active:scale-95 transition"
        >
          কুরআনে ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02110c] to-[#010906] text-white pb-32">
      {/* Immersive Top Bar */}
      <div className="sticky top-0 z-30 bg-[#02110c]/95 backdrop-blur-md border-b border-emerald-900/60 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-emerald-950/70 text-emerald-300 hover:text-white border border-emerald-900/50 cursor-pointer active:scale-95 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
                {surah.meta.nameBn}
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold px-1.5 py-0.5 rounded-full font-mono">
                  #{surah.meta.number}
                </span>
              </h1>
              <p className="text-[10px] text-emerald-400/80">
                {surah.meta.revelationTypeBn} • {toBnNum(surah.meta.ayahCount)}টি আয়াত
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Settings Icon */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-emerald-950/70 text-emerald-300 hover:text-white border border-emerald-900/50 cursor-pointer active:scale-95 transition"
              title="পড়ার সেটিংস"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Jump Menu Trigger */}
            <button
              onClick={() => setJumpMenuOpen(!jumpMenuOpen)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer hover:bg-amber-500/20 transition active:scale-95 flex items-center gap-1"
            >
              <span>যাও</span>
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Jump Menu Dropdown */}
      {jumpMenuOpen && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 bg-[#03231a] border border-amber-500/40 rounded-2xl w-[90%] max-w-sm shadow-2xl p-4 animate-scaleUp">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-800/40 pb-2">
            <span className="text-xs font-bold text-amber-300">আয়াতে সরাসরি যান</span>
            <button
              onClick={() => setJumpMenuOpen(false)}
              className="p-1 rounded-full text-emerald-400 hover:bg-emerald-900/40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
            {surah.ayahs.map((a) => (
              <button
                key={a.ayahNumber}
                onClick={() => {
                  scrollToAyah(a.ayahNumber);
                  setJumpMenuOpen(false);
                }}
                className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
                  activeAyah === a.ayahNumber
                    ? 'bg-amber-400 border-amber-400 text-[#02110c]'
                    : 'bg-emerald-950/80 border-emerald-900 text-emerald-300 hover:bg-emerald-900'
                }`}
              >
                {toBnNum(a.ayahNumber)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Surah Card Cover */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-[#04281e] to-[#01140f] border border-emerald-700/60 shadow-xl text-center space-y-4">
          {/* Subtle islamic background patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>

          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>সূরা তিলাওয়াত</span>
          </div>

          <div className="space-y-1">
            <h2 className="font-arabic text-amber-200 text-3xl leading-none">{surah.meta.nameAr}</h2>
            <h3 className="text-xl font-extrabold text-white">{surah.meta.nameBn}</h3>
            <p className="text-xs text-emerald-300/80 italic">
              অর্থ: {surah.meta.meaningBn} • ({surah.meta.nameEn})
            </p>
          </div>

          <div className="border-t border-emerald-800/40 pt-3 flex items-center justify-center gap-4 text-xs text-emerald-200/80 font-semibold">
            <span>নাযিল: {surah.meta.revelationTypeBn}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80"></span>
            <span>মোট আয়াত: {toBnNum(surah.meta.ayahCount)}</span>
          </div>

          {/* Bismillah Cover Image/Art */}
          {surah.bismillah && (
            <div className="pt-4 border-t border-emerald-800/40">
              <p className="font-arabic text-amber-200 text-2xl tracking-wide select-none" dir="rtl">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
              </p>
              <p className="text-[11px] text-emerald-400/80 mt-1">
                পরম করুণাময় অসীম দয়ালু আল্লাহর নামে শুরু করছি।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Verses Container */}
      <div className="max-w-md mx-auto px-4 mt-6 space-y-4">
        {surah.ayahs.map((ayah) => {
          const isSelected = activeAyah === ayah.ayahNumber;
          const isBookmarked = isBookmarkedState[ayah.ayahNumber] || false;

          return (
            <div
              key={ayah.ayahNumber}
              ref={(el) => { ayahRefs.current[ayah.ayahNumber] = el; }}
              onClick={() => {
                setActiveAyah(ayah.ayahNumber);
                quranService.saveLastRead(surahNumber, ayah.ayahNumber);
              }}
              className={`p-5 rounded-2xl transition-all duration-300 border flex flex-col gap-4 relative group cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-br from-[#042d22] to-[#021812] border-amber-500/70 shadow-lg shadow-black/40 scale-[1.01]'
                  : 'bg-[#02140f]/90 border-emerald-950 hover:border-emerald-850 hover:bg-[#031d16]'
              }`}
            >
              {/* Ayah Actions & Number Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center border transition-all duration-200 ${
                      isSelected
                        ? 'bg-amber-400 text-[#02110c] border-amber-400'
                        : 'bg-emerald-950 border-emerald-900 text-emerald-300'
                    }`}
                  >
                    {toBnNum(ayah.ayahNumber)}
                  </span>
                  <span className="text-[10px] text-emerald-400/70 font-mono">
                    {surah.meta.nameBn} • আয়াত
                  </span>
                </div>

                <div className="flex items-center gap-1.5 opacity-90 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                  {/* Explanation Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenExplanation(ayah);
                    }}
                    className="px-2 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-400 hover:text-emerald-950 cursor-pointer active:scale-95 transition flex items-center gap-1 text-[11px] font-bold"
                    title="ব্যাখ্যা ও টীকা দেখুন"
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-amber-400" />
                    <span>ব্যাখ্যা</span>
                  </button>

                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBookmark(ayah);
                    }}
                    className={`p-2 rounded-lg border transition cursor-pointer active:scale-95 ${
                      isBookmarked
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-emerald-950/60 border-emerald-900 text-emerald-400 hover:text-white'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-300' : ''}`} />
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyAyah(ayah);
                    }}
                    className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-900 text-emerald-400 hover:text-white cursor-pointer active:scale-95 transition"
                    title="আয়াত কপি করুন"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareAyah(ayah);
                    }}
                    className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-900 text-emerald-400 hover:text-white cursor-pointer active:scale-95 transition"
                    title="শেয়ার করুন"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Arabic Text (Beautiful Quran Font) */}
              {settings.showArabic && (
                <div className="py-2">
                  <p
                    className="font-arabic text-amber-100 text-right leading-loose tracking-wide select-text antialiased"
                    style={{ fontSize: `${settings.arabicFontSize}px`, wordSpacing: '2px' }}
                    dir="rtl"
                  >
                    {ayah.arabicText}
                    <span className="inline-block font-sans text-amber-400 mr-2 select-none text-base border border-amber-500/20 rounded-full px-2 py-0.5 bg-amber-500/5 font-bold">
                      ﴿{toBnNum(ayah.ayahNumber)}﴾
                    </span>
                  </p>
                </div>
              )}

              {/* Bengali Meaning */}
              {settings.showTranslation && (
                <div className="pt-1">
                  <p
                    className="text-emerald-100 leading-relaxed font-normal select-text text-justify"
                    style={{ fontSize: `${settings.bengaliFontSize}px` }}
                  >
                    {renderBengaliTextWithBadges(ayah.bengaliText, ayah)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#02110c]/95 backdrop-blur-md border-t border-emerald-900/60 shadow-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-md mx-auto p-4 flex items-center justify-between gap-3">
          {/* Previous Surah */}
          <button
            disabled={surahNumber <= 1}
            onClick={() => onNavigateSurah(surahNumber - 1)}
            className="flex-1 py-3 rounded-2xl bg-emerald-950/80 border border-emerald-900 hover:bg-emerald-900 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>পূর্ববর্তী সূরা</span>
          </button>

          {/* Next Surah */}
          <button
            disabled={surahNumber >= 114}
            onClick={() => onNavigateSurah(surahNumber + 1)}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-md"
          >
            <span>পরবর্তী সূরা</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reading Settings Modal */}
      <QuranSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={onSaveSettings}
      />

      {/* Ayah Footnotes & Tafsir Explanation Modal */}
      <AyahExplanationModal
        isOpen={explanationModalOpen}
        onClose={() => setExplanationModalOpen(false)}
        surahNumber={surahNumber}
        surahNameBn={surah.meta.nameBn}
        ayah={selectedExplanationAyah}
        targetFootnoteNumber={targetFootnoteNumber}
      />
    </div>
  );
};
