'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Truck, Loader2, ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md page-enter">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
              <Truck className="w-7 h-7 text-black" aria-hidden="true" />
            </div>
            <span className="text-3xl font-bold text-white">MarkPro</span>
          </div>
        </div>

        {/* Reset Card */}
        <div className="card p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-400" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-white">Check your email</h1>
              <p className="text-white/60">
                We&apos;ve sent a password reset link to <span className="text-white font-medium">{email}</span>
              </p>
              <p className="text-white/40 text-sm">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <div className="pt-4 space-y-3">
                <button
                  onClick={() => setSent(false)}
                  className="btn-secondary w-full"
                >
                  Try different email
                </button>
                <Link href="/login" className="btn-ghost w-full">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back to sign in
              </Link>

              <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
              <p className="text-white/60 mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
