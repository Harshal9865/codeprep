import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { apiRequest } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import {
  getLocalBackupMeta,
  importBackupSnapshot,
  LocalBackupMeta,
  PortableBackupSnapshot,
  readLocalBackupSnapshot,
  saveLocalBackupSnapshot,
} from '../utils/backupSync';
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
  Loader2,
  X,
  Camera,
  Boxes,
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
  oopSolved: number;
  oopTotal: number;
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
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAvatarPreset, setIsSavingAvatarPreset] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [avatarJustUpdated, setAvatarJustUpdated] = useState(false);
  const [passwordJustUpdated, setPasswordJustUpdated] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [localSnapshotMeta, setLocalSnapshotMeta] = useState<LocalBackupMeta | null>(() => getLocalBackupMeta());
  const toastTimerRef = React.useRef<number | null>(null);
  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const backupFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const showToast = React.useCallback((type: 'success' | 'error', title: string, message: string) => {
    setToast({ type, title, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetchAllProfileData();
    const handleProgressUpdated = () => {
      void fetchAllProfileData();
    };
    window.addEventListener('codeprep:progress-updated', handleProgressUpdated);
    return () => {
      window.removeEventListener('codeprep:progress-updated', handleProgressUpdated);
    };
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
      setLocalSnapshotMeta(getLocalBackupMeta(profileRes.user.email));
      setDisplayName(profileRes.user.displayName || '');
      setTimezone(profileRes.user.timezone || 'Asia/Kolkata');
      const dbTheme = (profileRes.user.themePreference || 'dark') as ThemeMode;
      setThemePreference(dbTheme);

      if (analyticsRes) {
        const stats = analyticsRes.analytics || (analyticsRes as ProfileTelemetry);
        setTelemetry({
          totalSolved: stats.totalSolved ?? 0,
          totalProblems: stats.totalProblems ?? 3000,
          dsaSolved: stats.dsaSolved ?? 0,
          dsaTotal: stats.dsaTotal ?? 2500,
          sqlSolved: stats.sqlSolved ?? 0,
          sqlTotal: stats.sqlTotal ?? 400,
          oopSolved: stats.oopSolved ?? 0,
          oopTotal: stats.oopTotal ?? 100,
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
    const chosen = THEME_OPTIONS.find((t) => t.id === themeId);
    const msg = `Workspace theme switched to ${chosen?.label || themeId}.`;
    setProfileSuccess(msg);
    showToast('success', 'Theme Updated', msg);
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
      const msg = res.message || 'Profile settings updated.';
      setProfileSuccess(msg);
      showToast('success', 'Profile Saved', msg);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Failed to update profile settings.';
      setErrorMsg(errText);
      showToast('error', 'Profile Save Failed', errText);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerAvatarPulse = () => {
    setAvatarJustUpdated(true);
    window.setTimeout(() => setAvatarJustUpdated(false), 3000);
  };

  const prepareAvatarDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const targetSize = 320;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas unavailable'));
            return;
          }
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
          URL.revokeObjectURL(objectUrl);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Selected file could not be read as an image.'));
      };
      img.src = objectUrl;
    });

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
      const msg = `Avatar switched to ${selectedPreset.name}.`;
      setProfileSuccess(msg);
      triggerAvatarPulse();
      showToast('success', 'Avatar Updated', msg);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Failed to save pixel character.';
      setErrorMsg(errText);
      showToast('error', 'Avatar Update Failed', errText);
    } finally {
      setIsSavingAvatarPreset(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
      const errText = 'Only JPEG, PNG, and WebP images are allowed.';
      setErrorMsg(errText);
      showToast('error', 'Unsupported Image', errText);
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMsg(null);
    setProfileSuccess(null);

    try {
      const base64Data = await prepareAvatarDataUrl(file);
      const res = await apiRequest<{ avatarUrl: string; message: string }>('/user/avatar', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: base64Data }),
      });

      setProfile((prev) => {
        const nextProfile = prev ? { ...prev, avatarUrl: res.avatarUrl } : prev;
        if (nextProfile) {
          window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: nextProfile }));
        }
        return nextProfile;
      });
      const msg = res.message || 'Custom profile photo uploaded and applied across your workspace.';
      setProfileSuccess(msg);
      triggerAvatarPulse();
      showToast('success', 'Profile Photo Updated', 'Your new avatar is now live in header & profile.');
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Avatar upload failed.';
      setErrorMsg(errText);
      showToast('error', 'Photo Upload Failed', errText);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);
    setErrorMsg(null);

    if (newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters long.';
      setPasswordError(msg);
      showToast('error', 'Password Too Short', msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation do not match.';
      setPasswordError(msg);
      showToast('error', 'Passwords Do Not Match', msg);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/user/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const msg = res.message || 'Password updated successfully.';
      setPasswordSuccess(msg);
      setPasswordJustUpdated(true);
      window.setTimeout(() => setPasswordJustUpdated(false), 3500);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password Updated', msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password change failed.';
      setPasswordError(msg);
      showToast('error', 'Password Update Failed', msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleExportData = async () => {
    try {
      const dump = await apiRequest<PortableBackupSnapshot>('/user/export');
      saveLocalBackupSnapshot(dump);
      setLocalSnapshotMeta(getLocalBackupMeta(profile?.email));

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codeprep-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Backup Exported', 'Your complete JSON snapshot has been downloaded and synced locally.');
    } catch {
      const msg = 'Failed to trigger JSON data export.';
      setErrorMsg(msg);
      showToast('error', 'Export Failed', msg);
    }
  };

  const applyImportedSnapshot = async (snapshot: PortableBackupSnapshot, sourceLabel: string) => {
    setIsImportingBackup(true);
    setErrorMsg(null);
    try {
      const res = await importBackupSnapshot(snapshot);
      saveLocalBackupSnapshot(snapshot);
      setLocalSnapshotMeta(getLocalBackupMeta(profile?.email));
      await fetchAllProfileData();
      const { submissionsRestored, draftsRestored, savedProblemsRestored } = res.restored;
      showToast(
        'success',
        `Restored from ${sourceLabel}`,
        `Synced ${submissionsRestored} submissions, ${draftsRestored} drafts, and ${savedProblemsRestored} saved notes/bookmarks.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import backup JSON.';
      setErrorMsg(msg);
      showToast('error', 'Restore Failed', msg);
    } finally {
      setIsImportingBackup(false);
    }
  };

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as PortableBackupSnapshot;
      await applyImportedSnapshot(parsed, 'Backup File');
    } catch {
      const msg = 'Invalid JSON backup file.';
      setErrorMsg(msg);
      showToast('error', 'Invalid Backup File', msg);
    }
  };

  const handleRestoreBrowserSnapshot = async () => {
    const snap = readLocalBackupSnapshot();
    if (!snap) {
      showToast('error', 'No Local Snapshot', 'No browser auto-backup snapshot found.');
      return;
    }
    await applyImportedSnapshot(snap, 'Browser Auto-Snapshot');
  };

  if (isInitialLoading) {
    return (
      <AppLayout currentTab="profile" onTabChange={onTabChange}>
        <CodePrepLoader
          variant="section"
          className="flex-1 min-h-[420px]"
          label="Loading Profile"
          sublabel="Loading profile settings and saved preferences..."
        />
      </AppLayout>
    );
  }

  const dsaPct = telemetry && telemetry.dsaTotal > 0 ? Math.round((telemetry.dsaSolved / telemetry.dsaTotal) * 100) : 0;
  const sqlPct = telemetry && telemetry.sqlTotal > 0 ? Math.round((telemetry.sqlSolved / telemetry.sqlTotal) * 100) : 0;
  const oopPct = telemetry && telemetry.oopTotal > 0 ? Math.round((telemetry.oopSolved / telemetry.oopTotal) * 100) : 0;
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

        {/* 1. Developer Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm">
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Avatar & Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative group shrink-0">
                <div
                  className={`w-24 h-24 rounded-2xl overflow-hidden bg-surface-elevated flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-[1.02] border ${
                    avatarJustUpdated
                      ? 'border-success ring-2 ring-success/50 scale-[1.03]'
                      : 'border-border-subtle'
                  }`}
                >
                  <UserAvatar
                    avatarUrl={profile?.avatarUrl}
                    displayName={profile?.displayName || displayName || 'Harshal Patel'}
                    size={96}
                    className="w-full h-full"
                  />
                </div>
                {isUploadingAvatar ? (
                  <div className="absolute inset-0 rounded-2xl bg-black/75 flex flex-col items-center justify-center text-[11px] text-white gap-1.5 font-mono">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  <label className="absolute inset-0 rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[11px] text-white gap-1 font-mono">
                    <Camera className="w-4 h-4 text-primary" />
                    <span>Change</span>
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                )}
                {avatarJustUpdated && !isUploadingAvatar && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-success text-white text-[10px] font-mono font-semibold shadow-sm whitespace-nowrap animate-fade-up">
                    Updated ✓
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                    {profile?.displayName || 'Harshal Patel'}
                  </h1>
                </div>
                <div className="text-xs font-mono text-text-secondary">{profile?.email}</div>
                <div className="text-xs font-mono text-primary">
                  B.Tech ICT • Dhirubhai Ambani University
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-[11px] font-mono text-text-primary transition-colors"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-3 h-3 text-primary" />
                    )}
                    <span>{isUploadingAvatar ? 'Uploading Photo...' : 'Upload Photo'}</span>
                  </button>
                  <span className="text-[11px] text-text-muted">
                    Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
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
                  <span className="text-xs font-normal text-text-muted">/{telemetry?.totalProblems ?? 3000}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-border-subtle">
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <Boxes className="w-3.5 h-3.5 text-purple-400" />
                    OOPs C++ Design
                  </span>
                  <span className="text-text-primary font-semibold">
                    {telemetry.oopSolved}/{telemetry.oopTotal} ({oopPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${oopPct}%` }}
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
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">Pixel Character Studio & Preferences</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={() => avatarFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-subtle hover:bg-primary/20 border border-primary/30 text-xs font-medium text-primary transition-colors"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Custom Photo'}</span>
              </button>
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

            {passwordError && (
              <div className="p-3 rounded-lg bg-danger-subtle border border-danger/35 text-xs text-danger flex items-center gap-2 font-mono animate-fade-up">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-success-subtle border border-success/35 text-xs text-success flex items-center gap-2 font-mono animate-fade-up">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
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
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
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
                    New Password (min 6 chars)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
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
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
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

              {/* Live Validation Checklist */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono pt-0.5">
                <span className={`inline-flex items-center gap-1 ${newPassword.length >= 10 ? 'text-success' : 'text-text-muted'}`}>
                  <Check className="w-3 h-3" />
                  <span>10+ characters</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 ${
                    confirmPassword.length > 0 && newPassword === confirmPassword ? 'text-success' : 'text-text-muted'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Passwords match</span>
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant={passwordJustUpdated ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={isUpdatingPassword}
                  className="gap-1.5 min-w-[140px]"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : passwordJustUpdated ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Updated ✓</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </Button>
              </div>
            </form>
          </section>

          {/* Data Export, Import & Auto-Sync Card */}
          <section className="lg:col-span-2 bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
                <Download className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text-primary">SQLite Backup &amp; Restore</h2>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Export or restore your full progress (submissions, streaks, code drafts, bookmarks, and notes). Your browser also keeps an automatic snapshot to recover after stateless container restarts.
              </p>
              {localSnapshotMeta && (
                <div className="p-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-mono text-text-muted space-y-0.5">
                  <div className="text-text-secondary font-semibold">Saved Browser Backup</div>
                  <div>
                    {localSnapshotMeta.acceptedSubmissions} solved • {localSnapshotMeta.totalSubmissions} submissions • {localSnapshotMeta.draftsCount} drafts
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <input
                ref={backupFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportBackupFile}
                className="hidden"
              />
              <Button variant="secondary" onClick={handleExportData} className="w-full gap-2 text-xs">
                <Download className="w-4 h-4" />
                <span>Export Backup (JSON)</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => backupFileInputRef.current?.click()}
                disabled={isImportingBackup}
                className="w-full gap-2 text-xs"
              >
                <Upload className="w-4 h-4" />
                <span>{isImportingBackup ? 'Restoring...' : 'Import Backup (JSON)'}</span>
              </Button>
              {localSnapshotMeta && (
                <Button
                  variant="ghost"
                  onClick={handleRestoreBrowserSnapshot}
                  disabled={isImportingBackup}
                  className="w-full gap-2 text-xs text-primary hover:text-primary"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Browser Snapshot</span>
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Floating Scroll-Independent Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm flex items-start gap-3 px-4 py-3 rounded-2xl bg-surface-elevated border shadow-2xl animate-fade-up ${
            toast.type === 'success' ? 'border-success/50' : 'border-danger/50'
          }`}
        >
          <span
            className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-semibold ${toast.type === 'success' ? 'text-success' : 'text-danger'}`}>
              {toast.title}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 leading-snug">{toast.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-text-muted hover:text-text-primary transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </AppLayout>
  );
};
