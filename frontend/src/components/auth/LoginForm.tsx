import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Zap,
  UserPlus,
  LogIn,
  AlertCircle,
  LockKeyhole,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
import { CodePrepLoader } from '../ui/CodePrepLoader';

/** Crisp Pixel-Art Terminal & Spark SVG (renders cleanly on pitch-black & day surfaces) */
const PixelDevEmblem: React.FC = () => (
  <svg
    viewBox="0 0 16 16"
    className="w-11 h-11 animate-pixel-float"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    {/* Monitor Frame */}
    <rect x="1" y="2" width="14" height="10" fill="#18181b" />
    <rect x="2" y="3" width="12" height="8" fill="#050507" />
    {/* Code Syntax Pixels inside Terminal */}
    <rect x="3" y="4" width="3" height="1" fill="#c084fc" />
    <rect x="7" y="4" width="4" height="1" fill="#38bdf8" />
    <rect x="4" y="6" width="5" height="1" fill="#ffa116" />
    <rect x="10" y="6" width="2" height="1" fill="#10b981" />
    <rect x="4" y="8" width="2" height="1" fill="#f43f5e" />
    <rect x="7" y="8" width="5" height="1" fill="#a1a1aa" />
    {/* Stand */}
    <rect x="7" y="12" width="2" height="1" fill="#3f3f46" />
    <rect x="5" y="13" width="6" height="1" fill="#52525b" />
    {/* Top-Right Flame Pixel Accent */}
    <rect x="13" y="1" width="1" height="1" fill="#ffa116" />
    <rect x="14" y="2" width="1" height="1" fill="#ffb800" />
    <rect x="12" y="2" width="1" height="1" fill="#10b981" />
  </svg>
);

