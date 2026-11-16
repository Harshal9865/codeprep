import React, { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { CodePrepLoader } from '../components/ui/CodePrepLoader';
import { apiRequest } from '../services/api';
import { fetchDashboardAnalytics } from '../services/analyticsCache';
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
  BarChart3,
  Settings,
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

interface SolveSpeedStats {
  trackedSolvedCount: number;
  totalActiveMinutes: number;
  avgEasySec: number | null;
  avgMediumSec: number | null;
  avgHardSec: number | null;
  fastestSolveSec: number | null;
  fastestProblemTitle: string | null;
}

interface ProfileStats {
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
  solveSpeedStats?: SolveSpeedStats;
}

interface StorageStatus {
  engine: 'PostgreSQL' | 'SQLite';
  persistent: boolean;
  location: string;
  note: string;
}

interface ProfilePageProps {
  onTabChange?: (tab: string) => void;
}

type ProfileTab = 'overview' | 'appearance' | 'settings';

export const ProfilePage: React.FC<ProfilePageProps> = ({ onTabChange }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
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
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAvatarPreset, setIsSavingAvatarPreset] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [avatarJustUpdated, setAvatarJustUpdated] = useState(false);
  const [passwordJustUpdated, setPasswordJustUpdated] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [localSnapshotMeta, setLocalSnapshotMeta] = useState<LocalBackupMeta | null>(() =>
    getLocalBackupMeta()
  );

  const toastTimerRef = React.useRef<number | null>(null);
  const avatarFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const backupFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const showToast = React.useCallback(
    (type: 'success' | 'error', title: string, message: string) => {
      setToast({ type, title, message });
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4500);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const fetchAllProfileData = async () => {
    setIsInitialLoading(true);
    try {
      const [profileRes, analyticsRes] = await Promise.all([
        apiRequest<{ user: UserProfile; storage?: StorageStatus }>('/user/profile'),
        fetchDashboardAnalytics<ProfileStats>().catch(() => null),
      ]);

      setProfile(profileRes.user);
      setStorageStatus(profileRes.storage || null);
      setLocalSnapshotMeta(getLocalBackupMeta(profileRes.user.email));
      setDisplayName(profileRes.user.displayName || '');
      setTimezone(profileRes.user.timezone || 'Asia/Kolkata');
      const dbTheme = (profileRes.user.themePreference || 'dark') as ThemeMode;
      setThemePreference(dbTheme);

      if (analyticsRes) {
        const payload = analyticsRes;
        setStats({
          totalSolved: payload.totalSolved ?? 0,
          totalProblems: payload.totalProblems ?? 3000,
          dsaSolved: payload.dsaSolved ?? 0,
          dsaTotal: payload.dsaTotal ?? 2500,
          sqlSolved: payload.sqlSolved ?? 0,
          sqlTotal: payload.sqlTotal ?? 400,
          oopSolved: payload.oopSolved ?? 0,
          oopTotal: payload.oopTotal ?? 100,
          currentStreak: payload.currentStreak ?? 0,
          longestStreak: payload.longestStreak ?? 0,
          badges: Array.isArray(payload.badges) ? payload.badges : [],
          solveSpeedStats: payload.solveSpeedStats,
        });
      }
    } catch {
      setErrorMsg('Failed to load profile details.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllProfileData();
    const handleProgressUpdated = () => {
      void fetchAllProfileData();
    };
    window.addEventListener('codeprep:progress-updated', handleProgressUpdated);
    return () => {
      window.removeEventListener('codeprep:progress-updated', handleProgressUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setThemePreference(theme);
  }, [theme]);

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
    showToast('success', 'Theme Updated', `Switched theme to ${chosen?.label || themeId}.`);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await apiRequest<{ user: UserProfile; message: string }>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, timezone, themePreference }),
      });
      setProfile(res.user);
      window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: res.user }));
      window.dispatchEvent(
        new CustomEvent('codeprep-theme-sync', { detail: res.user.themePreference })
      );
      window.dispatchEvent(new CustomEvent('codeprep:backup-dirty'));
      showToast('success', 'Profile Saved', res.message || 'Profile settings updated.');
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Failed to update profile settings.';
      setErrorMsg(errText);
      showToast('error', 'Save Failed', errText);
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
          resolve(canvas.toDataURL('image/png'));
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
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ user: UserProfile }>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: presetId }),
      });
      setProfile(res.user);
      window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: res.user }));
      const selectedPreset =
        PIXEL_AVATAR_PRESETS.find((p) => p.id === res.user.avatarUrl) || PIXEL_AVATAR_PRESETS[0];
      triggerAvatarPulse();
      showToast('success', 'Avatar Updated', `Switched to ${selectedPreset.name}.`);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Failed to update avatar.';
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
      window.dispatchEvent(new CustomEvent('codeprep:backup-dirty'));
      triggerAvatarPulse();
      showToast('success', 'Photo Updated', res.message || 'Custom photo applied.');
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Avatar upload failed.';
      setErrorMsg(errText);
      showToast('error', 'Upload Failed', errText);
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
      showToast('success', 'Backup Exported', 'JSON backup downloaded and cached locally.');
    } catch {
      const msg = 'Failed to export backup.';
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
        `${submissionsRestored} submissions, ${draftsRestored} drafts, and ${savedProblemsRestored} saved items restored.`
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
      showToast('error', 'Invalid File', msg);
    }
  };

  const handleRestoreBrowserSnapshot = async () => {
    const snap = readLocalBackupSnapshot(profile?.email);
    if (!snap) {
      showToast('error', 'No Snapshot', 'No browser backup found.');
      return;
    }
    await applyImportedSnapshot(snap, 'Browser Snapshot');
  };

  if (isInitialLoading) {
    return (
      <AppLayout currentTab="profile" onTabChange={onTabChange}>
        <CodePrepLoader
          variant="section"
          className="flex-1 min-h-[420px]"
          label="Loading Profile"
          sublabel="Loading account details..."
        />
      </AppLayout>
    );
  }

  const totalSolved = stats?.totalSolved ?? 0;
  const totalProblems = stats?.totalProblems ?? 3000;
  const overallPct = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;
  const dsaPct = stats && stats.dsaTotal > 0 ? Math.round((stats.dsaSolved / stats.dsaTotal) * 100) : 0;
  const sqlPct = stats && stats.sqlTotal > 0 ? Math.round((stats.sqlSolved / stats.sqlTotal) * 100) : 0;
  const oopPct = stats && stats.oopTotal > 0 ? Math.round((stats.oopSolved / stats.oopTotal) * 100) : 0;
  const unlockedBadgesCount = stats ? stats.badges.filter((b) => b.unlocked).length : 0;
  const shownName = profile?.displayName || 'Developer';

  return (
    <AppLayout currentTab="profile" onTabChange={onTabChange} currentStreak={stats?.currentStreak}>
      {/* Always-mounted file inputs for avatar & JSON import */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleAvatarUpload}
        className="hidden"
      />
      <input
        ref={backupFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportBackupFile}
        className="hidden"
      />

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 space-y-5 pb-14 animate-fade-up">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-danger-subtle border border-danger/30 text-xs text-danger flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT IDENTITY RAIL */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
            <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 shadow-sm">
              {/* Avatar + Name + Upload */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative group">
                  <div
                    className={`w-24 h-24 rounded-2xl overflow-hidden bg-surface-elevated border-2 flex items-center justify-center transition-all ${
                      avatarJustUpdated
                        ? 'border-success ring-4 ring-success/20'
                        : 'border-border-default'
                    }`}
                  >
                    <UserAvatar
                      avatarUrl={profile?.avatarUrl}
                      displayName={shownName}
                      size={96}
                      className="w-full h-full"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => avatarFileInputRef.current?.click()}
                    title="Change photo"
                    className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-black flex items-center justify-center shadow-md border-2 border-surface transition-colors cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="space-y-1 min-w-0 w-full">
                  <h1 className="text-xl font-bold text-text-primary truncate">{shownName}</h1>
                  <p className="text-xs font-mono text-text-muted truncate">{profile?.email}</p>
                  <div className="flex items-center justify-center gap-2 pt-1 text-[11px] font-mono text-text-muted">
                    <span>
                      Joined{' '}
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString()
                        : '—'}
                    </span>
                    {storageStatus && (
                      <>
                        <span>•</span>
                        <span
                          className={
                            storageStatus.persistent ? 'text-success' : 'text-warning'
                          }
                        >
                          {storageStatus.engine}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Overall Solve Bar */}
              <div className="pt-4 border-t border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-text-secondary">Overall Progress</span>
                  <span className="font-semibold text-text-primary">
                    {totalSolved} / {totalProblems} ({overallPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>

              {/* Quick 3 Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-text-muted">
                    <Flame className="w-3 h-3 text-primary" />
                    <span>Streak</span>
                  </div>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {stats?.currentStreak ?? 0}d
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-text-muted">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    <span>Best</span>
                  </div>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {stats?.longestStreak ?? 0}d
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-text-muted">
                    <Trophy className="w-3 h-3 text-warning" />
                    <span>Badges</span>
                  </div>
                  <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                    {unlockedBadgesCount}
                  </div>
                </div>
              </div>

              {onTabChange && (
                <button
                  type="button"
                  onClick={() => onTabChange('dashboard')}
                  className="w-full py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs font-medium text-text-primary flex items-center justify-between transition-colors"
                >
                  <span>Open Explore Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </button>
              )}
            </div>
          </aside>

          {/* RIGHT TABBED WORKSPACE */}
          <div className="lg:col-span-8 space-y-5">
            {/* Segmented Tab Bar */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-surface border border-border-subtle w-fit">
              {[
                { id: 'overview' as ProfileTab, label: 'Overview', icon: BarChart3 },
                { id: 'appearance' as ProfileTab, label: 'Appearance', icon: Palette },
                { id: 'settings' as ProfileTab, label: 'Account & Backup', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-primary text-black shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Track Progress */}
                {stats && (
                  <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-text-primary">Track Breakdown</h2>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-2 text-text-secondary">
                            <Code2 className="w-3.5 h-3.5 text-primary" />
                            <span>DSA Problems</span>
                          </span>
                          <span className="text-text-primary font-semibold">
                            {stats.dsaSolved}/{stats.dsaTotal} ({dsaPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${dsaPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-2 text-text-secondary">
                            <Database className="w-3.5 h-3.5 text-sky-400" />
                            <span>SQL Queries</span>
                          </span>
                          <span className="text-text-primary font-semibold">
                            {stats.sqlSolved}/{stats.sqlTotal} ({sqlPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all duration-500"
                            style={{ width: `${sqlPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-2 text-text-secondary">
                            <Boxes className="w-3.5 h-3.5 text-purple-400" />
                            <span>OOPs C++ Design</span>
                          </span>
                          <span className="text-text-primary font-semibold">
                            {stats.oopSolved}/{stats.oopTotal} ({oopPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${oopPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Solve Speed */}
                {stats?.solveSpeedStats && (
                  <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-primary">Solve Speed</h2>
                      </div>
                      <span className="text-xs font-mono text-text-muted">
                        {stats.solveSpeedStats.totalActiveMinutes}m total ·{' '}
                        {stats.solveSpeedStats.trackedSolvedCount} timed solves
                      </span>
                    </div>

                    {(() => {
                      const spd = stats.solveSpeedStats!;
                      const fmtDur = (sec: number | null) => {
                        if (sec === null) return '—';
                        const m = Math.floor(sec / 60);
                        const s = sec % 60;
                        return m > 0 ? `${m}m ${s}s` : `${s}s`;
                      };
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle">
                            <div className="text-[11px] font-mono text-success">Easy Avg</div>
                            <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                              {fmtDur(spd.avgEasySec)}
                            </div>
                          </div>
                          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle">
                            <div className="text-[11px] font-mono text-warning">Medium Avg</div>
                            <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                              {fmtDur(spd.avgMediumSec)}
                            </div>
                          </div>
                          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle">
                            <div className="text-[11px] font-mono text-danger">Hard Avg</div>
                            <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                              {fmtDur(spd.avgHardSec)}
                            </div>
                          </div>
                          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle">
                            <div className="text-[11px] font-mono text-primary">Fastest</div>
                            <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
                              {fmtDur(spd.fastestSolveSec)}
                            </div>
                            {spd.fastestProblemTitle && (
                              <div className="text-[10px] text-text-muted truncate mt-0.5">
                                {spd.fastestProblemTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </section>
                )}

                {/* Badges */}
                {stats && stats.badges.length > 0 && (
                  <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-semibold text-text-primary">Badges</h2>
                      </div>
                      <span className="text-xs font-mono text-text-muted">
                        {unlockedBadgesCount}/{stats.badges.length} unlocked
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stats.badges.map((badge) => {
                        const pct =
                          badge.target > 0
                            ? Math.min(100, Math.round((badge.current / badge.target) * 100))
                            : 0;
                        return (
                          <div
                            key={badge.badgeKey}
                            className={`p-3.5 rounded-xl border transition-all ${
                              badge.unlocked
                                ? 'bg-surface-elevated border-primary/35'
                                : 'bg-surface-subtle border-border-subtle opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-text-primary truncate">
                                {badge.title}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                  badge.unlocked
                                    ? 'bg-success-subtle text-success'
                                    : 'bg-surface-high text-text-muted'
                                }`}
                              >
                                {badge.unlocked ? 'Unlocked' : `${badge.current}/${badge.target}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-muted line-clamp-1">
                              {badge.description}
                            </p>
                            <div className="mt-2 w-full h-1 rounded-full bg-surface-high overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
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
              </div>
            )}

            {/* TAB 2: APPEARANCE */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                {/* Theme Selector */}
                <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Editor &amp; UI Theme</h2>
                    <span className="text-xs font-mono text-text-muted">Saved to profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {THEME_OPTIONS.map((choice) => {
                      const active = themePreference === choice.id;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleSelectTheme(choice.id)}
                          className={`flex flex-col gap-2.5 p-3.5 rounded-xl border text-left transition-all ${
                            active
                              ? 'bg-surface-elevated border-primary ring-1 ring-primary/35'
                              : 'bg-surface-subtle border-border-subtle text-text-secondary hover:bg-surface-elevated'
                          }`}
                        >
                          <div
                            className="w-full h-10 rounded-lg border border-border-subtle p-2 flex flex-col justify-between"
                            style={{ backgroundColor: choice.swatches[0] }}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: choice.swatches[2] }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full opacity-75"
                                style={{ backgroundColor: choice.swatches[1] }}
                              />
                            </div>
                            <div
                              className="h-1.5 w-2/3 rounded-full"
                              style={{ backgroundColor: choice.swatches[2], opacity: 0.85 }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-text-primary truncate">
                                {choice.label}
                              </div>
                              <div className="text-[11px] text-text-muted truncate">
                                {choice.subtitle}
                              </div>
                            </div>
                            {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Avatar Picker */}
                <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-semibold text-text-primary">Avatar</h2>
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
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAvatarPreset}
                        onClick={() => handleSelectPixelAvatar('')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-high border border-border-subtle text-xs text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
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
                              ? 'bg-surface-elevated border-primary ring-1 ring-primary/35'
                              : 'bg-surface-subtle border-border-subtle hover:bg-surface-elevated'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-border-subtle">
                            <PixelAvatar presetId={preset.id} size={36} className="w-full h-full" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-text-primary truncate">
                              {preset.name}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted truncate">
                              {preset.tag}
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 3: ACCOUNT & BACKUP */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                {/* Profile Details */}
                <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-text-primary">Profile Details</h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-3.5 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-text-secondary">Time Zone</label>
                          <span className="text-[11px] font-mono text-primary">{liveClockText}</span>
                        </div>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-3.5 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
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

                    <div className="flex justify-end">
                      <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </section>

                {/* Change Password + Backup Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <section className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-semibold text-text-primary">Change Password</h2>
                    </div>

                    {passwordError && (
                      <div className="p-2.5 rounded-lg bg-danger-subtle border border-danger/35 text-xs text-danger font-mono">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-2.5 rounded-lg bg-success-subtle border border-success/35 text-xs text-success font-mono">
                        {passwordSuccess}
                      </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
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
                            className="w-full px-3 py-2 pr-9 bg-surface-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPwd((p) => !p)}
                            aria-label="Toggle current password visibility"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                          >
                            {showCurrentPwd ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPwd ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              if (passwordError) setPasswordError(null);
                            }}
                            className="w-full px-3 py-2 pr-9 bg-surface-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPwd((p) => !p)}
                            aria-label="Toggle new password visibility"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                          >
                            {showNewPwd ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPwd ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (passwordError) setPasswordError(null);
                            }}
                            className="w-full px-3 py-2 pr-9 bg-surface-subtle border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPwd((p) => !p)}
                            aria-label="Toggle confirm password visibility"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                          >
                            {showConfirmPwd ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-[11px] font-mono pt-0.5">
                        <span
                          className={
                            newPassword.length >= 6 ? 'text-success' : 'text-text-muted'
                          }
                        >
                          6+ characters
                        </span>
                        <span
                          className={
                            confirmPassword.length > 0 && newPassword === confirmPassword
                              ? 'text-success'
                              : 'text-text-muted'
                          }
                        >
                          Matches
                        </span>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Button
                          type="submit"
                          variant={passwordJustUpdated ? 'primary' : 'secondary'}
                          size="sm"
                          disabled={isUpdatingPassword}
                        >
                          {isUpdatingPassword
                            ? 'Updating...'
                            : passwordJustUpdated
                            ? 'Updated ✓'
                            : 'Update Password'}
                        </Button>
                      </div>
                    </form>
                  </section>

                  {/* Backup & Data */}
                  <section className="bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-text-primary">Backup &amp; Restore</h2>
                        {storageStatus && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                              storageStatus.persistent
                                ? 'bg-success-subtle text-success border-success/30'
                                : 'bg-warning-subtle text-warning border-warning/30'
                            }`}
                          >
                            {storageStatus.persistent ? 'Persistent' : 'Ephemeral'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary leading-relaxed">
                        Export your submissions, drafts, notes, and streaks as JSON, or restore from a saved snapshot.
                      </p>

                      {storageStatus && !storageStatus.persistent && (
                        <div className="p-2.5 rounded-xl bg-warning-subtle/60 border border-warning/35 text-[11px] text-text-secondary leading-relaxed">
                          {storageStatus.note}
                        </div>
                      )}

                      {localSnapshotMeta && (
                        <div className="p-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-[11px] font-mono text-text-muted space-y-0.5">
                          <div className="text-text-secondary font-semibold">Browser Snapshot</div>
                          <div>
                            {localSnapshotMeta.acceptedSubmissions} solved ·{' '}
                            {localSnapshotMeta.totalSubmissions} submissions ·{' '}
                            {localSnapshotMeta.draftsCount} drafts
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        variant="secondary"
                        onClick={handleExportData}
                        className="w-full gap-2 text-xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export JSON Backup</span>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => backupFileInputRef.current?.click()}
                        disabled={isImportingBackup}
                        className="w-full gap-2 text-xs"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isImportingBackup ? 'Restoring...' : 'Import JSON Backup'}</span>
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
            )}
          </div>
        </div>
      </div>

      {/* Floating Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm flex items-start gap-3 px-4 py-3 rounded-2xl bg-surface-elevated border shadow-2xl animate-fade-up ${
            toast.type === 'success' ? 'border-success/50' : 'border-danger/50'
          }`}
        >
          <span
            className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
              toast.type === 'success'
                ? 'bg-success-subtle text-success'
                : 'bg-danger-subtle text-danger'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className={`text-xs font-semibold ${
                toast.type === 'success' ? 'text-success' : 'text-danger'
              }`}
            >
              {toast.title}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 leading-snug">
              {toast.message}
            </div>
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
