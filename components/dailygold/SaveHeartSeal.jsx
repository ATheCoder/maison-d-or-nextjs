'use client';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const GOLD = '#C8A96B';

export default function SaveHeartSeal({ 
  childId, 
  itemType, 
  itemId, 
  itemTitle, 
  itemSubtitle, 
  itemImageUrl,
  countryCode,
  countryName,
  themeTags = [],
  editionDate,
  size = 'md'
}) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!childId || !itemId) return;
    base44.entities.SavedItem.filter({ child_id: childId, item_id: itemId }, '-saved_at', 1)
      .then(items => setSaved(items.length > 0))
      .catch(() => {});
  }, [childId, itemId]);

  const handleSave = async () => {
    if (!childId || loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('saveItem', {
        child_id: childId,
        item_type: itemType,
        item_id: itemId,
        item_title: itemTitle,
        item_subtitle: itemSubtitle,
        item_image_url: itemImageUrl,
        country_code: countryCode,
        country_name: countryName,
        theme_tags: themeTags,
        edition_date: editionDate,
      });
      if (res.data.status === 'saved') setSaved(true);
      else if (res.data.status === 'unsaved') setSaved(false);
    } catch (err) {
      console.error('Save error:', err);
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
        onClick={handleSave}
        disabled={loading}
        title={saved ? 'Saved' : 'Save to your book'}
        style={{
          width: 36,
          height: 36,
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
          width={heartSize}
          height={heartSize}
          viewBox="0 0 24 24"
          fill={saved ? GOLD : 'none'}
          stroke={GOLD}
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