'use client';

/**
 * MaisonHeader
 * Top navigation bar for Maison d'Ore, recreated from the design
 * reference. Sits sticky at the top of every page (mounted in the
 * root layout). Styled entirely with the shared brand tokens from
 * globals.css so it stays in visual harmony with the editorial pages.
 *
 * Layout:  wordmark  ·  primary nav  ·  search + actions
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import MaisonBrandName from './MaisonBrandName';

// Nav labels from the design, mapped to the app's real routes.
const NAV_LINKS = [
  { label: 'Family', path: '/family-tracker' },
  { label: 'Academy', path: '/academy' },
  { label: 'Rituals', path: '/rituals' },
  { label: 'Discover', path: '/journal' },
  { label: 'Almanac', path: '/almanac' },
  { label: 'Village', path: '/village' },
];

const navLink: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.62rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--taupe)',
  textDecoration: 'none',
  fontWeight: 400,
  transition: 'color 0.25s ease',
  whiteSpace: 'nowrap',
};

export default function MaisonHeader() {
  const [scrolled, setScrolled] = useState(false);

  // Firm up the bar's background once the page scrolls beneath it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ⌘K / Ctrl+K search affordance (placeholder — wire to a real
  // command palette when one exists).
  const openSearch = () => {
    // TODO: open command palette / search overlay.
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'clamp(1rem, 3vw, 2.5rem)',
        padding: 'clamp(0.9rem, 2vw, 1.3rem) clamp(1.5rem, 5vw, 3.5rem)',
        background: scrolled ? 'rgba(250,247,242,0.92)' : 'rgba(250,247,242,0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      {/* ── Wordmark ── */}
      <Link href="/" aria-label="Maison d'Ore — home" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 400, letterSpacing: '0.04em' }}>
          <MaisonBrandName />
        </span>
      </Link>

      {/* ── Primary nav ── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(1.2rem, 2.5vw, 2.4rem)',
          overflowX: 'auto',
        }}
      >
        {NAV_LINKS.map(link => (
          <Link
            key={link.label}
            href={link.path}
            style={navLink}
            className="mdo-nav-link"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* ── Search + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.6rem, 1.2vw, 1rem)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search (Command K)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '7px 14px',
            border: '1px solid var(--border)',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--taupe)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.6rem',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            transition: 'border-color 0.25s ease',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Cmd K</span>
        </button>

        <Link
          href="/"
          style={{
            padding: '7px 16px',
            border: '1px solid var(--border)',
            borderRadius: 999,
            color: 'var(--taupe)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.6rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'border-color 0.25s ease',
          }}
        >
          Classic Maison
        </Link>

        <Link
          href="/login"
          style={{
            padding: '8px 18px',
            border: '1px solid var(--brown)',
            color: 'var(--brown)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.6rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'background 0.25s ease, color 0.25s ease',
          }}
          className="mdo-signin"
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}
