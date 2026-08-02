'use client';
/**
 * The /welcome wizard (onboarding plan WP-C): signup → a child reading today's
 * edition, in three short steps on one page.
 *
 * It owns no writes of its own. Each step calls the action that already existed
 * for that thing — renameFamily, setFamilyTimezone, createChildProfile,
 * createInvite — and the finish goes through finishWelcome, which enters the new
 * reader by the same verified path the profile picker uses. This file is
 * choreography and copy; the invariants stay where they were.
 *
 * Which steps exist is the server's decision (`askFamilyStep`), not a client
 * guess: an invited co-parent inherits a named household and starts at the
 * reader.
 */
import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  createChildProfile,
  createInvite,
  renameFamily,
  setFamilyTimezone,
} from '@/app/(dg)/family/actions';
import { finishWelcome } from '@/app/welcome/actions';
import { AVATARS, type AvatarKey } from '@/lib/avatars';
import { ageOnDay, birthDateBounds, formatBirthDate, normalizeBirthDate } from '@/lib/child-birth-date';
import { THEME_KEYS, type ThemeKey } from '@/lib/theme-keys';
import { THEMES } from '@/components/theme/themes';
import DatePicker from '@/components/ui/DatePicker';

const C = {
  gold: '#C9A96E',
  ivory: '#F5F0E7',
  ink: '#241A0C',
  brown: '#5C4A2A',
  muted: '#8B7355',
};

/**
 * Every zone the runtime knows, with UTC guaranteed present — the same list
 * /family offers, for the same reason: a select must be able to show the value
 * it already holds, and a hardcoded list would rot.
 */
const TIME_ZONES: string[] = (() => {
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [];
  return Array.from(new Set(['UTC', ...supported]));
})();

const input: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  borderRadius: 10,
  border: '1px solid rgba(201,169,110,0.45)',
  background: '#FFFDF9',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.9rem',
  color: C.ink,
  outline: 'none',
  boxSizing: 'border-box',
};

const label: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.62rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: C.muted,
  margin: '0 0 0.35rem',
};

const buttonGold: React.CSSProperties = {
  width: '100%',
  padding: '0.8rem',
  borderRadius: 12,
  border: 'none',
  background: C.gold,
  color: '#FFF',
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const quietLink: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: C.muted,
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.78rem',
  textDecoration: 'underline',
  cursor: 'pointer',
  padding: 0,
};

const errorLine: React.CSSProperties = {
  fontFamily: 'Lato, sans-serif',
  fontSize: '0.8rem',
  color: '#A4442E',
  margin: '0.9rem 0 0',
};

/**
 * The device's own zone, read through useSyncExternalStore so that the server
 * render and the hydration render agree on `null` and only the pass after
 * hydration sees a zone.
 *
 * The naive version — reading Intl in a state initialiser — is wrong twice
 * over: during SSR `resolvedOptions().timeZone` is the *host's* zone, which
 * would both mismatch on hydration and stand a chance of being committed as the
 * family's day boundary. The zone is never subscribed to (a device does not
 * change timezone mid-wizard), hence the no-op subscribe.
 */
const subscribeToNothing = () => () => {};
const noZoneOnServer = () => null;
function detectedTimeZone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && TIME_ZONES.includes(zone) ? zone : null;
  } catch {
    // No detection is no worse than the default; the select still works.
    return null;
  }
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div aria-hidden="true" style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '0 0 1.5rem' }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            width: i === current ? 22 : 6,
            height: 6,
            borderRadius: 3,
            background: i <= current ? C.gold : 'rgba(201,169,110,0.3)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }}
        />
      ))}
    </div>
  );
}

