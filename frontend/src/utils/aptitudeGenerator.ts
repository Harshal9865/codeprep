import { generateOopMcq } from '../data/oopsCurriculum';

export type AptitudeCategory =
  | 'Arithmetic Aptitude'
  | 'Data Interpretation'
  | 'Verbal Ability'
  | 'Logical Reasoning'
  | 'Verbal Reasoning'
  | 'Nonverbal Reasoning'
  | 'Interview Puzzles'
  | 'OOPs & C++ Design';

export const APTITUDE_CATEGORIES: AptitudeCategory[] = [
  'Arithmetic Aptitude',
  'Data Interpretation',
  'Verbal Ability',
  'Logical Reasoning',
  'Verbal Reasoning',
  'Nonverbal Reasoning',
  'Interview Puzzles',
  'OOPs & C++ Design',
];

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface BarChartVisual {
  type: 'bar-chart';
  title: string;
  unit: string;
  items: Array<{ label: string; value: number; highlight?: boolean }>;
}

export interface TableVisual {
  type: 'data-table';
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface GridShapeFrame {
  shape: 'triangle' | 'arrow' | 'diamond' | 'l-piece' | 'dot-ring';
  rotation: number; // degrees: 0, 45, 90, 135, 180, 225, 270, 315
  dotCorner: number; // 0..3 or -1
  filled?: boolean;
  count?: number;
}

export interface SequenceSvgVisual {
  type: 'svg-sequence';
  title: string;
  frames: GridShapeFrame[];
  showQuestionMark?: boolean;
}

export interface MirrorPixelVisual {
  type: 'mirror-grid';
  title: string;
  cells: number[][]; // 4x4 binary grid
}

export type QuestionVisual =
  | BarChartVisual
  | TableVisual
  | SequenceSvgVisual
  | MirrorPixelVisual;

export interface OptionVisual {
  type: 'svg-frame' | 'mirror-grid';
  frame?: GridShapeFrame;
  cells?: number[][];
}

export interface GeneratedAptitudeQuestion {
  id: string;
  category: AptitudeCategory;
  subtopic: string;
  difficulty: DifficultyLevel;
  askedIn: string;
  question: string;
  visual?: QuestionVisual;
  options: string[];
  optionVisuals?: OptionVisual[];
  correctIndex: number;
  explanation: string;
  shortcutTip: string;
}

let qSeqCounter = 1;

function nextId(prefix: string): string {
  qSeqCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${qSeqCounter}-${Math.floor(Math.random() * 1000)}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formatNumber(n: number, decimals = 2): string {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(decimals)).toString();
}

function buildOptions(
  correct: string,
  candidates: string[],
  fallbackPerturb?: (idx: number) => string
): { options: string[]; correctIndex: number } {
  const seen = new Set<string>([correct]);
  const distractors: string[] = [];

  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c);
      distractors.push(c);
      if (distractors.length === 3) break;
    }
  }

  let guard = 1;
  while (distractors.length < 3) {
    const extra = fallbackPerturb
      ? fallbackPerturb(guard)
      : `${Number.parseFloat(correct) + guard || guard * 7}`;
    guard += 1;
    if (!seen.has(extra)) {
      seen.add(extra);
      distractors.push(extra);
    }
  }

  const combined = shuffle([
    { text: correct, isCorrect: true },
    ...distractors.map((text) => ({ text, isCorrect: false })),
  ]);

  return {
    options: combined.map((o) => o.text),
    correctIndex: combined.findIndex((o) => o.isCorrect),
  };
}

/* -------------------------------------------------------------------------- */
/* 1. ARITHMETIC APTITUDE                                                     */
/* -------------------------------------------------------------------------- */

function genTrainPlatform(): GeneratedAptitudeQuestion {
  const speedMs = pick([10, 15, 20, 25, 30]);
  const speedKmh = (speedMs * 18) / 5;
  const trainLen = pick([120, 150, 180, 200, 240, 250, 300]);
  const platformLen = pick([220, 250, 320, 350, 400, 450, 500]);
  const timeSec = (trainLen + platformLen) / speedMs;

  const ans = `${formatNumber(timeSec)} seconds`;
  const { options, correctIndex } = buildOptions(
    ans,
    [
      `${formatNumber(platformLen / speedMs)} seconds`,
      `${formatNumber((trainLen + platformLen) / speedKmh)} seconds`,
      `${formatNumber(timeSec + pick([4, 6, 8]))} seconds`,
      `${formatNumber(Math.max(5, timeSec - pick([4, 5, 7])))} seconds`,
    ],
    (k) => `${formatNumber(timeSec + k * 5)} seconds`
  );

  return {
    id: nextId('arith-train'),
    category: 'Arithmetic Aptitude',
    subtopic: 'Speed, Time & Distance',
    difficulty: 'Easy',
    askedIn: 'TCS Ninja • Infosys • Accenture',
    question: `A train ${trainLen} m long is running at ${speedKmh} km/h. How long will it take to completely pass a railway platform ${platformLen} m long?`,
    options,
    correctIndex,
    explanation: `Convert speed to m/s: ${speedKmh} × (5/18) = ${speedMs} m/s. Total distance covered = Train length + Platform length = ${trainLen} + ${platformLen} = ${trainLen + platformLen} m. Time = ${trainLen + platformLen} / ${speedMs} = ${formatNumber(timeSec)} seconds.`,
    shortcutTip: 'Always multiply km/h by 5/18 to get m/s cleanly; don’t forget to add train length + platform length.',
  };
}

function genTimeAndWork(): GeneratedAptitudeQuestion {
  const pairs: Array<[number, number, number]> = [
    [10, 15, 6],
    [12, 24, 8],
    [15, 30, 10],
    [20, 30, 12],
    [18, 36, 12],
    [12, 36, 9],
    [16, 48, 12],
    [24, 40, 15],
  ];
  const [aDays, bDays, togetherDays] = pick(pairs);
  const ans = `${togetherDays} days`;
  const { options, correctIndex } = buildOptions(
    ans,
    [
      `${Math.round((aDays + bDays) / 2)} days`,
      `${togetherDays + 2} days`,
      `${Math.max(2, togetherDays - 2)} days`,
      `${togetherDays + 4} days`,
    ],
    (k) => `${togetherDays + k + 3} days`
  );

  return {
    id: nextId('arith-work'),
    category: 'Arithmetic Aptitude',
    subtopic: 'Time & Work',
    difficulty: 'Easy',
    askedIn: 'Cognizant • Wipro • Capgemini',
    question: `Engineer A can finish a deployment module in ${aDays} days and Engineer B can finish the same module in ${bDays} days. Working together, in how many days will they complete it?`,
    options,
    correctIndex,
    explanation: `One day work of A = 1/${aDays} and B = 1/${bDays}. Combined 1-day rate = (${aDays} + ${bDays}) / (${aDays} × ${bDays}) = 1/${togetherDays}. So both finish together in ${togetherDays} days.`,
    shortcutTip: 'Shortcut formula for two workers: (A × B) / (A + B).',
  };
}

