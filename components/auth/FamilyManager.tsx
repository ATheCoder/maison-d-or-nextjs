'use client';
/**
 * The /family management surface (auth-plan phase 2): rename the family,
 * set the day boundary, keep the children, see guardians, create/revoke
 * co-guardian invites. Invite links are shown once at creation (only the hash
 * is stored) with a copy button.
 *
 * ── On the primitives (2026-08-27) ────────────────────────────────────────
 * This room used to open with a private palette — `C.gold`, `C.ivory`,
 * `C.ink` — and five style objects (`card`, `h2`, `input`, `buttonGold`,
 * `smallLink`) built on top of it, which is the exact pattern the admin
 * desk's five private stylesheets were deleted for. It is now composed
 * entirely from components/ds, like the front door and the desk, and the
 * contract test guards it.
 *
 * The most visible thing that fixed: this page painted its own ivory ground
 * at 100vh *inside* the (dg) shell, which was already painting
 * --surface-page. The rail's theme picker is mounted on every destination in
 * the group, including this one, so a grown-up could switch the house to
 * espresso and watch every room but this one follow. There is no ground here
 * any more — the shell's is the ground, and all seven [data-theme] scopes
 * reach the cards, fields, buttons and hairlines below.
 *
 * ── The primitives this room asked for ───────────────────────────────────
 * Migrating it turned up eight things the house kept hand-rolling, worked
 * around here for one commit and then built: Avatar, Note, ListRow, Code,
 * FieldShell, Confirm and PageHeader in components/ds, and --success-readable
 * in globals.css §1. All of them are stamped on /design. Nothing in this file
 * is a local copy of a primitive any more — the only thing still private is
 * `Section`, which is a Card with a Heading in it and belongs to this room's
 * five cards rather than to the house.
 */
import { useState } from 'react';
import Link from 'next/link';
import {
  getFamilyOverview,
  renameFamily,
  createInvite,
  revokeInvite,
  createChildProfile,
  updateChildProfile,
  deleteChildProfile,
  setChildPin,
  removeChildPin,
  setGuardianPin,
  setFamilyTimezone,
  type FamilyOverview,
} from '@/app/(dg)/family/actions';
import { AVATARS, type AvatarKey } from '@/lib/avatars';
import { ageOnDay, birthDateBounds, formatBirthDate, normalizeBirthDate } from '@/lib/child-birth-date';
import DatePicker from '@/components/ui/DatePicker';
import SignOutButton from '@/components/auth/SignOutButton';
import { authClient } from '@/lib/auth-client';
import {
  Avatar,
  Button,
  Card,
  Code,
  Confirm,
  Container,
  Eyebrow,
  Field,
  FieldShell,
  Heading,
  ListRow,
  Note,
  PageHeader,
  Prose,
  TextLink,
} from '@/components/ds';

/**
 * Every zone the runtime knows, with UTC guaranteed present: a family that has
 * never chosen one is stored as 'UTC', and a select must always be able to show
 * the value it already holds. Asking Intl beats shipping a list that would rot.
 */
const TIME_ZONES: string[] = (() => {
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [];
  return Array.from(new Set(['UTC', ...supported]));
})();

/**
 * A card in the ledger: the title, then whatever the section asks. Every one
 * of the five is the same shape, and the title is a Heading rather than a raw
 * <h2> — Heading renders <p role="heading" aria-level>, so the outline is
 * real without the room owning six type sizes.
 */
function Section({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <Card as="section" padding="md" className={`mb-5 ${className}`}>
      <Heading level={2} variant="story" className="mb-4">
        {title}
      </Heading>
      {children}
    </Card>
  );
}

/**
 * What went wrong with whatever was just attempted. role="alert" because it
 * arrives in answer to something the grown-up did — the field-level messages
 * get theirs from Field, which is where an error about ONE answer belongs.
 */
function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Prose variant="caption" tone="none" measure={false} role="alert" className="mt-2.5 text-danger-readable">
      {error}
    </Prose>
  );
}

