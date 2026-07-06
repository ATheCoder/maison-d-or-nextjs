'use client';
/**
 * Daily Gold Mobile Tab Bar
 * Fixed bottom navigation for mobile
 */
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';

const TabIcon = ({ name, size = 22, color = 'currentColor' }) => {
  const icons = {
    gold: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    explore: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    saved: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
    family: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  };
  return icons[name] || null;
};

const TABS = [
  { label: 'For You', path: '/daily-gold-edition', iconName: 'gold' },
  { label: 'Explore', path: '/discover', iconName: 'explore' },
  { label: 'Saved', path: '/saved', iconName: 'saved' },
  { label: 'Family', path: '/family', iconName: 'family' },
];

export default function DGMobileTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <nav style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      height: 70,
      background: theme.bgCard,
      borderTop: `1px solid ${theme.accentGold}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 1rem',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.path;
        return (
          <button
            key={tab.label}
            onClick={() => router.push(tab.path)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '0.5rem',
              opacity: isActive ? 1 : 0.6,
              transition: 'all 0.2s ease',
            }}
          >
            <TabIcon name={tab.iconName} size={22} color={isActive ? theme.accentGold : theme.textMuted} />
            <span style={{
              fontFamily: theme.fontBody,
              fontSize: '0.65rem',
              color: isActive ? theme.accentGold : theme.textMuted,
              fontWeight: isActive ? 600 : 400,
            }}>
              {tab.label}
            </span>
            {isActive && (
              <div style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: theme.accentGold,
                marginTop: '2px',
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}