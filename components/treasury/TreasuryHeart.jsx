'use client';
/**
 * TreasuryHeart — the one gold heart in the reader.
 *
 * Every save goes through the `toggleSavedItem` server action, which resolves
 * the child from the session: nothing here names a child, which is what closes
 * the legacy IDOR by construction (docs/auth-plan.md §3).
 *
 * The heart never fetches its own state. `initialSaved` is server-fed — the
 * page hands its sections one set of saved keys — so a paper full of hearts
 * costs zero requests on load. A save is a deliberate act, so a failure is
 * shown rather than swallowed: the heart simply doesn't fill, which is the
 * honest answer to the tap (docs/flag-seal-spec.md §6.2).
 */
import { useState } from 'react';
import { useTheme } from '@/components/theme/ThemeContext';
import { toggleSavedItem } from '@/app/treasury/actions';

export default function TreasuryHeart({
  itemType,
  itemId,
  itemTitle,
  itemSubtitle,
  itemImageUrl,
  countryCode,
  countryName,
  editionDate,
  initialSaved = false,
  size = 'md',
  onToggled,
}) {
  const { theme } = useTheme();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  // Turning to another day, or a router.refresh() after a save elsewhere,
  // re-renders this heart over a different item — or the same item with a new
  // server answer. Adjusted during render rather than in an effect, which would
  // paint the previous item's fill for a frame first (house pattern, precedent
  // DGOnThisDay.jsx:112-116).
  const identity = `${itemType}:${itemId}:${initialSaved}`;
  const [lastIdentity, setLastIdentity] = useState(identity);
  if (identity !== lastIdentity) {
    setLastIdentity(identity);
    setSaved(initialSaved);
  }

  const handleToggle = async (e) => {
    // The heart sits on cards that open a modal on tap — keep the tap local.
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await toggleSavedItem({
        itemType,
        itemId,
        itemTitle,
        itemSubtitle,
        itemImageUrl,
        countryCode,
        countryName,
        editionDate,
      });
      if (res.status === 'error') {
        // Leave the heart exactly as it was: an unfilled heart after a tap is
        // the surfaced failure, no toast required.
        console.warn(`TreasuryHeart: save failed (${res.reason})`, { itemType, itemId });
        return;
      }
      setSaved(res.status === 'saved');
      onToggled?.(res.status);
    } catch (err) {
      // The action itself never throws; this is the transport failing.
      console.warn('TreasuryHeart: save failed', err);
    } finally {
      setLoading(false);
    }
  };

  const heartSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <>
      <style>{`
        @keyframes heartSavedPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
      `}</style>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={saved}
        aria-label={saved ? 'Saved' : `Save ${itemTitle}`}
        title={saved ? 'Saved' : 'Save to your treasury'}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          opacity: loading ? 0.5 : 1,
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg
          aria-hidden="true"
          width={heartSize}
          height={heartSize}
          viewBox="0 0 24 24"
          fill={saved ? theme.accentGold : 'none'}
          stroke={theme.accentGold}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'fill 0.25s ease',
            animation: saved ? 'heartSavedPulse 0.5s ease-in-out' : 'none',
            opacity: saved ? 1 : 0.7,
          }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </>
  );
}
