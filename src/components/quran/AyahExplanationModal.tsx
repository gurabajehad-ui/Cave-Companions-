import React, { useState, useEffect } from 'react';
import { X, BookOpen, Sparkles, MessageSquareText, Layers, RefreshCw } from 'lucide-react';
import { AyahItem } from '../../types/quran';
import { quranService } from '../../services/quranService';

interface AyahExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  surahNameBn: string;
  ayah: AyahItem | null;
  targetFootnoteNumber?: string | null;
}

export const AyahExplanationModal: React.FC<AyahExplanationModalProps> = ({
  isOpen,
  onClose,
  surahNumber,
  surahNameBn,
  ayah,
  targetFootnoteNumber
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [footnotes, setFootnotes] = useState<string | null>(null);
  const [tafsir, setTafsir] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'footnotes' | 'tafsir'>('footnotes');

  // Convert English numbers to Bengali
  const toBnNum = (num: number | string): string => {
    const en = num.toString();
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return en.replace(/[0-9]/g, (w) => bn[parseInt(w, 10)]);
  };

  useEffect(() => {
    if (!isOpen || !ayah) return;

    setFootnotes(ayah.footnotes || null);
    setTafsir(ayah.tafsir || null);

    // If no footnotes or tafsir present, auto fetch
    if (!ayah.footnotes && !ayah.tafsir) {
      loadExplanation();
    }
  }, [isOpen, ayah, surahNumber]);

  const loadExplanation = async () => {
    if (!ayah) return;
    setLoading(true);
    try {
      const res = await quranService.fetchAyahExplanation(surahNumber, ayah.ayahNumber);
      if (res.footnotes) setFootnotes(res.footnotes);
      if (res.tafsir) setTafsir(res.tafsir);
    } catch (err) {
      console.warn('Failed to load explanation', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ayah) return null;

  // Parse footnotes into individual items if structured
  const parseFootnotesList = (text: string) => {
    if (!text) return [];

    // Split by bracket patterns like [১], [২], [1], etc.
    const parts = text.split(/(?=\[[০-৯0-9]+\])/g).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return [text];
    return parts;
  };

  const parsedFootnotes = footnotes ? parseFootnotesList(footnotes) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg bg-gradient-to-b from-[#03231a] to-[#01140f] border border-emerald-700/60 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-emerald-800/60 bg-[#021812]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>ব্যাখ্যা ও টীকাসমূহ</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-400/30">
                  আয়াত {toBnNum(ayah.ayahNumber)}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-400/80">
                সূরা {surahNameBn} (সূরা #{surahNumber})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-emerald-950 border border-emerald-900 text-emerald-300 hover:text-white transition cursor-pointer active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Ayah Snippet Card */}
          <div className="p-4 rounded-2xl bg-[#021812] border border-emerald-900/80 space-y-3">
            <p className="font-arabic text-amber-200 text-right text-xl leading-loose" dir="rtl">
              {ayah.arabicText}
            </p>
            <p className="text-xs text-emerald-100/90 leading-relaxed pt-2 border-t border-emerald-900/60">
              {ayah.bengaliText}
            </p>
          </div>

          {/* Navigation Tabs (if both footnotes and tafsir available) */}
          {(footnotes || tafsir) && (
            <div className="flex items-center gap-2 bg-emerald-950/80 p-1 rounded-xl border border-emerald-900/60">
              <button
                onClick={() => setActiveTab('footnotes')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'footnotes'
                    ? 'bg-amber-400 text-[#02110c] shadow-md'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>টীকাসমূহ ({parsedFootnotes.length})</span>
              </button>
              {tafsir && (
                <button
                  onClick={() => setActiveTab('tafsir')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'tafsir'
                      ? 'bg-amber-400 text-[#02110c] shadow-md'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>বিস্তারিত তাফসীর</span>
                </button>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
              <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
              <p className="text-xs text-emerald-300">প্রামাণ্য টীকা ও ব্যাখ্যা লোড হচ্ছে...</p>
            </div>
          )}

          {/* Footnotes Display */}
          {!loading && activeTab === 'footnotes' && (
            <div className="space-y-3">
              {parsedFootnotes.length > 0 ? (
                parsedFootnotes.map((fn, idx) => {
                  const isHighlighted = targetFootnoteNumber && fn.includes(`[${targetFootnoteNumber}]`);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isHighlighted
                          ? 'bg-amber-500/15 border-amber-400/80 shadow-lg ring-1 ring-amber-400/40'
                          : 'bg-[#021812]/90 border-emerald-800/60 hover:border-emerald-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-[#02110c] font-bold text-[11px] font-mono">
                          টীকা
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-xs text-emerald-100 leading-relaxed font-normal whitespace-pre-line">
                        {fn}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center space-y-2 bg-[#021812] rounded-2xl border border-emerald-900/60 p-4">
                  <p className="text-xs text-emerald-300/80">
                    এই আয়াতের জন্য কোনো বিশেষ টীকা সংকেত প্রয়োজন হয়নি।
                  </p>
                  {tafsir && (
                    <button
                      onClick={() => setActiveTab('tafsir')}
                      className="mt-2 text-xs text-amber-300 font-bold underline cursor-pointer"
                    >
                      বিস্তারিত তাফসীর দেখুন
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tafsir Display */}
          {!loading && activeTab === 'tafsir' && tafsir && (
            <div className="p-4 rounded-2xl bg-[#021812]/90 border border-emerald-800/60 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-900/60">
                <span className="px-2 py-0.5 rounded-md bg-emerald-800 text-amber-300 font-bold text-[11px]">
                  আহসানুল বায়ান / ইবনে কাসীর তাফসীর
                </span>
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed font-normal whitespace-pre-line text-justify">
                {tafsir}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-emerald-900/60 bg-[#021812]/95 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-emerald-400/70">
            সূত্র: কুরআনএকাদেমী / ড. আবু বকর মুহাম্মাদ যাকারিয়া তাফসীর
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#02110c] font-bold text-xs transition cursor-pointer active:scale-95"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