function genPipeLeak(): GeneratedAptitudeQuestion {
  const combos: Array<[number, number, number]> = [
    [6, 12, 12],
    [4, 12, 6],
    [6, 15, 10],
    [8, 24, 12],
    [10, 15, 30],
    [9, 18, 18],
  ];
  const [fillH, emptyH, netH] = pick(combos);
  const ans = `${netH} hours`;
  const { options, correctIndex } = buildOptions(ans, [
    `${netH - 2} hours`,
    `${netH + 4} hours`,
    `${fillH + emptyH} hours`,
    `${Math.max(2, fillH - 1)} hours`,
  ]);

  return {
    id: nextId('arith-pipe'),
    category: 'Arithmetic Aptitude',
    subtopic: 'Pipes & Cisterns',
    difficulty: 'Medium',
    askedIn: 'Accenture • Deloitte • Barclays',
    question: `An inlet pipe can fill a server cooling tank in ${fillH} hours, while a drain valve at the bottom can empty the full tank in ${emptyH} hours. If both are opened together when the tank is empty, how many hours will it take to fill?`,
    options,
    correctIndex,
    explanation: `Net hourly fill fraction = (1/${fillH}) - (1/${emptyH}) = 1/${netH}. Therefore the tank takes ${netH} hours to fill.`,
    shortcutTip: 'When one fills in A and leak empties in B (B > A), net fill time = (A × B) / (B - A).',
  };
}

function genMarkupDiscount(): GeneratedAptitudeQuestion {
  const markup = pick([20, 25, 30, 40, 50]);
  const discount = pick([10, 15, 20, 25]);
  const cp = pick([400, 500, 800, 1000, 1200]);
  const mp = cp * (1 + markup / 100);
  const sp = mp * (1 - discount / 100);
  const netPct = ((sp - cp) / cp) * 100;

  const label =
    netPct > 0
      ? `${formatNumber(netPct)}% profit`
      : netPct < 0
      ? `${formatNumber(Math.abs(netPct))}% loss`
      : 'No profit, no loss';

  const { options, correctIndex } = buildOptions(
    label,
    [
      `${formatNumber(markup - discount)}% profit`,
      `${formatNumber(Math.abs(netPct) + 4)}% profit`,
      `${formatNumber(Math.abs(netPct) + 2)}% loss`,
      'No profit, no loss',
    ],
    (k) => `${formatNumber(Math.abs(netPct) + k * 3)}% profit`
  );

  return {
    id: nextId('arith-profit'),
    category: 'Arithmetic Aptitude',
    subtopic: 'Profit, Loss & Discount',
    difficulty: 'Medium',
    askedIn: 'Amazon • Flipkart • Goldman Sachs',
    question: `A hardware vendor buys a GPU card for ₹${cp}, marks its list price ${markup}% above cost price, and then offers a ${discount}% festive discount. What is the vendor's net profit or loss percentage?`,
    options,
    correctIndex,
    explanation: `Marked Price = ${cp} × ${1 + markup / 100} = ₹${mp}. Selling Price = ${mp} × ${1 - discount / 100} = ₹${sp}. Net change = (${sp} - ${cp}) / ${cp} × 100 = ${label}.`,
    shortcutTip: 'Successive percentage rule: Net % = m - d - (m × d)/100.',
  };
}

function genCiSiDiff(): GeneratedAptitudeQuestion {
  const rate = pick([5, 10, 20]);
  const mult = randInt(2, 9);
  const principal = mult * 10000;
  const diff = principal * (rate / 100) * (rate / 100);

  const ans = `₹${principal.toLocaleString('en-IN')}`;
  const { options, correctIndex } = buildOptions(
    ans,
    [
      `₹${(principal + 5000).toLocaleString('en-IN')}`,
      `₹${(principal - 5000).toLocaleString('en-IN')}`,
      `₹${(principal * 2).toLocaleString('en-IN')}`,
      `₹${Math.round(principal / 2).toLocaleString('en-IN')}`,
    ],
    (k) => `₹${(principal + k * 2500).toLocaleString('en-IN')}`
  );

  return {
    id: nextId('arith-cisi'),
    category: 'Arithmetic Aptitude',
    subtopic: 'Compound vs Simple Interest',
    difficulty: 'Medium',
    askedIn: 'JPMorgan • Morgan Stanley • HSBC',
    question: `The difference between Compound Interest (compounded annually) and Simple Interest on a certain sum at ${rate}% per annum for 2 years is ₹${diff.toLocaleString('en-IN')}. Find the principal sum.`,
    options,
    correctIndex,
    explanation: `For 2 years, CI − SI = P × (r / 100)². Substituting: ${diff} = P × (${rate}/100)² = P × ${(rate * rate) / 10000}. Solving gives P = ₹${principal.toLocaleString('en-IN')}.`,
    shortcutTip: '2-Year CI − SI formula: Difference = P × (R / 100)² — memorize it to solve in 5 seconds.',
  };
}

function genAverageShift(): GeneratedAptitudeQuestion {
  const count = pick([14, 19, 24, 29, 34]);
  const avg = pick([18, 20, 21, 22, 24]);
  const inc = pick([1, 2]);
  const mentorAge = avg + (count + 1) * inc;

  const ans = `${mentorAge} years`;
  const { options, correctIndex } = buildOptions(ans, [
    `${mentorAge - inc * 4} years`,
    `${avg + count * inc} years`,
    `${mentorAge + 5} years`,
    `${mentorAge - 3} years`,
  ]);

  return {
    id: nextId('arith-avg'),
    category: 'Arithmetic Aptitude',
    subtopic: 'Averages & Ages',
    difficulty: 'Easy',
    askedIn: 'Infosys • TCS Digital • Zoho',
    question: `The average age of ${count} B.Tech interns in a cohort is ${avg} years. When their tech mentor joins the group, the average age increases by ${inc} year${inc > 1 ? 's' : ''}. What is the mentor's age?`,
    options,
    correctIndex,
    explanation: `Original sum = ${count} × ${avg} = ${count * avg}. New sum of ${count + 1} members = ${count + 1} × ${avg + inc} = ${(count + 1) * (avg + inc)}. Mentor age = ${(count + 1) * (avg + inc)} − ${count * avg} = ${mentorAge} years.`,
    shortcutTip: 'New member = Old Average + (New Group Size × Increase in Average).',
  };
}

