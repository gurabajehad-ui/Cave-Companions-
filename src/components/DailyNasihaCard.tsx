import React from 'react';
import { BookOpen } from 'lucide-react';
import { HADITHS } from '../data/prayerConfig';

interface DailyNasihaCardProps {
  nasihaList?: any[];
  randomHadithIndex: number;
}

export const DailyNasihaCard: React.FC<DailyNasihaCardProps> = React.memo(({
  nasihaList = [],
  randomHadithIndex
}) => {
  const activeSource = nasihaList && nasihaList.length > 0 ? nasihaList : HADITHS;
  const currentItem = activeSource[randomHadithIndex % activeSource.length];

  return (
    <div 
      style={{ contain: 'layout style', transform: 'translateZ(0)' }}
      className="rounded-2xl border border-[#0c4334] bg-[#022119] p-3.5 shadow-sm text-white"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-1.5">
        <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="tracking-wide text-[11px] font-bold">দৈনিক নসিহা</span>
      </div>
      <p className="text-xs text-emerald-100/90 leading-relaxed font-normal">
        "{currentItem?.textBn}"
      </p>
      {currentItem?.sourceBn && (
        <div className="text-[10px] text-amber-300/90 text-right font-medium mt-1">
          — {currentItem.sourceBn}
        </div>
      )}
    </div>
  );
});

