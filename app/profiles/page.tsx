import { redirect } from 'next/navigation';
import { getProfilesForPicker } from './actions';
import ProfilePicker from '@/components/auth/ProfilePicker';

export const metadata = { title: 'Who\'s reading? — Maison d\'Oré' };
export const dynamic = 'force-dynamic';

export default async function ProfilesPage() {
  // getProfilesForPicker runs requireGuardian(); the picker itself is safe
  // from any state — it shows only names and avatars (auth-plan §4).
  const { profiles, userName, inChildMode } = await getProfilesForPicker();

  // A guardian whose family has no readers has nothing to pick, and every other
  // surface in the app is empty for them too. Send them to set-up rather than to
  // an empty picker (onboarding plan WP-C). Structural, not a flag: /welcome
  // bounces back here the moment a reader exists, so the two rules heal each
  // other whichever way the guardian abandons the flow.
  if (profiles.length === 0) redirect('/welcome');

  return <ProfilePicker profiles={profiles} userName={userName} inChildMode={inChildMode} />;
}