function genProbabilityBalls(): GeneratedAptitudeQuestion {
  const red = randInt(3, 6);
  const blue = randInt(3, 6);
  const total = red + blue;
  // Probability both drawn without replacement are RED
  const num = red * (red - 1);
  const den = total * (total - 1);
  const g = gcd(num, den);
  const ans = `${num / g}/${den / g}`;

  const altNum1 = blue * (blue - 1);
  const g1 = gcd(altNum1, den);
  const alt1 = `${altNum1 / g1}/${den / g1}`;

  const altNum2 = 2 * red * blue;
  const g2 = gcd(altNum2, den);
  const alt2 = `${altNum2 / g2}/${den / g2}`;

  const altNum3 = red * red;
  const den3 = total * total;
  const g3 = gcd(altNum3, den3);
  const alt3 = `${altNum3 / g3}/${den3 / g3}`;

  const { options, correctIndex } = buildOptions(
    ans,
    [alt1, alt2, alt3, `${red}/${total}`],
    (k) => `${k}/${den / g + k + 1}`
  );

  return {
    id: nextId('arith-prob'),
    category: 'Arithmetic Aptitude',
    subtopic: 'Probability & Combinations',
    difficulty: 'Hard',
    askedIn: 'Goldman Sachs • DE Shaw • Arcesium',
    question: `A server rack bin contains ${red} red Ethernet patch cables and ${blue} blue cables. If 2 cables are picked at random without replacement, what is the probability that both are red?`,
    options,
    correctIndex,
    explanation: `Total ways to pick 2 out of ${total} = C(${total}, 2) = ${den / 2}. Favorable ways to pick 2 red out of ${red} = C(${red}, 2) = ${num / 2}. Probability = (${red}/${total}) × (${red - 1}/${total - 1}) = ${num}/${den} = ${ans}.`,
    shortcutTip: 'Multiply conditional draw probabilities step-by-step: (r / N) × ((r − 1) / (N − 1)).',
  };
}

/* -------------------------------------------------------------------------- */
/* 2. DATA INTERPRETATION (WITH VISUAL SVG BAR CHARTS & TABLES)               */
/* -------------------------------------------------------------------------- */

function genDiBarChart(): GeneratedAptitudeQuestion {
  const depts = ['Platform', 'Data/ML', 'Security', 'Frontend', 'Mobile'];
  const values = depts.map(() => randInt(4, 16) * 5);
  const iA = 0;
  const iB = 2;
  const sumAll = values.reduce((a, b) => a + b, 0);
  const askSharePct = Math.random() < 0.5;

  if (askSharePct) {
    const targetIdx = randInt(0, depts.length - 1);
    const pct = (values[targetIdx] / sumAll) * 100;
    const ans = `${pct.toFixed(1)}%`;
    const { options, correctIndex } = buildOptions(
      ans,
      [
        `${(pct + 4.5).toFixed(1)}%`,
        `${Math.max(1, pct - 3.8).toFixed(1)}%`,
        `${(pct * 1.25).toFixed(1)}%`,
      ],
      (k) => `${(pct + k * 2.3).toFixed(1)}%`
    );

    return {
      id: nextId('di-bar'),
      category: 'Data Interpretation',
      subtopic: 'Department Hiring Bar Chart',
      difficulty: 'Easy',
      askedIn: 'Deloitte • ZS Associates • Mu Sigma',
      question: `Based on the engineering headcount chart below, approximately what percentage of total hires belong to the "${depts[targetIdx]}" team?`,
      visual: {
        type: 'bar-chart',
        title: 'Annual Campus Hiring Distribution (Engineers)',
        unit: 'hires',
        items: depts.map((d, idx) => ({ label: d, value: values[idx], highlight: idx === targetIdx })),
      },
      options,
      correctIndex,
      explanation: `Total hires = ${values.join(' + ')} = ${sumAll}. "${depts[targetIdx]}" hires = ${values[targetIdx]}. Percentage = (${values[targetIdx]} / ${sumAll}) × 100 = ${pct.toFixed(2)}% ≈ ${ans}.`,
      shortcutTip: 'Calculate total bar sum first, then compute target / sum × 100.',
    };
  }

  const vA = values[iA];
  const vB = values[iB];
  const pctMore = ((vA - vB) / vB) * 100;
  const isMore = vA >= vB;
  const ans = isMore
    ? `${Math.abs(pctMore).toFixed(1)}% more`
    : `${Math.abs(pctMore).toFixed(1)}% less`;

  const { options, correctIndex } = buildOptions(
    ans,
    [
      `${Math.abs(pctMore + 6).toFixed(1)}% ${isMore ? 'more' : 'less'}`,
      `${Math.abs(((vA - vB) / vA) * 100).toFixed(1)}% ${isMore ? 'less' : 'more'}`,
      `${Math.abs(pctMore * 0.5 + 3).toFixed(1)}% ${isMore ? 'more' : 'less'}`,
    ],
    (k) => `${(Math.abs(pctMore) + k * 7.2).toFixed(1)}% more`
  );

  return {
    id: nextId('di-bar-cmp'),
    category: 'Data Interpretation',
    subtopic: 'Comparative Bar Chart',
    difficulty: 'Medium',
    askedIn: 'Flipkart Analytics • Paytm • Razorpay',
    question: `Using the chart below, "${depts[iA]}" hires are approximately what percent more or less than "${depts[iB]}" hires?`,
    visual: {
      type: 'bar-chart',
      title: 'Engineering Hiring by Vertical',
      unit: 'hires',
      items: depts.map((d, idx) => ({ label: d, value: values[idx], highlight: idx === iA || idx === iB })),
    },
    options,
    correctIndex,
    explanation: `${depts[iA]} = ${vA}, ${depts[iB]} = ${vB}. Relative % = ((${vA} − ${vB}) / ${vB}) × 100 = ${pctMore.toFixed(2)}% → ${ans}.`,
    shortcutTip: 'Always put the "than X" quantity in the denominator: (A − B) / B × 100.',
  };
}

function genDiQuarterlyTable(): GeneratedAptitudeQuestion {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const rev = quarters.map(() => randInt(12, 35) * 10);
  const exp = rev.map((r) => r - randInt(3, 10) * 10);
  const profits = rev.map((r, i) => r - exp[i]);

  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const avgProfit = totalProfit / 4;

  const ans = `₹${formatNumber(avgProfit)} Cr`;
  const { options, correctIndex } = buildOptions(
    ans,
    [
      `₹${formatNumber(avgProfit + 12)} Cr`,
      `₹${formatNumber(Math.max(5, avgProfit - 10))} Cr`,
      `₹${formatNumber(totalProfit)} Cr`,
    ],
    (k) => `₹${formatNumber(avgProfit + k * 6.5)} Cr`
  );

  return {
    id: nextId('di-tbl'),
    category: 'Data Interpretation',
    subtopic: 'Quarterly Financial Table',
    difficulty: 'Easy',
    askedIn: 'TCS Digital • JP Morgan • Oracle',
    question: `Examine the quarterly cloud metrics table below. What is the average quarterly Profit (Revenue − Operating Cost) across Q1 to Q4?`,
    visual: {
      type: 'data-table',
      title: 'Cloud Division Quarterly Ledger (₹ Crore)',
      headers: ['Quarter', 'Revenue (₹ Cr)', 'Operating Cost (₹ Cr)'],
      rows: quarters.map((q, i) => [q, rev[i], exp[i]]),
    },
    options,
    correctIndex,
    explanation: `Profits by quarter: ${profits.map((p, i) => `${quarters[i]}=${p}`).join(', ')}. Sum = ${totalProfit} Cr. Average across 4 quarters = ${totalProfit} / 4 = ${formatNumber(avgProfit)} Cr.`,
    shortcutTip: 'Average Profit = (Sum of Revenues − Sum of Costs) / 4.',
  };
}

/* -------------------------------------------------------------------------- */
/* 3. LOGICAL REASONING                                                       */
/* -------------------------------------------------------------------------- */

