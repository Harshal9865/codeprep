import { makeSqlProblem, SqlProblemDefinition } from './sqlHelper';

export const SQL_BATCH_3: SqlProblemDefinition[] = [
  makeSqlProblem({
    id: 576,
    title: 'Primary Department for Each Employee',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'COUNT() OVER Partition Fallback',
    statement:
      'Report each employee_id and their primary department_id. Employees belonging to only one department use that department even if primary_flag = "N".',
    inputSummary: 'Employee (7 affiliations across 4 employees)',
    outputSummary: '1->1, 2->1, 3->3, 4->3',
    explanation: 'Keep rows where primary_flag = "Y" OR COUNT(*) OVER (PARTITION BY employee_id) = 1.',
    schemaDdl: `CREATE TABLE Employee (
  employee_id INT,
  department_id INT,
  primary_flag VARCHAR(2)
);
INSERT INTO Employee VALUES
  (1, 1, 'N'), (2, 1, 'Y'), (2, 2, 'N'), (3, 3, 'N'),
  (4, 2, 'N'), (4, 3, 'Y'), (4, 4, 'N');`,
    expectedQuery: `WITH Counts AS (
  SELECT employee_id, department_id, primary_flag,
    COUNT(*) OVER (PARTITION BY employee_id) AS dept_cnt
  FROM Employee
)
SELECT employee_id, department_id
FROM Counts
WHERE primary_flag = 'Y' OR dept_cnt = 1
ORDER BY employee_id;`,
    expectedRows: [
      { employee_id: 1, department_id: 1 },
      { employee_id: 2, department_id: 1 },
      { employee_id: 3, department_id: 3 },
      { employee_id: 4, department_id: 3 },
    ],
  }),

  makeSqlProblem({
    id: 577,
    title: 'Product Sales Analysis IV',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'JOIN + SUM Spend + RANK()',
    statement: 'For each user report product_id(s) on which they spent the largest total dollar amount. Order by user_id, product_id.',
    inputSummary: 'Sales (6 rows), Product (3 priced items)',
    outputSummary: 'User 101->product 3, User 102->products 1,2,3',
    explanation: 'Sum quantity * price per (user_id, product_id) then keep RANK() = 1 per user.',
    schemaDdl: `CREATE TABLE Product (
  product_id INT PRIMARY KEY,
  price INT
);
INSERT INTO Product VALUES (1, 10), (2, 25), (3, 15);
CREATE TABLE Sales (
  sale_id INT PRIMARY KEY,
  product_id INT,
  user_id INT,
  quantity INT
);
INSERT INTO Sales VALUES
  (1, 1, 101, 10), (2, 3, 101, 7), (3, 1, 102, 9),
  (4, 2, 102, 6), (5, 3, 102, 10), (6, 1, 102, 6);`,
    expectedQuery: `WITH Spend AS (
  SELECT s.user_id, s.product_id, SUM(s.quantity * p.price) AS total_spent
  FROM Sales s
  JOIN Product p ON s.product_id = p.product_id
  GROUP BY s.user_id, s.product_id
),
Ranked AS (
  SELECT user_id, product_id, RANK() OVER (PARTITION BY user_id ORDER BY total_spent DESC) AS rnk
  FROM Spend
)
SELECT user_id, product_id
FROM Ranked
WHERE rnk = 1
ORDER BY user_id, product_id;`,
    expectedRows: [
      { user_id: 101, product_id: 3 },
      { user_id: 102, product_id: 1 },
      { user_id: 102, product_id: 2 },
      { user_id: 102, product_id: 3 },
    ],
  }),

  makeSqlProblem({
    id: 578,
    title: 'User Activity for the Past 30 Days II',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'Distinct Session Ratio per Active User',
    statement:
      'Compute average_sessions_per_user (sessions with >= 1 action per active user) rounded to 2 decimal places during 2019-06-28..2019-07-27.',
    inputSummary: 'Activity (6 user action logs)',
    outputSummary: 'average_sessions_per_user: 1.33',
    explanation: 'Users 1, 2, 3 had 4 distinct user-session pairs in range (4 / 3 = 1.33).',
    schemaDdl: `CREATE TABLE Activity (
  user_id INT,
  session_id INT,
  activity_date VARCHAR(20),
  activity_type VARCHAR(30)
);
INSERT INTO Activity VALUES
  (1, 1, '2019-07-20', 'open_session'), (1, 1, '2019-07-20', 'scroll_down'),
  (2, 4, '2019-07-20', 'open_session'), (2, 5, '2019-07-21', 'open_session'),
  (3, 2, '2019-07-21', 'open_session'), (4, 3, '2019-06-25', 'open_session');`,
    expectedQuery: `WITH UserSessions AS (
  SELECT user_id, COUNT(DISTINCT session_id) AS s_cnt
  FROM Activity
  WHERE activity_date BETWEEN '2019-06-28' AND '2019-07-27'
  GROUP BY user_id
)
SELECT ROUND(COALESCE(AVG(s_cnt * 1.0), 0), 2) AS average_sessions_per_user
FROM UserSessions;`,
    expectedRows: [{ average_sessions_per_user: 1.33 }],
  }),

  makeSqlProblem({
    id: 579,
    title: 'Apples and Oranges',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'Conditional Signed Pivot Difference',
    statement: 'Report daily difference (apples sold minus oranges sold) as sale_date, diff ordered by sale_date.',
    inputSummary: 'Sales (8 daily fruit rows)',
    outputSummary: '2020-05-01: 2, 2020-05-02: 0, 2020-05-03: 20, 2020-05-04: -1',
    explanation: 'Sum +sold_num for apples and -sold_num for oranges grouped by sale_date.',
    schemaDdl: `CREATE TABLE Sales (
  sale_date VARCHAR(20),
  fruit VARCHAR(20),
  sold_num INT
);
INSERT INTO Sales VALUES
  ('2020-05-01', 'apples', 10), ('2020-05-01', 'oranges', 8),
  ('2020-05-02', 'apples', 15), ('2020-05-02', 'oranges', 15),
  ('2020-05-03', 'apples', 20), ('2020-05-03', 'oranges', 0),
  ('2020-05-04', 'apples', 15), ('2020-05-04', 'oranges', 16);`,
    expectedQuery: `SELECT sale_date,
  SUM(CASE WHEN fruit = 'apples' THEN sold_num ELSE -sold_num END) AS diff
FROM Sales
GROUP BY sale_date
ORDER BY sale_date;`,
    expectedRows: [
      { sale_date: '2020-05-01', diff: 2 },
      { sale_date: '2020-05-02', diff: 0 },
      { sale_date: '2020-05-03', diff: 20 },
      { sale_date: '2020-05-04', diff: -1 },
    ],
  }),

  makeSqlProblem({
    id: 580,
    title: 'Grand Slam Titles',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'Multi-Column Unpivot Championship Count',
    statement: 'Report player_id, player_name, and grand_slams_count for every player who won at least 1 Grand Slam title.',
    inputSummary: 'Players (3 players), Championships (3 years x 4 slams)',
    outputSummary: 'Federer: 5, Nadal: 7',
    explanation: 'Unpivot the four tournament winner columns via UNION ALL and join back to Players.',
    schemaDdl: `CREATE TABLE Players (
  player_id INT PRIMARY KEY,
  player_name VARCHAR(40)
);
INSERT INTO Players VALUES (1, 'Nadal'), (2, 'Federer'), (3, 'Novak');
CREATE TABLE Championships (
  year INT PRIMARY KEY,
  Wimbledon INT,
  Fr_open INT,
  US_open INT,
  Au_open INT
);
INSERT INTO Championships VALUES (2018, 1, 1, 1, 1), (2019, 1, 1, 2, 2), (2020, 2, 1, 2, 2);`,
    expectedQuery: `WITH Wins AS (
  SELECT Wimbledon AS player_id FROM Championships
  UNION ALL
  SELECT Fr_open FROM Championships
  UNION ALL
  SELECT US_open FROM Championships
  UNION ALL
  SELECT Au_open FROM Championships
)
SELECT p.player_id, p.player_name, COUNT(*) AS grand_slams_count
FROM Players p
JOIN Wins w ON p.player_id = w.player_id
GROUP BY p.player_id, p.player_name
ORDER BY grand_slams_count DESC, p.player_id;`,
    expectedRows: [
      { player_id: 1, player_name: 'Nadal', grand_slams_count: 7 },
      { player_id: 2, player_name: 'Federer', grand_slams_count: 5 },
    ],
  }),

  makeSqlProblem({
    id: 581,
    title: 'Page Recommendations',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'Bidirectional Friends + NOT IN Exclusion',
    statement: 'Recommend distinct page_id values to user_id = 1 based on pages liked by their friends, excluding pages user 1 already likes. Sort ASC.',
    inputSummary: 'Friendship (6 edges), Likes (8 likes)',
    outputSummary: 'recommended_page: 23, 24, 33, 56, 77',
    explanation: 'Friends of 1 are users 2, 3, 4, 6; exclude page 88 already liked by user 1.',
    schemaDdl: `CREATE TABLE Friendship (
  user1_id INT,
  user2_id INT
);
INSERT INTO Friendship VALUES (1, 2), (1, 3), (1, 4), (2, 3), (2, 4), (2, 5), (6, 1);
CREATE TABLE Likes (
  user_id INT,
  page_id INT
);
INSERT INTO Likes VALUES
  (1, 88), (2, 23), (3, 24), (4, 56), (5, 11), (6, 33), (2, 77), (3, 77), (6, 88);`,
    expectedQuery: `WITH FriendsOf1 AS (
  SELECT user2_id AS fid FROM Friendship WHERE user1_id = 1
  UNION
  SELECT user1_id AS fid FROM Friendship WHERE user2_id = 1
)
SELECT DISTINCT l.page_id AS recommended_page
FROM Likes l
JOIN FriendsOf1 f ON l.user_id = f.fid
WHERE l.page_id NOT IN (SELECT page_id FROM Likes WHERE user_id = 1)
ORDER BY recommended_page ASC;`,
    expectedRows: [
      { recommended_page: 23 },
      { recommended_page: 24 },
      { recommended_page: 33 },
      { recommended_page: 56 },
      { recommended_page: 77 },
    ],
  }),

  makeSqlProblem({
    id: 582,
    title: 'All People Report to the Given Manager',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'WITH RECURSIVE Direct + Indirect Hierarchy',
    statement: 'Find all employee_id values (excluding employee 1) who directly or indirectly report to the head of company (employee_id = 1). Sort ASC.',
    inputSummary: 'Employees (7 hierarchy rows)',
    outputSummary: 'employee_id: 2, 4, 7, 77',
    explanation: 'Traverse manager_id = 1 recursively avoiding self-cycle on CEO (1->1).',
    schemaDdl: `CREATE TABLE Employees (
  employee_id INT PRIMARY KEY,
  employee_name VARCHAR(40),
  manager_id INT
);
INSERT INTO Employees VALUES
  (1, 'Boss', 1), (3, 'Alice', 3), (2, 'Bob', 1),
  (4, 'Daniel', 2), (7, 'Luis', 4), (8, 'John', 3), (77, 'Robert', 1);`,
    expectedQuery: `WITH RECURSIVE Tree AS (
  SELECT employee_id
  FROM Employees
  WHERE manager_id = 1 AND employee_id != 1
  UNION ALL
  SELECT e.employee_id
  FROM Employees e
  JOIN Tree t ON e.manager_id = t.employee_id
)
SELECT employee_id
FROM Tree
ORDER BY employee_id ASC;`,
    expectedRows: [{ employee_id: 2 }, { employee_id: 4 }, { employee_id: 7 }, { employee_id: 77 }],
  }),

  makeSqlProblem({
    id: 583,
    title: 'Dynamic Pivoting of Product Categories',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'Category Pivot Matrix',
    statement:
      'Summarize revenue per store across Electronics, Apparel, and Grocery categories (Columns: store, Electronics, Apparel, Grocery ordered by store).',
    inputSummary: 'StoreSales (6 store-category revenue entries)',
    outputSummary: 'Store_A and Store_B pivoted category totals',
    explanation: 'Use SUM(CASE WHEN category = ... THEN revenue ELSE 0 END) grouped by store.',
    schemaDdl: `CREATE TABLE StoreSales (
  store VARCHAR(30),
  category VARCHAR(30),
  revenue INT
);
INSERT INTO StoreSales VALUES
  ('Store_A', 'Electronics', 12000), ('Store_A', 'Apparel', 5400), ('Store_A', 'Grocery', 8100),
  ('Store_B', 'Electronics', 9500), ('Store_B', 'Grocery', 11000), ('Store_B', 'Apparel', 3200);`,
    expectedQuery: `SELECT store,
  SUM(CASE WHEN category = 'Electronics' THEN revenue ELSE 0 END) AS Electronics,
  SUM(CASE WHEN category = 'Apparel' THEN revenue ELSE 0 END) AS Apparel,
  SUM(CASE WHEN category = 'Grocery' THEN revenue ELSE 0 END) AS Grocery
FROM StoreSales
GROUP BY store
ORDER BY store;`,
    expectedRows: [
      { store: 'Store_A', Electronics: 12000, Apparel: 5400, Grocery: 8100 },
      { store: 'Store_B', Electronics: 9500, Apparel: 3200, Grocery: 11000 },
    ],
  }),

  makeSqlProblem({
    id: 584,
    title: 'Average Time of Process per Machine',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'Start/End Self-Join Duration AVG',
    statement: 'Calculate mean process execution time per machine_id rounded to 3 decimals as processing_time ordered by machine_id.',
    inputSummary: 'Activity (8 start/end timestamps across 2 machines)',
    outputSummary: 'Machine 0: 0.894, Machine 1: 0.995',
    explanation: 'Pair start and end rows per (machine_id, process_id) and compute AVG(e.timestamp - s.timestamp).',
    schemaDdl: `CREATE TABLE Activity (
  machine_id INT,
  process_id INT,
  activity_type VARCHAR(10),
  timestamp REAL
);
INSERT INTO Activity VALUES
  (0, 0, 'start', 0.712), (0, 0, 'end', 1.520),
  (0, 1, 'start', 3.140), (0, 1, 'end', 4.120),
  (1, 0, 'start', 0.550), (1, 0, 'end', 1.550),
  (1, 1, 'start', 0.430), (1, 1, 'end', 1.420);`,
    expectedQuery: `SELECT s.machine_id, ROUND(AVG(e.timestamp - s.timestamp), 3) AS processing_time
FROM Activity s
JOIN Activity e
  ON s.machine_id = e.machine_id
 AND s.process_id = e.process_id
 AND s.activity_type = 'start'
 AND e.activity_type = 'end'
GROUP BY s.machine_id
ORDER BY s.machine_id;`,
    expectedRows: [
      { machine_id: 0, processing_time: 0.894 },
      { machine_id: 1, processing_time: 0.995 },
    ],
  }),

  makeSqlProblem({
    id: 585,
    title: 'Percentage of Users Attended a Contest',
    difficulty: 'Medium',
    topic: 'Gaps and Islands',
    pattern: 'Scalar Total Denominator Percentage',
    statement:
      'Report contest_id and percentage of registered users participating in each contest (rounded to 2 decimals) ordered by percentage DESC, contest_id ASC.',
    inputSummary: 'Users (3 users), Register (6 registrations)',
    outputSummary: '208, 209, 210: 66.67%; 215: 100.0%',
    explanation: 'Divide COUNT(DISTINCT user_id) per contest by total user count * 100.0.',
    schemaDdl: `CREATE TABLE Users (
  user_id INT PRIMARY KEY,
  user_name VARCHAR(40)
);
INSERT INTO Users VALUES (6, 'Alice'), (2, 'Bob'), (7, 'Alex');
CREATE TABLE Register (
  contest_id INT,
  user_id INT
);
INSERT INTO Register VALUES (215, 6), (209, 2), (208, 2), (210, 6), (208, 6), (209, 7), (215, 7), (210, 2), (215, 2);`,
    expectedQuery: `SELECT contest_id,
  ROUND(COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM Users), 2) AS percentage
FROM Register
GROUP BY contest_id
ORDER BY percentage DESC, contest_id ASC;`,
    expectedRows: [
      { contest_id: 215, percentage: 100.0 },
      { contest_id: 208, percentage: 66.67 },
      { contest_id: 209, percentage: 66.67 },
      { contest_id: 210, percentage: 66.67 },
    ],
  }),

  makeSqlProblem({
    id: 586,
    title: 'Trips and Users (Cancellation Rate)',
    difficulty: 'Hard',
    topic: 'Gaps and Islands',
    pattern: 'Dual User-Role Unbanned Filter',
    statement:
      'Compute daily cancellation rate of trips with both unbanned client and unbanned driver between 2013-10-01 and 2013-10-03 rounded to 2 decimals (Day, Cancellation Rate).',
    inputSummary: 'Trips (6 rides), Users (6 participants)',
    outputSummary: '2013-10-01: 0.33, 2013-10-02: 0.0, 2013-10-03: 0.5',
    explanation: 'Join Users twice (client and driver) enforcing banned = "No" before averaging cancelled statuses.',
    schemaDdl: `CREATE TABLE Users (
  users_id INT PRIMARY KEY,
  banned VARCHAR(10),
  role VARCHAR(20)
);
INSERT INTO Users VALUES
  (1, 'No', 'client'), (2, 'Yes', 'client'), (3, 'No', 'client'),
  (4, 'No', 'client'), (10, 'No', 'driver'), (11, 'No', 'driver');
CREATE TABLE Trips (
  id INT PRIMARY KEY,
  client_id INT,
  driver_id INT,
  status VARCHAR(30),
  request_at VARCHAR(20)
);
INSERT INTO Trips VALUES
  (1, 1, 10, 'completed', '2013-10-01'),
  (2, 2, 11, 'cancelled_by_driver', '2013-10-01'),
  (3, 3, 10, 'completed', '2013-10-01'),
  (4, 4, 11, 'cancelled_by_client', '2013-10-01'),
  (5, 1, 10, 'completed', '2013-10-02'),
  (6, 3, 11, 'completed', '2013-10-03'),
  (7, 4, 10, 'cancelled_by_client', '2013-10-03');`,
    expectedQuery: `SELECT t.request_at AS Day,
  ROUND(AVG(CASE WHEN t.status != 'completed' THEN 1.0 ELSE 0.0 END), 2) AS "Cancellation Rate"
FROM Trips t
JOIN Users c ON t.client_id = c.users_id AND c.banned = 'No'
JOIN Users d ON t.driver_id = d.users_id AND d.banned = 'No'
WHERE t.request_at BETWEEN '2013-10-01' AND '2013-10-03'
GROUP BY t.request_at
ORDER BY Day;`,
    expectedRows: [
      { Day: '2013-10-01', 'Cancellation Rate': 0.33 },
      { Day: '2013-10-02', 'Cancellation Rate': 0.0 },
      { Day: '2013-10-03', 'Cancellation Rate': 0.5 },
    ],
  }),

  makeSqlProblem({
    id: 587,
    title: 'Human Traffic of Stadium',
    difficulty: 'Hard',
    topic: 'Gaps and Islands',
    pattern: 'Island Length >= 3 Filtering',
    statement: 'Display stadium records (id, visit_date, people) with >= 3 consecutive ids where people >= 100, ordered by visit_date.',
    inputSummary: 'Stadium (8 attendance days)',
    outputSummary: 'ids 5, 6, 7, 8',
    explanation: 'Use id - ROW_NUMBER() OVER (ORDER BY id) to isolate qualifying streaks of size >= 3.',
    schemaDdl: `CREATE TABLE Stadium (
  id INT PRIMARY KEY,
  visit_date VARCHAR(20),
  people INT
);
INSERT INTO Stadium VALUES
  (1, '2017-01-01', 10), (2, '2017-01-02', 109), (3, '2017-01-03', 150),
  (4, '2017-01-04', 99), (5, '2017-01-05', 145), (6, '2017-01-06', 1455),
  (7, '2017-01-07', 199), (8, '2017-01-08', 188);`,
    expectedQuery: `WITH Islands AS (
  SELECT id, visit_date, people,
    id - ROW_NUMBER() OVER (ORDER BY id) AS grp
  FROM Stadium
  WHERE people >= 100
),
Counted AS (
  SELECT id, visit_date, people, COUNT(*) OVER (PARTITION BY grp) AS streak
  FROM Islands
)
SELECT id, visit_date, people
FROM Counted
WHERE streak >= 3
ORDER BY visit_date;`,
    expectedRows: [
      { id: 5, visit_date: '2017-01-05', people: 145 },
      { id: 6, visit_date: '2017-01-06', people: 1455 },
      { id: 7, visit_date: '2017-01-07', people: 199 },
      { id: 8, visit_date: '2017-01-08', people: 188 },
    ],
  }),

  makeSqlProblem({
    id: 588,
    title: 'Find Cumulative Salary of an Employee',
    difficulty: 'Hard',
    topic: 'Gaps and Islands',
    pattern: 'Trailing 3-Month Join Excluding Latest',
    statement:
      'For each employee compute the cumulative salary over a 3-month window (current month and 2 preceding months), excluding their single most recent active month. Order by id ASC, month DESC.',
    inputSummary: 'Employee (7 monthly payroll rows)',
    outputSummary: '3-month trailing payroll excluding max month per id',
    explanation: 'Rank months DESC per id to drop rnk=1, then self-join month BETWEEN e1.month - 2 AND e1.month.',
    schemaDdl: `CREATE TABLE Employee (
  id INT,
  month INT,
  salary INT
);
INSERT INTO Employee VALUES
  (1, 1, 20), (2, 1, 20), (1, 2, 30), (2, 2, 30),
  (3, 2, 40), (1, 3, 40), (3, 3, 60), (1, 4, 60), (3, 4, 70);`,
    expectedQuery: `WITH WithLatest AS (
  SELECT id, month, salary, MAX(month) OVER (PARTITION BY id) AS max_m
  FROM Employee
)
SELECT e1.id, e1.month, SUM(e2.salary) AS Salary
FROM WithLatest e1
JOIN Employee e2
  ON e1.id = e2.id
 AND e2.month BETWEEN e1.month - 2 AND e1.month
WHERE e1.month < e1.max_m
GROUP BY e1.id, e1.month
ORDER BY e1.id ASC, e1.month DESC;`,
    expectedRows: [
      { id: 1, month: 3, Salary: 90 },
      { id: 1, month: 2, Salary: 50 },
      { id: 1, month: 1, Salary: 20 },
      { id: 2, month: 1, Salary: 20 },
      { id: 3, month: 3, Salary: 100 },
      { id: 3, month: 2, Salary: 40 },
    ],
  }),

  makeSqlProblem({
    id: 589,
    title: 'User Purchase Platform',
    difficulty: 'Hard',
    topic: 'Gaps and Islands',
    pattern: 'Platform Scaffold CROSS JOIN',
    statement:
      'For each spend_date and platform ("desktop", "mobile", "both") report total_amount and total_users (including zero-count platforms) ordered by spend_date, platform.',
    inputSummary: 'Spending (4 user-platform transactions)',
    outputSummary: 'All 3 platforms per spend_date with 0-fill',
    explanation: 'Classify per (user_id, spend_date) as single platform or "both", then CROSS JOIN Dates x Platforms.',
    schemaDdl: `CREATE TABLE Spending (
  user_id INT,
  spend_date VARCHAR(20),
  platform VARCHAR(15),
  amount INT
);
INSERT INTO Spending VALUES
  (1, '2019-07-01', 'mobile', 100), (1, '2019-07-01', 'desktop', 100),
  (2, '2019-07-01', 'mobile', 100), (2, '2019-07-02', 'mobile', 100);`,
    expectedQuery: `WITH UserDaily AS (
  SELECT spend_date, user_id,
    CASE WHEN COUNT(DISTINCT platform) = 2 THEN 'both' ELSE MAX(platform) END AS platform,
    SUM(amount) AS total_amt
  FROM Spending
  GROUP BY spend_date, user_id
),
Platforms AS (
  SELECT 'desktop' AS platform
  UNION ALL SELECT 'mobile'
  UNION ALL SELECT 'both'
),
Dates AS (
  SELECT DISTINCT spend_date FROM Spending
)
SELECT d.spend_date, p.platform,
  COALESCE(SUM(u.total_amt), 0) AS total_amount,
  COUNT(u.user_id) AS total_users
FROM Dates d
CROSS JOIN Platforms p
LEFT JOIN UserDaily u ON d.spend_date = u.spend_date AND p.platform = u.platform
GROUP BY d.spend_date, p.platform
ORDER BY d.spend_date, p.platform;`,
    expectedRows: [
      { spend_date: '2019-07-01', platform: 'both', total_amount: 200, total_users: 1 },
      { spend_date: '2019-07-01', platform: 'desktop', total_amount: 0, total_users: 0 },
      { spend_date: '2019-07-01', platform: 'mobile', total_amount: 100, total_users: 1 },
      { spend_date: '2019-07-02', platform: 'both', total_amount: 0, total_users: 0 },
      { spend_date: '2019-07-02', platform: 'desktop', total_amount: 0, total_users: 0 },
      { spend_date: '2019-07-02', platform: 'mobile', total_amount: 100, total_users: 1 },
    ],
  }),

  makeSqlProblem({
    id: 590,
    title: 'Report Contiguous Dates',
    difficulty: 'Hard',
    topic: 'Gaps and Islands',
    pattern: 'Combined Status Stream Island Grouping',
    statement:
      'Merge Failed and Succeeded date logs for 2019 into contiguous intervals reporting period_state, start_date, end_date ordered by start_date.',
    inputSummary: 'Failed (3 dates), Succeeded (3 dates)',
    outputSummary: '3 contiguous periods in Jan 2019',
    explanation: 'Tag rows with period_state then group by CAST(julianday(dt) AS INTEGER) - ROW_NUMBER() OVER (PARTITION BY period_state ORDER BY dt).',
    schemaDdl: `CREATE TABLE Failed (
  fail_date VARCHAR(20) PRIMARY KEY
);
INSERT INTO Failed VALUES ('2018-12-28'), ('2019-01-04'), ('2019-01-05');
CREATE TABLE Succeeded (
  success_date VARCHAR(20) PRIMARY KEY
);
INSERT INTO Succeeded VALUES ('2019-01-01'), ('2019-01-02'), ('2019-01-03'), ('2019-01-06');`,
    expectedQuery: `WITH Events AS (
  SELECT 'failed' AS period_state, fail_date AS dt FROM Failed WHERE fail_date BETWEEN '2019-01-01' AND '2019-12-31'
  UNION ALL
  SELECT 'succeeded' AS period_state, success_date AS dt FROM Succeeded WHERE success_date BETWEEN '2019-01-01' AND '2019-12-31'
),
Grouped AS (
  SELECT period_state, dt,
    CAST(ROUND(julianday(dt)) AS INTEGER) - ROW_NUMBER() OVER (PARTITION BY period_state ORDER BY dt) AS grp
  FROM Events
)
SELECT period_state, MIN(dt) AS start_date, MAX(dt) AS end_date
FROM Grouped
GROUP BY period_state, grp
ORDER BY start_date;`,
    expectedRows: [
      { period_state: 'succeeded', start_date: '2019-01-01', end_date: '2019-01-03' },
      { period_state: 'failed', start_date: '2019-01-04', end_date: '2019-01-05' },
      { period_state: 'succeeded', start_date: '2019-01-06', end_date: '2019-01-06' },
    ],
  }),

  makeSqlProblem({
    id: 591,
    title: 'Average Salary: Departments VS Company',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Monthly Partition Benchmark Comparison',
    statement:
      'Compare each department average salary against the company-wide average in each pay_month ("higher", "lower", or "same") ordered by pay_month DESC, department_id ASC.',
    inputSummary: 'Salary (6 monthly payslips), Employee (3 employees)',
    outputSummary: 'Monthly comparison per department',
    explanation: 'Compute AVG(amount) OVER (PARTITION BY pay_month) alongside AVG(amount) OVER (PARTITION BY pay_month, department_id).',
    schemaDdl: `CREATE TABLE Employee (
  employee_id INT PRIMARY KEY,
  department_id INT
);
INSERT INTO Employee VALUES (1, 1), (2, 2), (3, 2);
CREATE TABLE Salary (
  id INT PRIMARY KEY,
  employee_id INT,
  amount INT,
  pay_date VARCHAR(20)
);
INSERT INTO Salary VALUES
  (1, 1, 9000, '2017-03-31'), (2, 2, 6000, '2017-03-31'), (3, 3, 10000, '2017-03-31'),
  (4, 1, 7000, '2017-02-28'), (5, 2, 6000, '2017-02-28'), (6, 3, 8000, '2017-02-28');`,
    expectedQuery: `WITH Monthly AS (
  SELECT substr(s.pay_date, 1, 7) AS pay_month, e.department_id,
    AVG(s.amount * 1.0) OVER (PARTITION BY substr(s.pay_date, 1, 7), e.department_id) AS dept_avg,
    AVG(s.amount * 1.0) OVER (PARTITION BY substr(s.pay_date, 1, 7)) AS comp_avg
  FROM Salary s
  JOIN Employee e ON s.employee_id = e.employee_id
)
SELECT DISTINCT pay_month, department_id,
  CASE
    WHEN dept_avg > comp_avg THEN 'higher'
    WHEN dept_avg < comp_avg THEN 'lower'
    ELSE 'same'
  END AS comparison
FROM Monthly
ORDER BY pay_month DESC, department_id ASC;`,
    expectedRows: [
      { pay_month: '2017-03', department_id: 1, comparison: 'higher' },
      { pay_month: '2017-03', department_id: 2, comparison: 'lower' },
      { pay_month: '2017-02', department_id: 1, comparison: 'same' },
      { pay_month: '2017-02', department_id: 2, comparison: 'same' },
    ],
  }),

  makeSqlProblem({
    id: 592,
    title: 'Department Top Three Performers Across Quarters',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Composite Partition DENSE_RANK()',
    statement: 'Rank performers per (department, quarter) keeping top 3 dense ranks ordered by department, quarter, score DESC.',
    inputSummary: 'QuarterlyPerf (6 employee-quarter KPIs)',
    outputSummary: 'Ranked top performers per department and quarter',
    explanation: 'Partition DENSE_RANK() by both dept and quarter.',
    schemaDdl: `CREATE TABLE QuarterlyPerf (
  dept VARCHAR(20),
  quarter VARCHAR(10),
  emp_name VARCHAR(40),
  score INT
);
INSERT INTO QuarterlyPerf VALUES
  ('Eng', 'Q1', 'Aarav', 98), ('Eng', 'Q1', 'Maya', 95), ('Eng', 'Q1', 'Rohan', 95), ('Eng', 'Q1', 'Kabir', 80),
  ('Eng', 'Q2', 'Maya', 99), ('Eng', 'Q2', 'Aarav', 92);`,
    expectedQuery: `WITH Ranked AS (
  SELECT dept, quarter, emp_name, score,
    DENSE_RANK() OVER (PARTITION BY dept, quarter ORDER BY score DESC) AS rnk
  FROM QuarterlyPerf
)
SELECT dept, quarter, emp_name, score
FROM Ranked
WHERE rnk <= 3
ORDER BY dept, quarter, score DESC, emp_name;`,
    expectedRows: [
      { dept: 'Eng', quarter: 'Q1', emp_name: 'Aarav', score: 98 },
      { dept: 'Eng', quarter: 'Q1', emp_name: 'Maya', score: 95 },
      { dept: 'Eng', quarter: 'Q1', emp_name: 'Rohan', score: 95 },
      { dept: 'Eng', quarter: 'Q1', emp_name: 'Kabir', score: 80 },
      { dept: 'Eng', quarter: 'Q2', emp_name: 'Maya', score: 99 },
      { dept: 'Eng', quarter: 'Q2', emp_name: 'Aarav', score: 92 },
    ],
  }),

  makeSqlProblem({
    id: 593,
    title: 'Total Sales Amount by Year',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Date Interval Year Overlap Multiplication',
    statement:
      'Report product_id, product_name, report_year, and total_amount earned in each calendar year (2018-2020) ordered by product_id, report_year.',
    inputSummary: 'Product (2), Sales multi-year date spans',
    outputSummary: 'Annualized sales amounts split at year boundaries',
    explanation: 'Intersect [period_start, period_end] with [year_start, year_end] to compute exact active days.',
    schemaDdl: `CREATE TABLE Product (
  product_id INT PRIMARY KEY,
  product_name VARCHAR(40)
);
INSERT INTO Product VALUES (1, 'LC Phone'), (2, 'LC T-Shirt');
CREATE TABLE Sales (
  product_id INT,
  period_start VARCHAR(20),
  period_end VARCHAR(20),
  average_daily_sales INT
);
INSERT INTO Sales VALUES
  (1, '2019-01-25', '2019-02-28', 100),
  (2, '2018-12-01', '2020-01-01', 10);`,
    expectedQuery: `WITH Years AS (
  SELECT '2018' AS yr, '2018-01-01' AS y_start, '2018-12-31' AS y_end
  UNION ALL SELECT '2019', '2019-01-01', '2019-12-31'
  UNION ALL SELECT '2020', '2020-01-01', '2020-12-31'
)
SELECT p.product_id, p.product_name, y.yr AS report_year,
  CAST(ROUND(julianday(MIN(s.period_end, y.y_end)) - julianday(MAX(s.period_start, y.y_start)) + 1) AS INTEGER) * s.average_daily_sales AS total_amount
FROM Sales s
JOIN Product p ON s.product_id = p.product_id
JOIN Years y ON s.period_start <= y.y_end AND s.period_end >= y.y_start
ORDER BY p.product_id, report_year;`,
    expectedRows: [
      { product_id: 1, product_name: 'LC Phone', report_year: '2019', total_amount: 3500 },
      { product_id: 2, product_name: 'LC T-Shirt', report_year: '2018', total_amount: 310 },
      { product_id: 2, product_name: 'LC T-Shirt', report_year: '2019', total_amount: 3650 },
      { product_id: 2, product_name: 'LC T-Shirt', report_year: '2020', total_amount: 10 },
    ],
  }),

  makeSqlProblem({
    id: 594,
    title: 'Median Salary Across Multiple Departments',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Odd/Even Analytic Median Calculation',
    statement: 'Compute exact median_salary rounded to 2 decimals for every department ordered by dept.',
    inputSummary: 'DeptSalary (7 rows across 2 departments)',
    outputSummary: 'Data: 115000.0, Infra: 120000.0',
    explanation: 'Average elements where rn IN (cnt/2.0 .. cnt/2.0 + 1).',
    schemaDdl: `CREATE TABLE DeptSalary (
  id INT PRIMARY KEY,
  dept VARCHAR(30),
  salary INT
);
INSERT INTO DeptSalary VALUES
  (1, 'Data', 90000), (2, 'Data', 110000), (3, 'Data', 120000), (4, 'Data', 150000),
  (5, 'Infra', 100000), (6, 'Infra', 120000), (7, 'Infra', 140000);`,
    expectedQuery: `WITH Ranked AS (
  SELECT dept, salary,
    ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary) AS rn,
    COUNT(*) OVER (PARTITION BY dept) AS cnt
  FROM DeptSalary
)
SELECT dept, ROUND(AVG(salary * 1.0), 2) AS median_salary
FROM Ranked
WHERE rn BETWEEN cnt * 1.0 / 2.0 AND cnt * 1.0 / 2.0 + 1.0
GROUP BY dept
ORDER BY dept;`,
    expectedRows: [
      { dept: 'Data', median_salary: 115000.0 },
      { dept: 'Infra', median_salary: 120000.0 },
    ],
  }),

  makeSqlProblem({
    id: 595,
    title: 'Gaps and Islands in Server Outages',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Julian Day Continuity Outage Spans',
    statement: 'Group contiguous "down" status dates into outage windows reporting start_date, end_date, and outage_days ordered by start_date.',
    inputSummary: 'ServerLogs (7 daily health checks)',
    outputSummary: '2 outage intervals (3 days and 2 days)',
    explanation: 'Assign integer island key via ROUND(julianday(log_date)) - ROW_NUMBER() OVER (ORDER BY log_date).',
    schemaDdl: `CREATE TABLE ServerLogs (
  log_date VARCHAR(20) PRIMARY KEY,
  status VARCHAR(15)
);
INSERT INTO ServerLogs VALUES
  ('2025-02-01', 'down'), ('2025-02-02', 'down'), ('2025-02-03', 'down'),
  ('2025-02-04', 'up'), ('2025-02-05', 'up'),
  ('2025-02-06', 'down'), ('2025-02-07', 'down');`,
    expectedQuery: `WITH DownIslands AS (
  SELECT log_date,
    CAST(ROUND(julianday(log_date)) AS INTEGER) - ROW_NUMBER() OVER (ORDER BY log_date) AS grp
  FROM ServerLogs
  WHERE status = 'down'
)
SELECT MIN(log_date) AS start_date, MAX(log_date) AS end_date, COUNT(*) AS outage_days
FROM DownIslands
GROUP BY grp
ORDER BY start_date;`,
    expectedRows: [
      { start_date: '2025-02-01', end_date: '2025-02-03', outage_days: 3 },
      { start_date: '2025-02-06', end_date: '2025-02-07', outage_days: 2 },
    ],
  }),

  makeSqlProblem({
    id: 596,
    title: 'Recursive Manager Hierarchy Path',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'WITH RECURSIVE Materialized Path',
    statement: 'Generate full reporting path from CEO down to every staff member (id, name, hierarchy_path, depth) ordered by depth, id.',
    inputSummary: 'Staff (5 hierarchy nodes)',
    outputSummary: 'Depth 1..3 materialized paths',
    explanation: 'Concatenate parent hierarchy_path || " -> " || child name in recursive CTE.',
    schemaDdl: `CREATE TABLE Staff (
  id INT PRIMARY KEY,
  name VARCHAR(30),
  manager_id INT
);
INSERT INTO Staff VALUES (1, 'CEO', NULL), (2, 'VP_Eng', 1), (3, 'VP_Ops', 1), (4, 'Lead_A', 2), (5, 'SDE_1', 4);`,
    expectedQuery: `WITH RECURSIVE Path AS (
  SELECT id, name, name AS hierarchy_path, 1 AS depth
  FROM Staff
  WHERE manager_id IS NULL
  UNION ALL
  SELECT s.id, s.name, p.hierarchy_path || ' -> ' || s.name AS hierarchy_path, p.depth + 1
  FROM Staff s
  JOIN Path p ON s.manager_id = p.id
)
SELECT id, name, hierarchy_path, depth
FROM Path
ORDER BY depth, id;`,
    expectedRows: [
      { id: 1, name: 'CEO', hierarchy_path: 'CEO', depth: 1 },
      { id: 2, name: 'VP_Eng', hierarchy_path: 'CEO -> VP_Eng', depth: 2 },
      { id: 3, name: 'VP_Ops', hierarchy_path: 'CEO -> VP_Ops', depth: 2 },
      { id: 4, name: 'Lead_A', hierarchy_path: 'CEO -> VP_Eng -> Lead_A', depth: 3 },
      { id: 5, name: 'SDE_1', hierarchy_path: 'CEO -> VP_Eng -> Lead_A -> SDE_1', depth: 4 },
    ],
  }),

  makeSqlProblem({
    id: 597,
    title: 'Market Analysis II',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Second Sale ROW_NUMBER() Check',
    statement:
      'Check for each user whether the brand of their 2nd sold item matches their favorite_brand ("yes" or "no"; "no" if fewer than 2 sales). Order by seller_id.',
    inputSummary: 'Users (4), Items (4), Orders (6)',
    outputSummary: '1->no, 2->yes, 3->yes, 4->no',
    explanation: 'Assign ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY order_date) and join rn = 2.',
    schemaDdl: `CREATE TABLE Users (
  user_id INT PRIMARY KEY,
  favorite_brand VARCHAR(30)
);
INSERT INTO Users VALUES (1, 'Lenovo'), (2, 'Samsung'), (3, 'LG'), (4, 'HP');
CREATE TABLE Items (
  item_id INT PRIMARY KEY,
  item_brand VARCHAR(30)
);
INSERT INTO Items VALUES (1, 'Samsung'), (2, 'Lenovo'), (3, 'LG'), (4, 'HP');
CREATE TABLE Orders (
  order_id INT PRIMARY KEY,
  order_date VARCHAR(20),
  item_id INT,
  seller_id INT
);
INSERT INTO Orders VALUES
  (1, '2019-08-01', 4, 2), (2, '2019-08-02', 2, 3), (3, '2019-08-03', 3, 3),
  (4, '2019-08-04', 1, 2), (5, '2019-08-04', 1, 4), (6, '2019-08-05', 2, 4);`,
    expectedQuery: `WITH RankedSales AS (
  SELECT o.seller_id, i.item_brand,
    ROW_NUMBER() OVER (PARTITION BY o.seller_id ORDER BY o.order_date) AS rn
  FROM Orders o
  JOIN Items i ON o.item_id = i.item_id
)
SELECT u.user_id AS seller_id,
  CASE WHEN r.item_brand = u.favorite_brand THEN 'yes' ELSE 'no' END AS "2nd_item_fav_brand"
FROM Users u
LEFT JOIN RankedSales r ON u.user_id = r.seller_id AND r.rn = 2
ORDER BY u.user_id;`,
    expectedRows: [
      { seller_id: 1, '2nd_item_fav_brand': 'no' },
      { seller_id: 2, '2nd_item_fav_brand': 'yes' },
      { seller_id: 3, '2nd_item_fav_brand': 'yes' },
      { seller_id: 4, '2nd_item_fav_brand': 'no' },
    ],
  }),

  makeSqlProblem({
    id: 598,
    title: 'Optimal Sales Representative Commission',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Quota Accelerator Commission Tiering',
    statement:
      'Compute closed revenue and commission per rep: 12% on total closed deals when closed >= quota, otherwise 5% (0 if none closed). Order by rep_id.',
    inputSummary: 'Reps (3 reps), Deals (5 enterprise deals)',
    outputSummary: 'Riya: 18000, Arjun: 2500, Neha: 0',
    explanation: 'Aggregate only closed_flag = 1 deals cleanly inside LEFT JOIN ON clause.',
    schemaDdl: `CREATE TABLE Reps (
  rep_id INT PRIMARY KEY,
  name VARCHAR(30),
  quota INT
);
INSERT INTO Reps VALUES (1, 'Riya', 100000), (2, 'Arjun', 80000), (3, 'Neha', 60000);
CREATE TABLE Deals (
  deal_id INT PRIMARY KEY,
  rep_id INT,
  deal_value INT,
  closed_flag INT
);
INSERT INTO Deals VALUES (1, 1, 90000, 1), (2, 1, 60000, 1), (3, 2, 50000, 1), (4, 2, 40000, 0), (5, 3, 70000, 0);`,
    expectedQuery: `SELECT r.rep_id, r.name,
  COALESCE(SUM(d.deal_value), 0) AS closed_revenue,
  ROUND(
    CASE
      WHEN COALESCE(SUM(d.deal_value), 0) >= r.quota THEN COALESCE(SUM(d.deal_value), 0) * 0.12
      ELSE COALESCE(SUM(d.deal_value), 0) * 0.05
    END,
    2
  ) AS commission
FROM Reps r
LEFT JOIN Deals d ON r.rep_id = d.rep_id AND d.closed_flag = 1
GROUP BY r.rep_id, r.name, r.quota
ORDER BY r.rep_id;`,
    expectedRows: [
      { rep_id: 1, name: 'Riya', closed_revenue: 150000, commission: 18000.0 },
      { rep_id: 2, name: 'Arjun', closed_revenue: 50000, commission: 2500.0 },
      { rep_id: 3, name: 'Neha', closed_revenue: 0, commission: 0.0 },
    ],
  }),

  makeSqlProblem({
    id: 599,
    title: 'Day 7 User Retention Cohort Analysis',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Cohort Signup + Day +7 Exact Return Rate',
    statement:
      'For each signup_date cohort report cohort_size, day7_retained, and retention_pct (percentage logging in exactly 7 days after signup_date rounded to 2 decimals) ordered by signup_date.',
    inputSummary: 'Users (4 signups across 2 cohorts), Logins (5 events)',
    outputSummary: '2025-01-01: 50.0%, 2025-01-02: 100.0%',
    explanation: 'Match distinct login_date where julianday(login_date) - julianday(signup_date) = 7.',
    schemaDdl: `CREATE TABLE Users (
  user_id INT PRIMARY KEY,
  signup_date VARCHAR(20)
);
INSERT INTO Users VALUES (1, '2025-01-01'), (2, '2025-01-01'), (3, '2025-01-02'), (4, '2025-01-02');
CREATE TABLE Logins (
  user_id INT,
  login_date VARCHAR(20)
);
INSERT INTO Logins VALUES
  (1, '2025-01-08'), (1, '2025-01-08'), (2, '2025-01-03'),
  (3, '2025-01-09'), (4, '2025-01-09');`,
    expectedQuery: `SELECT u.signup_date,
  COUNT(DISTINCT u.user_id) AS cohort_size,
  COUNT(DISTINCT l.user_id) AS day7_retained,
  ROUND(COUNT(DISTINCT l.user_id) * 100.0 / COUNT(DISTINCT u.user_id), 2) AS retention_pct
FROM Users u
LEFT JOIN Logins l
  ON u.user_id = l.user_id
 AND ROUND(julianday(l.login_date) - julianday(u.signup_date)) = 7
GROUP BY u.signup_date
ORDER BY u.signup_date;`,
    expectedRows: [
      { signup_date: '2025-01-01', cohort_size: 2, day7_retained: 1, retention_pct: 50.0 },
      { signup_date: '2025-01-02', cohort_size: 2, day7_retained: 2, retention_pct: 100.0 },
    ],
  }),

  makeSqlProblem({
    id: 600,
    title: 'Rolling 30-Day Active Subscriber Turnover',
    difficulty: 'Hard',
    topic: 'Advanced Analytics & Retention',
    pattern: 'Subscription Churn Rate Analytics',
    statement:
      'Summarize per plan: total_subs, churned_subs (status = "cancelled"), and churn_rate_pct (rounded to 2 decimals) ordered by churn_rate_pct DESC, plan ASC.',
    inputSummary: 'Subscriptions (6 SaaS subscriptions)',
    outputSummary: 'Basic: 50.0%, Pro: 25.0%',
    explanation: 'Compare cancelled subscriptions vs total subscriptions grouped by plan.',
    schemaDdl: `CREATE TABLE Subscriptions (
  sub_id INT PRIMARY KEY,
  user_id INT,
  plan VARCHAR(20),
  status VARCHAR(20)
);
INSERT INTO Subscriptions VALUES
  (1, 101, 'Basic', 'active'), (2, 102, 'Basic', 'cancelled'),
  (3, 103, 'Pro', 'active'), (4, 104, 'Pro', 'active'),
  (5, 105, 'Pro', 'active'), (6, 106, 'Pro', 'cancelled');`,
    expectedQuery: `SELECT plan,
  COUNT(*) AS total_subs,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS churned_subs,
  ROUND(SUM(CASE WHEN status = 'cancelled' THEN 100.0 ELSE 0.0 END) / COUNT(*), 2) AS churn_rate_pct
FROM Subscriptions
GROUP BY plan
ORDER BY churn_rate_pct DESC, plan ASC;`,
    expectedRows: [
      { plan: 'Basic', total_subs: 2, churned_subs: 1, churn_rate_pct: 50.0 },
      { plan: 'Pro', total_subs: 4, churned_subs: 1, churn_rate_pct: 25.0 },
    ],
  }),
];
