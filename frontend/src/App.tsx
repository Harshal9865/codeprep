import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { ActiveMockBanner } from './components/mock/ActiveMockBanner';
import { CodePrepLoader } from './components/ui/CodePrepLoader';
import { StreakCelebrationOverlay } from './components/workspace/StreakCelebrationOverlay';
import { CommandPalette } from './components/layout/CommandPalette';
import {
  ensureBackupOrAutoRestore,
  flushAutoBackup,
  scheduleAutoBackupSync,
} from './utils/backupSync';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const StreakSplashScreen = lazy(() =>
  import('./components/auth/StreakSplashScreen').then((m) => ({ default: m.StreakSplashScreen }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const ProblemListPage = lazy(() =>
  import('./pages/ProblemListPage').then((m) => ({ default: m.ProblemListPage }))
);
const ProblemWorkspacePage = lazy(() =>
  import('./pages/ProblemWorkspacePage').then((m) => ({ default: m.ProblemWorkspacePage }))
);
const SolutionGuidePage = lazy(() =>
  import('./pages/SolutionGuidePage').then((m) => ({ default: m.SolutionGuidePage }))
);
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const SqlListPage = lazy(() =>
  import('./pages/SqlListPage').then((m) => ({ default: m.SqlListPage }))
);
const SqlWorkspacePage = lazy(() =>
  import('./pages/SqlWorkspacePage').then((m) => ({ default: m.SqlWorkspacePage }))
);
const OopsPage = lazy(() => import('./pages/OopsPage').then((m) => ({ default: m.OopsPage })));
const AptitudePage = lazy(() =>
  import('./pages/AptitudePage').then((m) => ({ default: m.AptitudePage }))
);
const MockInterviewPage = lazy(() =>
  import('./pages/MockInterviewPage').then((m) => ({ default: m.MockInterviewPage }))
);
const InterviewPrepPage = lazy(() =>
  import('./pages/InterviewPrepPage').then((m) => ({ default: m.InterviewPrepPage }))
);

type AppView =
  | 'dashboard'
  | 'dsa'
  | 'sql'
  | 'oops'
  | 'workspace'
  | 'sql-workspace'
  | 'ai-solution'
  | 'about'
  | 'profile'
  | 'aptitude'
  | 'prep'
  | 'mock-interview';

type ProblemStatusFilter = 'All' | 'Solved' | 'Unsolved' | 'Bookmarked' | 'Revision';

const isSqlProblemId = (id: number) => (id >= 501 && id <= 600) || (id >= 731 && id <= 1030);

function parseRouteFromHash(): {
  view: AppView;
  problemId: number;
  statusFilter: ProblemStatusFilter;
} {
  if (typeof window === 'undefined') {
    return { view: 'dashboard', problemId: 1, statusFilter: 'All' };
  }

  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (!raw || raw === 'dashboard') {
    return { view: 'dashboard', problemId: 1, statusFilter: 'All' };
  }
  if (raw === 'dsa') {
    return { view: 'dsa', problemId: 1, statusFilter: 'All' };
  }
  if (raw === 'bookmarks') {
    return { view: 'dsa', problemId: 1, statusFilter: 'Bookmarked' };
  }
  if (raw === 'sql') {
    return { view: 'sql', problemId: 501, statusFilter: 'All' };
  }
  if (raw === 'oops') {
    return { view: 'oops', problemId: 631, statusFilter: 'All' };
  }
  if (raw === 'mock-interview') {
    return { view: 'mock-interview', problemId: 1, statusFilter: 'All' };
  }
  if (raw === 'aptitude') {
    return { view: 'aptitude', problemId: 1, statusFilter: 'All' };
  }
  if (raw === 'prep') {
    return { view: 'prep', problemId: 1, statusFilter: 'All' };
  }
  if (raw === 'about') {
    return { view: 'about', problemId: 1, statusFilter: 'All' };
  }
  if (raw === 'profile') {
    return { view: 'profile', problemId: 1, statusFilter: 'All' };
  }

  const problemMatch = /^problem\/(\d+)$/.exec(raw);
  if (problemMatch) {
    const id = Number.parseInt(problemMatch[1], 10);
    if (Number.isFinite(id) && id > 0) {
      return {
        view: isSqlProblemId(id) ? 'sql-workspace' : 'workspace',
        problemId: id,
        statusFilter: 'All',
      };
    }
  }

  const sqlMatch = /^sql\/(\d+)$/.exec(raw);
  if (sqlMatch) {
    const id = Number.parseInt(sqlMatch[1], 10);
    if (Number.isFinite(id) && id > 0) {
      return { view: 'sql-workspace', problemId: id, statusFilter: 'All' };
    }
  }

  const solMatch = /^solution\/(\d+)$/.exec(raw);
  if (solMatch) {
    const id = Number.parseInt(solMatch[1], 10);
    if (Number.isFinite(id) && id > 0) {
      return { view: 'ai-solution', problemId: id, statusFilter: 'All' };
    }
  }

  return { view: 'dashboard', problemId: 1, statusFilter: 'All' };
}

function buildHashForRoute(
  view: AppView,
  problemId: number,
  statusFilter?: ProblemStatusFilter
): string {
  switch (view) {
    case 'dsa':
      return statusFilter === 'Bookmarked' ? '#bookmarks' : '#dsa';
    case 'sql':
      return '#sql';
    case 'oops':
      return '#oops';
    case 'mock-interview':
      return '#mock-interview';
    case 'aptitude':
      return '#aptitude';
    case 'prep':
      return '#prep';
    case 'about':
      return '#about';
    case 'profile':
      return '#profile';
    case 'workspace':
      return `#problem/${problemId}`;
    case 'sql-workspace':
      return `#sql/${problemId}`;
    case 'ai-solution':
      return `#solution/${problemId}`;
    case 'dashboard':
    default:
      return '#dashboard';
  }
}

export const App: React.FC = () => {
  const { user, isLoading, quickLogin } = useAuth();
  const initialRoute = useRef(parseRouteFromHash()).current;
  const demoAutoTriedRef = useRef<boolean>(false);

  const [currentView, setCurrentView] = useState<AppView>(initialRoute.view);
  const [activeProblemId, setActiveProblemId] = useState<number>(initialRoute.problemId);
  const [showStreakSplash, setShowStreakSplash] = useState<boolean>(false);
  const [problemListPreset, setProblemListPreset] = useState<{
    prepSetId?: string | null;
    statusFilter?: ProblemStatusFilter;
    difficultyFilter?: string;
    topicFilter?: string;
    filterVersion?: number;
    searchQuery?: string;
    searchVersion?: number;
  }>({
    prepSetId: null,
    statusFilter: initialRoute.statusFilter,
    difficultyFilter: 'All',
    topicFilter: 'All',
    filterVersion: 0,
    searchQuery: '',
    searchVersion: 0,
  });
  const wasLoggedOutRef = useRef<boolean>(false);
  const backupSyncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      wasLoggedOutRef.current = true;
      backupSyncedUserRef.current = null;
      setShowStreakSplash(false);
    } else if (wasLoggedOutRef.current) {
      wasLoggedOutRef.current = false;
      setCurrentView('dashboard');
      window.history.replaceState(null, '', '#dashboard');
      setShowStreakSplash(true);
    }
  }, [user, isLoading]);

  // Support direct portfolio/interviewer share links ending with ?demo=1 or #demo
  useEffect(() => {
    if (isLoading || user || demoAutoTriedRef.current) return;
    const isDemoLink =
      window.location.search.includes('demo=1') || window.location.hash === '#demo';
    if (isDemoLink) {
      demoAutoTriedRef.current = true;
      void quickLogin('demo@codeprep.dev')
        .then(() => {
          window.history.replaceState(null, '', '#dashboard');
        })
        .catch(() => {
          // Fall back to standard login card cleanly if demo login fails
        });
    }
  }, [isLoading, user, quickLogin]);

  // Keep a local browser mirror of SQLite progress and restore seamlessly if a stateless deploy rebooted the DB
  useEffect(() => {
    if (isLoading || !user) return;
    if (backupSyncedUserRef.current !== user.id) {
      backupSyncedUserRef.current = user.id;
      void ensureBackupOrAutoRestore(user.email);
    }

    const handleProgressSnapshot = () => {
      scheduleAutoBackupSync();
    };
    const handlePageHide = () => {
      flushAutoBackup();
    };
    window.addEventListener('codeprep:progress-updated', handleProgressSnapshot);
    window.addEventListener('codeprep:backup-dirty', handleProgressSnapshot);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('codeprep:progress-updated', handleProgressSnapshot);
      window.removeEventListener('codeprep:backup-dirty', handleProgressSnapshot);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [user, isLoading]);

  // Listen to browser Back / Forward hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const next = parseRouteFromHash();
      setCurrentView(next.view);
      if (
        next.view === 'workspace' ||
        next.view === 'sql-workspace' ||
        next.view === 'ai-solution'
      ) {
        setActiveProblemId(next.problemId);
      }
      if (next.view === 'dsa') {
        setProblemListPreset((prev) => ({
          ...prev,
          statusFilter: next.statusFilter,
        }));
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Synchronize URL hash cleanly so browser refresh and back/forward preserve location
  useEffect(() => {
    if (!user || showStreakSplash) return;
    const nextHash = buildHashForRoute(
      currentView,
      activeProblemId,
      problemListPreset.statusFilter
    );
    if (window.location.hash !== nextHash) {
      if (!window.location.hash) {
        window.history.replaceState(null, '', nextHash);
      } else {
        window.location.hash = nextHash;
      }
    }
  }, [user, showStreakSplash, currentView, activeProblemId, problemListPreset.statusFilter]);

  // Handle cross-page global search submissions from Navbar
  useEffect(() => {
    const handleGlobalSearch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const query = typeof customEvent.detail === 'string' ? customEvent.detail.trim() : '';
      setProblemListPreset((prev) => ({
        prepSetId: null,
        statusFilter: 'All',
        difficultyFilter: 'All',
        topicFilter: 'All',
        filterVersion: (prev.filterVersion ?? 0) + 1,
        searchQuery: query,
        searchVersion: (prev.searchVersion ?? 0) + 1,
      }));
      setCurrentView('dsa');
    };

    window.addEventListener('codeprep:navigate-search', handleGlobalSearch);
    return () => window.removeEventListener('codeprep:navigate-search', handleGlobalSearch);
  }, []);

  const handleTabNavigate = useCallback((tab: string) => {
    if (tab === 'bookmarks') {
      setProblemListPreset((prev) => ({
        prepSetId: null,
        statusFilter: 'Bookmarked',
        difficultyFilter: 'All',
        topicFilter: 'All',
        filterVersion: (prev.filterVersion ?? 0) + 1,
        searchQuery: '',
        searchVersion: (prev.searchVersion ?? 0) + 1,
      }));
      setCurrentView('dsa');
    } else if (tab === 'dsa') {
      setProblemListPreset((prev) => ({
        prepSetId: null,
        statusFilter: 'All',
        difficultyFilter: 'All',
        topicFilter: 'All',
        filterVersion: (prev.filterVersion ?? 0) + 1,
        searchQuery: '',
        searchVersion: (prev.searchVersion ?? 0) + 1,
      }));
      setCurrentView('dsa');
    } else if (tab === 'sql') {
      setCurrentView('sql');
    } else if (tab === 'oops') {
      setCurrentView('oops');
    } else if (tab === 'mock-interview') {
      setCurrentView('mock-interview');
    } else if (tab === 'aptitude') {
      setCurrentView('aptitude');
    } else if (tab === 'prep') {
      setCurrentView('prep');
    } else if (tab === 'about') {
      setCurrentView('about');
    } else if (tab === 'profile') {
      setCurrentView('profile');
    } else {
      setCurrentView('dashboard');
    }
  }, []);

  if (isLoading) {
    return (
      <CodePrepLoader
        variant="fullscreen"
        label="Loading CodePrep"
        sublabel="Preparing your workspace..."
      />
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<CodePrepLoader variant="fullscreen" label="Loading CodePrep" sublabel="" />}>
        <LoginPage />
      </Suspense>
    );
  }

  if (showStreakSplash) {
    return (
      <Suspense fallback={<CodePrepLoader variant="fullscreen" label="Loading CodePrep" sublabel="" />}>
        <StreakSplashScreen
          displayName={user.displayName}
          onComplete={() => setShowStreakSplash(false)}
        />
      </Suspense>
    );
  }

  let activePage: React.ReactNode;

  if (currentView === 'profile') {
    activePage = <ProfilePage onTabChange={handleTabNavigate} />;
  } else if (currentView === 'about') {
    activePage = <AboutPage onNavigate={handleTabNavigate} />;
  } else if (currentView === 'aptitude') {
    activePage = <AptitudePage onTabChange={handleTabNavigate} />;
  } else if (currentView === 'mock-interview') {
    activePage = (
      <MockInterviewPage
        onTabChange={handleTabNavigate}
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView(isSqlProblemId(id) ? 'sql-workspace' : 'workspace');
        }}
      />
    );
  } else if (currentView === 'prep') {
    activePage = (
      <InterviewPrepPage
        onTabChange={handleTabNavigate}
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView(isSqlProblemId(id) ? 'sql-workspace' : 'workspace');
        }}
      />
    );
  } else if (currentView === 'sql') {
    activePage = (
      <SqlListPage
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView('sql-workspace');
        }}
        onTabChange={handleTabNavigate}
      />
    );
  } else if (currentView === 'oops') {
    activePage = (
      <OopsPage
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView('workspace');
        }}
        onTabChange={handleTabNavigate}
      />
    );
  } else if (currentView === 'sql-workspace') {
    activePage = (
      <SqlWorkspacePage
        problemId={activeProblemId}
        onBackToList={() => setCurrentView('sql')}
        onNavigateProblem={(newId) => setActiveProblemId(newId)}
      />
    );
  } else if (currentView === 'ai-solution') {
    activePage = (
      <SolutionGuidePage
        problemId={activeProblemId}
        onBackToProblem={() =>
          setCurrentView(isSqlProblemId(activeProblemId) ? 'sql-workspace' : 'workspace')
        }
        onSelectSimilarProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView(isSqlProblemId(id) ? 'sql-workspace' : 'workspace');
        }}
      />
    );
  } else if (currentView === 'workspace') {
    activePage = (
      <ProblemWorkspacePage
        problemId={activeProblemId}
        onNavigateProblem={(newId) => setActiveProblemId(newId)}
        onBackToList={() => setCurrentView('dsa')}
        onOpenAiSolution={() => setCurrentView('ai-solution')}
      />
    );
  } else if (currentView === 'dsa') {
    activePage = (
      <ProblemListPage
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView(isSqlProblemId(id) ? 'sql-workspace' : 'workspace');
        }}
        onTabChange={handleTabNavigate}
        initialPrepSetId={problemListPreset.prepSetId}
        initialStatusFilter={problemListPreset.statusFilter}
        initialDifficultyFilter={problemListPreset.difficultyFilter}
        initialTopicFilter={problemListPreset.topicFilter}
        initialFilterVersion={problemListPreset.filterVersion}
        initialSearchQuery={problemListPreset.searchQuery}
        initialSearchVersion={problemListPreset.searchVersion}
      />
    );
  } else {
    activePage = (
      <DashboardPage
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView(isSqlProblemId(id) ? 'sql-workspace' : 'workspace');
        }}
        onTabChange={handleTabNavigate}
        onOpenProblemsWithFilter={(filter) => {
          setProblemListPreset((prev) => ({
            prepSetId: filter.track || null,
            statusFilter: 'All',
            difficultyFilter: filter.difficulty || 'All',
            topicFilter: filter.topic || 'All',
            filterVersion: (prev.filterVersion ?? 0) + 1,
            searchQuery: '',
            searchVersion: (prev.searchVersion ?? 0) + 1,
          }));
          setCurrentView('dsa');
        }}
      />
    );
  }

  return (
    <>
      <Suspense fallback={<CodePrepLoader variant="fullscreen" label="Loading..." sublabel="" />}>
        {activePage}
      </Suspense>
      <ActiveMockBanner
        isVisible={currentView === 'workspace' || currentView === 'sql-workspace'}
        onReturnToMock={() => setCurrentView('mock-interview')}
      />
      <StreakCelebrationOverlay />
      <CommandPalette
        isWorkspaceActive={currentView === 'workspace' || currentView === 'sql-workspace'}
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView(isSqlProblemId(id) ? 'sql-workspace' : 'workspace');
        }}
        onNavigateTab={handleTabNavigate}
        onOpenCore600={() => {
          setProblemListPreset((prev) => ({
            prepSetId: 'core-600',
            statusFilter: 'All',
            difficultyFilter: 'All',
            topicFilter: 'All',
            filterVersion: (prev.filterVersion ?? 0) + 1,
            searchQuery: '',
            searchVersion: (prev.searchVersion ?? 0) + 1,
          }));
          setCurrentView('dsa');
        }}
      />
    </>
  );
};