function genNumberSeries(): GeneratedAptitudeQuestion {
  const mode = pick(['square-plus', 'diff-ap', 'alt-mul-add']);
  let terms: number[] = [];
  let nextVal = 0;
  let ruleDesc = '';

  if (mode === 'square-plus') {
    const start = randInt(2, 5);
    const offset = randInt(1, 5);
    terms = Array.from({ length: 5 }, (_, i) => (start + i) * (start + i) + offset);
    nextVal = (start + 5) * (start + 5) + offset;
    ruleDesc = `Each term is k² + ${offset} starting from k = ${start} (${start + 5}² + ${offset} = ${nextVal}).`;
  } else if (mode === 'diff-ap') {
    let cur = randInt(3, 12);
    const d0 = randInt(3, 7);
    const step = randInt(3, 6);
    terms = [cur];
    for (let i = 0; i < 4; i++) {
      cur += d0 + i * step;
      terms.push(cur);
    }
    nextVal = cur + d0 + 4 * step;
    ruleDesc = `Consecutive differences increase by +${step} each step (+${d0}, +${d0 + step}, ..., +${d0 + 4 * step}).`;
  } else {
    let cur = randInt(2, 6);
    const add = randInt(1, 5);
    terms = [cur];
    for (let i = 0; i < 4; i++) {
      cur = cur * 2 + add;
      terms.push(cur);
    }
    nextVal = cur * 2 + add;
    ruleDesc = `Each next number follows (prev × 2) + ${add}.`;
  }

  const ans = String(nextVal);
  const { options, correctIndex } = buildOptions(ans, [
    String(nextVal + pick([2, 4, 6])),
    String(nextVal - pick([2, 3, 5])),
    String(nextVal + 11),
  ]);

  return {
    id: nextId('log-series'),
    category: 'Logical Reasoning',
    subtopic: 'Number Series',
    difficulty: 'Easy',
    askedIn: 'Accenture • Infosys • IBM',
    question: `Find the missing number that continues the logical pattern:\n${terms.join(', ')}, ?`,
    options,
    correctIndex,
    explanation: ruleDesc,
    shortcutTip: 'Take first differences first; if not constant, check second differences or ×2 ± k.',
  };
}

function genCipherWord(): GeneratedAptitudeQuestion {
  const words = ['KERNEL', 'ROUTER', 'BINARY', 'LAMBDA', 'SERVER', 'DOCKER', 'MATRIX', 'SOCKET'];
  const [w1, w2] = shuffle(words).slice(0, 2);
  const shift = randInt(2, 5);

  const encode = (word: string, s: number) =>
    word
      .split('')
      .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + s) % 26) + 65))
      .join('');

  const c1 = encode(w1, shift);
  const ans = encode(w2, shift);

  const { options, correctIndex } = buildOptions(ans, [
    encode(w2, shift + 1),
    encode(w2, Math.max(1, shift - 1)),
    encode(w2, shift + 2),
  ]);

  return {
    id: nextId('log-cipher'),
    category: 'Logical Reasoning',
    subtopic: 'Coding & Decoding',
    difficulty: 'Easy',
    askedIn: 'Wipro • Cognizant • Tech Mahindra',
    question: `In a certain cipher, the word "${w1}" is encoded as "${c1}". Using the exact same letter shift rule, how will "${w2}" be encoded?`,
    options,
    correctIndex,
    explanation: `Every letter is shifted forward by +${shift} positions in the alphabet (${w1[0]} → ${c1[0]}). Applying +${shift} to "${w2}" produces "${ans}".`,
    shortcutTip: 'Verify the first and last letters first—you can often eliminate 3 options immediately.',
  };
}

function genDirectionSense(): GeneratedAptitudeQuestion {
  const triples: Array<[number, number, number]> = [
    [3, 4, 5],
    [6, 8, 10],
    [5, 12, 13],
    [8, 15, 17],
    [9, 12, 15],
  ];
  const [eastStep, northStep, hyp] = pick(triples);
  const extraWalk = randInt(4, 9);
  const firstNorth = northStep + extraWalk;

  const ans = `${hyp} km`;
  const { options, correctIndex } = buildOptions(ans, [
    `${eastStep + northStep} km`,
    `${hyp + 2} km`,
    `${Math.max(1, hyp - 2)} km`,
  ]);

  return {
    id: nextId('log-dir'),
    category: 'Logical Reasoning',
    subtopic: 'Direction & Displacement',
    difficulty: 'Medium',
    askedIn: 'Capgemini • HCL • Mindtree',
    question: `An autonomous drone flies ${firstNorth} km North from base, turns Right and flies ${eastStep} km East, then turns Right again and flies ${extraWalk} km South. How far is it from the starting base in a straight line?`,
    options,
    correctIndex,
    explanation: `Net North displacement = ${firstNorth} − ${extraWalk} = ${northStep} km. Net East displacement = ${eastStep} km. Shortest distance = √(${northStep}² + ${eastStep}²) = √(${northStep * northStep + eastStep * eastStep}) = ${hyp} km.`,
    shortcutTip: 'Keep net (North − South) and (East − West) totals separately, then use Pythagoras.',
  };
}

function genRankingLine(): GeneratedAptitudeQuestion {
  const fromLeft = randInt(8, 22);
  const fromRight = randInt(9, 25);
  const total = fromLeft + fromRight - 1;
  const ans = `${total} candidates`;

  const { options, correctIndex } = buildOptions(ans, [
    `${total + 1} candidates`,
    `${Math.max(2, total - 1)} candidates`,
    `${total + 2} candidates`,
  ]);

  return {
    id: nextId('log-rank'),
    category: 'Logical Reasoning',
    subtopic: 'Order & Ranking',
    difficulty: 'Easy',
    askedIn: 'Infosys • Syntel • DXC',
    question: `In a university placement shortlist row, Harshal ranks ${fromLeft}th from the left end and ${fromRight}th from the right end. How many total candidates are in the shortlist?`,
    options,
    correctIndex,
    explanation: `Total = Rank from Left + Rank from Right − 1 (since Harshal is counted twice) = ${fromLeft} + ${fromRight} − 1 = ${total} candidates.`,
    shortcutTip: 'Total = L + R − 1.',
  };
}

/* -------------------------------------------------------------------------- */
/* 4. VERBAL ABILITY                                                          */
/* -------------------------------------------------------------------------- */

const VOCAB_BANK = [
  {
    word: 'EPHEMERAL',
    meaning: 'lasting for a very short time',
    syn: 'Transient',
    wrong: ['Perpetual', 'Redundant', 'Monumental', 'Stagnant'],
  },
  {
    word: 'MITIGATE',
    meaning: 'make less severe or painful',
    syn: 'Alleviate',
    wrong: ['Aggravate', 'Proliferate', 'Inhibit', 'Fabricate'],
  },
  {
    word: 'UBIQUITOUS',
    meaning: 'present everywhere at once',
    syn: 'Omnipresent',
    wrong: ['Obsolete', 'Scarce', 'Cryptic', 'Fragile'],
  },
  {
    word: 'PRAGMATIC',
    meaning: 'dealing with things sensibly and realistically',
    syn: 'Practical',
    wrong: ['Idealistic', 'Erratic', 'Dogmatic', 'Ambiguous'],
  },
  {
    word: 'RESILIENT',
    meaning: 'able to recover quickly from failures',
    syn: 'Adaptable',
    wrong: ['Brittle', 'Lethargic', 'Complacent', 'Volatile'],
  },
  {
    word: 'CONCISE',
    meaning: 'giving information clearly in few words',
    syn: 'Succinct',
    wrong: ['Verbose', 'Opaque', 'Disjointed', 'Meandering'],
  },
  {
    word: 'BOTTLENECK',
    meaning: 'a point of congestion slowing system throughput',
    syn: 'Constraint',
    wrong: ['Accelerator', 'Surplus', 'Redundancy', 'Bypass'],
  },
  {
    word: 'IDEMPOTENT',
    meaning: 'producing the same outcome when applied repeatedly',
    syn: 'Repeatable safely',
    wrong: ['Side-effect heavy', 'Non-deterministic', 'Destructive', 'Ephemeral'],
  },
];

