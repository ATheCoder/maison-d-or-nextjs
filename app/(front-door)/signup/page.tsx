import { Suspense } from 'react';
import AuthForm from '@/components/auth/AuthForm';
import AuthCardFallback from '@/components/auth/AuthCardFallback';

export const metadata = { title: 'Sign up — Maison d\'Oré' };

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
