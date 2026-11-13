import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { StreakSplashScreen } from './components/auth/StreakSplashScreen';
import { DashboardPage } from './pages/DashboardPage';
import { ProblemListPage } from './pages/ProblemListPage';
import { ProblemWorkspacePage } from './pages/ProblemWorkspacePage';
import { SolutionGuidePage } from './pages/SolutionGuidePage';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import { SqlListPage } from './pages/SqlListPage';
import { SqlWorkspacePage } from './pages/SqlWorkspacePage';
import { AptitudePage } from './pages/AptitudePage';
import { InterviewPrepPage } from './pages/InterviewPrepPage';
import { CodePrepLoader } from './components/ui/CodePrepLoader';

type AppView =
  | 'dashboard'
  | 'dsa'
  | 'sql'
  | 'workspace'
  | 'sql-workspace'
  | 'ai-solution'
  | 'about'
  | 'profile'
  | 'aptitude'
  | 'prep';

type ProblemStatusFilter = 'All' | 'Solved' | 'Unsolved' | 'Bookmarked';

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
        view: id >= 501 ? 'sql-workspace' : 'workspace',
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
  const { user, isLoading } = useAuth();
  const initialRoute = useRef(parseRouteFromHash()).current;

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

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      wasLoggedOutRef.current = true;
      setShowStreakSplash(false);
    } else if (wasLoggedOutRef.current) {
      wasLoggedOutRef.current = false;
      setCurrentView('dashboard');
      window.history.replaceState(null, '', '#dashboard');
      setShowStreakSplash(true);
    }
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
        label="Booting CodePrep"
        sublabel="Restoring your saved workspace & local SQLite session..."
      />
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (showStreakSplash) {
    return (
      <StreakSplashScreen
        displayName={user.displayName}
        onComplete={() => setShowStreakSplash(false)}
      />
    );
  }

  if (currentView === 'profile') {
    return <ProfilePage onTabChange={handleTabNavigate} />;
  }

  if (currentView === 'about') {
    return <AboutPage onNavigate={handleTabNavigate} />;
  }

  if (currentView === 'aptitude') {
    return <AptitudePage onTabChange={handleTabNavigate} />;
  }

  if (currentView === 'prep') {
    return (
      <InterviewPrepPage
        onTabChange={handleTabNavigate}
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView(id >= 501 ? 'sql-workspace' : 'workspace');
        }}
      />
    );
  }

  if (currentView === 'sql') {
    return (
      <SqlListPage
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView('sql-workspace');
        }}
        onTabChange={handleTabNavigate}
      />
    );
  }

  if (currentView === 'sql-workspace') {
    return (
      <SqlWorkspacePage
        problemId={activeProblemId}
        onBackToList={() => setCurrentView('sql')}
        onNavigateProblem={(newId) => setActiveProblemId(newId)}
      />
    );
  }

  if (currentView === 'ai-solution') {
    return (
      <SolutionGuidePage
        problemId={activeProblemId}
        onBackToProblem={() => setCurrentView('workspace')}
        onSelectSimilarProblem={(id) => {
          setActiveProblemId(id);
          setCurrentView('workspace');
        }}
      />
    );
  }

  if (currentView === 'workspace') {
    return (
      <ProblemWorkspacePage
        problemId={activeProblemId}
        onNavigateProblem={(newId) => setActiveProblemId(newId)}
        onBackToList={() => setCurrentView('dsa')}
        onOpenAiSolution={() => setCurrentView('ai-solution')}
      />
    );
  }

  if (currentView === 'dsa') {
    return (
      <ProblemListPage
        onSelectProblem={(id) => {
          setActiveProblemId(id);
          if (id >= 501) {
            setCurrentView('sql-workspace');
          } else {
            setCurrentView('workspace');
          }
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
  }

  return (
    <DashboardPage
      onSelectProblem={(id) => {
        setActiveProblemId(id);
        if (id >= 501) {
          setCurrentView('sql-workspace');
        } else {
          setCurrentView('workspace');
        }
      }}
      onTabChange={handleTabNavigate}
      onOpenProblemsWithFilter={(filter) => {
        setProblemListPreset((prev) => ({
          prepSetId: null,
          statusFilter: 'All',
          difficultyFilter: filter.difficulty || 'All',
          topicFilter: filter.topic || 'All Topics',
          filterVersion: (prev.filterVersion ?? 0) + 1,
          searchQuery: '',
          searchVersion: (prev.searchVersion ?? 0) + 1,
        }));
        setCurrentView('dsa');
      }}
    />
  );
};