const ERROR_SPOT_BANK = [
  {
    q: 'Identify the grammatically correct replacement sentence:',
    correct: 'Neither the cache server nor the worker nodes were responding after the deploy.',
    wrong: [
      'Neither the cache server nor the worker nodes was responding after the deploy.',
      'Neither the cache server or the worker nodes were responding after the deploy.',
      'Neither the cache server nor the worker nodes is respond after the deploy.',
    ],
    exp: 'With "neither ... nor ...", the verb agrees with the closer noun ("worker nodes" is plural → "were").',
  },
  {
    q: 'Choose the sentence with accurate parallel structure:',
    correct: 'Good API design requires clear documentation, consistent naming, and strict validation.',
    wrong: [
      'Good API design requires clear documentation, consistent naming, and to validate strictly.',
      'Good API design requires clearing documentation, consistent naming, and strictly validation.',
      'Good API design requires clear documentation, naming consistently, and strict validation.',
    ],
    exp: 'All three items must share the same noun-phrase form: [adj + noun], [adj + noun], [adj + noun].',
  },
  {
    q: 'Select the error-free statement:',
    correct: 'Each of the microservices exposes its own health-check endpoint.',
    wrong: [
      'Each of the microservices expose their own health-check endpoint.',
      'Each of the microservice exposes its own health-check endpoint.',
      'Each of the microservices expose its own health-check endpoint.',
    ],
    exp: '"Each" is singular and takes a singular verb ("exposes") and singular pronoun ("its"), while "microservices" after "of the" stays plural.',
  },
  {
    q: 'Pick the sentence using the conditional tense properly:',
    correct: 'Had the database index been created earlier, the query would have finished in milliseconds.',
    wrong: [
      'Had the database index been created earlier, the query will finish in milliseconds.',
      'If the database index would have been created earlier, the query finished in milliseconds.',
      'Were the database index created earlier, the query would finish yesterday.',
    ],
    exp: 'Third conditional inversion uses "Had + subject + past participle, ... would have + past participle".',
  },
];

function genVerbalAbility(): GeneratedAptitudeQuestion {
  if (Math.random() < 0.55) {
    const item = pick(VOCAB_BANK);
    const { options, correctIndex } = buildOptions(item.syn, shuffle(item.wrong).slice(0, 3));
    return {
      id: nextId('verb-syn'),
      category: 'Verbal Ability',
      subtopic: 'Technical & Business Vocabulary',
      difficulty: 'Easy',
      askedIn: 'Accenture • Infosys • Deloitte',
      question: `Choose the word closest in meaning (synonym) to "${item.word}" as used in software engineering reviews:`,
      options,
      correctIndex,
      explanation: `"${item.word}" means ${item.meaning}. Therefore "${item.syn}" is the closest match.`,
      shortcutTip: 'Eliminate antonyms first when you recognize root prefixes like epi-, ubiq-, or con-.',
    };
  }

  const gram = pick(ERROR_SPOT_BANK);
  const { options, correctIndex } = buildOptions(gram.correct, gram.wrong);
  return {
    id: nextId('verb-gram'),
    category: 'Verbal Ability',
    subtopic: 'Grammar & Sentence Correction',
    difficulty: 'Medium',
    askedIn: 'TCS • Cognizant • Goldman Sachs',
    question: gram.q,
    options,
    correctIndex,
    explanation: gram.exp,
    shortcutTip: 'Check subject-verb agreement and parallelism across listed phrases.',
  };
}

/* -------------------------------------------------------------------------- */
/* 5. VERBAL REASONING                                                        */
/* -------------------------------------------------------------------------- */

function genVerbalReasoning(): GeneratedAptitudeQuestion {
  const domains: Array<[string, string, string]> = [
    ['micro-services', 'containers', 'orchestrated pods'],
    ['SQL queries', 'read operations', 'logged transactions'],
    ['binary trees', 'acyclic graphs', 'connected structures'],
    ['hash maps', 'key-value stores', 'memory buffers'],
    ['engineers', 'problem solvers', 'system thinkers'],
  ];
  const [A, B, C] = pick(domains);
  const mode = pick(['all-all', 'all-no', 'conditional']);

  if (mode === 'all-all') {
    const correct = `All ${A} are ${C}.`;
    const { options, correctIndex } = buildOptions(correct, [
      `All ${C} are ${A}.`,
      `No ${A} are ${C}.`,
      `Some ${C} cannot be ${B}.`,
    ]);
    return {
      id: nextId('vreas-syl'),
      category: 'Verbal Reasoning',
      subtopic: 'Syllogism Deduction',
      difficulty: 'Easy',
      askedIn: 'TCS NQT • Capgemini • LTIMindtree',
      question: `Statements:\n1. All ${A} are ${B}.\n2. All ${B} are ${C}.\n\nWhich conclusion logically follows with 100% certainty?`,
      options,
      correctIndex,
      explanation: `By transitive inclusion (A ⊆ B and B ⊆ C), every element in ${A} must belong to ${C}. Reverse containment ("All C are A") is not guaranteed.`,
      shortcutTip: 'Draw quick nested Venn circles: inner circle A inside B inside C.',
    };
  }

  if (mode === 'all-no') {
    const correct = `No ${A} are ${C}.`;
    const { options, correctIndex } = buildOptions(correct, [
      `Some ${A} are ${C}.`,
      `All ${B} are ${A}.`,
      `Some ${C} are ${A}.`,
    ]);
    return {
      id: nextId('vreas-syl2'),
      category: 'Verbal Reasoning',
      subtopic: 'Syllogism Disjoint Sets',
      difficulty: 'Medium',
      askedIn: 'Infosys • Cognizant • HSBC',
      question: `Statements:\n1. All ${A} are ${B}.\n2. No ${B} are ${C}.\n\nWhich conclusion definitely follows?`,
      options,
      correctIndex,
      explanation: `Since every ${A} lies inside ${B} and set ${B} has zero overlap with ${C}, zero ${A} can be ${C}.`,
      shortcutTip: 'If A ⊆ B and B ∩ C = ∅, then A ∩ C = ∅.',
    };
  }

  const pair = pick([
    {
      p: 'the primary shard fails',
      q: 'traffic automatically routes to the replica',
    },
    {
      p: 'the cache hits a valid key',
      q: 'the database avoids a disk seek',
    },
    {
      p: 'all unit tests pass CI',
      q: 'the pull request becomes merge-ready',
    },
  ]);
  const correct = `If NOT (${pair.q}), then NOT (${pair.p}).`;
  const { options, correctIndex } = buildOptions(correct, [
    `If (${pair.q}), then (${pair.p}).`,
    `If NOT (${pair.p}), then NOT (${pair.q}).`,
    `Either (${pair.p}) or (${pair.q}) must be false.`,
  ]);

  return {
    id: nextId('vreas-cond'),
    category: 'Verbal Reasoning',
    subtopic: 'Logical Equivalence (Contrapositive)',
    difficulty: 'Hard',
    askedIn: 'Amazon • Microsoft • Atlassian',
    question: `Assume this rule is always true:\n"If ${pair.p}, then ${pair.q}."\nWhich statement MUST be logically equivalent?`,
    options,
    correctIndex,
    explanation: `An implication "If P, then Q" (P ⇒ Q) is always logically equivalent to its contrapositive "If ¬Q, then ¬P". Converse (Q ⇒ P) and inverse (¬P ⇒ ¬Q) are common fallacies.`,
    shortcutTip: 'P ⇒ Q ≡ (¬Q ⇒ ¬P). Flip AND negate both sides.',
  };
}

