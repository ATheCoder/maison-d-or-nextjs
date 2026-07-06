'use client';
/**
 * TreasuryHeart — Gold heart button for saving items to the Treasury
 * Drop-in replacement / companion to SaveHeartSeal
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const GOLD = '#C8A96B';

export default function TreasuryHeart({
  childId,
  section,
  itemId,
  itemTitle,
  itemSubtitle = '',
  itemImageUrl = '',
  countryCode = '',
  countryName = '',
  themeTags = [],
  editionDate,
  size = 'md',
  onSaved,
}) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!childId || !itemId) return;
    base44.entities.Treasury
      .filter({ child_id: childId, section, item_id: itemId }, '-created_date', 1)
      .then(items => setSaved(items.length > 0))
      .catch(() => {});
  }, [childId, section, itemId]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!childId || loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('saveToTreasury', {
        child_id: childId, section, item_id: itemId,
        item_title: itemTitle, item_subtitle: itemSubtitle,
        item_image_url: itemImageUrl, country_code: countryCode,
        country_name: countryName, theme_tags: themeTags,
        edition_date: editionDate || new Date().toISOString().slice(0, 10),
      });
      if (res.data.status === 'saved') { setSaved(true); if (onSaved) onSaved(res.data.item); }
      else if (res.data.status === 'removed') setSaved(false);
    } catch (err) {
      console.error('[TreasuryHeart]', err);
    } finally {
      setLoading(false);
    }
  };

  const heartSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <>
      <style>{`@keyframes treasuryHeartPop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }`}</style>
      <button
        onClick={handleToggle}
        disabled={loading}
        title={saved ? 'Saved to Treasury' : 'Save to Treasury'}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          border: 'none', background: 'transparent',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, opacity: loading ? 0.5 : 1,
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'scale(1.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg
          width={heartSize} height={heartSize}
          viewBox="0 0 24 24"
          fill={saved ? GOLD : 'none'}
          stroke={GOLD}
          strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transition: 'fill 0.22s ease',
            animation: saved ? 'treasuryHeartPop 0.4s ease' : 'none',
            opacity: saved ? 1 : 0.75,
          }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </>
  );
}