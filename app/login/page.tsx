import { Suspense } from 'react';
import AuthForm from '@/components/auth/AuthForm';
import AuthCardFallback from '@/components/auth/AuthCardFallback';

export const metadata = { title: 'Log in — Maison d\'Oré' };

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