/* -------------------------------------------------------------------------- */
/* 6. NONVERBAL REASONING (WITH DYNAMIC SVG DIAGRAMS & VISUAL OPTION TILES)   */
/* -------------------------------------------------------------------------- */

function genNonverbalRotation(): GeneratedAptitudeQuestion {
  const shape = pick(['arrow', 'triangle', 'l-piece'] as const);
  const startRot = pick([0, 45, 90, 180]);
  const stepRot = pick([45, 90, 135]);
  const frames: GridShapeFrame[] = [0, 1, 2, 3].map((idx) => ({
    shape,
    rotation: (startRot + idx * stepRot) % 360,
    dotCorner: (idx + 0) % 4,
    filled: idx % 2 === 0,
  }));

  const ansFrame: GridShapeFrame = {
    shape,
    rotation: (startRot + 4 * stepRot) % 360,
    dotCorner: 0,
    filled: true,
  };

  const wrongAngles = [90, 180, 270].map((offset) => (ansFrame.rotation + offset) % 360);
  const ansText = `Rotated ${ansFrame.rotation}° clockwise, filled`;

  const candidateFrames: Array<{ label: string; frame: GridShapeFrame }> = [
    { label: ansText, frame: ansFrame },
    {
      label: `Rotated ${wrongAngles[0]}° clockwise, hollow`,
      frame: { shape, rotation: wrongAngles[0], dotCorner: 1, filled: false },
    },
    {
      label: `Rotated ${wrongAngles[1]}° clockwise, filled`,
      frame: { shape, rotation: wrongAngles[1], dotCorner: 2, filled: true },
    },
    {
      label: `Rotated ${wrongAngles[2]}° clockwise, hollow`,
      frame: { shape, rotation: wrongAngles[2], dotCorner: 3, filled: false },
    },
  ];

  const shuffled = shuffle(candidateFrames);
  const correctIndex = shuffled.findIndex((c) => c.label === ansText);

  return {
    id: nextId('nv-rot'),
    category: 'Nonverbal Reasoning',
    subtopic: 'Visual Rotation & Parity Sequence',
    difficulty: 'Medium',
    askedIn: 'Accenture • Capgemini Gamified Assessment • IBM',
    question: `Observe the 4-frame visual pattern below. Notice how both the orientation and the fill state (solid vs outline) progress. Which tile comes 5th?`,
    visual: {
      type: 'svg-sequence',
      title: 'Pattern Progression Sequence',
      frames,
      showQuestionMark: true,
    },
    options: shuffled.map((c) => c.label),
    optionVisuals: shuffled.map((c) => ({ type: 'svg-frame', frame: c.frame })),
    correctIndex,
    explanation: `Each step rotates the shape by +${stepRot}° clockwise (ending at ${(startRot + 3 * stepRot) % 360}° + ${stepRot}° = ${ansFrame.rotation}°), shifts the corner marker clockwise by +1 quadrant, and alternates solid/outline fill (step 5 is filled).`,
    shortcutTip: 'Track rotation angle AND alternating fill/dot state independently to rule out 2–3 choices instantly.',
  };
}

function genNonverbalMirror(): GeneratedAptitudeQuestion {
  // Generate asymmetric 4x4 grid (ensure left != reversed left on at least two rows)
  const cells: number[][] = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      cells[r][c] = Math.random() < 0.42 ? 1 : 0;
    }
  }
  cells[0][0] = 1;
  cells[0][3] = 0;
  cells[1][1] = 1;
  cells[2][0] = 1;
  cells[2][2] = 0;
  cells[3][1] = 0;
  cells[3][3] = 1;

  const mirrorH = cells.map((row) => [...row].reverse());
  const flipV = [...cells].reverse().map((row) => [...row]);
  const rotate180 = [...cells].reverse().map((row) => [...row].reverse());
  const invert = cells.map((row) => row.map((v) => (v === 1 ? 0 : 1)));

  const choices = shuffle([
    { key: 'correct', label: 'Horizontal Mirror Reflection', cells: mirrorH },
    { key: 'flipv', label: 'Vertical Flip Variant', cells: flipV },
    { key: 'rot180', label: '180° Rotated Variant', cells: rotate180 },
    { key: 'invert', label: 'Inverted Matrix Variant', cells: invert },
  ]);

  const correctIndex = choices.findIndex((c) => c.key === 'correct');

  return {
    id: nextId('nv-mirror'),
    category: 'Nonverbal Reasoning',
    subtopic: 'Mirror Image Matrix',
    difficulty: 'Easy',
    askedIn: 'Accenture • Infosys • Mercer Mettl',
    question: `Identify the exact horizontal mirror image (reflected across the right vertical mirror line) of the 4×4 pixel glyph shown below:`,
    visual: {
      type: 'mirror-grid',
      title: '4×4 Glyph Reflection Across Vertical Mirror',
      cells,
    },
    options: choices.map((_, idx) => `Option ${String.fromCharCode(65 + idx)} Pattern`),
    optionVisuals: choices.map((c) => ({ type: 'mirror-grid', cells: c.cells })),
    correctIndex,
    explanation: `In a horizontal mirror reflection across a vertical axis, every row keeps the same vertical height while columns flip left-to-right (col 0 swaps with col 3, col 1 swaps with col 2).`,
    shortcutTip: 'Check just the top-left corner cell: in a right-mirror image it MUST appear in the top-right corner.',
  };
}

/* -------------------------------------------------------------------------- */
/* 7. INTERVIEW PUZZLES (DYNAMICALLY PARAMETERIZED CLASSIC BRAINTEASERS)      */
/* -------------------------------------------------------------------------- */

