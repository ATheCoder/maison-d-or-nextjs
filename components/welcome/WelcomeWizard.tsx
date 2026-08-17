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
 *
 * Everything about how it looks comes from components/maison/guardianSurface
 * and the `.mdo-guardian-*` classes — the same drawing-room photograph, glass
 * card, field, button and palette the front door wears, because a visitor
 * arrives here one click after /signup and the two should read as one room.
 * What stays local is what is genuinely only here: the step dots, the emblem
 * and colour grids, and the panels around the invitation.
 */
import { useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createChildProfile,
  createInvite,
  renameFamily,
  setFamilyTimezone,
} from '@/app/(dg)/family/actions';
import { finishWelcome } from '@/app/welcome/actions';
import { AVATARS, type AvatarKey } from '@/lib/avatars';
import { ageOnDay, birthDateBounds, formatBirthDate, normalizeBirthDate } from '@/lib/child-birth-date';
import { THEME_KEYS, THEME_NAMES, type ThemeKey } from '@/lib/theme-keys';
import DatePicker from '@/components/ui/DatePicker';
import {
  C,
  photoShellStyle,
  wideCardStyle,
  glassCardStyle,
  eyebrowStyle,
  titleStyle,
  subtitleStyle,
  labelStyle,
  hintStyle,
  noteStyle,
  errorStyle,
} from '@/components/maison/guardianSurface';

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

/**
 * Every step opens with a heading and a line saying what the step is for, so
 * the title closes up from its standalone spacing and the pair carries the air
 * instead. /signup does the same thing for the same reason.
 */
