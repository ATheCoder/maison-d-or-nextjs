import { Suspense } from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import AuthCardFallback from '@/components/auth/AuthCardFallback';

export const metadata = { title: 'Choose a new password — Maison d\'Oré' };

// The form reads the reset token from the query with useSearchParams, so the
// page cannot be prerendered — the Suspense boundary is what keeps the build
// from bailing out, exactly as /login does.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
