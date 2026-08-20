import { Suspense } from 'react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import AuthCardFallback from '@/components/auth/AuthCardFallback';

export const metadata = { title: 'Forgot password — Maison d\'Oré' };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
