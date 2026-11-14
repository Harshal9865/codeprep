import { ProblemDefinition } from '../judge/types';
import { DSA_BATCH_1 } from './dsa_batch_1';
import { DSA_BATCH_2 } from './dsa_batch_2';
import { DSA_BATCH_3 } from './dsa_batch_3';
import { DSA_BATCH_4 } from './dsa_batch_4';
import { DSA_BATCH_5 } from './dsa_batch_5';
import { DSA_BATCH_6 } from './dsa_batch_6';
import { DSA_BATCH_7 } from './dsa_batch_7';
import { DSA_BATCH_8 } from './dsa_batch_8';
import { DSA_BATCH_9 } from './dsa_batch_9';
import { DSA_BATCH_10 } from './dsa_batch_10';
import { DSA_LOGIC_EASY_PROBLEMS } from './dsa_logic_easy';
import { OOP_100_PROBLEMS } from './oop100';
import { DSA_EXTENDED_1970 } from './dsaExtended2000';
import { FAMOUS_DSA_PROBLEMS } from './famousCurriculum';

const baseProblems: ProblemDefinition[] = [
  ...DSA_BATCH_1,
  ...DSA_BATCH_2,
  ...DSA_BATCH_3,
  ...DSA_BATCH_4,
  ...DSA_BATCH_5,
  ...DSA_BATCH_6,
  ...DSA_BATCH_7,
  ...DSA_BATCH_8,
  ...DSA_BATCH_9,
  ...DSA_BATCH_10,
  ...DSA_LOGIC_EASY_PROBLEMS,
  ...OOP_100_PROBLEMS,
  ...DSA_EXTENDED_1970,
];

// Priority map of curated high-frequency LeetCode & GeeksforGeeks problems
const famousMap = new Map<number, ProblemDefinition>();
for (const p of FAMOUS_DSA_PROBLEMS) {
  famousMap.set(p.id, p);
}

export const DSA_500_PROBLEMS: ProblemDefinition[] = baseProblems.map((prob) => {
  const chosen = famousMap.get(prob.id) || prob;
  const baseSlug = chosen.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return {
    ...chosen,
    slug: `${chosen.id}-${baseSlug || 'problem'}`,
  };
});
