import React from 'react';
import { Home, Coins, Store, UserCheck, ShoppingBag } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

const NAV_ITEMS = [
  {
    id: 'home' as ActiveTab,
    labelBn: 'হোম',
    labelEn: 'Home',
    icon: Home
  },
  {
    id: 'tokens' as ActiveTab,
    labelBn: 'টোকেন',
    labelEn: 'My Token',
    icon: Coins,
    badge: '🪙'
  },
  {
    id: 'shops' as ActiveTab,
    labelBn: 'শপ',
    labelEn: 'Shops',
    icon: Store,
    badge: 'ছাড়'
  },
  {
    id: 'market' as ActiveTab,
    labelBn: 'মার্কেট',
    labelEn: 'Cave Market',
    icon: ShoppingBag,
    badge: 'নতুন'
  },
  {
    id: 'profile' as ActiveTab,
    labelBn: 'প্রোফাইল',
    labelEn: 'Profile',
    icon: UserCheck
  }
];

export const BottomNav: React.FC<BottomNavProps> = React.memo(({ activeTab, onChangeTab }) => {
  return (
    <nav 
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#060a14] border-t border-[#0e2c24] select-none pb-[env(safe-area-inset-bottom,0px)] [transform:translateZ(0)] will-change-transform" 
      style={{ contain: 'layout style', transform: 'translateZ(0)' }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 px-1 py-1.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              aria-label={item.labelBn}
              className={`relative min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-amber-300 font-bold'
                  : 'text-emerald-300/60 hover:text-emerald-100'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-0.5 bg-amber-400 rounded-full" />
              )}

              <div className="relative mt-0.5 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 leading-none">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] mt-1 tracking-tight truncate max-w-full font-medium leading-none">
                {item.labelBn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});