function genClockAnglePuzzle(): GeneratedAptitudeQuestion {
  const hour = randInt(1, 11);
  const minute = pick([10, 15, 20, 25, 30, 35, 40, 45, 50]);
  const rawDiff = Math.abs(30 * hour - 5.5 * minute);
  const angle = Math.min(rawDiff, 360 - rawDiff);

  const ans = `${formatNumber(angle, 1)}°`;
  const { options, correctIndex } = buildOptions(
    ans,
    [
      `${formatNumber(Math.min(angle + 15, 180), 1)}°`,
      `${formatNumber(Math.abs(angle - 12.5), 1)}°`,
      `${formatNumber(Math.abs(30 * hour - 6 * minute), 1)}°`,
    ],
    (k) => `${formatNumber(Math.min(180, angle + k * 7.5), 1)}°`
  );

  return {
    id: nextId('puz-clock'),
    category: 'Interview Puzzles',
    subtopic: 'Clock Geometry',
    difficulty: 'Medium',
    askedIn: 'Goldman Sachs • Microsoft • Adobe',
    question: `What is the smaller angle (in degrees) between the hour hand and the minute hand of an analog clock at ${hour}:${minute}?`,
    options,
    correctIndex,
    explanation: `Formula: |30H − 5.5M| = |30(${hour}) − 5.5(${minute})| = |${30 * hour} − ${5.5 * minute}| = ${rawDiff}°. Taking the smaller acute/obtuse angle ≤ 180° gives ${ans}.`,
    shortcutTip: 'Remember the hour hand moves 0.5° every minute, giving exact formula |30H − 5.5M|.',
  };
}

function genPoisonBottlesPuzzle(): GeneratedAptitudeQuestion {
  const bottles = pick([64, 100, 128, 250, 500, 1000]);
  const testers = Math.ceil(Math.log2(bottles));
  const ans = `${testers} testers`;

  const { options, correctIndex } = buildOptions(ans, [
    `${testers - 1} testers`,
    `${testers + 2} testers`,
    `${Math.ceil(Math.sqrt(bottles))} testers`,
  ]);

  return {
    id: nextId('puz-poison'),
    category: 'Interview Puzzles',
    subtopic: 'Binary Encoding',
    difficulty: 'Hard',
    askedIn: 'Google • Microsoft • Databricks',
    question: `You have ${bottles} wine bottles, and exactly 1 bottle is poisoned. The poison takes 24 hours to show effect, and you have exactly 24 hours (1 round of testing). What is the MINIMUM number of testers needed to pinpoint the poisoned bottle?`,
    options,
    correctIndex,
    explanation: `Each tester gives 1 bit of information (affected = 1, safe = 0). With k testers we can uniquely encode 2^k states. We need 2^k ≥ ${bottles} ⇒ k = ⌈log₂(${bottles})⌉ = ${testers} testers (2^${testers} = ${2 ** testers} ≥ ${bottles}).`,
    shortcutTip: '1-round testing = information theory / binary encoding → minimum testers = ceil(log₂(N)).',
  };
}

function genBalanceScalePuzzle(): GeneratedAptitudeQuestion {
  const coins = pick([9, 27, 81, 243]);
  const weighings = Math.round(Math.log(coins) / Math.log(3));
  const ans = `${weighings} weighings`;

  const { options, correctIndex } = buildOptions(ans, [
    `${weighings + 1} weighings`,
    `${Math.ceil(Math.log2(coins))} weighings`,
    `${Math.max(1, weighings - 1)} weighings`,
  ]);

  return {
    id: nextId('puz-coins'),
    category: 'Interview Puzzles',
    subtopic: 'Ternary Search Strategy',
    difficulty: 'Medium',
    askedIn: 'Amazon • Oracle • D.E. Shaw',
    question: `You have ${coins} identical-looking coins, and 1 coin is slightly heavier than the others. Using a standard two-pan balance scale, what is the minimum number of weighings guaranteed to find the heavier coin?`,
    options,
    correctIndex,
    explanation: `Each weighing has 3 outcomes: Left heavy, Right heavy, or Equal (meaning third group has the coin). Splitting into thirds yields 3^k ≥ ${coins} ⇒ k = log₃(${coins}) = ${weighings} weighings.`,
    shortcutTip: 'A two-pan scale gives ternary (base-3) branching: divide into 3 equal groups each step!',
  };
}

function genTwoEggsPuzzle(): GeneratedAptitudeQuestion {
  const floors = pick([36, 55, 78, 100, 120]);
  let drops = 1;
  while ((drops * (drops + 1)) / 2 < floors) drops += 1;

  const ans = `${drops} drops`;
  const { options, correctIndex } = buildOptions(ans, [
    `${Math.ceil(Math.sqrt(floors)) + 2} drops`,
    `${Math.ceil(floors / 10) + 5} drops`,
    `${drops - 2} drops`,
  ]);

  return {
    id: nextId('puz-eggs'),
    category: 'Interview Puzzles',
    subtopic: 'Minimax Dynamic Programming',
    difficulty: 'Hard',
    askedIn: 'Google • Microsoft • Tower Research',
    question: `You are given 2 identical eggs and access to a ${floors}-story building. You want to find the highest floor from which an egg can drop without breaking using the minimum number of drops in the WORST case. How many drops are required?`,
    options,
    correctIndex,
    explanation: `To keep the worst-case total constant if the 1st egg breaks, decrease interval steps by 1 each jump: x + (x−1) + ... + 1 = x(x+1)/2 ≥ ${floors}. Solving gives x = ${drops} (${drops}×${drops + 1}/2 = ${(drops * (drops + 1)) / 2} ≥ ${floors}).`,
    shortcutTip: 'Solve x(x + 1)/2 ≥ N floors. Classic 100 floors → 14 drops.',
  };
}

function genChocolateCuts(): GeneratedAptitudeQuestion {
  const rows = randInt(4, 12);
  const cols = randInt(5, 14);
  const cuts = rows * cols - 1;
  const ans = `${cuts} breaks`;

  const { options, correctIndex } = buildOptions(ans, [
    `${rows + cols} breaks`,
    `${rows * cols} breaks`,
    `${(rows - 1) + (cols - 1) * 2} breaks`,
  ]);

  return {
    id: nextId('puz-choc'),
    category: 'Interview Puzzles',
    subtopic: 'Invariant Principle',
    difficulty: 'Easy',
    askedIn: 'Adobe • PayPal • Goldman Sachs',
    question: `You have a ${rows} × ${cols} rectangular chocolate bar grid. In one move, you pick 1 connected piece and break it along a straight groove into 2 pieces (no stacking). What is the minimum number of breaks needed to separate all 1×1 squares?`,
    options,
    correctIndex,
    explanation: `Start with 1 piece. Every single break increases the number of pieces by exactly +1 regardless of which groove you snap. To reach ${rows * cols} individual squares, you MUST make (${rows * cols} − 1) = ${cuts} breaks.`,
    shortcutTip: 'Invariant: 1 piece → +1 piece per cut → N pieces always takes N − 1 breaks.',
  };
}

