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
 * Everything about how it looks comes from components/ds, like the rest of
 * the house — the same card, field, button and eyebrow /signup wears, because
 * a visitor arrives here one click after it and the two should read as one
 * room. That used to be true by a different route: both wore
 * components/maison/guardianSurface, a second design system kept deliberately
 * theme-immune by writing its palette out as hex. The immunity now comes from
 * data-theme="parchment" on the route group's layout, so the tokens can be the
 * tokens. What stays local is what is genuinely only here: the step dots, the
 * emblem and colour grids, and the panels around the invitation.
 */
import { useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createChildProfile,
  createInvite,
  renameFamily,
  setFamilyTimezone,
} from '@/app/(dg)/family/actions';
import { finishWelcome } from '@/app/(front-door)/welcome/actions';
import { AVATARS, type AvatarKey } from '@/lib/avatars';
import { ageOnDay, birthDateBounds, formatBirthDate, normalizeBirthDate } from '@/lib/child-birth-date';
import { THEME_KEYS, THEME_NAMES, type ThemeKey } from '@/lib/theme-keys';
import DatePicker from '@/components/ui/DatePicker';
import { Avatar, Button, Card, Code, Eyebrow, Field, FieldShell, Heading, Note, Prose } from '@/components/ds';

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

/**
 * Every step opens with a heading and a line saying what the step is for, so
 * the title closes up from its standalone spacing and the pair carries the air
 * instead. /signup does the same thing for the same reason. Extracted because
 * it was three hand-typed copies of the same two elements.
 */
function StepHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <>
      <Heading level={1} variant="section" className="mb-2.5 text-center">
        {title}
      </Heading>
      <Prose variant="caption" measure={false} className="mb-7 text-center">
        {lede}
      </Prose>
    </>
  );
}

/**
 * What went wrong with the step just attempted. role="alert" because it
 * arrives in answer to something the grown-up just did — the field-level
 * messages get theirs from Field.
 */
