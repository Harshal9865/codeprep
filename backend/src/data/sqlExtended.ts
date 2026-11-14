import { makeSqlProblem, SqlProblemDefinition } from './sqlHelper';

interface SqlGeneratorEntry {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic:
    | 'Aggregations & Joins'
    | 'Window Functions'
    | 'Common Table Expressions'
    | 'Gaps and Islands'
    | 'Advanced Analytics & Retention';
  pattern: string;
  statement: string;
  inputSummary: string;
  outputSummary: string;
  explanation: string;
  schemaDdl: string;
  expectedQuery: string;
  expectedRows: Array<Record<string, unknown>>;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

const TOPICS: Array<SqlGeneratorEntry['topic']> = [
  'Aggregations & Joins',
  'Window Functions',
  'Common Table Expressions',
  'Gaps and Islands',
  'Advanced Analytics & Retention',
];

function buildEcommerceProblem(seqIdx: number, id: number): SqlProblemDefinition {
  // 50 unique queries across Orders, Customers, OrderItems, Products
  const minAmount = 40 + (seqIdx % 10) * 15;
  const variant = seqIdx % 10;
  const topK = (seqIdx % 3) + 2;
  const tierOffset = (seqIdx % 5) * 10;
  const topic = TOPICS[seqIdx % TOPICS.length];

  const customers = [
    { cid: 1, name: 'Aarav', tier: 'Gold', city: 'Bengaluru' },
    { cid: 2, name: 'Diya', tier: 'Silver', city: 'Mumbai' },
    { cid: 3, name: 'Kabir', tier: 'Gold', city: 'Delhi' },
    { cid: 4, name: 'Meera', tier: 'Bronze', city: 'Pune' },
    { cid: 5, name: 'Rohan', tier: 'Silver', city: 'Bengaluru' },
    { cid: 6, name: 'Tara', tier: 'Bronze', city: 'Hyderabad' },
  ];
  const orders = [
    { oid: 101, cid: 1, day: 1, status: 'paid', amount: 120 + tierOffset },
    { oid: 102, cid: 1, day: 2, status: 'paid', amount: 85 + tierOffset },
    { oid: 103, cid: 2, day: 2, status: 'refunded', amount: 140 + tierOffset },
    { oid: 104, cid: 2, day: 3, status: 'paid', amount: 95 + tierOffset },
    { oid: 105, cid: 3, day: 1, status: 'paid', amount: 210 + tierOffset },
    { oid: 106, cid: 3, day: 2, status: 'paid', amount: 65 + tierOffset },
    { oid: 107, cid: 3, day: 3, status: 'paid', amount: 110 + tierOffset },
    { oid: 108, cid: 4, day: 4, status: 'paid', amount: 55 + tierOffset },
    { oid: 109, cid: 5, day: 2, status: 'paid', amount: 175 + tierOffset },
    { oid: 110, cid: 5, day: 5, status: 'paid', amount: 130 + tierOffset },
  ];

  const schemaDdl = `CREATE TABLE Customers (
  customer_id INT PRIMARY KEY,
  name TEXT,
  tier TEXT,
  city TEXT
);
INSERT INTO Customers VALUES
${customers.map((c) => `  (${c.cid}, '${c.name}', '${c.tier}', '${c.city}')`).join(',\n')};
CREATE TABLE Orders (
  order_id INT PRIMARY KEY,
  customer_id INT,
  order_day INT,
  status TEXT,
  amount INT
);
INSERT INTO Orders VALUES
${orders.map((o) => `  (${o.oid}, ${o.cid}, ${o.day}, '${o.status}', ${o.amount})`).join(',\n')};`;

  const paidOrders = orders.filter((o) => o.status === 'paid');
  const custById = new Map(customers.map((c) => [c.cid, c]));

  let entry: SqlGeneratorEntry;

  if (variant === 0) {
    const rows = paidOrders
      .filter((o) => o.amount >= minAmount)
      .map((o) => ({ order_id: o.oid, name: custById.get(o.cid)!.name, amount: o.amount }))
      .sort((a, b) => a.order_id - b.order_id);
    entry = {
      id,
      title: `High-Value Paid Orders >= ${minAmount} (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'INNER JOIN + Predicate Filter',
      statement: `Return \`order_id\`, \`name\`, and \`amount\` for all **paid** orders whose amount is at least \`${minAmount}\`, ordered by \`order_id\` ascending.`,
      inputSummary: 'Customers (6 rows), Orders (10 rows)',
      outputSummary: `${rows.length} qualifying paid orders`,
      explanation: `Filter status = 'paid' and amount >= ${minAmount}, joining Customers on customer_id.`,
      schemaDdl,
      expectedQuery: `SELECT o.order_id, c.name, o.amount\nFROM Orders o\nJOIN Customers c ON o.customer_id = c.customer_id\nWHERE o.status = 'paid' AND o.amount >= ${minAmount}\nORDER BY o.order_id;`,
      expectedRows: rows,
    };
  } else if (variant === 1) {
    const totals = new Map<string, number>();
    for (const o of paidOrders) {
      const city = custById.get(o.cid)!.city;
      totals.set(city, (totals.get(city) || 0) + o.amount);
    }
    const rows = Array.from(totals.entries())
      .map(([city, total_revenue]) => ({ city, total_revenue }))
      .sort((a, b) => b.total_revenue - a.total_revenue || a.city.localeCompare(b.city));
    entry = {
      id,
      title: `Paid Revenue by Customer City (Variant ${Math.floor(seqIdx / 10) + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'JOIN + GROUP BY Aggregation',
      statement: `Compute total paid revenue (\`total_revenue\`) per \`city\`, ordered by \`total_revenue\` descending and \`city\` ascending.`,
      inputSummary: 'Customers (6 rows), Orders (10 rows)',
      outputSummary: `${rows.length} active cities ranked by spend`,
      explanation: `Join Orders with Customers, filter paid status, group by city, and sort.`,
      schemaDdl,
      expectedQuery: `SELECT c.city, SUM(o.amount) AS total_revenue\nFROM Orders o\nJOIN Customers c ON o.customer_id = c.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.city\nORDER BY total_revenue DESC, c.city ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 2) {
    const orderedIds = new Set(orders.map((o) => o.cid));
    const rows = customers
      .filter((c) => !orderedIds.has(c.cid))
      .map((c) => ({ customer_id: c.cid, name: c.name, tier: c.tier }))
      .sort((a, b) => a.customer_id - b.customer_id);
    entry = {
      id,
      title: `Dormant Registered Customers Audit (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'LEFT JOIN Anti-Join',
      statement: `Find all customers who have zero rows in \`Orders\`. Return \`customer_id\`, \`name\`, and \`tier\` ordered by \`customer_id\`.`,
      inputSummary: 'Customers (6 rows), Orders (10 rows)',
      outputSummary: rows.map((r) => r.name).join(', '),
      explanation: `LEFT JOIN Orders and keep rows where o.order_id IS NULL.`,
      schemaDdl,
      expectedQuery: `SELECT c.customer_id, c.name, c.tier\nFROM Customers c\nLEFT JOIN Orders o ON c.customer_id = o.customer_id\nWHERE o.order_id IS NULL\nORDER BY c.customer_id;`,
      expectedRows: rows,
    };
  } else if (variant === 3) {
    const byCust = new Map<number, number>();
    for (const o of paidOrders) byCust.set(o.cid, (byCust.get(o.cid) || 0) + o.amount);
    const ranked = customers
      .map((c) => ({ name: c.name, paid_spend: byCust.get(c.cid) || 0 }))
      .filter((r) => r.paid_spend > 0)
      .sort((a, b) => b.paid_spend - a.paid_spend || a.name.localeCompare(b.name))
      .slice(0, topK)
      .map((r, idx) => ({ name: r.name, paid_spend: r.paid_spend, spend_rank: idx + 1 }));
    entry = {
      id,
      title: `Top-${topK} Customer Lifetime Spend Leaderboard (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic,
      pattern: 'CTE + ROW_NUMBER Window Ranking',
      statement: `Aggregate total paid spend (\`paid_spend\`) per customer, assign \`spend_rank\` using \`ROW_NUMBER() OVER (ORDER BY paid_spend DESC, name ASC)\`, and return the top \`${topK}\` customers ordered by \`spend_rank\`.`,
      inputSummary: 'Customers (6 rows), Orders (10 rows)',
      outputSummary: `Top ${topK} customers by paid spend`,
      explanation: `CTE summarizes spend, outer SELECT assigns ROW_NUMBER and limits to ${topK}.`,
      schemaDdl,
      expectedQuery: `WITH Spend AS (\n  SELECT c.name, SUM(o.amount) AS paid_spend\n  FROM Customers c\n  JOIN Orders o ON c.customer_id = o.customer_id\n  WHERE o.status = 'paid'\n  GROUP BY c.customer_id, c.name\n)\nSELECT name, paid_spend, ROW_NUMBER() OVER (ORDER BY paid_spend DESC, name ASC) AS spend_rank\nFROM Spend\nORDER BY spend_rank\nLIMIT ${topK};`,
      expectedRows: ranked,
    };
  } else if (variant === 4) {
    const custOrders = orders.filter((o) => o.status === 'paid').sort((a, b) => a.cid - b.cid || a.day - b.day || a.oid - b.oid);
    const runningMap = new Map<number, number>();
    const rows = custOrders.map((o) => {
      const next = (runningMap.get(o.cid) || 0) + o.amount;
      runningMap.set(o.cid, next);
      return {
        customer_id: o.cid,
        order_id: o.oid,
        amount: o.amount,
        running_total: next,
      };
    });
    entry = {
      id,
      title: `Per-Customer Cumulative Paid Spend (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic,
      pattern: 'SUM() OVER (PARTITION BY ORDER BY)',
      statement: `For every **paid** order, compute each customer's cumulative paid spend \`running_total\` ordered by \`customer_id, order_day, order_id\`. Return \`customer_id, order_id, amount, running_total\`.`,
      inputSummary: 'Orders (10 rows)',
      outputSummary: `${rows.length} paid rows with cumulative window sum`,
      explanation: `Use SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_day, order_id).`,
      schemaDdl,
      expectedQuery: `SELECT customer_id, order_id, amount,\n  SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_day, order_id) AS running_total\nFROM Orders\nWHERE status = 'paid'\nORDER BY customer_id, order_day, order_id;`,
      expectedRows: rows,
    };
  } else if (variant === 5) {
    const byTier = new Map<string, { sum: number; count: number }>();
    for (const o of paidOrders) {
      const tier = custById.get(o.cid)!.tier;
      const cur = byTier.get(tier) || { sum: 0, count: 0 };
      cur.sum += o.amount;
      cur.count += 1;
      byTier.set(tier, cur);
    }
    const rows = Array.from(byTier.entries())
      .map(([tier, stat]) => ({ tier, avg_order: round2(stat.sum / stat.count), order_count: stat.count }))
      .sort((a, b) => a.tier.localeCompare(b.tier));
    entry = {
      id,
      title: `Tier-Level Paid Order Average & Volume (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'ROUND(AVG) + COUNT Aggregation',
      statement: `Compute the rounded average paid order amount (\`avg_order\` to 2 decimals) and \`order_count\` for each customer \`tier\`, sorted alphabetically by \`tier\`.`,
      inputSummary: 'Customers (6 rows), Orders (10 rows)',
      outputSummary: 'Bronze, Gold, Silver summary metrics',
      explanation: `GROUP BY c.tier over paid orders and calculate ROUND(AVG(o.amount), 2).`,
      schemaDdl,
      expectedQuery: `SELECT c.tier, ROUND(AVG(o.amount), 2) AS avg_order, COUNT(*) AS order_count\nFROM Orders o\nJOIN Customers c ON o.customer_id = c.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.tier\nORDER BY c.tier ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 6) {
    // Repeat vs single paid customer retention
    const daysByCust = new Map<number, Set<number>>();
    for (const o of paidOrders) {
      if (!daysByCust.has(o.cid)) daysByCust.set(o.cid, new Set());
      daysByCust.get(o.cid)!.add(o.day);
    }
    const rows = Array.from(daysByCust.entries())
      .filter(([, ds]) => ds.size >= 2)
      .map(([cid, ds]) => ({ customer_id: cid, name: custById.get(cid)!.name, active_days: ds.size }))
      .sort((a, b) => a.customer_id - b.customer_id);
    entry = {
      id,
      title: `Multi-Day Retained Buyers (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic,
      pattern: 'HAVING COUNT(DISTINCT day) >= 2',
      statement: `Identify customers who placed paid orders on at least 2 distinct \`order_day\` values. Return \`customer_id, name, active_days\` ordered by \`customer_id\`.`,
      inputSummary: 'Customers (6 rows), Orders (10 rows)',
      outputSummary: rows.map((r) => r.name).join(', '),
      explanation: `Group paid orders by customer and keep HAVING COUNT(DISTINCT order_day) >= 2.`,
      schemaDdl,
      expectedQuery: `SELECT c.customer_id, c.name, COUNT(DISTINCT o.order_day) AS active_days\nFROM Customers c\nJOIN Orders o ON c.customer_id = o.customer_id\nWHERE o.status = 'paid'\nGROUP BY c.customer_id, c.name\nHAVING COUNT(DISTINCT o.order_day) >= 2\nORDER BY c.customer_id;`,
      expectedRows: rows,
    };
  } else if (variant === 7) {
    // Longest active day streak / consecutive days per customer
    const cust3Orders = paidOrders.filter((o) => o.cid === 3).sort((a, b) => a.day - b.day);
    const allDays = cust3Orders.map((o) => o.day);
    const rows = allDays.map((d, i) => ({
      order_day: d,
      prev_day: i > 0 ? allDays[i - 1] : null,
    }));
    entry = {
      id,
      title: `Previous Paid Order Day via LAG (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic,
      pattern: 'LAG() Gap Detection',
      statement: `For \`customer_id = 3\`, list each paid \`order_day\` alongside their immediately preceding paid \`prev_day\` (\`NULL\` for the first order), ordered by \`order_day\`.`,
      inputSummary: 'Orders (10 rows)',
      outputSummary: `${rows.length} timeline steps for customer 3`,
      explanation: `Use LAG(order_day) OVER (ORDER BY order_day) scoped to customer_id = 3.`,
      schemaDdl,
      expectedQuery: `SELECT order_day, LAG(order_day) OVER (ORDER BY order_day) AS prev_day\nFROM Orders\nWHERE customer_id = 3 AND status = 'paid'\nORDER BY order_day;`,
      expectedRows: rows,
    };
  } else if (variant === 8) {
    // Above overall average paid orders
    const avgVal = paidOrders.reduce((s, o) => s + o.amount, 0) / paidOrders.length;
    const rows = paidOrders
      .filter((o) => o.amount > avgVal)
      .map((o) => ({ order_id: o.oid, customer_id: o.cid, amount: o.amount }))
      .sort((a, b) => b.amount - a.amount || a.order_id - b.order_id);
    entry = {
      id,
      title: `Paid Orders Exceeding Global Mean (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic,
      pattern: 'Scalar Subquery Comparison',
      statement: `Find all **paid** orders whose \`amount\` exceeds the average amount of all paid orders. Return \`order_id, customer_id, amount\` ordered by \`amount DESC, order_id ASC\`.`,
      inputSummary: 'Orders (10 rows)',
      outputSummary: `${rows.length} above-average orders`,
      explanation: `Compare against a scalar subquery (SELECT AVG(amount) FROM Orders WHERE status = 'paid').`,
      schemaDdl,
      expectedQuery: `SELECT order_id, customer_id, amount\nFROM Orders\nWHERE status = 'paid'\n  AND amount > (SELECT AVG(amount) FROM Orders WHERE status = 'paid')\nORDER BY amount DESC, order_id ASC;`,
      expectedRows: rows,
    };
  } else {
    // Island grouping on consecutive active days across paid orders
    const distinctDays = Array.from(new Set(paidOrders.map((o) => o.day))).sort((a, b) => a - b);
    const islands: Array<{ start_day: number; end_day: number; streak_days: number }> = [];
    for (const d of distinctDays) {
      if (islands.length === 0 || d !== islands[islands.length - 1].end_day + 1) {
        islands.push({ start_day: d, end_day: d, streak_days: 1 });
      } else {
        islands[islands.length - 1].end_day = d;
        islands[islands.length - 1].streak_days += 1;
      }
    }
    entry = {
      id,
      title: `Consecutive Paid Activity Day Islands (#${seqIdx + 1})`,
      difficulty: 'Hard',
      topic: 'Gaps and Islands',
      pattern: 'ROW_NUMBER Gap-and-Island Trick',
      statement: `Group distinct days with at least one **paid** order into contiguous sequences of consecutive days. Return \`start_day, end_day, streak_days\` ordered by \`start_day\`.`,
      inputSummary: 'Orders (10 rows)',
      outputSummary: `${islands.length} contiguous active day islands`,
      explanation: `Subtract ROW_NUMBER() OVER (ORDER BY order_day) from distinct paid order_day values to form island group keys.`,
      schemaDdl,
      expectedQuery: `WITH Days AS (\n  SELECT DISTINCT order_day FROM Orders WHERE status = 'paid'\n),\nGrouped AS (\n  SELECT order_day, order_day - ROW_NUMBER() OVER (ORDER BY order_day) AS grp FROM Days\n)\nSELECT MIN(order_day) AS start_day, MAX(order_day) AS end_day, COUNT(*) AS streak_days\nFROM Grouped\nGROUP BY grp\nORDER BY start_day;`,
      expectedRows: islands,
    };
  }

  return makeSqlProblem(entry);
}

function buildWorkforceProblem(seqIdx: number, id: number): SqlProblemDefinition {
  const variant = seqIdx % 10;
  const bonusShift = (seqIdx % 6) * 500;
  const salaryFloor = 65000 + (seqIdx % 5) * 4000;
  const topic = TOPICS[(seqIdx + 1) % TOPICS.length];

  const depts = [
    { did: 10, dname: 'Platform' },
    { did: 20, dname: 'Security' },
    { did: 30, dname: 'Data' },
    { did: 40, dname: 'Research' },
  ];
  const staff = [
    { eid: 1, name: 'Ananya', did: 10, role: 'L5', salary: 92000 + bonusShift, mgr: null as number | null },
    { eid: 2, name: 'Vikram', did: 10, role: 'L4', salary: 78000 + bonusShift, mgr: 1 },
    { eid: 3, name: 'Neha', did: 10, role: 'L4', salary: 78000 + bonusShift, mgr: 1 },
    { eid: 4, name: 'Siddharth', did: 20, role: 'L5', salary: 88000 + bonusShift, mgr: null },
    { eid: 5, name: 'Pooja', did: 20, role: 'L3', salary: 64000 + bonusShift, mgr: 4 },
    { eid: 6, name: 'Arjun', did: 30, role: 'L5', salary: 95000 + bonusShift, mgr: null },
    { eid: 7, name: 'Kiran', did: 30, role: 'L4', salary: 71000 + bonusShift, mgr: 6 },
    { eid: 8, name: 'Isha', did: 30, role: 'L3', salary: 61000 + bonusShift, mgr: 7 },
  ];
  const deptName = new Map(depts.map((d) => [d.did, d.dname]));

  const schemaDdl = `CREATE TABLE Departments (
  dept_id INT PRIMARY KEY,
  dept_name TEXT
);
INSERT INTO Departments VALUES
${depts.map((d) => `  (${d.did}, '${d.dname}')`).join(',\n')};
CREATE TABLE Staff (
  emp_id INT PRIMARY KEY,
  emp_name TEXT,
  dept_id INT,
  level_code TEXT,
  salary INT,
  manager_id INT
);
INSERT INTO Staff VALUES
${staff.map((s) => `  (${s.eid}, '${s.name}', ${s.did}, '${s.role}', ${s.salary}, ${s.mgr === null ? 'NULL' : s.mgr})`).join(',\n')};`;

  let entry: SqlGeneratorEntry;

  if (variant === 0) {
    const byDept = new Map<number, number[]>();
    for (const s of staff) {
      if (!byDept.has(s.did)) byDept.set(s.did, []);
      byDept.get(s.did)!.push(s.salary);
    }
    const rows = depts
      .map((d) => {
        const arr = byDept.get(d.did) || [];
        return {
          dept_name: d.dname,
          headcount: arr.length,
          max_salary: arr.length ? Math.max(...arr) : 0,
        };
      })
      .sort((a, b) => a.dept_name.localeCompare(b.dept_name));
    entry = {
      id,
      title: `Department Headcount & Peak Compensation (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'LEFT JOIN + COALESCE Aggregation',
      statement: `For every department (including departments with zero assigned engineers), output \`dept_name, headcount, max_salary\` (\`0\` if empty), ordered alphabetically by \`dept_name\`.`,
      inputSummary: 'Departments (4 rows), Staff (8 rows)',
      outputSummary: '4 department payroll rows',
      explanation: `LEFT JOIN Staff on dept_id and wrap MAX(salary) in COALESCE(..., 0).`,
      schemaDdl,
      expectedQuery: `SELECT d.dept_name, COUNT(s.emp_id) AS headcount, COALESCE(MAX(s.salary), 0) AS max_salary\nFROM Departments d\nLEFT JOIN Staff s ON d.dept_id = s.dept_id\nGROUP BY d.dept_id, d.dept_name\nORDER BY d.dept_name ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 1) {
    const ranked = [...staff]
      .sort((a, b) => a.did - b.did || b.salary - a.salary || a.name.localeCompare(b.name));
    const rows: Array<{ dept_name: string; emp_name: string; salary: number; dept_rank: number }> = [];
    for (const d of depts) {
      const inD = ranked.filter((s) => s.did === d.did);
      let denseRank = 0;
      let prevSal: number | null = null;
      for (const s of inD) {
        if (s.salary !== prevSal) {
          denseRank++;
          prevSal = s.salary;
        }
        rows.push({ dept_name: d.dname, emp_name: s.name, salary: s.salary, dept_rank: denseRank });
      }
    }
    rows.sort((a, b) => a.dept_name.localeCompare(b.dept_name) || a.dept_rank - b.dept_rank || a.emp_name.localeCompare(b.emp_name));
    entry = {
      id,
      title: `Dense Compensation Rank Per Department (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic: 'Window Functions',
      pattern: 'DENSE_RANK() PARTITION BY dept_id',
      statement: `Assign a dense salary rank \`dept_rank\` within each department ordered from highest to lowest \`salary\`. Return \`dept_name, emp_name, salary, dept_rank\` ordered by \`dept_name ASC, dept_rank ASC, emp_name ASC\`.`,
      inputSummary: 'Departments (4 rows), Staff (8 rows)',
      outputSummary: `${rows.length} ranked staff records`,
      explanation: `Join Staff with Departments and apply DENSE_RANK() OVER (PARTITION BY s.dept_id ORDER BY s.salary DESC).`,
      schemaDdl,
      expectedQuery: `SELECT d.dept_name, s.emp_name, s.salary,\n  DENSE_RANK() OVER (PARTITION BY s.dept_id ORDER BY s.salary DESC) AS dept_rank\nFROM Staff s\nJOIN Departments d ON s.dept_id = d.dept_id\nORDER BY d.dept_name ASC, dept_rank ASC, s.emp_name ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 2) {
    const byDeptAvg = new Map<number, number>();
    for (const d of depts) {
      const ds = staff.filter((s) => s.did === d.did);
      if (ds.length > 0) byDeptAvg.set(d.did, ds.reduce((acc, s) => acc + s.salary, 0) / ds.length);
    }
    const rows = staff
      .filter((s) => s.salary > (byDeptAvg.get(s.did) || 0))
      .map((s) => ({ emp_name: s.name, dept_name: deptName.get(s.did)!, salary: s.salary }))
      .sort((a, b) => a.emp_name.localeCompare(b.emp_name));
    entry = {
      id,
      title: `Engineers Paid Above Department Mean (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic: 'Common Table Expressions',
      pattern: 'CTE Departmental Average Join',
      statement: `Find employees whose \`salary\` is strictly greater than their own department's average salary. Return \`emp_name, dept_name, salary\` sorted by \`emp_name\`.`,
      inputSummary: 'Departments (4 rows), Staff (8 rows)',
      outputSummary: `${rows.length} above-dept-mean engineers`,
      explanation: `Compute per-department average inside a CTE and join against Staff.`,
      schemaDdl,
      expectedQuery: `WITH DeptAvg AS (\n  SELECT dept_id, AVG(salary) AS avg_sal FROM Staff GROUP BY dept_id\n)\nSELECT s.emp_name, d.dept_name, s.salary\nFROM Staff s\nJOIN DeptAvg a ON s.dept_id = a.dept_id\nJOIN Departments d ON s.dept_id = d.dept_id\nWHERE s.salary > a.avg_sal\nORDER BY s.emp_name;`,
      expectedRows: rows,
    };
  } else if (variant === 3) {
    const staffById = new Map(staff.map((s) => [s.eid, s]));
    const rows = staff
      .filter((s) => s.mgr !== null)
      .map((s) => ({ employee: s.name, manager: staffById.get(s.mgr!)!.name, diff_to_mgr: staffById.get(s.mgr!)!.salary - s.salary }))
      .sort((a, b) => a.employee.localeCompare(b.employee));
    entry = {
      id,
      title: `Manager Compensation Gap Self-Join (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic,
      pattern: 'Self Join Hierarchy Diff',
      statement: `For every employee with a non-null \`manager_id\`, report \`employee, manager, diff_to_mgr\` where \`diff_to_mgr = manager.salary - employee.salary\`, sorted by \`employee\`.`,
      inputSummary: 'Staff (8 rows)',
      outputSummary: `${rows.length} direct-report pairs`,
      explanation: `Self-join Staff e with Staff m ON e.manager_id = m.emp_id.`,
      schemaDdl,
      expectedQuery: `SELECT e.emp_name AS employee, m.emp_name AS manager, (m.salary - e.salary) AS diff_to_mgr\nFROM Staff e\nJOIN Staff m ON e.manager_id = m.emp_id\nORDER BY e.emp_name;`,
      expectedRows: rows,
    };
  } else if (variant === 4) {
    const rows = staff
      .filter((s) => s.salary >= salaryFloor)
      .map((s) => ({ emp_id: s.eid, emp_name: s.name, salary: s.salary }))
      .sort((a, b) => b.salary - a.salary || a.emp_id - b.emp_id);
    entry = {
      id,
      title: `Staff Above Compensation Band ${salaryFloor} (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'Threshold Filter + Multi-Key Sort',
      statement: `List \`emp_id, emp_name, salary\` for staff earning at least \`${salaryFloor}\`, ordered by \`salary DESC, emp_id ASC\`.`,
      inputSummary: 'Staff (8 rows)',
      outputSummary: `${rows.length} qualifying staff members`,
      explanation: `Simple WHERE salary >= ${salaryFloor} with multi-column sort.`,
      schemaDdl,
      expectedQuery: `SELECT emp_id, emp_name, salary\nFROM Staff\nWHERE salary >= ${salaryFloor}\nORDER BY salary DESC, emp_id ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 5) {
    // Recursive CTE org chart depth
    const depthOf = (eid: number): number => {
      const emp = staff.find((s) => s.eid === eid)!;
      return emp.mgr === null ? 0 : 1 + depthOf(emp.mgr);
    };
    const rows = staff
      .map((s) => ({ emp_name: s.name, org_depth: depthOf(s.eid) }))
      .sort((a, b) => a.org_depth - b.org_depth || a.emp_name.localeCompare(b.emp_name));
    entry = {
      id,
      title: `Recursive Management Hierarchy Depth (#${seqIdx + 1})`,
      difficulty: 'Hard',
      topic: 'Common Table Expressions',
      pattern: 'WITH RECURSIVE Tree Traversal',
      statement: `Using a recursive CTE starting from roots (\`manager_id IS NULL\` at depth 0), compute each employee's \`emp_name\` and \`org_depth\`. Sort by \`org_depth ASC, emp_name ASC\`.`,
      inputSummary: 'Staff (8 rows hierarchical)',
      outputSummary: 'Org depth levels 0, 1, 2 across 8 staff',
      explanation: `Seed WITH RECURSIVE Org AS (SELECT ... 0 AS org_depth WHERE manager_id IS NULL UNION ALL ... org_depth + 1).`,
      schemaDdl,
      expectedQuery: `WITH RECURSIVE Org AS (\n  SELECT emp_id, emp_name, 0 AS org_depth FROM Staff WHERE manager_id IS NULL\n  UNION ALL\n  SELECT s.emp_id, s.emp_name, o.org_depth + 1 FROM Staff s JOIN Org o ON s.manager_id = o.emp_id\n)\nSELECT emp_name, org_depth\nFROM Org\nORDER BY org_depth ASC, emp_name ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 6) {
    const distinctSalaries = Array.from(new Set(staff.map((s) => s.salary))).sort((a, b) => b - a);
    const secondHighest = distinctSalaries[1] ?? null;
    entry = {
      id,
      title: `Second Highest Distinct Engineering Salary (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic: 'Window Functions',
      pattern: 'DISTINCT + ORDER BY + LIMIT OFFSET',
      statement: `Return the **second highest distinct** salary across \`Staff\` under column \`second_highest_salary\`.`,
      inputSummary: 'Staff (8 rows)',
      outputSummary: `Salary = ${secondHighest}`,
      explanation: `Deduplicate salaries with DISTINCT, sort DESC, skip 1 via OFFSET 1.`,
      schemaDdl,
      expectedQuery: `SELECT (\n  SELECT DISTINCT salary FROM Staff ORDER BY salary DESC LIMIT 1 OFFSET 1\n) AS second_highest_salary;`,
      expectedRows: [{ second_highest_salary: secondHighest }],
    };
  } else if (variant === 7) {
    const totalPayroll = staff.reduce((sum, s) => sum + s.salary, 0);
    const byRole = new Map<string, number>();
    for (const s of staff) byRole.set(s.role, (byRole.get(s.role) || 0) + s.salary);
    const rows = Array.from(byRole.entries())
      .map(([level_code, share_pct]) => ({
        level_code,
        payroll_pct: round2((share_pct * 100) / totalPayroll),
      }))
      .sort((a, b) => a.level_code.localeCompare(b.level_code));
    entry = {
      id,
      title: `Payroll Share Percentage by Level (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic: 'Advanced Analytics & Retention',
      pattern: 'Ratio-to-Report Calculation',
      statement: `Calculate each \`level_code\`'s share of total company payroll as \`payroll_pct\` rounded to 2 decimal places, ordered by \`level_code ASC\`.`,
      inputSummary: 'Staff (8 rows)',
      outputSummary: 'Payroll breakdown for L3, L4, L5',
      explanation: `Multiply SUM(salary) by 100.0 and divide by total staff salary.`,
      schemaDdl,
      expectedQuery: `SELECT level_code,\n  ROUND(SUM(salary) * 100.0 / (SELECT SUM(salary) FROM Staff), 2) AS payroll_pct\nFROM Staff\nGROUP BY level_code\nORDER BY level_code ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 8) {
    const empIds = [...staff.map((s) => s.eid)].sort((a, b) => a - b);
    const rows = empIds.map((eid) => {
      const s = staff.find((x) => x.eid === eid)!;
      const mgr = staff.find((x) => x.mgr === eid);
      return {
        emp_name: s.name,
        has_reports: mgr ? 'Manager' : 'IC',
      };
    });
    rows.sort((a, b) => a.emp_name.localeCompare(b.emp_name));
    entry = {
      id,
      title: `Classify Managers vs Individual Contributors (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'CASE + EXISTS Subquery',
      statement: `Classify each employee as \`'Manager'\` if at least one row in \`Staff\` references them as \`manager_id\`, otherwise \`'IC'\`. Output \`emp_name, has_reports\` sorted by \`emp_name\`.`,
      inputSummary: 'Staff (8 rows)',
      outputSummary: `${rows.length} classified engineers`,
      explanation: `Use CASE WHEN EXISTS (SELECT 1 FROM Staff r WHERE r.manager_id = s.emp_id) THEN 'Manager' ELSE 'IC' END.`,
      schemaDdl,
      expectedQuery: `SELECT s.emp_name,\n  CASE WHEN EXISTS (SELECT 1 FROM Staff r WHERE r.manager_id = s.emp_id) THEN 'Manager' ELSE 'IC' END AS has_reports\nFROM Staff s\nORDER BY s.emp_name ASC;`,
      expectedRows: rows,
    };
  } else {
    const sorted = [...staff].sort((a, b) => a.salary - b.salary);
    const rows = sorted.map((s, idx) => ({
      emp_name: s.name,
      salary: s.salary,
      next_higher_salary: idx + 1 < sorted.length ? sorted[idx + 1].salary : null,
    }));
    entry = {
      id,
      title: `Next Compensation Step via LEAD (#${seqIdx + 1})`,
      difficulty: 'Hard',
      topic: 'Window Functions',
      pattern: 'LEAD() Salary Step Ladder',
      statement: `Sort employees by \`salary ASC, emp_id ASC\` and pair each employee with \`next_higher_salary\` using \`LEAD(salary)\` (\`NULL\` for highest earner). Return \`emp_name, salary, next_higher_salary\`.`,
      inputSummary: 'Staff (8 rows)',
      outputSummary: `${rows.length} ladder entries`,
      explanation: `Use LEAD(salary) OVER (ORDER BY salary ASC, emp_id ASC).`,
      schemaDdl,
      expectedQuery: `SELECT emp_name, salary,\n  LEAD(salary) OVER (ORDER BY salary ASC, emp_id ASC) AS next_higher_salary\nFROM Staff\nORDER BY salary ASC, emp_id ASC;`,
      expectedRows: rows,
    };
  }

  return makeSqlProblem(entry);
}

function buildTelemetryProblem(seqIdx: number, id: number): SqlProblemDefinition {
  const variant = seqIdx % 10;
  const weight = (seqIdx % 5) + 1;
  const topic = TOPICS[(seqIdx + 2) % TOPICS.length];

  const users = [
    { uid: 1, handle: 'alpha', plan: 'Pro', country: 'IN' },
    { uid: 2, handle: 'beta', plan: 'Free', country: 'US' },
    { uid: 3, handle: 'gamma', plan: 'Pro', country: 'IN' },
    { uid: 4, handle: 'delta', plan: 'Enterprise', country: 'DE' },
    { uid: 5, handle: 'epsilon', plan: 'Free', country: 'US' },
  ];
  const events = [
    { eid: 1, uid: 1, day: 1, ev: 'login', latency: 40 + weight * 3 },
    { eid: 2, uid: 1, day: 2, ev: 'compile', latency: 120 + weight * 4 },
    { eid: 3, uid: 1, day: 3, ev: 'submit', latency: 90 + weight * 2 },
    { eid: 4, uid: 2, day: 1, ev: 'login', latency: 55 + weight * 3 },
    { eid: 5, uid: 2, day: 4, ev: 'compile', latency: 200 + weight * 5 },
    { eid: 6, uid: 3, day: 2, ev: 'login', latency: 35 + weight * 2 },
    { eid: 7, uid: 3, day: 3, ev: 'compile', latency: 150 + weight * 3 },
    { eid: 8, uid: 3, day: 5, ev: 'submit', latency: 110 + weight * 4 },
    { eid: 9, uid: 4, day: 1, ev: 'login', latency: 25 + weight },
    { eid: 10, uid: 4, day: 2, ev: 'submit', latency: 75 + weight * 2 },
  ];

  const schemaDdl = `CREATE TABLE Accounts (
  user_id INT PRIMARY KEY,
  handle TEXT,
  plan TEXT,
  country TEXT
);
INSERT INTO Accounts VALUES
${users.map((u) => `  (${u.uid}, '${u.handle}', '${u.plan}', '${u.country}')`).join(',\n')};
CREATE TABLE Events (
  event_id INT PRIMARY KEY,
  user_id INT,
  day_num INT,
  event_type TEXT,
  latency_ms INT
);
INSERT INTO Events VALUES
${events.map((e) => `  (${e.eid}, ${e.uid}, ${e.day}, '${e.ev}', ${e.latency})`).join(',\n')};`;

  const userMap = new Map(users.map((u) => [u.uid, u]));
  let entry: SqlGeneratorEntry;

  if (variant === 0) {
    const rows = users.map((u) => {
      const cnt = events.filter((e) => e.uid === u.uid).length;
      return { handle: u.handle, event_count: cnt };
    }).sort((a, b) => b.event_count - a.event_count || a.handle.localeCompare(b.handle));
    entry = {
      id,
      title: `Total Telemetry Events Per Account (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'LEFT JOIN + COUNT(event_id)',
      statement: `Count total logged events (\`event_count\`, 0 if none) for every account. Output \`handle, event_count\` ordered by \`event_count DESC, handle ASC\`.`,
      inputSummary: 'Accounts (5 rows), Events (10 rows)',
      outputSummary: '5 account activity counts',
      explanation: `LEFT JOIN Events so inactive users retain 0 count.`,
      schemaDdl,
      expectedQuery: `SELECT a.handle, COUNT(e.event_id) AS event_count\nFROM Accounts a\nLEFT JOIN Events e ON a.user_id = e.user_id\nGROUP BY a.user_id, a.handle\nORDER BY event_count DESC, a.handle ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 1) {
    const byType = new Map<string, { sum: number; cnt: number }>();
    for (const e of events) {
      const cur = byType.get(e.ev) || { sum: 0, cnt: 0 };
      cur.sum += e.latency;
      cur.cnt += 1;
      byType.set(e.ev, cur);
    }
    const rows = Array.from(byType.entries())
      .map(([event_type, v]) => ({ event_type, avg_latency: round2(v.sum / v.cnt) }))
      .sort((a, b) => b.avg_latency - a.avg_latency || a.event_type.localeCompare(b.event_type));
    entry = {
      id,
      title: `Average Endpoint Latency by Event Type (#${seqIdx + 1})`,
      difficulty: 'Easy',
      topic,
      pattern: 'GROUP BY + ROUND(AVG)',
      statement: `Compute rounded average \`latency_ms\` (\`avg_latency\`, 2 decimals) for each \`event_type\`, sorted by \`avg_latency DESC, event_type ASC\`.`,
      inputSummary: 'Events (10 rows)',
      outputSummary: '3 event types ranked by average latency',
      explanation: `Group Events by event_type and compute ROUND(AVG(latency_ms), 2).`,
      schemaDdl,
      expectedQuery: `SELECT event_type, ROUND(AVG(latency_ms), 2) AS avg_latency\nFROM Events\nGROUP BY event_type\nORDER BY avg_latency DESC, event_type ASC;`,
      expectedRows: rows,
    };
  } else if (variant === 2) {
    const firstDay = new Map<number, number>();
    for (const e of events) {
      if (!firstDay.has(e.uid) || e.day < firstDay.get(e.uid)!) firstDay.set(e.uid, e.day);
    }
    const day2Retained = Array.from(firstDay.entries()).filter(([uid, fd]) =>
      events.some((e) => e.uid === uid && e.day === fd + 1)
    ).length;
    const activeUsers = firstDay.size;
    const rate = round2((day2Retained * 100) / activeUsers);
    entry = {
      id,
      title: `Day+1 Cohort User Retention Rate (#${seqIdx + 1})`,
      difficulty: 'Hard',
      topic: 'Advanced Analytics & Retention',
      pattern: 'First-Seen Cohort Retention',
      statement: `Find the percentage (\`d1_retention_pct\`, rounded to 2 decimals) of active users who logged any event on the exact day immediately following their first ever \`day_num\`.`,
      inputSummary: 'Events (10 rows)',
      outputSummary: `Retention = ${rate}%`,
      explanation: `Compute MIN(day_num) per user in a CTE, then check how many also have day_num = first_day + 1.`,
      schemaDdl,
      expectedQuery: `WITH FirstSeen AS (\n  SELECT user_id, MIN(day_num) AS first_day FROM Events GROUP BY user_id\n)\nSELECT ROUND(\n  COUNT(DISTINCT CASE WHEN e.day_num = f.first_day + 1 THEN f.user_id END) * 100.0 / COUNT(DISTINCT f.user_id),\n  2\n) AS d1_retention_pct\nFROM FirstSeen f\nJOIN Events e ON f.user_id = e.user_id;`,
      expectedRows: [{ d1_retention_pct: rate }],
    };
  } else if (variant === 3) {
    // Slowest event per user
    const best = new Map<number, typeof events[number]>();
    for (const e of events) {
      const cur = best.get(e.uid);
      if (!cur || e.latency > cur.latency || (e.latency === cur.latency && e.eid < cur.eid)) {
        best.set(e.uid, e);
      }
    }
    const rows = Array.from(best.values())
      .map((e) => ({ handle: userMap.get(e.uid)!.handle, event_id: e.eid, latency_ms: e.latency }))
      .sort((a, b) => b.latency_ms - a.latency_ms || a.event_id - b.event_id);
    entry = {
      id,
      title: `Peak Latency Event Per User (#${seqIdx + 1})`,
      difficulty: 'Medium',
      topic: 'Window Functions',
      pattern: 'Top-1 Per Group ROW_NUMBER',
      statement: `Find each active user's slowest recorded event (tie-break by smaller \`event_id\`). Output \`handle, event_id, latency_ms\` sorted by \`latency_ms DESC, event_id ASC\`.`,
      inputSummary: 'Accounts (5 rows), Events (10 rows)',
      outputSummary: `${rows.length} slowest events per user`,
      explanation: `Partition ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY latency_ms DESC, event_id ASC) and pick rn = 1.`,
      schemaDdl,
      expectedQuery: `WITH Ranked AS (\n  SELECT a.handle, e.event_id, e.latency_ms,\n    ROW_NUMBER() OVER (PARTITION BY e.user_id ORDER BY e.latency_ms DESC, e.event_id ASC) AS rn\n  FROM Events e\n  JOIN Accounts a ON e.user_id = a.user_id\n)\nSELECT handle, event_id, latency_ms\nFROM Ranked\nWHERE rn = 1\nORDER BY latency_ms DESC, event_id ASC;`,
      expectedRows: rows,
    };
  } else {
    // Gaps and streak per country or day gaps across events
    const days = Array.from(new Set(events.map((e) => e.day))).sort((a, b) => a - b);
    const minDay = days[0];
    const maxDay = days[days.length - 1];
    const present = new Set(days);
    const missing: Array<{ missing_day: number }> = [];
    for (let d = minDay; d <= maxDay; d++) {
      if (!present.has(d)) missing.push({ missing_day: d });
    }
    // Wait: events cover days 1,2,3,4,5 so use recursive sequence over user 2 (days 1,4 -> missing 2,3)!
    const u2Days = Array.from(new Set(events.filter((e) => e.uid === 2).map((e) => e.day))).sort((a, b) => a - b);
    const u2Missing: Array<{ missing_day: number }> = [];
    const u2Set = new Set(u2Days);
    for (let d = u2Days[0]; d <= u2Days[u2Days.length - 1]; d++) {
      if (!u2Set.has(d)) u2Missing.push({ missing_day: d });
    }
    if (variant % 2 === 0) {
      entry = {
        id,
        title: `Missing Telemetry Days Gap Finder (#${seqIdx + 1})`,
        difficulty: 'Hard',
        topic: 'Gaps and Islands',
        pattern: 'WITH RECURSIVE Missing Series',
        statement: `For \`user_id = 2\`, find all integer \`day_num\` values strictly between their first and last active day on which they had **no** events. Return \`missing_day\` sorted ascending.`,
        inputSummary: 'Events (10 rows)',
        outputSummary: `Missing days: ${u2Missing.map((x) => x.missing_day).join(', ')}`,
        explanation: `Generate continuous integer days using WITH RECURSIVE from MIN(day_num) to MAX(day_num) and LEFT JOIN Events.`,
        schemaDdl,
        expectedQuery: `WITH RECURSIVE Bounds AS (\n  SELECT MIN(day_num) AS lo, MAX(day_num) AS hi FROM Events WHERE user_id = 2\n),\nSeq(d) AS (\n  SELECT lo FROM Bounds\n  UNION ALL\n  SELECT d + 1 FROM Seq, Bounds WHERE d < Bounds.hi\n)\nSELECT s.d AS missing_day\nFROM Seq s\nLEFT JOIN Events e ON e.user_id = 2 AND e.day_num = s.d\nWHERE e.event_id IS NULL\nORDER BY s.d ASC;`,
        expectedRows: u2Missing.length ? u2Missing : missing,
      };
    } else {
      // Country summary with pivot-style CASE sums
      const byCountry = new Map<string, { login_cnt: number; submit_cnt: number }>();
      for (const e of events) {
        const ctry = userMap.get(e.uid)!.country;
        const cur = byCountry.get(ctry) || { login_cnt: 0, submit_cnt: 0 };
        if (e.ev === 'login') cur.login_cnt++;
        if (e.ev === 'submit') cur.submit_cnt++;
        byCountry.set(ctry, cur);
      }
      const rows = Array.from(byCountry.entries())
        .map(([country, v]) => ({ country, login_cnt: v.login_cnt, submit_cnt: v.submit_cnt }))
        .sort((a, b) => a.country.localeCompare(b.country));
      entry = {
        id,
        title: `Conditional Event Pivot by Country (#${seqIdx + 1})`,
        difficulty: 'Medium',
        topic: 'Aggregations & Joins',
        pattern: 'Conditional SUM(CASE WHEN)',
        statement: `Pivot telemetry counts per \`country\` into columns \`login_cnt\` and \`submit_cnt\`, sorted alphabetically by \`country\`.`,
        inputSummary: 'Accounts (5 rows), Events (10 rows)',
        outputSummary: `${rows.length} country pivot rows`,
        explanation: `Join Events and Accounts, group by country, and apply SUM(CASE WHEN event_type = '...' THEN 1 ELSE 0 END).`,
        schemaDdl,
        expectedQuery: `SELECT a.country,\n  SUM(CASE WHEN e.event_type = 'login' THEN 1 ELSE 0 END) AS login_cnt,\n  SUM(CASE WHEN e.event_type = 'submit' THEN 1 ELSE 0 END) AS submit_cnt\nFROM Events e\nJOIN Accounts a ON e.user_id = a.user_id\nGROUP BY a.country\nORDER BY a.country ASC;`,
        expectedRows: rows,
      };
    }
  }

  return makeSqlProblem(entry);
}

// Generate 300 Extended SQL Problems (#731 - #1030): 100 E-Commerce, 100 Workforce, 100 SaaS Telemetry
const extendedList: SqlProblemDefinition[] = [];
for (let i = 0; i < 100; i++) {
  extendedList.push(buildEcommerceProblem(i, 731 + i));
}
for (let i = 0; i < 100; i++) {
  extendedList.push(buildWorkforceProblem(i, 831 + i));
}
for (let i = 0; i < 100; i++) {
  extendedList.push(buildTelemetryProblem(i, 931 + i));
}

export const SQL_EXTENDED_300: SqlProblemDefinition[] = extendedList;