function genAntsPolygonPuzzle(): GeneratedAptitudeQuestion {
  const sides = pick([3, 4, 5, 6]);
  const totalWays = 2 ** sides;
  const collisionWays = totalWays - 2;
  const g = gcd(collisionWays, totalWays);
  const ans = `${collisionWays / g}/${totalWays / g}`;

  const { options, correctIndex } = buildOptions(ans, [
    `${2 / g}/${totalWays / g}`,
    '1/2',
    `${(totalWays - 1) / gcd(totalWays - 1, totalWays)}/${totalWays / gcd(totalWays - 1, totalWays)}`,
  ]);

  const shapeName = sides === 3 ? 'triangle' : sides === 4 ? 'square' : sides === 5 ? 'pentagon' : 'hexagon';

  return {
    id: nextId('puz-ants'),
    category: 'Interview Puzzles',
    subtopic: 'Symmetry & Probability',
    difficulty: 'Medium',
    askedIn: 'Microsoft • Jane Street • Uber',
    question: `${sides} ants sit at the ${sides} corners of a regular ${shapeName}. Each ant randomly picks one of its two adjacent edges (clockwise or counter-clockwise) with equal speed. What is the probability that AT LEAST TWO ants collide?`,
    options,
    correctIndex,
    explanation: `There are 2^${sides} = ${totalWays} equal outcomes. Ants avoid collision ONLY if all walk clockwise OR all walk counter-clockwise (2 outcomes). So collision probability = 1 − (2/${totalWays}) = ${collisionWays}/${totalWays} = ${ans}.`,
    shortcutTip: 'For N ants on an N-gon: P(collision) = 1 − 2 / 2^N = 1 − 1 / 2^(N−1).',
  };
}

function genPiratesGoldPuzzle(): GeneratedAptitudeQuestion {
  const coins = pick([100, 120, 200]);
  const pirates = pick([3, 4, 5]);
  // Backward induction: Captain needs ceil(N/2) votes including self = floor((N-1)/2) bribed pirates at 1 coin each
  const bribed = Math.floor((pirates - 1) / 2);
  const captainCoins = coins - bribed;
  const ans = `${captainCoins} coins`;

  const { options, correctIndex } = buildOptions(ans, [
    `${coins - pirates + 1} coins`,
    `${Math.floor(coins / pirates)} coins`,
    `${captainCoins - 1} coins`,
  ]);

  return {
    id: nextId('puz-pirates'),
    category: 'Interview Puzzles',
    subtopic: 'Backward Induction / Game Theory',
    difficulty: 'Hard',
    askedIn: 'Goldman Sachs • Microsoft • Citadel',
    question: `${pirates} ultra-rational pirates (ranked #${pirates} strongest down to #1) split ${coins} gold coins. The senior pirate proposes a split; if AT LEAST HALF vote yes (including proposer), it passes—else the proposer is tossed overboard. What is the maximum coins the senior pirate can keep?`,
    options,
    correctIndex,
    explanation: `Work backwards from 2 pirates (senior keeps 100%). With ${pirates} pirates, the proposer already counts 1 vote (self) and needs ${bribed} more vote(s) to hit ≥50%. By offering 1 coin each to pirates who would receive 0 if rejected, the proposer keeps ${coins} − ${bribed} = ${captainCoins} coins.`,
    shortcutTip: 'Standard pirate game invariant: offer 1 coin to every alternate pirate below you → keep Coins − floor((N−1)/2).',
  };
}

function genPigeonholeSocks(): GeneratedAptitudeQuestion {
  const colors = randInt(3, 7);
  const each = randInt(4, 10);
  const draw = colors + 1;
  const ans = `${draw} socks`;

  const { options, correctIndex } = buildOptions(ans, [
    `${colors} socks`,
    `${each + 1} socks`,
    `${colors * 2} socks`,
  ]);

  return {
    id: nextId('puz-socks'),
    category: 'Interview Puzzles',
    subtopic: 'Pigeonhole Principle',
    difficulty: 'Easy',
    askedIn: 'Wipro • Zoho • TCS',
    question: `A dark drawer has socks of ${colors} different colors (${each} pairs of each color, mixed loosely). Without turning on the lights, what is the minimum number of socks you must pull out to GUARANTEE at least 1 matching pair of the same color?`,
    options,
    correctIndex,
    explanation: `By the Pigeonhole Principle, in the worst case your first ${colors} pulls are all distinct colors (1 per color). The (${colors} + 1)th pull MUST match one of those ${colors} colors. Answer: ${draw} socks.`,
    shortcutTip: 'Worst-case distinct picks = Number of colors K; guaranteed match = K + 1.',
  };
}

/* -------------------------------------------------------------------------- */
/* PUBLIC GENERATOR API                                                       */
/* -------------------------------------------------------------------------- */

function genOopsMcqQuestion(): GeneratedAptitudeQuestion {
  const item = generateOopMcq();
  return {
    id: item.id,
    category: 'OOPs & C++ Design',
    subtopic: item.subtopic,
    difficulty: item.difficulty,
    askedIn: item.askedIn,
    question: item.question,
    options: item.options,
    correctIndex: item.correctIndex,
    explanation: item.explanation,
    shortcutTip: item.shortcutTip,
  };
}

const CATEGORY_GENERATORS: Record<AptitudeCategory, Array<() => GeneratedAptitudeQuestion>> = {
  'Arithmetic Aptitude': [
    genTrainPlatform,
    genTimeAndWork,
    genPipeLeak,
    genMarkupDiscount,
    genCiSiDiff,
    genAverageShift,
    genProbabilityBalls,
  ],
  'Data Interpretation': [genDiBarChart, genDiQuarterlyTable],
  'Verbal Ability': [genVerbalAbility],
  'Logical Reasoning': [genNumberSeries, genCipherWord, genDirectionSense, genRankingLine],
  'Verbal Reasoning': [genVerbalReasoning],
  'Nonverbal Reasoning': [genNonverbalRotation, genNonverbalMirror],
  'Interview Puzzles': [
    genClockAnglePuzzle,
    genPoisonBottlesPuzzle,
    genBalanceScalePuzzle,
    genTwoEggsPuzzle,
    genChocolateCuts,
    genAntsPolygonPuzzle,
    genPiratesGoldPuzzle,
    genPigeonholeSocks,
  ],
  'OOPs & C++ Design': [genOopsMcqQuestion],
};

export function generateAptitudeQuestion(
  category: AptitudeCategory | 'Mixed' = 'Mixed'
): GeneratedAptitudeQuestion {
  if (category === 'Mixed') {
    const pickedCat = pick(APTITUDE_CATEGORIES);
    const fn = pick(CATEGORY_GENERATORS[pickedCat]);
    return fn();
  }
  const fns = CATEGORY_GENERATORS[category] || CATEGORY_GENERATORS['Arithmetic Aptitude'];
  return pick(fns)();
}

export function generateAptitudeBatch(
  category: AptitudeCategory | 'Mixed',
  count: number
): GeneratedAptitudeQuestion[] {
  const results: GeneratedAptitudeQuestion[] = [];
  if (category === 'Mixed') {
    for (let i = 0; i < count; i++) {
      const cat = APTITUDE_CATEGORIES[i % APTITUDE_CATEGORIES.length];
      results.push(generateAptitudeQuestion(cat));
    }
    return shuffle(results);
  }
  const pool = CATEGORY_GENERATORS[category];
  for (let i = 0; i < count; i++) {
    const fn = pool[i % pool.length];
    results.push(fn());
  }
  return results;
}