function ChildrenSection({ overview, refresh }: { overview: FamilyOverview; refresh: () => Promise<void> }) {
  const bounds = birthDateBounds();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatar, setAvatar] = useState<AvatarKey>('sun');
  const [pinEditFor, setPinEditFor] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState('');
  const [dobEditFor, setDobEditFor] = useState<string | null>(null);
  const [dobDraft, setDobDraft] = useState('');
  const [deleting, setDeleting] = useState<FamilyOverview['children'][number] | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The client half of the same rule the action enforces — it decides whether
  // Add is offered, never whether the write is allowed.
  const born = normalizeBirthDate(birthDate);
  const canAdd = name.trim() !== '' && born.ok;

  // Guardian gate PIN
  const [gatePin, setGatePin] = useState('');
  const [gatePassword, setGatePassword] = useState('');
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [gateOk, setGateOk] = useState(false);
  const [gatePending, setGatePending] = useState(false);

  async function addChild() {
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await createChildProfile({ displayName: name, birthDate, avatar });
    setPending(false);
    if (!res.ok) { setError(res.error ?? null); return; }
    setName('');
    setBirthDate('');
    await refresh();
  }

  /**
   * Correct a birthday after the fact. Profiles created before birthdays were
   * collected were backfilled to 1 January of the year on file, so this is the
   * one door that fixes them — it sends the name and avatar back unchanged,
   * because updateChildProfile validates the whole profile at once.
   */
  async function saveBirthday(child: FamilyOverview['children'][number]) {
    const res = await updateChildProfile(child.id, {
      displayName: child.displayName,
      birthDate: dobDraft,
      avatar: child.avatar,
    });
    if (!res.ok) { setError(res.error ?? null); return; }
    setError(null);
    setDobEditFor(null);
    setDobDraft('');
    await refresh();
  }

  async function savePin(profileId: string) {
    const res = await setChildPin(profileId, pinDraft);
    if (!res.ok) { setError(res.error ?? null); return; }
    setError(null);
    setPinEditFor(null);
    setPinDraft('');
    await refresh();
  }

  async function confirmDelete() {
    if (!deleting || deletePending) return;
    setDeletePending(true);
    await deleteChildProfile(deleting.id);
    setDeletePending(false);
    setDeleting(null);
    await refresh();
  }

  async function saveGatePin() {
    if (gatePending) return;
    setGatePending(true);
    setGateMsg(null);
    const res = await setGuardianPin(gatePin, gatePassword);
    setGatePending(false);
    setGateOk(res.ok);
    setGateMsg(res.ok ? 'Parent PIN saved.' : res.error ?? null);
    if (res.ok) { setGatePin(''); setGatePassword(''); await refresh(); }
  }

  return (
    <>
      <Section title="Children">
        {overview.children.map((c) => (
          <ListRow key={c.id}>
            <Avatar avatar={c.avatar} />
            <div className="min-w-0 flex-1">
              <span className="type-body-ui text-primary">{c.displayName}</span>
              <span className="type-caption ml-2">
                age {ageOnDay(c.birthDate) ?? '—'} · born {formatBirthDate(c.birthDate) ?? 'unknown'}
                {c.hasPin ? ' · PIN set 🔒' : ''}
              </span>
            </div>
            {dobEditFor === c.id ? (
              <span className="flex flex-wrap items-center justify-end gap-2">
                {/* No FieldShell here on purpose: this picker replaces a
                    value already written beside it, so the row IS the label,
                    and a second one would say the child's name twice. The
                    add-child picker below asks a fresh question and gets the
                    full seat. */}
                <DatePicker
                  value={dobDraft} min={bounds.min} max={bounds.max}
                  onChange={setDobDraft}
                  aria-label={`${c.displayName}'s date of birth`}
                  invalid={dobDraft !== '' && !normalizeBirthDate(dobDraft).ok}
                  style={{ width: 186 }}
                  autoFocus
                />
                <Button size="sm" onClick={() => saveBirthday(c)}>Save</Button>
                <Button variant="link" size="sm" onClick={() => { setDobEditFor(null); setDobDraft(''); }}>
                  Cancel
                </Button>
              </span>
            ) : pinEditFor === c.id ? (
              <span className="flex items-center gap-2">
                <Field
                  size="sm"
                  label={`${c.displayName}'s PIN`}
                  labelHidden
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4 digits"
                  value={pinDraft}
                  onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
                  className="w-24"
                  style={{ textAlign: 'center' }}
                  autoFocus
                />
                <Button size="sm" onClick={() => savePin(c.id)}>Save</Button>
                <Button variant="link" size="sm" onClick={() => { setPinEditFor(null); setPinDraft(''); }}>
                  Cancel
                </Button>
              </span>
            ) : (
              <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
                <Button variant="link" size="sm" onClick={() => { setDobEditFor(c.id); setDobDraft(c.birthDate); }}>
                  Birthday
                </Button>
                <Button variant="link" size="sm" onClick={() => { setPinEditFor(c.id); setPinDraft(''); }}>
                  {c.hasPin ? 'Change PIN' : 'Set PIN'}
                </Button>
                {c.hasPin && (
                  <Button variant="link" size="sm" onClick={async () => { await removeChildPin(c.id); await refresh(); }}>
                    Remove PIN
                  </Button>
                )}
                {/* The house coat for a destructive verb on a row — the same
                    one the admin desk wears — rather than a red underlined
                    word that looked like the three beside it. */}
                <Button variant="danger" size="sm" onClick={() => setDeleting(c)}>Delete</Button>
              </span>
            )}
          </ListRow>
        ))}

        {/* Add child */}
        <div className="mt-5">
          {/* items-start, not items-end: the birthday carries a message seat
              under it and the other two do not, so aligning bottoms would hang
              Add off the hint line instead of the control line. */}
          <div className="mb-3 flex flex-wrap items-start gap-3">
            <Field
              label="Child's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Amélie"
              className="min-w-0 flex-[1_1_9rem]"
            />
            {/* The one control Field cannot host, wearing Field's label and
                Field's message seat anyway. The hint doubles as the validity
                line: an empty box says what a birthday is for, a good one
                reads the date back, a bad one takes the error branch. */}
            <FieldShell
              label="Their birthday"
              hint={born.ok || birthDate === ''
                ? birthDate === ''
                  ? 'So the paper can choose stories that fit.'
                  : `${formatBirthDate(birthDate)} — that makes them ${ageOnDay(birthDate)}.`
                : undefined}
              error={birthDate !== '' && !born.ok ? born.error : undefined}
            >
              {({ id, 'aria-describedby': describedBy, 'aria-invalid': isInvalid }) => (
                <DatePicker
                  id={id}
                  aria-describedby={describedBy}
                  invalid={!!isInvalid}
                  value={birthDate} min={bounds.min} max={bounds.max}
                  onChange={setBirthDate}
                  style={{ width: 186 }}
                />
              )}
            </FieldShell>
            {/* The button sits on the CONTROL line, which means clearing the
                height of a label and its gap first. Written as an empty label
                wearing the real label's classes rather than as a margin: the
                two can then never drift apart, because they are the same two
                rules Field and FieldShell use. */}
            <div>
              <span aria-hidden className="type-label-editorial block text-secondary">&nbsp;</span>
              <div className="mt-2">
                <Button onClick={addChild} disabled={!canAdd} loading={pending}>Add</Button>
              </div>
            </div>
          </div>

          <span className="type-label-editorial block text-secondary">Their emblem</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(AVATARS) as AvatarKey[]).map((k) => (
              // `bare` brings the focus ring the raw <button> never had;
              // Avatar brings the circle and the choice mark, which is
              // --accent and therefore follows the room.
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

          <FormError error={error} />
        </div>
      </Section>

      {deleting && (
        // No requireTyped: a reader's profile is recoverable in the ways that
        // matter — their name and birthday live in the grown-up's head — and
        // making someone retype a name on every delete teaches them to stop
        // reading the dialog. See Confirm's docstring.
        <Confirm
          title={`Delete ${deleting.displayName}'s profile?`}
          confirmLabel="Delete profile"
          cancelLabel="Keep them"
          pending={deletePending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        >
          Their reading history, saved pages and flag collection go with them.
          This cannot be undone.
        </Confirm>
      )}

      {/* Guardian gate PIN */}
      <Section title="Your parent PIN">
        <Prose variant="caption" measure={false} className="mb-3.5">
          {overview.guardianHasPin
            ? 'Used at the grown-ups gate and to unlock child profiles. Enter your password to change it.'
            : 'A quick 4-digit code for the grown-ups gate, instead of typing your password on a shared device.'}
        </Prose>
        <div className="flex items-end gap-3">
          <Field
            label="New PIN"
            labelHidden
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="New PIN"
            value={gatePin}
            onChange={(e) => setGatePin(e.target.value.replace(/\D/g, ''))}
            className="w-28"
            style={{ textAlign: 'center' }}
          />
          <Field
            label="Your password"
            labelHidden
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            value={gatePassword}
            onChange={(e) => setGatePassword(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button onClick={saveGatePin} loading={gatePending}>Save</Button>
        </div>
        {gateMsg && (
          <Prose
            variant="caption"
            tone="none"
            measure={false}
            role="alert"
            className={`mt-2.5 ${gateOk ? 'text-success-readable' : 'text-danger-readable'}`}
          >
            {gateMsg}
          </Prose>
        )}
      </Section>
    </>
  );
}

/**
 * The verify-your-email nag (auth-plan §9.4). Deliberately a note and not a
 * gate: nothing in the app waits on a confirmed address, so this asks once,
 * closes on request, and never comes back in this session. The reason it is
 * worth asking at all is password recovery — an unconfirmed address is a
 * family whose history no one can get back into.
 */
function VerifyEmailNote({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  if (dismissed) return null;

  async function resend() {
    if (state === 'sending') return;
    setState('sending');
    const res = await authClient.sendVerificationEmail({ email, callbackURL: '/family' });
    setState(res.error ? 'failed' : 'sent');
  }

  return (
    <Note className="mb-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <span aria-hidden className="text-lg">✉️</span>
        <Prose variant="caption" measure={false} className="min-w-50 flex-1">
          {state === 'sent'
            ? <>A fresh confirmation link is on its way to <strong>{email}</strong>.</>
            : state === 'failed'
              ? 'We could not send that just now — please try again in a moment.'
              : <>Confirm <strong>{email}</strong> so you can recover your account if you ever forget your password.</>}
        </Prose>
        {state !== 'sent' && (
          <Button size="sm" onClick={resend} loading={state === 'sending'}>Resend</Button>
        )}
        <Button variant="link" size="sm" onClick={() => setDismissed(true)}>Not now</Button>
      </div>
    </Note>
  );
}

export default function FamilyManager({ initialOverview }: { initialOverview: FamilyOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [nameDraft, setNameDraft] = useState(initialOverview.name);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newInvite, setNewInvite] = useState<{ url: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The caller's own address, as the overview already reports it — the resend
  // endpoint needs an address, and this is the one the session belongs to.
  const selfEmail = overview.members.find((m) => m.isSelf)?.email ?? '';

  const refresh = async () => setOverview(await getFamilyOverview());

  async function handleRename() {
    if (nameDraft.trim() === overview.name) return;
    const res = await renameFamily(nameDraft);
    if (!res.ok) setError(res.error ?? null);
    else { setError(null); await refresh(); }
  }

  async function handleTimezone(zone: string) {
    if (zone === overview.timezone) return;
    const res = await setFamilyTimezone(zone);
    if (!res.ok) setError(res.error ?? null);
    else { setError(null); await refresh(); }
  }

  async function handleInvite() {
    if (pending) return;
    setPending(true);
    setError(null);
    setNewInvite(null);
    setCopied(false);
    const res = await createInvite(inviteEmail);
    setPending(false);
    if (!res.ok) { setError(res.error); return; }
    setNewInvite({ url: res.url, email: res.email });
    setInviteEmail('');
    await refresh();
  }

  return (
    /* No ground of its own. The (dg) shell paints --surface-page behind this
       and the rail's theme picker re-scopes it; a background here would be a
       second page painted over the first, which is what it used to be. */
    <Container width="prose" className="pt-6 pb-24">
      <PageHeader
        className="mb-8"
        eyebrow={<>Maison d&rsquo;Or&eacute; &mdash; Your family</>}
        title={overview.name}
        actions={
          <>
            <TextLink as={Link} href="/profiles" className="type-caption">Profiles</TextLink>
            <SignOutButton />
          </>
        }
      />

      {!overview.emailVerified && selfEmail && <VerifyEmailNote email={selfEmail} />}

      {/* Family name */}
      <Section title="Family name">
        <div className="flex items-end gap-3">
          <Field
            label="Family name"
            labelHidden
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={80}
            className="min-w-0 flex-1"
          />
          <Button onClick={handleRename}>Save</Button>
        </div>
      </Section>

      {/* Timezone. The explanation is the field's hint rather than a paragraph
          above it — it is about this answer, so it belongs in the message seat
          where a screen reader reads it with the control. */}
      <Section title="Timezone">
        <Field
          as="select"
          label="Where your days begin and end"
          labelHidden
          value={overview.timezone}
          onChange={(e) => handleTimezone(e.target.value)}
          hint="Where your days begin and end. Today's reading is counted in this zone on the Parent Observatory and on your child's own For Parents card."
          className="max-w-85"
        >
          {TIME_ZONES.map((zone) => (
            <option key={zone} value={zone}>{zone.replace(/_/g, ' ')}</option>
          ))}
        </Field>
      </Section>

      {/* Children */}
      <ChildrenSection overview={overview} refresh={refresh} />

      {/* Guardians */}
      <Section title="Parents & guardians">
        {overview.members.map((m) => (
          <ListRow key={m.id} className="justify-between">
            <span className="type-body-ui text-primary">
              {m.name}{m.isSelf ? ' (you)' : ''}
            </span>
            <span className="type-caption">{m.email}</span>
          </ListRow>
        ))}
      </Section>

      {/* Invites */}
      <Section title="Invite a co-guardian">
        <div className="mb-3.5 flex items-end gap-3">
          <Field
            label="Their email"
            labelHidden
            type="email"
            placeholder="their@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button onClick={handleInvite} disabled={!inviteEmail} loading={pending}>Invite</Button>
        </div>

        <FormError error={error} />

        {newInvite && (
          <Note className="my-3.5">
            <Prose variant="caption" measure={false} className="mb-2">
              Share this link with <strong>{newInvite.email}</strong> — it is shown only once and expires in 7 days:
            </Prose>
            <div className="flex items-center gap-2">
              <Code break className="flex-1">{newInvite.url}</Code>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await navigator.clipboard.writeText(newInvite.url); setCopied(true); }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </Note>
        )}

        {overview.invites.length > 0 && (
          <>
            <Eyebrow rule={false} tone="faint" className="mt-4 mb-1">Pending invites</Eyebrow>
            {overview.invites.map((inv) => (
              <ListRow key={inv.id} className="justify-between">
                <span className="type-body-ui text-primary">{inv.email}</span>
                <span className="flex items-center gap-3">
                  <span className="type-caption">
                    expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => { await revokeInvite(inv.id); await refresh(); }}
                  >
                    Revoke
                  </Button>
                </span>
              </ListRow>
            ))}
          </>
        )}
      </Section>
    </Container>
  );
}
