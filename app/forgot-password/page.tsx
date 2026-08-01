import { Suspense } from 'react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata = { title: 'Forgot password — Maison d\'Oré' };

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
