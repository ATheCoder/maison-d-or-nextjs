'use client';
/**
 * FlagCollectionView — full-screen parchment collection of all 197 country flag seals.
 * Shows earned (full color) and unearned (greyed) seals.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import FlagSealMedallion from './FlagSealMedallion';

// All 197 UN-recognised countries with ISO2 codes
const ALL_COUNTRIES = [
  { name: 'Afghanistan', code: 'AF' }, { name: 'Albania', code: 'AL' },
  { name: 'Algeria', code: 'DZ' }, { name: 'Andorra', code: 'AD' },
  { name: 'Angola', code: 'AO' }, { name: 'Antigua and Barbuda', code: 'AG' },
  { name: 'Argentina', code: 'AR' }, { name: 'Armenia', code: 'AM' },
  { name: 'Australia', code: 'AU' }, { name: 'Austria', code: 'AT' },
  { name: 'Azerbaijan', code: 'AZ' }, { name: 'Bahamas', code: 'BS' },
  { name: 'Bahrain', code: 'BH' }, { name: 'Bangladesh', code: 'BD' },
  { name: 'Barbados', code: 'BB' }, { name: 'Belarus', code: 'BY' },
  { name: 'Belgium', code: 'BE' }, { name: 'Belize', code: 'BZ' },
  { name: 'Benin', code: 'BJ' }, { name: 'Bhutan', code: 'BT' },
  { name: 'Bolivia', code: 'BO' }, { name: 'Bosnia and Herzegovina', code: 'BA' },
  { name: 'Botswana', code: 'BW' }, { name: 'Brazil', code: 'BR' },
  { name: 'Brunei', code: 'BN' }, { name: 'Bulgaria', code: 'BG' },
  { name: 'Burkina Faso', code: 'BF' }, { name: 'Burundi', code: 'BI' },
  { name: 'Cabo Verde', code: 'CV' }, { name: 'Cambodia', code: 'KH' },
  { name: 'Cameroon', code: 'CM' }, { name: 'Canada', code: 'CA' },
  { name: 'Central African Republic', code: 'CF' }, { name: 'Chad', code: 'TD' },
  { name: 'Chile', code: 'CL' }, { name: 'China', code: 'CN' },
  { name: 'Colombia', code: 'CO' }, { name: 'Comoros', code: 'KM' },
  { name: 'Congo', code: 'CG' }, { name: 'Costa Rica', code: 'CR' },
  { name: 'Croatia', code: 'HR' }, { name: 'Cuba', code: 'CU' },
  { name: 'Cyprus', code: 'CY' }, { name: 'Czechia', code: 'CZ' },
  { name: 'DR Congo', code: 'CD' }, { name: 'Denmark', code: 'DK' },
  { name: 'Djibouti', code: 'DJ' }, { name: 'Dominica', code: 'DM' },
  { name: 'Dominican Republic', code: 'DO' }, { name: 'Ecuador', code: 'EC' },
  { name: 'Egypt', code: 'EG' }, { name: 'El Salvador', code: 'SV' },
  { name: 'Equatorial Guinea', code: 'GQ' }, { name: 'Eritrea', code: 'ER' },
  { name: 'Estonia', code: 'EE' }, { name: 'Eswatini', code: 'SZ' },
  { name: 'Ethiopia', code: 'ET' }, { name: 'Fiji', code: 'FJ' },
  { name: 'Finland', code: 'FI' }, { name: 'France', code: 'FR' },
  { name: 'Gabon', code: 'GA' }, { name: 'Gambia', code: 'GM' },
  { name: 'Georgia', code: 'GE' }, { name: 'Germany', code: 'DE' },
  { name: 'Ghana', code: 'GH' }, { name: 'Greece', code: 'GR' },
  { name: 'Grenada', code: 'GD' }, { name: 'Guatemala', code: 'GT' },
  { name: 'Guinea', code: 'GN' }, { name: 'Guinea-Bissau', code: 'GW' },
  { name: 'Guyana', code: 'GY' }, { name: 'Haiti', code: 'HT' },
  { name: 'Honduras', code: 'HN' }, { name: 'Hungary', code: 'HU' },
  { name: 'Iceland', code: 'IS' }, { name: 'India', code: 'IN' },
  { name: 'Indonesia', code: 'ID' }, { name: 'Iran', code: 'IR' },
  { name: 'Iraq', code: 'IQ' }, { name: 'Ireland', code: 'IE' },
  { name: 'Israel', code: 'IL' }, { name: 'Italy', code: 'IT' },
  { name: 'Jamaica', code: 'JM' }, { name: 'Japan', code: 'JP' },
  { name: 'Jordan', code: 'JO' }, { name: 'Kazakhstan', code: 'KZ' },
  { name: 'Kenya', code: 'KE' }, { name: 'Kiribati', code: 'KI' },
  { name: 'Kuwait', code: 'KW' }, { name: 'Kyrgyzstan', code: 'KG' },
  { name: 'Laos', code: 'LA' }, { name: 'Latvia', code: 'LV' },
  { name: 'Lebanon', code: 'LB' }, { name: 'Lesotho', code: 'LS' },
  { name: 'Liberia', code: 'LR' }, { name: 'Libya', code: 'LY' },
  { name: 'Liechtenstein', code: 'LI' }, { name: 'Lithuania', code: 'LT' },
  { name: 'Luxembourg', code: 'LU' }, { name: 'Madagascar', code: 'MG' },
  { name: 'Malawi', code: 'MW' }, { name: 'Malaysia', code: 'MY' },
  { name: 'Maldives', code: 'MV' }, { name: 'Mali', code: 'ML' },
  { name: 'Malta', code: 'MT' }, { name: 'Marshall Islands', code: 'MH' },
  { name: 'Mauritania', code: 'MR' }, { name: 'Mauritius', code: 'MU' },
  { name: 'Mexico', code: 'MX' }, { name: 'Micronesia', code: 'FM' },
  { name: 'Moldova', code: 'MD' }, { name: 'Monaco', code: 'MC' },
  { name: 'Mongolia', code: 'MN' }, { name: 'Montenegro', code: 'ME' },
  { name: 'Morocco', code: 'MA' }, { name: 'Mozambique', code: 'MZ' },
  { name: 'Myanmar', code: 'MM' }, { name: 'Namibia', code: 'NA' },
  { name: 'Nauru', code: 'NR' }, { name: 'Nepal', code: 'NP' },
  { name: 'Netherlands', code: 'NL' }, { name: 'New Zealand', code: 'NZ' },
  { name: 'Nicaragua', code: 'NI' }, { name: 'Niger', code: 'NE' },
  { name: 'Nigeria', code: 'NG' }, { name: 'North Korea', code: 'KP' },
  { name: 'North Macedonia', code: 'MK' }, { name: 'Norway', code: 'NO' },
  { name: 'Oman', code: 'OM' }, { name: 'Pakistan', code: 'PK' },
  { name: 'Palau', code: 'PW' }, { name: 'Panama', code: 'PA' },
  { name: 'Papua New Guinea', code: 'PG' }, { name: 'Paraguay', code: 'PY' },
  { name: 'Peru', code: 'PE' }, { name: 'Philippines', code: 'PH' },
  { name: 'Poland', code: 'PL' }, { name: 'Portugal', code: 'PT' },
  { name: 'Qatar', code: 'QA' }, { name: 'Romania', code: 'RO' },
  { name: 'Russia', code: 'RU' }, { name: 'Rwanda', code: 'RW' },
  { name: 'Saint Kitts and Nevis', code: 'KN' }, { name: 'Saint Lucia', code: 'LC' },
  { name: 'Saint Vincent', code: 'VC' }, { name: 'Samoa', code: 'WS' },
  { name: 'San Marino', code: 'SM' }, { name: 'Sao Tome and Principe', code: 'ST' },
  { name: 'Saudi Arabia', code: 'SA' }, { name: 'Senegal', code: 'SN' },
  { name: 'Serbia', code: 'RS' }, { name: 'Seychelles', code: 'SC' },
  { name: 'Sierra Leone', code: 'SL' }, { name: 'Singapore', code: 'SG' },
  { name: 'Slovakia', code: 'SK' }, { name: 'Slovenia', code: 'SI' },
  { name: 'Solomon Islands', code: 'SB' }, { name: 'Somalia', code: 'SO' },
  { name: 'South Africa', code: 'ZA' }, { name: 'South Korea', code: 'KR' },
  { name: 'South Sudan', code: 'SS' }, { name: 'Spain', code: 'ES' },
  { name: 'Sri Lanka', code: 'LK' }, { name: 'Sudan', code: 'SD' },
  { name: 'Suriname', code: 'SR' }, { name: 'Sweden', code: 'SE' },
  { name: 'Switzerland', code: 'CH' }, { name: 'Syria', code: 'SY' },
  { name: 'Tajikistan', code: 'TJ' }, { name: 'Tanzania', code: 'TZ' },
  { name: 'Thailand', code: 'TH' }, { name: 'Timor-Leste', code: 'TL' },
  { name: 'Togo', code: 'TG' }, { name: 'Tonga', code: 'TO' },
  { name: 'Trinidad and Tobago', code: 'TT' }, { name: 'Tunisia', code: 'TN' },
  { name: 'Turkey', code: 'TR' }, { name: 'Turkmenistan', code: 'TM' },
  { name: 'Tuvalu', code: 'TV' }, { name: 'Uganda', code: 'UG' },
  { name: 'Ukraine', code: 'UA' }, { name: 'United Arab Emirates', code: 'AE' },
  { name: 'United Kingdom', code: 'GB' }, { name: 'United States', code: 'US' },
  { name: 'Uruguay', code: 'UY' }, { name: 'Uzbekistan', code: 'UZ' },
  { name: 'Vanuatu', code: 'VU' }, { name: 'Vatican City', code: 'VA' },
  { name: 'Venezuela', code: 'VE' }, { name: 'Vietnam', code: 'VN' },
  { name: 'Yemen', code: 'YE' }, { name: 'Zambia', code: 'ZM' },
  { name: 'Zimbabwe', code: 'ZW' },
];

export default function FlagCollectionView({ childId, onClose }) {
  const [earnedSeals, setEarnedSeals] = useState([]);
  const [selectedSeal, setSelectedSeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) { setLoading(false); return; }
    base44.entities.FlagSeal.filter({ child_id: childId }, '-first_earned_date', 200)
      .then(seals => { setEarnedSeals(seals); setLoading(false); })
      .catch(() => setLoading(false));
  }, [childId]);

  const earnedCodes = new Set(earnedSeals.map(s => s.country_code));
  const earnedMap = Object.fromEntries(earnedSeals.map(s => [s.country_code, s]));
  const earnedCount = earnedCodes.size;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,12,8,0.88)',
        backdropFilter: 'blur(6px)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1100,
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 0%, #F5EDD8 0%, #EDE0C4 40%, #E0CFA8 100%)',
          padding: '2rem 1.5rem 4rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.4)',
              borderRadius: '50%', width: 38, height: 38, cursor: 'pointer',
              fontSize: '1.1rem', color: '#8B7355', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>

          <h1 style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 700, color: '#3C2E1A', margin: '0 0 0.4rem',
          }}>
            My Flag Collection
          </h1>
          <p style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: '1.05rem', color: '#8B7355', margin: '0 0 0.25rem',
            fontStyle: 'italic',
          }}>
            {loading ? 'Loading your collection…' : `You have collected ${earnedCount} of ${ALL_COUNTRIES.length} countries`}
          </p>
          {!loading && earnedCount > 0 && (
            <div style={{
              display: 'inline-block',
              background: 'rgba(201,169,110,0.2)',
              border: '1px solid rgba(201,169,110,0.4)',
              borderRadius: 20, padding: '4px 16px',
              fontFamily: 'Jost, sans-serif', fontSize: '0.72rem',
              color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              ✦ {Math.round((earnedCount / ALL_COUNTRIES.length) * 100)}% Complete
            </div>
          )}
        </div>

        {/* Decorative divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.3)' }} />
          <span style={{ fontFamily: 'Cormorant Garamond, serif', color: 'rgba(201,169,110,0.7)', fontSize: '1.2rem' }}>✦</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.3)' }} />
        </div>

        {/* Seal grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: '1rem 0.75rem',
        }}>
          {ALL_COUNTRIES.map(country => {
            const earned = earnedCodes.has(country.code);
            const sealData = earnedMap[country.code];
            return (
              <div
                key={country.code}
                onClick={() => earned && sealData && setSelectedSeal(sealData)}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <FlagSealMedallion
                  countryCode={country.code}
                  countryName={country.name}
                  size="md"
                  earned={earned}
                  showLabel
                  onClick={earned ? () => setSelectedSeal(sealData) : undefined}
                />
              </div>
            );
          })}
        </div>

        {/* 197 Countries label (bottom-right like the reference image) */}
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'rgba(240,228,204,0.95)',
          border: '2px solid rgba(201,169,110,0.5)',
          borderRadius: 8, padding: '8px 16px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: '1.1rem', color: '#5C4A2A', margin: 0 }}>
            {ALL_COUNTRIES.length} Countries
          </p>
          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B7355', margin: 0 }}>
            The World
          </p>
        </div>
      </div>

      {/* Seal detail modal */}
      {selectedSeal && (
        <div
          onClick={() => setSelectedSeal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, #FDF6E8 0%, #EDE0C4 100%)',
              border: '2px solid rgba(201,169,110,0.4)',
              borderRadius: 20, padding: '2.5rem 2rem',
              maxWidth: 380, width: '100%', textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <FlagSealMedallion countryCode={selectedSeal.country_code} countryName={selectedSeal.country_name} size="lg" earned showLabel />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', margin: '0 0 2px' }}>Earned</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#3C2E1A', margin: 0 }}>{selectedSeal.times_earned}×</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', margin: '0 0 2px' }}>First collected</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: '#3C2E1A', margin: 0 }}>
                  {selectedSeal.first_earned_date ? new Date(selectedSeal.first_earned_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
            {selectedSeal.sources?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
                {[...new Set(selectedSeal.sources)].map(src => (
                  <span key={src} style={{
                    background: 'rgba(201,169,110,0.2)', border: '1px solid rgba(201,169,110,0.4)',
                    borderRadius: 12, padding: '2px 10px',
                    fontFamily: 'Jost, sans-serif', fontSize: '0.65rem', color: '#8B7355',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {src.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedSeal(null)} style={{
              background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.4)',
              borderRadius: 20, padding: '6px 20px', cursor: 'pointer',
              fontFamily: 'Jost, sans-serif', fontSize: '0.72rem',
              letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B7355',
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}