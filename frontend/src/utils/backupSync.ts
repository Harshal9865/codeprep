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
    unlockedAiSolution?: boolean;
  }>;
  badges?: Array<{
    badgeKey: string;
    title?: string;
    description?: string;
    category?: string;
    unlockedAt?: string;
  }>;
}

const DEMO_EMAIL = 'demo@codeprep.dev';

function isDemoAccount(email?: string | null): boolean {
  return email?.toLowerCase().trim() === DEMO_EMAIL;
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
    (snap.savedProblems?.length || 0) > 0 ||
      (snap.timers?.length || 0) > 0 ||
    (snap.badges?.length || 0) > 0
  );
}

function submissionKey(s: {
  problemId: number;
  verdict: string;
  submittedAt?: string;
  code: string;
}): string {
  const ts = s.submittedAt ? new Date(s.submittedAt).toISOString() : '';
  return `${s.problemId}|${s.verdict}|${ts}|${s.code}`;
}

export function mergeBackupSnapshots(
  existing: PortableBackupSnapshot | null | undefined,
  incoming: PortableBackupSnapshot
): PortableBackupSnapshot {
  if (!existing) return incoming;

  const subMap = new Map<string, NonNullable<PortableBackupSnapshot['submissions']>[number]>();
  for (const s of existing.submissions || []) {
    subMap.set(submissionKey(s), s);
  }
  for (const s of incoming.submissions || []) {
    subMap.set(submissionKey(s), s);
  }

  const draftMap = new Map<number, string>();
  for (const d of existing.drafts || []) {
    if (typeof d.code === 'string') draftMap.set(d.problemId, d.code);
  }
  for (const d of incoming.drafts || []) {
    if (typeof d.code === 'string' && d.code.trim().length > 0) {
      draftMap.set(d.problemId, d.code);
    }
  }

  const timerMap = new Map<number, number>();
  for (const t of [...(existing.timers || []), ...(incoming.timers || [])]) {
    const prev = timerMap.get(t.problemId) || 0;
    timerMap.set(t.problemId, Math.max(prev, Math.floor(Number(t.activeSeconds) || 0)));
  }

  const savedMap = new Map<number, NonNullable<PortableBackupSnapshot['savedProblems']>[number]>();
  for (const sp of [...(existing.savedProblems || []), ...(incoming.savedProblems || [])]) {
    const prev = savedMap.get(sp.id);
    savedMap.set(sp.id, {
      id: sp.id,
      isBookmark: Boolean(prev?.isBookmark || sp.isBookmark),
      userNotes:
        typeof sp.userNotes === 'string' && sp.userNotes.length > 0
          ? sp.userNotes
          : prev?.userNotes ?? sp.userNotes ?? null,
      solvedWithAiHelp: Boolean(prev?.solvedWithAiHelp || sp.solvedWithAiHelp),
      unlockedAiSolution: Boolean(prev?.unlockedAiSolution || sp.unlockedAiSolution),
    });
  }

  const badgeMap = new Map<string, NonNullable<PortableBackupSnapshot['badges']>[number]>();
  for (const b of [...(existing.badges || []), ...(incoming.badges || [])]) {
    if (b?.badgeKey) badgeMap.set(b.badgeKey, b);
  }

  const mergedSubmissions = Array.from(subMap.values()).sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return ta - tb;
  });

  const mergedUser = incoming.user || existing.user
    ? {
      ...(existing.user || {}),
      ...(incoming.user || {}),
      displayName: incoming.user?.displayName || existing.user?.displayName,
      avatarUrl: incoming.user?.avatarUrl ?? existing.user?.avatarUrl ?? null,
      themePreference: incoming.user?.themePreference || existing.user?.themePreference,
      timezone: incoming.user?.timezone || existing.user?.timezone,
    }
    : null;

  return {
    metadata: incoming.metadata || existing.metadata,
    user: mergedUser,
    submissions: mergedSubmissions,
    drafts: Array.from(draftMap.entries()).map(([problemId, code]) => ({ problemId, code })),
    timers: Array.from(timerMap.entries()).map(([problemId, activeSeconds]) => ({
      problemId,
      activeSeconds,
    })),
    savedProblems: Array.from(savedMap.values()),
    badges: Array.from(badgeMap.values()),
  };
}