const stepTitleStyle: React.CSSProperties = { ...titleStyle, margin: '0 0 0.6rem' };

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

  /**
   * Send the wizard back to its first step whenever it leaves the screen.
   *
   * Under Cache Components <Activity> hides a route rather than unmounting it,
   * so `stepIndex` survives navigating away and back — and a household that
   * returns to /welcome would land mid-wizard, on a step whose earlier answers
   * they can no longer see or check. Onboarding starts at the beginning.
   *
   * The typed answers are deliberately *not* cleared. Each step writes to the
   * server as it is completed, and losing a half-entered child's name because
   * someone glanced at another tab is the failure the Activity guidance warns
   * about; walking forward again finds the fields as they were left. What goes
   * is the position in the flow and the transient banners around it.
   */
  useLayoutEffect(() => () => {
    setStepIndex(0);
    setPending(false);
    setError(null);
    setCopied(false);
  }, []);

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
    <div style={{ ...photoShellStyle, fontFamily: 'var(--font-sans)' }}>
      <div style={{ ...wideCardStyle, ...glassCardStyle }}>
        <p style={{ ...eyebrowStyle, margin: '0 0 1.25rem' }}>Maison d&apos;Oré</p>

        <StepDots total={steps.length} current={stepIndex} />

        {step === 'family' && (
          <>
            <h1 style={stepTitleStyle}>Welcome, {guardianName.split(' ')[0]}</h1>
            <p style={subtitleStyle}>
              Just a couple of things before we begin.
            </p>

            <div style={{ marginBottom: '1.1rem' }}>
              <label htmlFor="familyName" style={labelStyle}>What should we call your family?</label>
              <input
                id="familyName"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={80}
                className="mdo-guardian-field"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="timezone" style={labelStyle}>Where do your days begin?</label>
              <select
                id="timezone"
                value={zone}
                onChange={(e) => setZoneChoice(e.target.value)}
                className="mdo-guardian-field"
                style={{ cursor: 'pointer' }}
              >
                {TIME_ZONES.map((z) => (
                  <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <p style={hintStyle}>
                So your days begin at the right time. We&apos;ve chosen your time zone from your device, but you can change it anytime.
              </p>
            </div>

            {error && <p style={errorStyle}>{error}</p>}

            <button onClick={saveFamily} disabled={pending} className="mdo-guardian-submit">
              {pending ? 'One moment…' : `Let's begin`}
            </button>
          </>
        )}

        {step === 'reader' && (
          <>
            <h1 style={stepTitleStyle}>Your first reader</h1>
            <p style={subtitleStyle}>
              Who are we making this for? You can add the rest of the family anytime.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="childName" style={labelStyle}>Their name</label>
              <input
                id="childName"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                maxLength={40}
                placeholder="Amélie"
                className="mdo-guardian-field"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label htmlFor="birthDate" style={labelStyle}>Their birthday</label>
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
              <p id="birthDateHint" style={hintStyle}>
                {birthDate === ''
                  ? 'This helps us choose stories that feel right for their age and remember their birthday, of course.'
                  : born.ok
                    ? `${formatBirthDate(birthDate)} — that makes them ${ageOnDay(birthDate)}.`
                    : born.error}
              </p>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <span style={labelStyle}>Their emblem</span>
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
              <span style={labelStyle}>Their colours</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {THEME_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setThemeKey(k)}
                    aria-pressed={themeKey === k}
                    title={THEME_NAMES[k]}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    }}
                  >
                    {/* data-theme re-scopes the tokens on the chip itself, so the
                        gradient previews the theme's actual ground and accent. */}
                    <span
                      aria-hidden="true"
                      data-theme={k}
                      style={{
                        width: 44, height: 30, borderRadius: 8,
                        background: 'linear-gradient(135deg, var(--surface-page) 0%, var(--surface-raised) 55%, var(--accent) 100%)',
                        border: themeKey === k ? `2.5px solid ${C.gold}` : '2.5px solid rgba(201,169,110,0.25)',
                        boxShadow: themeKey === k ? '0 2px 10px rgba(100,80,40,0.18)' : 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.58rem', color: themeKey === k ? C.umber : C.taupe, maxWidth: 54, textAlign: 'center', lineHeight: 1.2 }}>
                      {THEME_NAMES[k]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p style={{ ...noteStyle, margin: '0 0 1.3rem' }}>
              Your child never has an account, an email, or a password — just a nickname and a
              reading history you control.
            </p>

            {error && <p style={errorStyle}>{error}</p>}

            <button onClick={saveChild} disabled={pending || !readerReady} className="mdo-guardian-submit">
              {pending ? 'Making it theirs… Just adding the finishing touches.' : 'Create their reader'}
            </button>
          </>
        )}

        {step === 'invite' && (
          <>
            <h1 style={stepTitleStyle}>Share it with someone</h1>
            <p style={subtitleStyle}>
              Invite someone you trust to be part of your family&apos;s Maison d&apos;Oré. They&apos;ll be able to see the children’s spaces and share the journey with you. You can always do this later.
            </p>

            <div style={{ marginBottom: '0.9rem' }}>
              <label htmlFor="inviteEmail" style={labelStyle}>Their email</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="their@email.com"
                  className="mdo-guardian-field"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  onClick={sendInvite}
                  disabled={pending || !inviteEmail}
                  className="mdo-guardian-submit mdo-guardian-submit--inline"
                >
                  Send invitation
                </button>
              </div>
            </div>

            {sentInvite && (
              <div style={{ ...noteStyle, marginBottom: '1.1rem' }}>
                <p style={{ margin: '0 0 0.5rem' }}>
                  Invitation sent 🤍
We&apos;ve sent it to <strong>{sentInvite.email}</strong>. You can also share their private invitation link below. It will be available here once and expires in 7 days.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <code style={{ fontSize: '0.7rem', color: C.brown, wordBreak: 'break-all', flex: 1, minWidth: 0 }}>{sentInvite.url}</code>
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(sentInvite.url); setCopied(true); }}
                    className="mdo-guardian-submit mdo-guardian-submit--compact"
                  >
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}

            {error && <p style={errorStyle}>{error}</p>}

            <button onClick={finish} disabled={pending} className="mdo-guardian-submit">
              {pending ? 'Opening the paper…' : sentInvite ? 'Enter Maison d’Oré' : 'See today’s edition'}
            </button>

            {!sentInvite && (
              <p style={{ textAlign: 'center', margin: '1rem 0 0' }}>
                <button onClick={finish} disabled={pending} className="mdo-guardian-quiet">I&apos;ll do this later</button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
