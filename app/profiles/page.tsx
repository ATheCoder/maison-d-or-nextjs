import { getProfilesForPicker } from './actions';
import ProfilePicker from '@/components/auth/ProfilePicker';

export const metadata = { title: 'Who\'s reading? — Maison d\'Oré' };
export const dynamic = 'force-dynamic';

export default async function ProfilesPage() {
  // getProfilesForPicker runs requireGuardian(); the picker itself is safe
  // from any state — it shows only names and avatars (auth-plan §4).
  const { profiles, userName, inChildMode } = await getProfilesForPicker();
  return <ProfilePicker profiles={profiles} userName={userName} inChildMode={inChildMode} />;
}