function serverNeedsRestoreFromLocal(
  localSnap: PortableBackupSnapshot,
  serverSnap: PortableBackupSnapshot
): boolean {
  const serverSubs = new Set((serverSnap.submissions || []).map(submissionKey));
  for (const s of localSnap.submissions || []) {
    if (!serverSubs.has(submissionKey(s))) return true;
  }

  const serverDrafts = new Set((serverSnap.drafts || []).map((d) => d.problemId));
  for (const d of localSnap.drafts || []) {
    if (d.code && !serverDrafts.has(d.problemId)) return true;
  }

  const serverSaved = new Map((serverSnap.savedProblems || []).map((sp) => [sp.id, sp]));
  for (const sp of localSnap.savedProblems || []) {
    const s = serverSaved.get(sp.id);
    if (!s) return true;
    if (sp.isBookmark && !s.isBookmark) return true;
    if (sp.userNotes && !s.userNotes) return true;
    if (sp.solvedWithAiHelp && !s.solvedWithAiHelp) return true;
  }

  const serverBadges = new Set((serverSnap.badges || []).map((b) => b.badgeKey));
  for (const b of localSnap.badges || []) {
    if (b.badgeKey && !serverBadges.has(b.badgeKey)) return true;
  }

  const serverTimers = new Map((serverSnap.timers || []).map((t) => [t.problemId, t.activeSeconds || 0]));
  for (const t of localSnap.timers || []) {
    if ((t.activeSeconds || 0) > (serverTimers.get(t.problemId) || 0) + 15) {
      return true;
    }
  }

  return false;
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
  if (!hasMeaningfulData(snap) || isDemoAccount(snap.user?.email)) return;
  try {
    const targetKey = getBackupStorageKey(snap.user?.email);
    const existing = readLocalBackupSnapshot(snap.user?.email);
    const merged = mergeBackupSnapshots(existing, snap);
    localStorage.setItem(targetKey, JSON.stringify(merged));
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

let pendingSyncTimer: number | null = null;
let syncInFlight: Promise<void> | null = null;

export async function syncAutoBackup(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    try {
      const serverSnap = await apiRequest<PortableBackupSnapshot>('/user/export');
      if (hasMeaningfulData(serverSnap) && !isDemoAccount(serverSnap.user?.email)) {
        saveLocalBackupSnapshot(serverSnap);
      }
    } catch {
      // Silent background snapshot
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
}

/**
 * Debounced trailing-edge scheduler so rapid draft, bookmark, note, and submit mutations
 * are always reflected in the local backup without dropping trailing updates.
 */
export function scheduleAutoBackupSync(delayMs = 900): void {
  if (pendingSyncTimer !== null) {
    window.clearTimeout(pendingSyncTimer);
  }
  pendingSyncTimer = window.setTimeout(() => {
    pendingSyncTimer = null;
    void syncAutoBackup();
  }, delayMs);
}

export function flushAutoBackup(): void {
  if (pendingSyncTimer !== null) {
    window.clearTimeout(pendingSyncTimer);
    pendingSyncTimer = null;
  }
  void syncAutoBackup();
}

/**
 * Checks whether the backend database rebooted empty (or missing prior items) after a deploy.
 * If missing items exist in the browser mirror for this account, restores them seamlessly.
 */
export async function ensureBackupOrAutoRestore(userEmail?: string): Promise<boolean> {
  if (isDemoAccount(userEmail)) return false;

    const attemptRestore = async (): Promise<boolean> => {
      const serverSnap = await apiRequest<PortableBackupSnapshot>('/user/export');
      const localSnap = readLocalBackupSnapshot(userEmail);

      if (localSnap) {
        const sameAccount =
          !userEmail ||
          !localSnap.user?.email ||
          localSnap.user.email.toLowerCase() === userEmail.toLowerCase();

        if (sameAccount && serverNeedsRestoreFromLocal(localSnap, serverSnap)) {
          await importBackupSnapshot(localSnap);
          const refreshed = await apiRequest<PortableBackupSnapshot>('/user/export').catch(() => null);
          if (refreshed && hasMeaningfulData(refreshed)) {
            saveLocalBackupSnapshot(refreshed);
          }
          return true;
        }
      }

      if (hasMeaningfulData(serverSnap)) {
        saveLocalBackupSnapshot(serverSnap);
      }
      return false;
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await attemptRestore();
      } catch {
        if (attempt === 0) {
          await new Promise((r) => window.setTimeout(r, 1500));
        }
      }
    }
    return false;
  }
