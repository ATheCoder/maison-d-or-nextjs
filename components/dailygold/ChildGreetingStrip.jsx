'use client';
/**
 * ChildGreetingStrip
 * Warm personal greeting "Hi, [Name]" + child switcher overlay + quick personal links.
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const GOLD = '#C8A96B';
const TEXT = '#5C4A36';
const TEXT_MUTED = '#9B7B5C';
const BG = 'rgba(240,228,204,0.85)';

function QuickLink({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: hovered ? `rgba(201,169,107,0.22)` : `rgba(201,169,107,0.10)`,
        border: `1px solid rgba(201,169,107,${hovered ? '0.6' : '0.35'})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s ease',
        boxShadow: hovered ? '0 2px 8px rgba(201,169,107,0.2)' : 'none',
      }}>
        {icon}
      </div>
      <span style={{
        fontFamily: 'Lato, sans-serif', fontSize: '0.5rem',
        color: hovered ? GOLD : TEXT_MUTED, letterSpacing: '0.06em',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        transition: 'color 0.18s ease',
      }}>
        {label}
      </span>
    </button>
  );
}

function ChildSwitcherOverlay({ currentChildId, onSelect, onClose }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.Child.list('-created_date', 20).then(kids => {
      setChildren(kids || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '110%', left: 0, zIndex: 500,
        background: '#FFFDF7',
        border: `1px solid rgba(201,169,107,0.3)`,
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(44,36,22,0.14)',
        minWidth: 200,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '0.65rem 1rem 0.4rem', borderBottom: '1px solid rgba(201,169,107,0.15)' }}>
        <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: TEXT_MUTED, margin: 0 }}>
          Switch Reader
        </p>
      </div>
      {loading ? (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${GOLD}40`, borderTopColor: GOLD, animation: 'dgSpin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : children.map(kid => (
        <button
          key={kid.id}
          onClick={() => { sessionStorage.setItem('dg_active_child_id', kid.id); sessionStorage.setItem('dg_active_child_obj', JSON.stringify(kid)); onSelect(kid); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '0.6rem 1rem',
            background: kid.id === currentChildId ? `rgba(201,169,107,0.1)` : 'transparent',
            border: 'none', cursor: 'pointer',
            borderBottom: '1px solid rgba(201,169,107,0.08)',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { if (kid.id !== currentChildId) e.currentTarget.style.background = 'rgba(201,169,107,0.06)'; }}
          onMouseLeave={e => { if (kid.id !== currentChildId) e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#E8C9A0', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Playfair Display", serif', fontSize: '0.75rem', fontWeight: 700, color: TEXT,
            border: `1.5px solid rgba(201,169,107,${kid.id === currentChildId ? '0.7' : '0.3'})`,
          }}>
            {kid.name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '0.78rem', fontWeight: kid.id === currentChildId ? 700 : 400, color: TEXT, margin: 0 }}>
              {kid.name}
            </p>
            {kid.age && (
              <p style={{ fontFamily: 'Lato, sans-serif', fontSize: '0.55rem', color: TEXT_MUTED, margin: 0 }}>
                Age {kid.age}
              </p>
            )}
          </div>
          {kid.id === currentChildId && (
            <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
          )}
        </button>
      ))}
    </div>
  );
}

export default function ChildGreetingStrip({ child, onShowFlags, navigate }) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [activeChild, setActiveChild] = useState(child);

  useEffect(() => { setActiveChild(child); }, [child]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.5rem clamp(1rem, 3vw, 2rem) 0.75rem',
    }}>
      <style>{`@keyframes dgSpin { to { transform: rotate(360deg); } }`}</style>

      {/* LEFT: Greeting + quick links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Greeting with tappable name */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: TEXT_MUTED,
              fontWeight: 400,
            }}>Hi,</span>
            <button
              onClick={() => setShowSwitcher(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: '"Playfair Display", serif',
                fontStyle: 'italic',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#8B6A3A',
                letterSpacing: '0.01em',
                display: 'flex', alignItems: 'baseline', gap: 4,
              }}
            >
              {activeChild.name}
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ marginBottom: 1 }}>
                <path d="M2 3.5l3 3 3-3" stroke="rgba(139,106,58,0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p style={{
            fontFamily: 'Lato, sans-serif', fontSize: '0.5rem', color: 'rgba(155,123,92,0.55)',
            margin: '1px 0 0', letterSpacing: '0.08em', pointerEvents: 'none',
          }}>
            tap to switch reader
          </p>
          {showSwitcher && (
            <ChildSwitcherOverlay
              currentChildId={activeChild.id}
              onSelect={setActiveChild}
              onClose={() => setShowSwitcher(false)}
            />
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <QuickLink
            label="My Flags"
            onClick={onShowFlags}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            }
          />
          <QuickLink
            label="My Book"
            onClick={() => navigate && navigate('/assessments/goldprint')}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            }
          />
          <QuickLink
            label="My Recipes"
            onClick={() => {}}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2l1.5 14.5a2 2 0 002 1.5h11a2 2 0 002-1.5L21 2"/>
                <path d="M12 2v4"/><path d="M8 2v3"/><path d="M16 2v3"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}