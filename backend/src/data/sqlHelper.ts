import { ProblemDefinition } from '../judge/types';

export interface SqlProblemDefinition extends ProblemDefinition {
  schemaDdl: string;
  expectedQuery: string;
  expectedResultJson: string;
}

export interface SqlSpec {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  pattern: string;
  statement: string;
  constraints?: string;
  inputSummary: string;
  outputSummary: string;
  explanation: string;
  schemaDdl: string;
  expectedQuery: string;
  expectedRows: Array<Record<string, unknown>>;
  stub?: string;
}

export function makeSqlProblem(spec: SqlSpec): SqlProblemDefinition {
  const baseSlug = spec.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    id: spec.id,
    slug: `sql-${spec.id}-${baseSlug || 'query'}`,
    title: spec.title,
    difficulty: spec.difficulty,
    category: 'SQL',
    topic: spec.topic,
    pattern: spec.pattern,
    statement: spec.statement,
    constraints:
      spec.constraints ||
      'SQLite / ANSI SQL compatible read-only query\nMust execute within 2000ms\nOnly single SELECT or WITH statements permitted.',
    examples: [
      {
        input: spec.inputSummary,
        output: spec.outputSummary,
        explanation: spec.explanation,
      },
    ],
    functionSignature: 'SELECT ... FROM ...',
    paramTypes: [],
    returnType: 'TABLE',
    defaultCodeStub:
      spec.stub || `-- SQLite / ANSI SQL Query\n-- Write your SELECT query below\nSELECT \n  \nFROM \n;`,
    sampleTestCases: [],
    hiddenTestCases: [],
    schemaDdl: spec.schemaDdl.trim(),
    expectedQuery: spec.expectedQuery.trim(),
    expectedResultJson: JSON.stringify(spec.expectedRows),
  };
}

