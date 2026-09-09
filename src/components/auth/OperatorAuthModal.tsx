import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  LogIn,
  UserPlus
} from 'lucide-react';

interface OperatorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OperatorAuthModal({ isOpen, onClose }: OperatorAuthModalProps) {
  const {
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    logout,
    operatorProfile
  } = useAuth();

  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authTab === 'REGISTER') {
        await signupWithEmail(email, password, displayName || undefined);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error('[Auth Error]', err);
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMessage('Invalid credentials. Please check your email and password.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('Password must be at least 6 characters.');
      } else {
        setErrorMessage(err.message || 'Authentication error. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.warn('[Google Auth]', err);
      setErrorMessage('Google authentication popup failed or was cancelled.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-mono"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0b1209] border border-[#526a27]/70 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-[#16200d]/80 flex flex-col space-y-4 text-slate-100 relative"
      >
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#16200d] border border-[#526a27] text-[#a4c639] font-bold px-2 py-0.5 rounded tracking-widest uppercase flex items-center gap-1 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-[#a4c639]" /> VANGUARD C2 SECURITY
            </span>
            <span className="text-[10px] text-[#a4c639]/80 font-bold">CLEARANCE: TS-SCI</span>
          </div>
          <h2 className="font-heading font-bold text-xl text-slate-100 tracking-wide uppercase">
            {operatorProfile ? 'OPERATOR PROFILE & SESSION' : 'OPERATOR AUTHENTICATION PORTAL'}
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            {operatorProfile
              ? 'Active security clearance authenticated. Access granted to tactical defense feeds.'
              : 'Sign in with Firebase Authentication to access defense feeds and situational command capabilities.'}
          </p>
        </div>

        {/* LOGGED IN SESSION VS LOGGED OUT FORM */}
        {operatorProfile ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-[#526a27]/60 bg-[#16200d]/60 space-y-2">
              <div className="flex items-center gap-2 text-[#a4c639] font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#c6ff00]" />
                <span>AUTHENTICATED OPERATOR SESSION ACTIVE</span>
              </div>
              <div className="text-slate-100 font-bold text-base">
                {operatorProfile.displayName}
              </div>
              <div className="text-xs text-zinc-400 font-mono">
                {operatorProfile.email}
              </div>
              <div className="inline-block px-2 py-0.5 rounded bg-[#2a3814] border border-[#526a27] text-[10px] text-[#c6ff00] font-mono">
                CLEARANCE: {operatorProfile.clearanceLevel}
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
              }}
              className="w-full py-3 px-4 rounded-xl bg-rose-950 border border-rose-500/60 hover:bg-rose-900 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-rose-400 rotate-180" />
              <span>SIGN OUT OPERATOR</span>
            </button>
          </div>
        ) : (
          <>
            {/* TAB SWITCHER */}
            <div className="flex items-center gap-1 bg-[#060a05] p-1 rounded-xl border border-[#526a27]/40 text-xs font-bold">
              <button
                onClick={() => { setAuthTab('LOGIN'); setErrorMessage(''); }}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authTab === 'LOGIN'
                    ? 'bg-[#1b2711] border border-[#a4c639]/80 text-[#a4c639] shadow-[0_0_15px_rgba(82,106,39,0.35)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>SIGN IN</span>
              </button>
              <button
                onClick={() => { setAuthTab('REGISTER'); setErrorMessage(''); }}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authTab === 'REGISTER'
                    ? 'bg-[#1b2711] border border-[#a4c639]/80 text-[#a4c639] shadow-[0_0_15px_rgba(82,106,39,0.35)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>REGISTER</span>
              </button>
            </div>

            {/* ERROR ALERT */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="font-sans leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* GOOGLE SIGN IN BUTTON */}
            <button
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#16200d] hover:bg-[#1b2711] border border-[#526a27] hover:border-[#a4c639] text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>SIGN IN WITH GOOGLE</span>
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[#526a27]/30" />
              <span className="text-[10px] text-[#a4c639]/70 uppercase font-bold">OR EMAIL AUTH</span>
              <div className="flex-1 h-px bg-[#526a27]/30" />
            </div>

            {/* EMAIL & PASSWORD FORM */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authTab === 'REGISTER' && (
                <div>
                  <label className="text-[10px] text-[#a4c639]/90 uppercase font-bold mb-1 block">
                    OPERATOR CALLSIGN / NAME
                  </label>
                  <div className="relative">
                    <UserCheck className="w-3.5 h-3.5 absolute left-3 top-3 text-[#526a27]" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Commander Sarah Vance"
                      className="w-full bg-[#060a05] border border-[#526a27]/50 rounded-lg pl-9 pr-3 py-2 text-slate-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-[#a4c639] focus:ring-1 focus:ring-[#a4c639]/40"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] text-[#a4c639]/90 uppercase font-bold mb-1 block">
                  OPERATOR EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#526a27]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@vanguard.c2"
                    className="w-full bg-[#060a05] border border-[#526a27]/50 rounded-lg pl-9 pr-3 py-2 text-slate-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-[#a4c639] focus:ring-1 focus:ring-[#a4c639]/40"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#a4c639]/90 uppercase font-bold mb-1 block">
                  SECURITY PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-[#526a27]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#060a05] border border-[#526a27]/50 rounded-lg pl-9 pr-3 py-2 text-slate-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-[#a4c639] focus:ring-1 focus:ring-[#a4c639]/40"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2a3814] via-[#43571d] to-[#2a3814] border border-[#a4c639]/80 hover:brightness-110 text-[#c6ff00] hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(82,106,39,0.35)] cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#c6ff00]" />
                <span>{authTab === 'REGISTER' ? 'REGISTER NEW OPERATOR' : 'AUTHENTICATE OPERATOR'}</span>
              </button>
            </form>
          </>
        )}

        {/* ACTIVE OPERATOR FOOTER STATUS */}
        {operatorProfile && (
          <div className="pt-2 border-t border-[#526a27]/40 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>ACTIVE PROFILE:</span>
            <span className="text-[#a4c639] font-bold">
              {operatorProfile.displayName} [{operatorProfile.clearanceLevel}]
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
