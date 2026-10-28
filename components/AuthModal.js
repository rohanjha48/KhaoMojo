'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabase } from '../utils/supabase/client';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'magiclink'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setErrorMsg('Database connection unavailable. Please check your network.');
      return;
    }

    try {
      setIsLoading(true);

      if (mode === 'magiclink') {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined,
          },
        });

        if (error) {
          setErrorMsg(error.message || 'Failed to send magic link.');
          return;
        }

        setSuccessMsg(`Magic login link sent to ${trimmedEmail}! Click the link in your email to sign in.`);
        return;
      }

      if (mode === 'signup') {
        if (!password || password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message || 'Failed to sign up.');
          return;
        }

        // If email confirmation is disabled in Supabase, user is instantly logged in
        if (data.session) {
          setSuccessMsg('Account created successfully! Welcome to KhaoMojo.');
          if (fullName.trim()) {
            localStorage.setItem('khaomojo_customer_name', fullName.trim());
          }
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(data.user);
            onClose();
          }, 600);
        } else {
          setSuccessMsg('Account registered! Please check your email inbox to verify your account.');
        }
        return;
      }

      // Default: 'signin' with email and password
      if (!password) {
        setErrorMsg('Please enter your password.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password.');
        return;
      }

      setSuccessMsg('Signed in successfully! Redirecting...');
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(data.user);
        onClose();
      }, 500);

    } catch (err) {
      console.error('[AuthModal] error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-[#141210] border border-[#2E2924] rounded-2xl shadow-2xl p-5 sm:p-6 z-10 text-[#F5F2EB]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#A8A29E] hover:text-[#F5F2EB] bg-[#1F1C18] hover:bg-[#292520] border border-[#2E2924] transition-colors"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-[#FF5500] flex items-center justify-center text-white font-black text-xs tracking-tighter">
            KM
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-[#F5F2EB] flex items-center gap-1.5">
              <span>Khao<span className="text-[#FF5500]">Mojo</span> Account</span>
            </h2>
            <p className="text-[11px] text-[#A8A29E]">Track midnight orders & speedy reorders</p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-[#1F1C18] p-1 border border-[#2E2924] mb-4">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-[#FF5500] text-white shadow-sm'
                : 'text-[#A8A29E] hover:text-[#F5F2EB]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-[#FF5500] text-white shadow-sm'
                : 'text-[#A8A29E] hover:text-[#F5F2EB]'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setMode('magiclink'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'magiclink'
                ? 'bg-[#FF5500] text-white shadow-sm'
                : 'text-[#A8A29E] hover:text-[#F5F2EB]'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wider mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-[#A8A29E]" />
                <input
                  type="text"
                  placeholder="e.g. Rohan Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#1F1C18] border border-[#2E2924] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6E675F] focus:outline-none focus:border-[#FF5500] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#A8A29E]" />
              <input
                type="email"
                required
                placeholder="name@hostel.edu or gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1F1C18] border border-[#2E2924] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6E675F] focus:outline-none focus:border-[#FF5500] transition-colors"
              />
            </div>
          </div>

          {mode !== 'magiclink' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('magiclink')}
                    className="text-[10px] text-[#FF5500] hover:underline"
                  >
                    Forgot / Use Magic Link
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#A8A29E]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1F1C18] border border-[#2E2924] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6E675F] focus:outline-none focus:border-[#FF5500] transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#FF5500] hover:bg-[#ff6a1a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FF5500]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Please wait...</span>
              </>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : mode === 'signup' ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                <span>Send Magic Link</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <p className="mt-4 text-[10px] text-center text-[#A8A29E] leading-relaxed">
          100% Free Supabase Auth. By signing in, you agree to hostel late-night delivery guidelines.
        </p>
      </div>
    </div>
  );
}
