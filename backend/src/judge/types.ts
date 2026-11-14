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

export interface CaseExecutionDetail {
  index: number;
  input: string;
  expected: string;
  actual: string;
  stdout?: string;
  passed: boolean;
  runtimeMs?: number;
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
  caseResults?: CaseExecutionDetail[];
  totalTestCases: number;
  passedTestCases: number;
}

export interface ProblemDefinition {
  id: number;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'DSA' | 'SQL' | 'OOP';
  topic: string;
  pattern: string;
  statement: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  functionSignature: string; // e.g. "int maxSubArray(vector<int>& nums)"
  paramTypes: string[];     // ["vector<int>"]
  returnType: string;       // "int"
  defaultCodeStub: string;
  sampleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
}