function StepError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Prose variant="caption" tone="none" measure={false} role="alert" className="mb-4 text-danger-readable">
      {error}
    </Prose>
  );
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
            background: i <= current
              ? 'var(--accent)'
              : 'color-mix(in srgb, var(--accent) 30%, transparent)',
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
    <div className="front-door front-door-photo">
      {/* Wider than the four auth cards (480 against 400), and not for
          decoration: this step asks for an emblem and a colour scheme, and
          both are swatch grids that wrap badly at 400. Everything else — the
          glass, the corner, the gold rule on top — is shared, which is the
          point. */}
      <Card
        tone="glass"
        elevation="modal"
        radius="lg"
        padding="none"
        className="front-door-card w-full max-w-120 px-8 py-10"
      >
        <Eyebrow rule={false} className="mb-5 text-center">Maison d&apos;Oré</Eyebrow>

        <StepDots total={steps.length} current={stepIndex} />

        {step === 'family' && (
          <>
            <StepHeader
              title={`Welcome, ${guardianName.split(' ')[0]}`}
              lede="Just a couple of things before we begin."
            />

            <Field
              id="familyName"
              label="What should we call your family?"
              className="mb-4"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={80}
              autoFocus
            />

            <Field
              as="select"
              id="timezone"
              label="Where do your days begin?"
              className="mb-6"
              value={zone}
              onChange={(e) => setZoneChoice(e.target.value)}
              hint="So your days begin at the right time. We've chosen your time zone from your device, but you can change it anytime."
            >
              {TIME_ZONES.map((z) => (
                <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
              ))}
            </Field>

            <StepError error={error} />

            <Button onClick={saveFamily} loading={pending} className="w-full">
              {pending ? 'One moment…' : `Let's begin`}
            </Button>
          </>
        )}

        {step === 'reader' && (
          <>
            <StepHeader
              title="Your first reader"
              lede="Who are we making this for? You can add the rest of the family anytime."
            />

            <Field
              id="childName"
              label="Their name"
              className="mb-4"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              maxLength={40}
              placeholder="Amélie"
              autoFocus
            />

            {/* DatePicker is a compound widget, not a ds primitive — it owns
                a popover, a calendar grid and its own .mdo-dp-* coat — so it
                cannot go inside Field. FieldShell is Field with the input
                taken out: the same label, the same gap, the same message seat
                and, crucially, the same three wiring attributes, which this
                step used to reconstruct by hand from Field's classes. */}
            <FieldShell
              label="Their birthday"
              className="mb-5"
              hint={born.ok || birthDate === ''
                ? birthDate === ''
                  ? 'This helps us choose stories that feel right for their age and remember their birthday, of course.'
                  : `${formatBirthDate(birthDate)} — that makes them ${ageOnDay(birthDate)}.`
                : undefined}
              error={birthDate !== '' && !born.ok ? born.error : undefined}
            >
              {({ id, 'aria-describedby': describedBy, 'aria-invalid': isInvalid }) => (
                <DatePicker
                  id={id}
                  aria-describedby={describedBy}
                  invalid={!!isInvalid}
                  value={birthDate}
                  min={bounds.min}
                  max={bounds.max}
                  onChange={setBirthDate}
                  autoComplete="bday"
                  style={{ width: '100%', maxWidth: 240 }}
                />
              )}
            </FieldShell>

            <div style={{ marginBottom: '1.2rem' }}>
              <span className="type-label-editorial block text-secondary">Their emblem</span>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {(Object.keys(AVATARS) as AvatarKey[]).map((k) => (
                  <Button
                    key={k}
                    variant="bare"
                    onClick={() => setAvatar(k)}
                    aria-pressed={avatar === k}
                    aria-label={k}
                    className="rounded-full"
                  >
                    <Avatar avatar={k} selected={avatar === k} />
                  </Button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.3rem' }}>
              <span className="type-label-editorial block text-secondary">Their colours</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {THEME_KEYS.map((k) => (
                  <Button
                    key={k}
                    variant="bare"
                    onClick={() => setThemeKey(k)}
                    aria-pressed={themeKey === k}
                    title={THEME_NAMES[k]}
                    className="flex flex-col items-center gap-1"
                  >
                    {/* data-theme re-scopes the tokens on the chip itself, so the
                        gradient previews the theme's actual ground and accent. */}
                    <span
                      aria-hidden="true"
                      data-theme={k}
                      style={{
                        width: 44, height: 30, borderRadius: 8,
                        background: 'linear-gradient(135deg, var(--surface-page) 0%, var(--surface-raised) 55%, var(--accent) 100%)',
                        border: themeKey === k
                          ? '2.5px solid var(--accent)'
                          : '2.5px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                        boxShadow: themeKey === k ? 'var(--shadow-card)' : 'none',
                      }}
                    />
                    <span
                      className={`type-caption text-center ${themeKey === k ? 'text-primary' : 'text-secondary'}`}
                      style={{ maxWidth: 54, lineHeight: 1.2 }}
                    >
                      {THEME_NAMES[k]}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <Note className="mb-5">
              <Prose variant="caption" measure={false}>
                Your child never has an account, an email, or a password — just a nickname and a
                reading history you control.
              </Prose>
            </Note>

            <StepError error={error} />

            <Button
              onClick={saveChild}
              disabled={!readerReady}
              loading={pending}
              className="w-full"
            >
              {pending ? 'Making it theirs… Just adding the finishing touches.' : 'Create their reader'}
            </Button>
          </>
        )}

        {step === 'invite' && (
          <>
            <StepHeader
              title="Share it with someone"
              lede="Invite someone you trust to be part of your family's Maison d'Oré. They'll be able to see the children's spaces and share the journey with you. You can always do this later."
            />

            {/* The button sits beside the field rather than under it, so it
                aligns to the control and not to the label above it — hence
                items-end rather than items-center. */}
            <div className="mb-4 flex items-end gap-2">
              <Field
                id="inviteEmail"
                label="Their email"
                type="email"
                className="min-w-0 flex-1"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="their@email.com"
              />
              <Button onClick={sendInvite} disabled={!inviteEmail} loading={pending}>
                Send invitation
              </Button>
            </div>

            {sentInvite && (
              <Note className="mb-4">
                <Prose variant="caption" measure={false} className="mb-2">
                  Invitation sent 🤍
We&apos;ve sent it to <strong>{sentInvite.email}</strong>. You can also share their private invitation link below. It will be available here once and expires in 7 days.
                </Prose>
                <div className="flex items-center gap-2">
                  <Code break className="flex-1">{sentInvite.url}</Code>
                  {/* Ghost rather than a third gold button: two primaries in
                      one panel is two calls to action, and the one that
                      matters here is Enter Maison d'Oré below. */}
                  <Button
                    variant="ghost"
                    onClick={async () => { await navigator.clipboard.writeText(sentInvite.url); setCopied(true); }}
                  >
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
              </Note>
            )}

            <StepError error={error} />

            <Button onClick={finish} loading={pending} className="w-full">
              {pending ? 'Opening the paper…' : sentInvite ? 'Enter Maison d’Oré' : 'See today’s edition'}
            </Button>

            {!sentInvite && (
              // Quiet on purpose: a way past the step, not a second call to
              // action competing with the button above it.
              <p className="mt-4 text-center">
                <Button variant="link" onClick={finish} disabled={pending} className="type-caption">
                  I&apos;ll do this later
                </Button>
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
