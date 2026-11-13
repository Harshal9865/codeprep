import { InputParser } from './inputParser';

export type OrderComparisonMode = 'strict' | 'outer-unordered' | 'deep-unordered';

export interface JudgePolicy {
  orderMode: OrderComparisonMode;
  floatTolerance?: number;
  isTreeReturn: boolean;
  isStringReturn: boolean;
  allowBoolIntCoercion: boolean;
  returnType: string;
}

const DEEP_UNORDERED_KEYWORDS = [
  'two-sum',
  '3sum',
  '4sum',
  'group-anagrams',
  'top-k-frequent-elements',
  'subsets',
  'combination-sum',
  'find-all-duplicates',
  'intersection-of-two-arrays',
];

const OUTER_UNORDERED_KEYWORDS = [
  'generate-parentheses',
  'permutations',
  'combinations',
  'letter-combinations',
  'palindrome-partitioning',
  'restore-ip-addresses',
  'word-search-ii',
  'word-break-ii',
  'binary-tree-paths',
  'all-paths-from-source-to-target',
  'accounts-merge',
  'find-duplicate-subtrees',
  'delete-nodes-and-return-forest',
  'find-all-anagrams',
  'repeated-dna-sequences',
  'non-decreasing-subsequences',
];

// Two Sum II explicitly requires [index1, index2] with index1 < index2
const STRICTLY_ORDERED_EXCEPTIONS = [
  'two-sum-ii',
  'top-k-frequent-words',
  'merge-intervals',
  'insert-interval',
  'daily-temperatures',
  'sliding-window-maximum',
  'course-schedule-ii',
  'reconstruct-itinerary',
  'spiral-matrix',
  'rotate-image',
];

export class ProblemJudgePolicy {
  static getPolicy(problem: {
    slug?: string;
    title?: string;
    statement?: string;
    functionSignature: string;
    returnType?: string;
  }): JudgePolicy {
    const parsed = InputParser.parseSignature(problem.functionSignature);
    const returnType = InputParser.normalizeType(
      problem.returnType || parsed?.returnType || ''
    );
    const slugLower = (problem.slug || problem.title || '').toLowerCase();
    const statementLower = (problem.statement || '').toLowerCase();

    const isFloatReturn =
      returnType === 'double' ||
      returnType === 'float' ||
      returnType === 'long double' ||
      returnType.includes('vector<double>') ||
      returnType.includes('vector<float>');

    const isTreeReturn = returnType.includes('TreeNode');
    const isStringReturn = returnType === 'string' || returnType === 'std::string';
    const isVectorReturn = returnType.startsWith('vector<');

    let orderMode: OrderComparisonMode = 'strict';

    const isExplicitlyStrict = STRICTLY_ORDERED_EXCEPTIONS.some((k) =>
      slugLower.includes(k)
    );

    if (!isExplicitlyStrict && isVectorReturn) {
      if (DEEP_UNORDERED_KEYWORDS.some((k) => slugLower.includes(k))) {
        orderMode = 'deep-unordered';
      } else if (
        OUTER_UNORDERED_KEYWORDS.some((k) => slugLower.includes(k)) ||
        statementLower.includes('in any order')
      ) {
        orderMode = 'outer-unordered';
      }
    }

    return {
      orderMode,
      floatTolerance: isFloatReturn ? 1e-5 : undefined,
      isTreeReturn,
      isStringReturn,
      allowBoolIntCoercion: returnType === 'bool' || returnType === 'int',
      returnType,
    };
  }
}

