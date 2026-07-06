'use client';
/**
 * Daily Gold Navigation Rail (Desktop)
 * Fixed left sidebar navigation
 */
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeContext';
import { useState } from 'react';

const NavIcon = ({ name, size = 20, color = 'currentColor' }) => {
  const icons = {
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    academy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    gold: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    journeys: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    library: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
    family: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    profile: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  };
  return icons[name] || null;
};

const NAV_ITEMS = [
  { label: 'Home', path: '/home', iconName: 'home' },
  { label: 'Academy', path: '/academy', iconName: 'academy' },
  { label: 'Daily Gold', path: '/daily-gold-edition', iconName: 'gold', active: true },
  { label: 'Journeys', path: '/journey/learning-architecture', iconName: 'journeys' },
  { label: 'Library', path: '/library', iconName: 'library' },
  { label: 'Family', path: '/family', iconName: 'family' },
  { label: 'Profile', path: '/profile', iconName: 'profile' },
];

export default function DGNavigationRail() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [user, setUser] = useState(null);

  return (
    <nav style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 80,
      background: 'transparent',
      borderRight: `1px solid rgba(201,169,110,0.12)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 0',
      zIndex: 1000,
    }}>
      {/* Logo / Monogram at top */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${theme.accentGold}30 0%, ${theme.accentGold}10 100%)`,
        border: `1px solid ${theme.accentGold}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '3rem',
        fontSize: '1.2rem',
      }}>
        M
      </div>

      {/* Navigation items */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        flex: 1,
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.path || (item.active && (pathname || '').includes('daily-gold'));
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                border: 'none',
                background: isActive ? `${theme.accentGold}15` : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
              title={item.label}
            >
              <NavIcon name={item.iconName} size={20} color={isActive ? theme.accentGold : theme.textMuted} />
              {isActive && (
                <div style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: theme.accentGold,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* User avatar at bottom */}
      <button
        onClick={() => router.push('/profile')}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: user?.avatar_url ? `url('${user.avatar_url}') center/cover` : theme.accentGold,
          border: `2px solid ${theme.accentGold}40`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: theme.textHeadline,
        }}
        title={user?.full_name || 'Profile'}
      >
        {!user?.avatar_url && <NavIcon name="profile" size={20} color="#fff" />}
      </button>
    </nav>
  );
}