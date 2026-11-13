import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { apiRequest } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { THEME_OPTIONS, ThemeMode } from '../types/theme';
import {
  PIXEL_AVATAR_PRESETS,
  PixelAvatar,
  UserAvatar,
  DEFAULT_PIXEL_AVATAR_ID,
  resolvePixelAvatarPreset,
} from '../components/ui/PixelAvatars';
import {
  User as UserIcon,
  Download,
  Upload,
  Check,
  AlertCircle,
  Clock,
  Key,
  Palette,
  Eye,
  EyeOff,
  RotateCcw,
  Flame,
  Trophy,
  Code2,
  Database,
  Award,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  themePreference: string;
  timezone: string;
  createdAt: string;
}

interface BadgeSummary {
  badgeKey: string;
  title: string;
  description: string;
  unlocked: boolean;
  current: number;
  target: number;
}

interface ProfileTelemetry {
  totalSolved: number;
  totalProblems: number;
  dsaSolved: number;
  dsaTotal: number;
  sqlSolved: number;
  sqlTotal: number;
  currentStreak: number;
  longestStreak: number;
  badges: BadgeSummary[];
}

interface ProfilePageProps {
  onTabChange?: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onTabChange }) => {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [telemetry, setTelemetry] = useState<ProfileTelemetry | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [themePreference, setThemePreference] = useState<ThemeMode>(theme);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Status feedback
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAvatarPreset, setIsSavingAvatarPreset] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchAllProfileData();
  }, []);

  useEffect(() => {
    setThemePreference(theme);
  }, [theme]);

  const fetchAllProfileData = async () => {
    setIsInitialLoading(true);
    try {
      const [profileRes, analyticsRes] = await Promise.all([
        apiRequest<{ user: UserProfile }>('/user/profile'),
        apiRequest<{ analytics?: ProfileTelemetry } & Partial<ProfileTelemetry>>('/analytics/dashboard').catch(
          () => null
        ),
      ]);

      setProfile(profileRes.user);
      setDisplayName(profileRes.user.displayName || '');
      setTimezone(profileRes.user.timezone || 'Asia/Kolkata');
      const dbTheme = (profileRes.user.themePreference || 'dark') as ThemeMode;
      setThemePreference(dbTheme);

      if (analyticsRes) {
        const stats = analyticsRes.analytics || (analyticsRes as ProfileTelemetry);
        setTelemetry({
          totalSolved: stats.totalSolved ?? 0,
          totalProblems: stats.totalProblems ?? 600,
          dsaSolved: stats.dsaSolved ?? 0,
          dsaTotal: stats.dsaTotal ?? 500,
          sqlSolved: stats.sqlSolved ?? 0,
          sqlTotal: stats.sqlTotal ?? 100,
          currentStreak: stats.currentStreak ?? 0,
          longestStreak: stats.longestStreak ?? 0,
          badges: Array.isArray(stats.badges) ? stats.badges : [],
        });
      }
    } catch {
      setErrorMsg('Failed to load profile details.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const liveClockText = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());
    } catch {
      return new Date().toLocaleTimeString();
    }
  }, [timezone]);

  const handleSelectTheme = (themeId: ThemeMode) => {
    setThemePreference(themeId);
    setTheme(themeId);
    setProfileSuccess('Theme preference updated and saved.');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setProfileSuccess(null);
    setErrorMsg(null);

    try {
      const res = await apiRequest<{ user: UserProfile; message: string }>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, timezone, themePreference }),
      });
      setProfile(res.user);
      window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: res.user }));
      window.dispatchEvent(new CustomEvent('codeprep-theme-sync', { detail: res.user.themePreference }));
      setProfileSuccess(res.message || 'Profile settings updated.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPixelAvatar = async (presetId: string) => {
    setIsSavingAvatarPreset(true);
    setProfileSuccess(null);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ user: UserProfile }>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: presetId }),
      });
      setProfile(res.user);
      window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: res.user }));
      const selectedPreset = resolvePixelAvatarPreset(res.user.avatarUrl);
      setProfileSuccess(`Character avatar set to ${selectedPreset.name}.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save pixel character.');
    } finally {
      setIsSavingAvatarPreset(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Avatar file size must be less than 2MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await apiRequest<{ avatarUrl: string; message: string }>('/user/avatar', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: base64Data }),
        });

        if (profile) {
          const updatedProfile = { ...profile, avatarUrl: res.avatarUrl };
          setProfile(updatedProfile);
          window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: updatedProfile }));
        }
        setProfileSuccess('Custom avatar uploaded and saved.');
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Avatar upload failed.');
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setErrorMsg(null);

    if (newPassword.length < 10) {
      setErrorMsg('New password must be at least 10 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/user/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setPasswordSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Password change failed.');
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('codeprep_access_token');
      const response = await fetch('/api/user/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Data export failed.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codeprep-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErrorMsg('Failed to trigger JSON data export.');
    }
  };

  if (isInitialLoading) {
    return (
      <AppLayout currentTab="profile" onTabChange={onTabChange}>
        <CodePrepLoader
          variant="section"
          className="flex-1 min-h-[420px]"
          label="Loading Developer Profile"
          sublabel="Fetching telemetry, pixel characters & saved preferences..."
        />
      </AppLayout>
    );
  }

  const dsaPct = telemetry && telemetry.dsaTotal > 0 ? Math.round((telemetry.dsaSolved / telemetry.dsaTotal) * 100) : 0;
  const sqlPct = telemetry && telemetry.sqlTotal > 0 ? Math.round((telemetry.sqlSolved / telemetry.sqlTotal) * 100) : 0;
  const unlockedBadgesCount = telemetry ? telemetry.badges.filter((b) => b.unlocked).length : 0;

  return (
    <AppLayout currentTab="profile" onTabChange={onTabChange} currentStreak={telemetry?.currentStreak}>
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 pb-12 animate-fade-up">
        {/* Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-danger-subtle border border-danger/30 text-xs text-danger flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {profileSuccess && (
          <div className="p-3.5 rounded-xl bg-success-subtle border border-success/30 text-xs text-success flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {/* 1. Developer Hero Banner + Live Telemetry */}
        <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: 'var(--border-active)' }}
          />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Avatar & Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl border border-border-subtle overflow-hidden bg-surface-elevated flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
                  <UserAvatar
                    avatarUrl={profile?.avatarUrl}
                    displayName={profile?.displayName || displayName || 'Harshal Patel'}
                    size={96}
                    className="w-full h-full"
                  />
                </div>
                <label className="absolute inset-0 rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[11px] text-white gap-1 font-mono">
                  <Upload className="w-4 h-4 text-primary" />
                  <span>{isUploadingAvatar ? 'Saving...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                    {profile?.displayName || 'Harshal Patel'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success-subtle text-success text-[11px] font-mono font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Active Workspace
                  </span>
                </div>
                <div className="text-xs font-mono text-text-secondary">{profile?.email}</div>
                <div className="text-xs font-mono text-primary">
                  B.Tech ICT • Dhirubhai Ambani University
                </div>
                <div className="text-[11px] text-text-muted pt-0.5">
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'} · Hover avatar to upload photo
                </div>
              </div>
            </div>

            {/* Live Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 shrink-0">
              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>Solved</span>
                </div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {telemetry?.totalSolved ?? 0}
                  <span className="text-xs font-normal text-text-muted">/{telemetry?.totalProblems ?? 600}</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                  <Flame className="w-3.5 h-3.5 text-primary" />
                  <span>Streak</span>
                </div>
                <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                  {telemetry?.currentStreak ?? 0}d
                  <span className="text-xs font-normal text-text-muted"> / {telemetry?.longestStreak ?? 0}d</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle col-span-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span>
                    <strong className="text-text-primary">{unlockedBadgesCount}</strong> Badges Earned
                  </span>
                </div>
                {onTabChange && (
                  <button
                    type="button"
                    onClick={() => onTabChange('dashboard')}
                    className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Curriculum Progress Bars */}
          {telemetry && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-border-subtle">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Code2 className="w-3.5 h-3.5 text-primary" />
                    C++ DSA Curriculum
                  </span>
                  <span className="text-text-primary font-semibold">
                    {telemetry.dsaSolved}/{telemetry.dsaTotal} ({dsaPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${dsaPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    SQL Query Lab
                  </span>
                  <span className="text-text-primary font-semibold">
                    {telemetry.sqlSolved}/{telemetry.sqlTotal} ({sqlPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${sqlPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. Earned Badges & Milestones Showcase */}
        {telemetry && telemetry.badges.length > 0 && (
          <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">Achievements & Badges</h2>
              </div>
              <span className="text-xs font-mono text-text-muted">
                {unlockedBadgesCount} of {telemetry.badges.length} unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {telemetry.badges.map((badge) => {
                const pct = badge.target > 0 ? Math.min(100, Math.round((badge.current / badge.target) * 100)) : 0;
                return (
                  <div
                    key={badge.badgeKey}
                    className={`p-3.5 rounded-xl border transition-all ${
                      badge.unlocked
                        ? 'bg-surface-elevated border-primary/40 shadow-sm'
                        : 'bg-surface-subtle border-border-subtle opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-xs font-semibold truncate ${
                          badge.unlocked ? 'text-text-primary' : 'text-text-secondary'
                        }`}
                      >
                        {badge.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          badge.unlocked ? 'bg-success-subtle text-success' : 'bg-surface-high text-text-muted'
                        }`}
                      >
                        {badge.unlocked ? 'Earned' : `${badge.current}/${badge.target}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted line-clamp-2 min-h-[28px]">{badge.description}</p>
                    <div className="mt-2.5 w-full h-1 rounded-full bg-surface-high overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          badge.unlocked ? 'bg-success' : 'bg-primary/70'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Coding Workspace Theme Selector (Visual Mini-IDE Cards) */}
        <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Coding Workspace Theme</h2>
            </div>
            <span className="text-xs font-mono text-text-muted">Applies across editor, dashboard &amp; lists</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {THEME_OPTIONS.map((choice) => {
              const active = themePreference === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handleSelectTheme(choice.id)}
                  className={`group flex flex-col gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    active
                      ? 'bg-surface-elevated border-primary ring-1 ring-primary/35 shadow-sm'
                      : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-elevated hover:border-border-hover'
                  }`}
                >
                  {/* Mini IDE Syntax Preview Strip */}
                  <div
                    className="w-full h-12 rounded-lg border border-border-subtle p-2 flex flex-col justify-between overflow-hidden"
                    style={{ backgroundColor: choice.swatches[0] }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: choice.swatches[2] }} />
                        <span className="w-1.5 h-1.5 rounded-full opacity-75" style={{ backgroundColor: choice.swatches[1] }} />
                        <span className="w-1.5 h-1.5 rounded-full opacity-55" style={{ backgroundColor: choice.swatches[2] }} />
                      </div>
                      <span
                        className="h-2 w-8 rounded-sm opacity-75"
                        style={{ backgroundColor: choice.swatches[1] }}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: choice.swatches[2], opacity: 0.85 }} />
                      <div className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: choice.swatches[1], opacity: 0.85 }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-text-primary truncate block">
                        {choice.label}
                      </span>
                      <span className="text-[11px] text-text-muted truncate block">{choice.subtitle}</span>
                    </div>
                    {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Pixel Characters + Personal Preferences */}
        <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Pixel Character Studio & Preferences</h2>
            </div>
            <button
              type="button"
              disabled={isSavingAvatarPreset}
              onClick={() => handleSelectPixelAvatar('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Use Default Bot</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PIXEL_AVATAR_PRESETS.map((preset) => {
              const usingPixel = !profile?.avatarUrl || profile.avatarUrl.startsWith('pixel:');
              const currentPresetId = profile?.avatarUrl || DEFAULT_PIXEL_AVATAR_ID;
              const isSelected = usingPixel && currentPresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isSavingAvatarPreset}
                  onClick={() => handleSelectPixelAvatar(preset.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-surface-elevated border-primary ring-1 ring-primary/35 shadow-sm'
                      : 'bg-surface-subtle border-border-subtle hover:bg-surface-elevated hover:border-border-hover'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border-subtle">
                    <PixelAvatar presetId={preset.id} size={40} className="w-full h-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-text-primary truncate">{preset.name}</div>
                    <div className="text-[10px] font-mono text-text-muted truncate">{preset.tag}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4 border-t border-border-subtle">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Time Zone</span>
                  </label>
                  <span className="text-[11px] font-mono text-primary">{liveClockText}</span>
                </div>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </section>

        {/* 5. Password Security & Data Portability Split */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Password Card */}
          <section className="lg:col-span-3 bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
              <Key className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Password & Security</h2>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-success-subtle border border-success/30 text-xs text-success flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-9 bg-surface-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd((p) => !p)}
                    aria-label={showCurrentPwd ? 'Hide current password' : 'Show current password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showCurrentPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    New Password (min 10 chars)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-9 bg-surface-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd((p) => !p)}
                      aria-label={showNewPwd ? 'Hide new password' : 'Show new password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showNewPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-9 bg-surface-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd((p) => !p)}
                      aria-label={showConfirmPwd ? 'Hide confirmation password' : 'Show confirmation password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showConfirmPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" variant="secondary" size="sm">
                  Update Password
                </Button>
              </div>
            </form>
          </section>

          {/* Data Export & Backup Card */}
          <section className="lg:col-span-2 bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
                <Download className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">SQLite Data Portability</h2>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Download a complete, portable JSON snapshot containing your profile settings, submission history, saved code drafts, bookmarks, notes, and active streak logs.
              </p>
            </div>

            <Button variant="secondary" onClick={handleExportData} className="w-full gap-2 text-xs">
              <Download className="w-4 h-4" />
              <span>Export Complete Backup (JSON)</span>
            </Button>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};