export default function WelcomeWizard({
  guardianName,
  familyName,
  timezone,
  askFamilyStep,
}: {
  guardianName: string;
  familyName: string;
  timezone: string;
  askFamilyStep: boolean;
}) {
  const steps: Array<'family' | 'reader' | 'invite'> = askFamilyStep
    ? ['family', 'reader', 'invite']
    : ['reader', 'invite'];
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — the household
  const [nameDraft, setNameDraft] = useState(familyName);
  const detected = useSyncExternalStore(subscribeToNothing, detectedTimeZone, noZoneOnServer);
  // `null` until the grown-up touches the select, which is what lets detection
  // fill the field without ever overwriting a deliberate answer. Detection only
  // gets a say when the family has never chosen: 'UTC' is the column default,
  // not somebody's decision.
  const [zoneChoice, setZoneChoice] = useState<string | null>(null);
  const zone = zoneChoice ?? (timezone === 'UTC' ? detected ?? timezone : timezone);

  // Step 2 — the first reader. The birthday starts empty rather than at a
  // guessed date: a prefilled day is one the grown-up can leave uncorrected,
  // and a wrong birthday is worse than a blank one.
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const bounds = useMemo(() => birthDateBounds(), []);
  // The same rule the action enforces, so Continue can never offer to submit a
  // birthday the server is going to send straight back.
  const born = normalizeBirthDate(birthDate);
  const readerReady = childName.trim() !== '' && born.ok;
  const [avatar, setAvatar] = useState<AvatarKey>('sun');
  const [themeKey, setThemeKey] = useState<ThemeKey>(THEME_KEYS[0]);

  // Step 3 — the co-parent
  const [inviteEmail, setInviteEmail] = useState('');
  const [sentInvite, setSentInvite] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function saveFamily() {
    if (pending) return;
    setPending(true);
    setError(null);
    const renamed = await renameFamily(nameDraft);
    if (!renamed.ok) { setPending(false); setError(renamed.error ?? null); return; }
    if (zone !== timezone) {
      const zoned = await setFamilyTimezone(zone);
      if (!zoned.ok) { setPending(false); setError(zoned.error ?? null); return; }
    }
    setPending(false);
    setStepIndex((i) => i + 1);
  }

  async function saveChild() {
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await createChildProfile({
      displayName: childName,
      birthDate,
      avatar,
      themePreference: themeKey,
    });
    setPending(false);
    if (!res.ok) { setError(res.error ?? null); return; }
    setStepIndex((i) => i + 1);
  }

  async function sendInvite() {
    if (pending) return;
    setPending(true);
    setError(null);
    setCopied(false);
    const res = await createInvite(inviteEmail);
    setPending(false);
    if (!res.ok) { setError(res.error); return; }
    setSentInvite({ url: res.url, email: res.email });
    setInviteEmail('');
  }

  async function finish() {
    if (pending) return;
    setPending(true);
    setError(null);
    // On success this never returns — the action redirects into the edition.
    const res = await finishWelcome();
    setPending(false);
    if (res && !res.ok) setError(res.error);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.ivory,
      backgroundImage: 'radial-gradient(ellipse at 15% 25%, rgba(139,115,80,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 75%, rgba(100,75,45,0.04) 0%, transparent 45%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'Lato, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(255,248,238,0.85)',
        borderRadius: 18,
        border: '1px solid rgba(201,169,110,0.3)',
        boxShadow: '0 8px 40px rgba(100,80,40,0.12)',
        padding: '2.5rem 2rem',
      }}>
        <p style={{
          fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: C.gold, textAlign: 'center', margin: '0 0 1.25rem',
        }}>
          Maison d&apos;Oré
        </p>

        <StepDots total={steps.length} current={stepIndex} />

        {step === 'family' && (
          <>
            <h1 style={heading}>Welcome, {guardianName.split(' ')[0]}</h1>
            <p style={lede}>
              Let&apos;s set your house in order. Two small things, then the good part.
            </p>

            <div style={{ marginBottom: '1.1rem' }}>
              <label htmlFor="familyName" style={label}>Your family&apos;s name</label>
              <input
                id="familyName"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={80}
                style={input}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="timezone" style={label}>Where your days begin</label>
              <select
                id="timezone"
                value={zone}
                onChange={(e) => setZoneChoice(e.target.value)}
                style={{ ...input, cursor: 'pointer' }}
              >
                {TIME_ZONES.map((z) => (
                  <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <p style={hint}>
                Today&apos;s reading is counted in this zone. We guessed from your device — change it if we guessed wrong.
              </p>
            </div>

            <button onClick={saveFamily} disabled={pending} style={{ ...buttonGold, opacity: pending ? 0.6 : 1 }}>
              {pending ? 'One moment…' : 'Continue'}
            </button>
          </>
        )}

        {step === 'reader' && (
          <>
            <h1 style={heading}>Your first reader</h1>
            <p style={lede}>
              Who is the paper for? You can add more readers any time.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="childName" style={label}>Their name</label>
              <input
                id="childName"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                maxLength={40}
                placeholder="Amélie"
                style={input}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label htmlFor="birthDate" style={label}>The day they were born</label>
              <DatePicker
                id="birthDate"
                value={birthDate}
                min={bounds.min}
                max={bounds.max}
                onChange={setBirthDate}
                autoComplete="bday"
                invalid={birthDate !== '' && !born.ok}
                aria-describedby="birthDateHint"
                style={{ width: '100%', maxWidth: 240 }}
              />
              <p id="birthDateHint" style={hint}>
                {birthDate === ''
                  ? 'It sets their reading level, and tells us when to wish them a happy birthday. Ages 5 to 17.'
                  : born.ok
                    ? `${formatBirthDate(birthDate)} — that makes them ${ageOnDay(birthDate)}.`
                    : born.error}
              </p>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <span style={label}>Their emblem</span>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {(Object.keys(AVATARS) as AvatarKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAvatar(k)}
                    aria-pressed={avatar === k}
                    aria-label={k}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', fontSize: '1.1rem', cursor: 'pointer',
                      background: AVATARS[k].bg,
                      border: avatar === k ? `2.5px solid ${C.gold}` : '2.5px solid transparent',
                    }}
                  >
                    {AVATARS[k].emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.3rem' }}>
              <span style={label}>Their colours</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {THEME_KEYS.map((k) => {
                  const t = THEMES[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setThemeKey(k)}
                      aria-pressed={themeKey === k}
                      title={t?.name ?? k}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 44, height: 30, borderRadius: 8,
                          background: `linear-gradient(135deg, ${t?.bgPrimary} 0%, ${t?.bgCard} 55%, ${t?.accentGold} 100%)`,
                          border: themeKey === k ? `2.5px solid ${C.gold}` : '2.5px solid rgba(201,169,110,0.25)',
                          boxShadow: themeKey === k ? '0 2px 10px rgba(100,80,40,0.18)' : 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.58rem', color: themeKey === k ? C.brown : C.muted, maxWidth: 54, textAlign: 'center', lineHeight: 1.2 }}>
                        {t?.name ?? k}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p style={{
              fontSize: '0.76rem', color: C.brown, lineHeight: 1.6,
              background: 'rgba(201,169,110,0.1)',
              border: '1px dashed rgba(201,169,110,0.45)',
              borderRadius: 10, padding: '0.75rem 0.9rem', margin: '0 0 1.3rem',
            }}>
              Your child never has an account, an email, or a password — just a nickname and a
              reading history you control.
            </p>

            <button onClick={saveChild} disabled={pending || !readerReady} style={{
              ...buttonGold,
              background: pending || !readerReady ? 'rgba(201,169,110,0.5)' : C.gold,
              cursor: pending || !readerReady ? 'default' : 'pointer',
            }}>
              {pending ? 'One moment…' : 'Continue'}
            </button>
          </>
        )}

        {step === 'invite' && (
          <>
            <h1 style={heading}>Invite a co-parent</h1>
            <p style={lede}>
              A second grown-up sees the same readers, the same treasures, the same journey.
              Entirely optional — you can do this later from your family page.
            </p>

            <div style={{ marginBottom: '0.9rem' }}>
              <label htmlFor="inviteEmail" style={label}>Their email</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="their@email.com"
                  style={{ ...input, flex: 1 }}
                />
                <button
                  onClick={sendInvite}
                  disabled={pending || !inviteEmail}
                  style={{
                    ...buttonGold,
                    width: 'auto',
                    padding: '0.7rem 1.1rem',
                    background: pending || !inviteEmail ? 'rgba(201,169,110,0.5)' : C.gold,
                  }}
                >
                  Send
                </button>
              </div>
            </div>

            {sentInvite && (
              <div style={{
                background: 'rgba(201,169,110,0.12)',
                border: '1px dashed rgba(201,169,110,0.5)',
                borderRadius: 10,
                padding: '0.9rem 1rem',
                marginBottom: '1.1rem',
              }}>
                <p style={{ fontSize: '0.78rem', color: C.brown, margin: '0 0 0.5rem' }}>
                  Sent to <strong>{sentInvite.email}</strong>. You can share the link yourself too —
                  it is shown only once and expires in 7 days:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <code style={{ fontSize: '0.7rem', color: C.ink, wordBreak: 'break-all', flex: 1 }}>{sentInvite.url}</code>
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(sentInvite.url); setCopied(true); }}
                    style={{ ...buttonGold, width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <button onClick={finish} disabled={pending} style={{ ...buttonGold, opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Opening the paper…' : sentInvite ? 'Finish' : 'Open today’s edition'}
            </button>

            {!sentInvite && (
              <p style={{ textAlign: 'center', margin: '1rem 0 0' }}>
                <button onClick={finish} disabled={pending} style={quietLink}>Skip for now</button>
              </p>
            )}
          </>
        )}

        {error && <p style={errorLine}>{error}</p>}
      </div>
    </div>
  );
}

const heading: React.CSSProperties = {
  fontFamily: '"Playfair Display", Georgia, serif',
  fontSize: '1.6rem',
  fontWeight: 600,
  color: C.ink,
  textAlign: 'center',
  margin: '0 0 0.6rem',
};

const lede: React.CSSProperties = {
  fontSize: '0.85rem',
  color: C.brown,
  textAlign: 'center',
  lineHeight: 1.6,
  margin: '0 0 1.75rem',
};

const hint: React.CSSProperties = {
  fontSize: '0.72rem',
  color: C.muted,
  lineHeight: 1.5,
  margin: '0.45rem 0 0',
};