export const LoginForm: React.FC = () => {
  const {
    login,
    register,
    quickLogin,
    isRegistrationAllowed,
    userCount,
    maxUsers,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quickLoginTarget, setQuickLoginTarget] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isQuickLoggingIn = quickLoginTarget !== null;
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (!isRegistrationAllowed && mode === 'register') {
      setMode('login');
    }
  }, [isRegistrationAllowed, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Enter a valid workspace email address.');
      return;
    }

    if (mode === 'register') {
      if (!isRegistrationAllowed) {
        setErrorMessage(`Account capacity reached (${userCount}/${maxUsers} users). Use Sign In or Quick Enter.`);
        setMode('login');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Passphrase must be at least 6 characters.');
        return;
      }
      if (!displayName.trim()) {
        setErrorMessage('Enter a display name for your workspace.');
        return;
      }
    } else if (!password) {
      setErrorMessage('Enter your passphrase to sign in.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        await register(trimmedEmail, password, displayName.trim());
      } else {
        await login(trimmedEmail, password, rememberMe);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (targetEmail: string) => {
    setErrorMessage(null);
    setQuickLoginTarget(targetEmail);
    try {
      await quickLogin(targetEmail);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Quick login failed. Please verify server connectivity.');
      }
    } finally {
      setQuickLoginTarget(null);
    }
  };

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl bg-surface border border-border-default shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
      {/* Left Column: Compact Pitch-Black Code Identity & Instant Launch */}
      <div className="md:col-span-5 bg-surface-subtle border-b md:border-b-0 md:border-r border-border-subtle p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-center shrink-0">
              <PixelDevEmblem />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-text-primary leading-tight">
                CodePrep
              </h1>
              <p className="text-xs font-mono text-primary">
                600 Problems • C++17 & SQL
              </p>
            </div>
          </div>

          {/* Code Readability Mini Preview Block */}
          <div className="hidden md:block p-3 rounded-xl bg-surface-elevated border border-border-subtle font-mono text-xs leading-relaxed">
            <div>
              <span className="text-purple-400">vector</span>
              <span className="text-text-muted">&lt;</span>
              <span className="text-sky-400">int</span>
              <span className="text-text-muted">&gt; </span>
              <span className="text-primary">solve</span>
              <span className="text-text-muted">() &#123;</span>
            </div>
            <div className="pl-3">
              <span className="text-purple-400">return </span>
              <span className="text-success">&#123;streak, accepted&#125;</span>
              <span className="text-text-muted">;</span>
            </div>
            <div>
              <span className="text-text-muted">&#125;</span>
            </div>
          </div>

          {/* Concise Workspace Highlights */}
          <ul className="hidden md:space-y-1.5 md:block text-xs text-text-secondary">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Persistent code drafts & submissions</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Curated Blind 75, NeetCode 150 & SQL</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-success shrink-0" />
              <span>6 coding themes saved to your profile</span>
            </li>
          </ul>
        </div>

        {/* 1-Click Live Demo (Guest / Interviewer) + Local Owner Shortcut */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('demo@codeprep.dev')}
              disabled={isQuickLoggingIn || isLoading}
              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {quickLoginTarget === 'demo@codeprep.dev' ? (
                <CodePrepLoader variant="inline" tone="contrast" label="Launching Live Demo..." />
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-black" />
                  <span>Try Live Demo • Guest / Interviewer</span>
                </>
              )}
            </button>
            {isLocalHost && (
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@codeprep.dev')}
                disabled={isQuickLoggingIn || isLoading}
                className="w-full py-2 px-3 rounded-xl bg-surface-high hover:bg-surface-elevated text-text-primary border border-border-default hover:border-primary/60 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {quickLoginTarget === 'admin@codeprep.dev' ? (
                  <CodePrepLoader variant="inline" label="Entering Owner Workspace..." />
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>Quick Enter • Harshal (Local)</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="text-xs text-center text-text-muted">
            Instant isolated guest sandbox or private personal account
          </p>
        </div>
      </div>

      {/* Right Column: Compact Credentials Form (Zero Overflow) */}
      <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-center space-y-3.5 bg-surface">
        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-elevated border border-border-subtle rounded-xl text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'login'
                ? 'bg-surface-high text-text-primary font-semibold border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            disabled={!isRegistrationAllowed}
            title={
              isRegistrationAllowed
                ? 'Create a new personal workspace account'
                : `Account capacity reached (${maxUsers} users max)`
            }
            onClick={() => {
              if (!isRegistrationAllowed) return;
              setMode('register');
              setErrorMessage(null);
            }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              !isRegistrationAllowed
                ? 'text-text-muted/60 cursor-not-allowed'
                : mode === 'register'
                ? 'bg-surface-high text-text-primary font-semibold border border-border-subtle'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {isRegistrationAllowed ? (
              <UserPlus className="w-3.5 h-3.5" />
            ) : (
              <LockKeyhole className="w-3.5 h-3.5" />
            )}
            <span>{isRegistrationAllowed ? 'Create Account' : 'Capacity Full'}</span>
          </button>
        </div>

        {/* Inline Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="px-3 py-2 rounded-xl bg-danger-subtle border border-danger/30 text-xs text-danger font-mono flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Compact Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {mode === 'register' && isRegistrationAllowed && (
            <Input
              label="DISPLAY NAME"
              type="text"
              required
              placeholder="e.g. Alex Rivera"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              icon={<KeyRound className="w-4 h-4" />}
            />
          )}

          <Input
            label="DEVELOPER EMAIL"
            type="email"
            required
            autoComplete="email"
            placeholder="developer@codeprep.dev"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            icon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="PASSPHRASE"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onKeyDown={checkCapsLock}
            onKeyUp={checkCapsLock}
            onBlur={() => setCapsLockOn(false)}
            icon={<Lock className="w-4 h-4" />}
            actionIcon={
              showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />
            }
            onActionClick={() => setShowPassword((prev) => !prev)}
            helperText={
              capsLockOn
                ? 'Caps Lock is active.'
                : mode === 'register'
                ? 'Minimum 6 characters.'
                : undefined
            }
          />

          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-surface-elevated border-border-default text-primary focus:ring-0 h-3.5 w-3.5"
                />
                <span className="text-text-muted hover:text-text-primary transition-colors">
                  Remember 30 days
                </span>
              </label>
              <span className="font-mono text-text-muted">
                {userCount > 0 ? `${userCount}/${maxUsers} users` : `${maxUsers} users max`}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isQuickLoggingIn}
            className="w-full py-2.5 rounded-xl bg-surface-high hover:bg-surface-elevated text-text-primary border border-border-default hover:border-primary/50 font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {isLoading ? (
              <CodePrepLoader variant="inline" label="Authenticating..." />
            ) : mode === 'register' ? (
              'Create Local Account'
            ) : (
              'Sign In with Credentials'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
