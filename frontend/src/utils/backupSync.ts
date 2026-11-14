import { apiRequest } from '../services/api';

const BACKUP_STORAGE_KEY = 'codeprep_auto_backup_v1';

function getBackupStorageKey(userEmail?: string | null): string {
  const normalized = userEmail?.toLowerCase().trim();
  return normalized ? `${BACKUP_STORAGE_KEY}:${normalized}` : BACKUP_STORAGE_KEY;
}

export interface PortableBackupSnapshot {
  metadata?: {
    exportDate?: string;
    version?: string;
    platform?: string;
  };
  user?: {
    id?: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string | null;
    themePreference?: string;
    timezone?: string;
  } | null;
  summary?: {
    totalSubmissions?: number;
    acceptedSubmissions?: number;
    bookmarkedProblems?: number;
    notesCount?: number;
  };
  submissions?: Array<{
    problemId: number;
    language?: string;
    code: string;
    verdict: string;
    runtimeMs?: number | null;
    memoryKb?: number | null;
    submittedAt?: string;
  }>;
  drafts?: Array<{
    problemId: number;
    code: string;
  }>;
  timers?: Array<{
    problemId: number;
    activeSeconds?: number;
  }>;
  savedProblems?: Array<{
    id: number;
    isBookmark?: boolean;
    userNotes?: string | null;
    solvedWithAiHelp?: boolean;
  }>;
}

export interface LocalBackupMeta {
  savedAt: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  draftsCount: number;
  notesAndBookmarksCount: number;
  email?: string;
}

function hasMeaningfulData(snap: PortableBackupSnapshot | null | undefined): boolean {
  if (!snap) return false;
  return (
    (snap.submissions?.length || 0) > 0 ||
    (snap.drafts?.length || 0) > 0 ||
    (snap.savedProblems?.length || 0) > 0
  );
}

export function readLocalBackupSnapshot(userEmail?: string | null): PortableBackupSnapshot | null {
  try {
    const scopedKey = getBackupStorageKey(userEmail);
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      const parsed = JSON.parse(raw) as PortableBackupSnapshot;
      if (hasMeaningfulData(parsed)) {
        return parsed;
      }
    }

    // Legacy fallback: only match if legacy key belongs to this exact email
    if (scopedKey !== BACKUP_STORAGE_KEY && userEmail) {
      const legacyRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw) as PortableBackupSnapshot;
        if (
          hasMeaningfulData(legacyParsed) &&
          legacyParsed.user?.email?.toLowerCase() === userEmail.toLowerCase()
        ) {
          return legacyParsed;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function getLocalBackupMeta(userEmail?: string | null): LocalBackupMeta | null {
  const snap = readLocalBackupSnapshot(userEmail);
  if (!snap) return null;
  const subs = snap.submissions || [];
  return {
    savedAt: snap.metadata?.exportDate || new Date().toISOString(),
    totalSubmissions: subs.length,
    acceptedSubmissions: subs.filter((s) => s.verdict === 'Accepted').length,
    draftsCount: snap.drafts?.length || 0,
    notesAndBookmarksCount: snap.savedProblems?.length || 0,
    email: snap.user?.email,
  };
}

export function saveLocalBackupSnapshot(snap: PortableBackupSnapshot): void {
  if (!hasMeaningfulData(snap)) return;
  try {
    const targetKey = getBackupStorageKey(snap.user?.email);
    localStorage.setItem(targetKey, JSON.stringify(snap));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export async function importBackupSnapshot(snap: PortableBackupSnapshot) {
  const res = await apiRequest<{
    message: string;
    user?: Record<string, unknown> | null;
    restored: {
      submissionsRestored: number;
      draftsRestored: number;
      timersRestored: number;
      savedProblemsRestored: number;
    };
  }>('/user/import', {
    method: 'POST',
    body: JSON.stringify(snap),
  });

  if (res.user) {
    window.dispatchEvent(new CustomEvent('codeprep:user-updated', { detail: res.user }));
  }
  window.dispatchEvent(new CustomEvent('codeprep:progress-updated'));
  return res;
}

let lastSyncTs = 0;

export async function syncAutoBackup(): Promise<void> {
  const now = Date.now();
  if (now - lastSyncTs < 4000) return;
  lastSyncTs = now;

  try {
    const serverSnap = await apiRequest<PortableBackupSnapshot>('/user/export');
    if (hasMeaningfulData(serverSnap)) {
      saveLocalBackupSnapshot(serverSnap);
    }
  } catch {
    // Silent background snapshot
  }
}

/**
 * Checks whether the backend database rebooted empty after a deploy.
 * If empty and browser holds a snapshot for this user, restores it seamlessly.
 */
export async function ensureBackupOrAutoRestore(userEmail?: string): Promise<boolean> {
  try {
    const serverSnap = await apiRequest<PortableBackupSnapshot>('/user/export');
    if (hasMeaningfulData(serverSnap)) {
      saveLocalBackupSnapshot(serverSnap);
      return false;
    }

    const localSnap = readLocalBackupSnapshot(userEmail);
    if (!localSnap) return false;

    const sameAccount =
      !userEmail ||
      !localSnap.user?.email ||
      localSnap.user.email.toLowerCase() === userEmail.toLowerCase();

    if (!sameAccount) return false;

    await importBackupSnapshot(localSnap);
    return true;
  } catch {
    return false;
  }
}

