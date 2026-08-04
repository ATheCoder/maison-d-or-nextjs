// @ts-nocheck — untyped .jsx from before checkJs was on; 5 errors to clear.
// This line is the backlog entry (tsconfig.json explains the ratchet): fix the
// file, delete the marker. Do not add one to a new file.
'use client';
/**
 * ProfileSwitchCurtain — the curtains for in-app identity switches.
 *
 * ChildSwitcherOverlay changes the session server-side and then reports
 * `onSwitched(kind, profile)`; the mount site (rail or mobile header) lands
 * the switch with a push or refresh. Before this file, that landing was a
 * bare wait — the menu closed and the page sat unchanged until the new
 * identity arrived. The hook here wraps the landing navigation in one
 * transition and holds a curtain up for exactly as long as it is pending:
 * the sunrise (ProfileEnteringCurtain) when a reader is being entered, the
 * study key (StudyOpeningCurtain) when child mode is being cleared.
 *
 * On a refresh the mount site survives the landing, so the curtain is taken
 * down by `isPending` going false; on a push the mount site unmounts at the
 * navigation commit and takes the curtain with it, handing the wait to the
 * destination's loading skeleton — the same contract as /profiles.
 *
 * Landing rule (moved here from the two renderers, verbatim): a grown-up
 * entering a reader heads for the paper — the same landing /profiles chose —
 * unless already on it, where a refresh suffices (and push+refresh must never
 * be paired; the pair races, see ProfilePicker). Every other switch stays
 * put: reader-to-reader keeps the page, and a reader becoming the parent
 * keeps it too — the pages that cannot host a parent bounce through their
 * own guards.
 */
import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ProfileEnteringCurtain from '@/components/auth/ProfileEnteringCurtain';
import StudyOpeningCurtain from '@/components/auth/StudyOpeningCurtain';
import { AVATARS } from '@/lib/avatars';

export function useProfileSwitch(hasActiveReader) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // { kind: 'child', profile } | { kind: 'parent' }. Only shown while the
  // transition is pending — the landing (isPending falling) is what lowers
  // the curtain, never a timer, so a slow refresh stays covered to the end.
  // The stale object left behind is invisible and overwritten on next use.
  const [switching, setSwitching] = useState(null);

  const handleSwitched = (kind, profile = null) => {
    setSwitching({ kind, profile });
    startTransition(() => {
      if (kind === 'child' && !hasActiveReader && !pathname.startsWith('/daily-gold-edition')) {
        router.push('/daily-gold-edition');
        return;
      }
      router.refresh();
    });
  };

  return { switching: isPending ? switching : null, handleSwitched };
}

export default function SwitchCurtain({ switching }) {
  if (!switching) return null;
  if (switching.kind === 'parent') return <StudyOpeningCurtain />;
  const profile = switching.profile;
  if (!profile) return null;
  const a = AVATARS[profile.avatar] || AVATARS.sun;
  return <ProfileEnteringCurtain name={profile.displayName} emoji={a.emoji} bg={a.bg} />;
}
