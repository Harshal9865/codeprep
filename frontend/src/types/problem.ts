export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Verdict =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Output Limit Exceeded'
  | 'Compile Error'
  | 'Runtime Error';

export interface TestCase {
  id?: number | string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  topic: string;
  pattern: string;
  statement: string;
  constraints: string;
  examples: ProblemExample[];
  functionSignature: string;
  defaultCodeStub?: string;
  userDraftCode?: string;
  sampleTestCases: TestCase[];
  isBookmark?: boolean;
  userNotes?: string;
  isSolved?: boolean;
  unlockedAiSolution?: boolean;
  solvedWithAiHelp?: boolean;
  recentSubmissions?: SubmissionHistoryItem[];
}

export interface ExecutionResult {
  verdict: Verdict;
  runtimeMs: number;
  memoryKb: number;
  stdout?: string;
  stderr?: string;
  compileError?: string;
  failedTestCase?: {
    input: string;
    expected: string;
    actual: string;
    testIndex: number;
  };
  totalTestCases: number;
  passedTestCases: number;
}

export interface SubmissionHistoryItem {
  id: string;
  verdict: Verdict;
  runtimeMs?: number;
  memoryKb?: number;
  submittedAt: string;
  code: string;
}

