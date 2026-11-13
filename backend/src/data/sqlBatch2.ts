import { makeSqlProblem, SqlProblemDefinition } from './sqlHelper';

export const SQL_BATCH_2: SqlProblemDefinition[] = [
  makeSqlProblem({
    id: 551,
    title: 'Last Person to Fit in the Bus',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Running Weight Sum <= 1000',
    statement:
      'People board a bus in ascending turn order. Weight limit is 1000 kg. Return the person_name of the last person who can board without exceeding 1000 kg.',
    inputSummary: 'Queue (6 boarding turns)',
    outputSummary: 'person_name: John Cena',
    explanation: 'Turns 1..3 total 250 + 350 + 400 = 1000 kg; turn 4 would exceed 1000 kg.',
    schemaDdl: `CREATE TABLE Queue (
  person_id INT PRIMARY KEY,
  person_name VARCHAR(40),
  weight INT,
  turn INT
);
INSERT INTO Queue VALUES
  (5, 'Alice', 250, 1), (4, 'Bob', 175, 5), (3, 'Alex', 350, 2),
  (6, 'John Cena', 400, 3), (1, 'Winston', 500, 6), (2, 'Marie', 200, 4);`,
    expectedQuery: `WITH Running AS (
  SELECT person_name, turn, SUM(weight) OVER (ORDER BY turn) AS total_w
  FROM Queue
)
SELECT person_name
FROM Running
WHERE total_w <= 1000
ORDER BY turn DESC
LIMIT 1;`,
    expectedRows: [{ person_name: 'John Cena' }],
  }),

  makeSqlProblem({
    id: 552,
    title: 'Movie Rating',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Multi-Metric Top UNION ALL',
    statement:
      'Find (1) the name of the user who rated the greatest number of movies (lexicographically smallest on ties) and (2) the movie title with highest average rating in Feb 2020 (lexicographically smallest on ties). Return both rows as column results.',
    inputSummary: 'Movies (3), Users (4), MovieRating (9)',
    outputSummary: 'Daniel, Frozen 2',
    explanation: 'Daniel and Monica both rated 3 movies -> Daniel wins alphabetically; Frozen 2 averages 3.5 in 2020-02.',
    schemaDdl: `CREATE TABLE Movies (
  movie_id INT PRIMARY KEY,
  title VARCHAR(50)
);
INSERT INTO Movies VALUES (1, 'Avengers'), (2, 'Frozen 2'), (3, 'Joker');
CREATE TABLE Users (
  user_id INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Users VALUES (1, 'Daniel'), (2, 'Monica'), (3, 'Maria'), (4, 'James');
CREATE TABLE MovieRating (
  movie_id INT,
  user_id INT,
  rating INT,
  created_at VARCHAR(20)
);
INSERT INTO MovieRating VALUES
  (1, 1, 3, '2020-01-12'), (1, 2, 4, '2020-02-11'), (1, 3, 2, '2020-02-12'), (1, 4, 1, '2020-01-01'),
  (2, 1, 5, '2020-02-17'), (2, 2, 2, '2020-02-01'), (2, 3, 2, '2020-03-01'),
  (3, 1, 3, '2020-02-22'), (3, 2, 4, '2020-02-25');`,
    expectedQuery: `SELECT results FROM (
  SELECT u.name AS results
  FROM Users u
  JOIN MovieRating r ON u.user_id = r.user_id
  GROUP BY u.user_id, u.name
  ORDER BY COUNT(*) DESC, u.name ASC
  LIMIT 1
)
UNION ALL
SELECT results FROM (
  SELECT m.title AS results
  FROM Movies m
  JOIN MovieRating r ON m.movie_id = r.movie_id
  WHERE substr(r.created_at, 1, 7) = '2020-02'
  GROUP BY m.movie_id, m.title
  ORDER BY AVG(r.rating * 1.0) DESC, m.title ASC
  LIMIT 1
);`,
    expectedRows: [{ results: 'Daniel' }, { results: 'Frozen 2' }],
  }),

  makeSqlProblem({
    id: 553,
    title: 'Capital Gain/Loss',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Signed Cashflow Aggregation',
    statement: 'Report total capital_gain_loss for each stock across all Buy and Sell operations ordered by stock_name.',
    inputSummary: 'Stocks (10 buy/sell events)',
    outputSummary: 'Corona Masks: 9500, Handbags: -23000, Leetcode: 8000',
    explanation: 'Every Sell adds cash (+price) and every Buy subtracts cash (-price).',
    schemaDdl: `CREATE TABLE Stocks (
  stock_name VARCHAR(40),
  operation VARCHAR(10),
  operation_day INT,
  price INT
);
INSERT INTO Stocks VALUES
  ('Leetcode', 'Buy', 1, 1000), ('Corona Masks', 'Buy', 2, 10),
  ('Leetcode', 'Sell', 5, 9000), ('Handbags', 'Buy', 17, 30000),
  ('Corona Masks', 'Sell', 3, 1010), ('Corona Masks', 'Buy', 4, 1000),
  ('Corona Masks', 'Sell', 5, 500), ('Corona Masks', 'Buy', 6, 1000),
  ('Handbags', 'Sell', 29, 7000), ('Corona Masks', 'Sell', 10, 10000);`,
    expectedQuery: `SELECT stock_name,
  SUM(CASE WHEN operation = 'Sell' THEN price ELSE -price END) AS capital_gain_loss
FROM Stocks
GROUP BY stock_name
ORDER BY stock_name;`,
    expectedRows: [
      { stock_name: 'Corona Masks', capital_gain_loss: 9500 },
      { stock_name: 'Handbags', capital_gain_loss: -23000 },
      { stock_name: 'Leetcode', capital_gain_loss: 8000 },
    ],
  }),

  makeSqlProblem({
    id: 554,
    title: 'Market Analysis I',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'LEFT JOIN Conditional Year Filter',
    statement: 'For every user return buyer_id, join_date, and orders_in_2019 (0 if none) sorted by buyer_id.',
    inputSummary: 'Users (4 rows), Orders (6 rows)',
    outputSummary: 'User 1: 1, User 2: 2, User 3: 0, User 4: 0',
    explanation: 'Keep the 2019 filter inside ON so users with zero 2019 orders are preserved.',
    schemaDdl: `CREATE TABLE Users (
  user_id INT PRIMARY KEY,
  join_date VARCHAR(20),
  favorite_brand VARCHAR(30)
);
INSERT INTO Users VALUES
  (1, '2018-01-01', 'Lenovo'), (2, '2018-02-09', 'Samsung'),
  (3, '2018-01-19', 'LG'), (4, '2018-05-21', 'HP');
CREATE TABLE Orders (
  order_id INT PRIMARY KEY,
  order_date VARCHAR(20),
  item_id INT,
  buyer_id INT,
  seller_id INT
);
INSERT INTO Orders VALUES
  (1, '2019-08-01', 4, 1, 2), (2, '2018-08-02', 2, 1, 3),
  (3, '2019-08-03', 3, 2, 3), (4, '2018-08-04', 1, 4, 2),
  (5, '2018-08-04', 1, 3, 4), (6, '2019-08-05', 2, 2, 4);`,
    expectedQuery: `SELECT u.user_id AS buyer_id, u.join_date, COUNT(o.order_id) AS orders_in_2019
FROM Users u
LEFT JOIN Orders o
  ON u.user_id = o.buyer_id AND substr(o.order_date, 1, 4) = '2019'
GROUP BY u.user_id, u.join_date
ORDER BY u.user_id;`,
    expectedRows: [
      { buyer_id: 1, join_date: '2018-01-01', orders_in_2019: 1 },
      { buyer_id: 2, join_date: '2018-02-09', orders_in_2019: 2 },
      { buyer_id: 3, join_date: '2018-01-19', orders_in_2019: 0 },
      { buyer_id: 4, join_date: '2018-05-21', orders_in_2019: 0 },
    ],
  }),

  makeSqlProblem({
    id: 555,
    title: 'Find the Start and End Number of Continuous Ranges',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Value - ROW_NUMBER() Gap Grouping',
    statement: 'Report start_id and end_id of every continuous sequence of log_id values ordered by start_id.',
    inputSummary: 'Logs (6 integer ids)',
    outputSummary: '[1..3], [7..8], [10..10]',
    explanation: 'Consecutive values have identical (log_id - ROW_NUMBER()) keys.',
    schemaDdl: `CREATE TABLE Logs (
  log_id INT PRIMARY KEY
);
INSERT INTO Logs VALUES (1), (2), (3), (7), (8), (10);`,
    expectedQuery: `WITH Islands AS (
  SELECT log_id, log_id - ROW_NUMBER() OVER (ORDER BY log_id) AS grp
  FROM Logs
)
SELECT MIN(log_id) AS start_id, MAX(log_id) AS end_id
FROM Islands
GROUP BY grp
ORDER BY start_id;`,
    expectedRows: [
      { start_id: 1, end_id: 3 },
      { start_id: 7, end_id: 8 },
      { start_id: 10, end_id: 10 },
    ],
  }),

  makeSqlProblem({
    id: 556,
    title: 'Running Total for Different Genders',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Partitioned Cumulative Sum',
    statement: 'Compute cumulative score_points per gender sorted by gender ASC, day ASC as columns gender, day, total.',
    inputSummary: 'Scores (7 match score entries)',
    outputSummary: 'Running totals independently for F and M',
    explanation: 'SUM(score_points) OVER (PARTITION BY gender ORDER BY day).',
    schemaDdl: `CREATE TABLE Scores (
  player_name VARCHAR(30),
  gender VARCHAR(2),
  day VARCHAR(20),
  score_points INT
);
INSERT INTO Scores VALUES
  ('Aron', 'F', '2020-01-01', 17), ('Alice', 'F', '2020-01-07', 23),
  ('Bajrang', 'M', '2020-01-07', 7), ('Khali', 'M', '2019-12-25', 11),
  ('Slaman', 'M', '2019-12-30', 13), ('Joe', 'M', '2019-12-31', 3),
  ('Jose', 'M', '2019-12-18', 2);`,
    expectedQuery: `SELECT gender, day,
  SUM(score_points) OVER (PARTITION BY gender ORDER BY day) AS total
FROM Scores
ORDER BY gender ASC, day ASC;`,
    expectedRows: [
      { gender: 'F', day: '2020-01-01', total: 17 },
      { gender: 'F', day: '2020-01-07', total: 40 },
      { gender: 'M', day: '2019-12-18', total: 2 },
      { gender: 'M', day: '2019-12-25', total: 13 },
      { gender: 'M', day: '2019-12-30', total: 26 },
      { gender: 'M', day: '2019-12-31', total: 29 },
      { gender: 'M', day: '2020-01-07', total: 36 },
    ],
  }),

  makeSqlProblem({
    id: 557,
    title: 'Number of Calls Between Two Persons',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Normalized Undirected Edge Grouping',
    statement:
      'Report call_count and total_duration between every unique pair (person1, person2) where person1 < person2, ordered by person1, person2.',
    inputSummary: 'Calls (7 call records)',
    outputSummary: '(1,2): 2 calls 70s, (1,3): 1 call 20s, (3,4): 4 calls 999s',
    explanation: 'Normalize MIN(from_id, to_id) / CASE WHEN so bidirectional calls group together.',
    schemaDdl: `CREATE TABLE Calls (
  from_id INT,
  to_id INT,
  duration INT
);
INSERT INTO Calls VALUES (1, 2, 59), (2, 1, 11), (1, 3, 20), (3, 4, 100), (3, 4, 200), (3, 4, 200), (4, 3, 499);`,
    expectedQuery: `WITH Normalized AS (
  SELECT
    CASE WHEN from_id < to_id THEN from_id ELSE to_id END AS person1,
    CASE WHEN from_id < to_id THEN to_id ELSE from_id END AS person2,
    duration
  FROM Calls
)
SELECT person1, person2, COUNT(*) AS call_count, SUM(duration) AS total_duration
FROM Normalized
GROUP BY person1, person2
ORDER BY person1, person2;`,
    expectedRows: [
      { person1: 1, person2: 2, call_count: 2, total_duration: 70 },
      { person1: 1, person2: 3, call_count: 1, total_duration: 20 },
      { person1: 3, person2: 4, call_count: 4, total_duration: 999 },
    ],
  }),

  makeSqlProblem({
    id: 558,
    title: 'Calculate Salaries',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Tiered Tax Rate via Company MAX',
    statement:
      'Compute net integer salary rounded to nearest integer: 0% tax if max company salary < 1000, 24% if 1000..10000, 49% if > 10000. Order by company_id, employee_id.',
    inputSummary: 'Salaries (6 employees across 3 companies)',
    outputSummary: 'Taxed salaries according to company bracket',
    explanation: 'Use MAX(salary) OVER (PARTITION BY company_id) to determine the multiplier.',
    schemaDdl: `CREATE TABLE Salaries (
  company_id INT,
  employee_id INT,
  employee_name VARCHAR(40),
  salary INT
);
INSERT INTO Salaries VALUES
  (1, 1, 'Tony', 2000), (1, 2, 'Pronub', 21300), (1, 3, 'Tyrrox', 10800),
  (2, 1, 'Pam', 300), (2, 7, 'Bassem', 450),
  (3, 2, 'Ognjen', 2200), (3, 13, 'Nyancat', 3300);`,
    expectedQuery: `WITH Bracketed AS (
  SELECT *, MAX(salary) OVER (PARTITION BY company_id) AS max_sal
  FROM Salaries
)
SELECT company_id, employee_id, employee_name,
  CAST(ROUND(
    salary * CASE
      WHEN max_sal < 1000 THEN 1.0
      WHEN max_sal <= 10000 THEN 0.76
      ELSE 0.51
    END
  ) AS INTEGER) AS salary
FROM Bracketed
ORDER BY company_id, employee_id;`,
    expectedRows: [
      { company_id: 1, employee_id: 1, employee_name: 'Tony', salary: 1020 },
      { company_id: 1, employee_id: 2, employee_name: 'Pronub', salary: 10863 },
      { company_id: 1, employee_id: 3, employee_name: 'Tyrrox', salary: 5508 },
      { company_id: 2, employee_id: 1, employee_name: 'Pam', salary: 300 },
      { company_id: 2, employee_id: 7, employee_name: 'Bassem', salary: 450 },
      { company_id: 3, employee_id: 2, employee_name: 'Ognjen', salary: 1672 },
      { company_id: 3, employee_id: 13, employee_name: 'Nyancat', salary: 2508 },
    ],
  }),

  makeSqlProblem({
    id: 559,
    title: 'Countries You Can Safely Invest In',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Global vs Group Average Filter',
    statement:
      'Find countries where average call duration (both incoming and outgoing calls) is strictly greater than the global call average.',
    inputSummary: 'Person (4 rows), Country (2 rows), Calls (4 rows)',
    outputSummary: 'country: Peru',
    explanation: 'Map caller_id and callee_id calls to country via phone prefix.',
    schemaDdl: `CREATE TABLE Person (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  phone_number VARCHAR(20)
);
INSERT INTO Person VALUES (3, 'Jonathan', '051-1234567'), (12, 'Elvis', '051-7654321'), (1, 'Moncef', '212-1234567'), (2, 'Maroua', '212-6523651');
CREATE TABLE Country (
  name VARCHAR(40),
  country_code VARCHAR(10)
);
INSERT INTO Country VALUES ('Peru', '051'), ('Morocco', '212');
CREATE TABLE Calls (
  caller_id INT,
  callee_id INT,
  duration INT
);
INSERT INTO Calls VALUES (1, 12, 33), (2, 12, 100), (3, 12, 200), (1, 2, 10);`,
    expectedQuery: `WITH AllLegs AS (
  SELECT c.name AS country, ca.duration
  FROM Calls ca
  JOIN Person p ON ca.caller_id = p.id
  JOIN Country c ON substr(p.phone_number, 1, 3) = c.country_code
  UNION ALL
  SELECT c.name AS country, ca.duration
  FROM Calls ca
  JOIN Person p ON ca.callee_id = p.id
  JOIN Country c ON substr(p.phone_number, 1, 3) = c.country_code
)
SELECT country
FROM AllLegs
GROUP BY country
HAVING AVG(duration * 1.0) > (SELECT AVG(duration * 1.0) FROM Calls);`,
    expectedRows: [{ country: 'Peru' }],
  }),

  makeSqlProblem({
    id: 560,
    title: 'Customers Who Bought All Products',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Relational Division (COUNT DISTINCT)',
    statement: 'Report customer_id values who bought every product in the Product table ordered by customer_id.',
    inputSummary: 'Customer (5 purchase rows), Product (2 items)',
    outputSummary: 'customer_id: 1, 3',
    explanation: 'Customers 1 and 3 purchased both product keys (5 and 6).',
    schemaDdl: `CREATE TABLE Product (
  product_key INT PRIMARY KEY
);
INSERT INTO Product VALUES (5), (6);
CREATE TABLE Customer (
  customer_id INT,
  product_key INT
);
INSERT INTO Customer VALUES (1, 5), (2, 6), (3, 5), (3, 6), (1, 6);`,
    expectedQuery: `SELECT customer_id
FROM Customer
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM Product)
ORDER BY customer_id;`,
    expectedRows: [{ customer_id: 1 }, { customer_id: 3 }],
  }),

  makeSqlProblem({
    id: 561,
    title: 'Product Price at a Given Date',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Latest Price Snapshot + Default 10',
    statement: 'Find the price of all products on 2019-08-16. Assume initial price of every product before any price change is 10.',
    inputSummary: 'Products (6 price change log entries)',
    outputSummary: '1->35, 2->50, 3->10',
    explanation: 'For each distinct product_id, pick the latest change_date <= 2019-08-16 or fallback to 10.',
    schemaDdl: `CREATE TABLE Products (
  product_id INT,
  new_price INT,
  change_date VARCHAR(20)
);
INSERT INTO Products VALUES
  (1, 20, '2019-08-14'), (2, 50, '2019-08-14'), (1, 30, '2019-08-15'),
  (1, 35, '2019-08-16'), (2, 65, '2019-08-17'), (3, 20, '2019-08-18');`,
    expectedQuery: `WITH DistinctProd AS (
  SELECT DISTINCT product_id FROM Products
),
LatestChange AS (
  SELECT product_id, new_price,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY change_date DESC) AS rn
  FROM Products
  WHERE change_date <= '2019-08-16'
)
SELECT d.product_id, COALESCE(l.new_price, 10) AS price
FROM DistinctProd d
LEFT JOIN LatestChange l ON d.product_id = l.product_id AND l.rn = 1
ORDER BY d.product_id;`,
    expectedRows: [
      { product_id: 1, price: 35 },
      { product_id: 2, price: 50 },
      { product_id: 3, price: 10 },
    ],
  }),

  makeSqlProblem({
    id: 562,
    title: 'Confirmation Rate',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'LEFT JOIN Conditional Rate',
    statement: 'Find confirmation_rate of each user rounded to 2 decimal places (0.0 for users without requests), ordered by user_id.',
    inputSummary: 'Signups (4 users), Confirmations (6 logs)',
    outputSummary: '2: 0.5, 3: 0.0, 6: 0.0, 7: 1.0',
    explanation: 'AVG(CASE WHEN action = "confirmed" THEN 1.0 ELSE 0.0 END) yields 0.0 for NULL LEFT JOIN rows.',
    schemaDdl: `CREATE TABLE Signups (
  user_id INT PRIMARY KEY,
  time_stamp VARCHAR(30)
);
INSERT INTO Signups VALUES (3, '2020-03-21'), (7, '2020-01-04'), (2, '2020-07-29'), (6, '2020-12-09');
CREATE TABLE Confirmations (
  user_id INT,
  time_stamp VARCHAR(30),
  action VARCHAR(20)
);
INSERT INTO Confirmations VALUES
  (3, '2021-01-06', 'timeout'), (3, '2021-07-14', 'timeout'),
  (7, '2021-06-12', 'confirmed'), (7, '2021-06-13', 'confirmed'),
  (2, '2021-01-22', 'confirmed'), (2, '2021-02-28', 'timeout');`,
    expectedQuery: `SELECT s.user_id,
  ROUND(AVG(CASE WHEN c.action = 'confirmed' THEN 1.0 ELSE 0.0 END), 2) AS confirmation_rate
FROM Signups s
LEFT JOIN Confirmations c ON s.user_id = c.user_id
GROUP BY s.user_id
ORDER BY s.user_id;`,
    expectedRows: [
      { user_id: 2, confirmation_rate: 0.5 },
      { user_id: 3, confirmation_rate: 0.0 },
      { user_id: 6, confirmation_rate: 0.0 },
      { user_id: 7, confirmation_rate: 1.0 },
    ],
  }),

  makeSqlProblem({
    id: 563,
    title: 'Count Salary Categories',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Fixed Bucket UNION ALL Zero-Preserve',
    statement:
      'Report accounts_count for "Low Salary" (<20000), "Average Salary" (20000..50000), and "High Salary" (>50000), including 0-count buckets.',
    inputSummary: 'Accounts (4 bank accounts)',
    outputSummary: 'Low: 1, Average: 0, High: 3',
    explanation: 'UNION ALL of the three category filters ensures Average Salary appears with 0.',
    schemaDdl: `CREATE TABLE Accounts (
  account_id INT PRIMARY KEY,
  income INT
);
INSERT INTO Accounts VALUES (3, 108939), (2, 12747), (8, 87709), (6, 91796);`,
    expectedQuery: `SELECT 'Low Salary' AS category, COUNT(*) AS accounts_count FROM Accounts WHERE income < 20000
UNION ALL
SELECT 'Average Salary' AS category, COUNT(*) AS accounts_count FROM Accounts WHERE income BETWEEN 20000 AND 50000
UNION ALL
SELECT 'High Salary' AS category, COUNT(*) AS accounts_count FROM Accounts WHERE income > 50000;`,
    expectedRows: [
      { category: 'Low Salary', accounts_count: 1 },
      { category: 'Average Salary', accounts_count: 0 },
      { category: 'High Salary', accounts_count: 3 },
    ],
  }),

  makeSqlProblem({
    id: 564,
    title: 'Consecutive Available Seats',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'LAG / LEAD Adjacent Seat Check',
    statement: 'Report all seat_id values of consecutive available (free = 1) cinema seats in ascending order.',
    inputSummary: 'Cinema (5 seats)',
    outputSummary: 'seat_id: 3, 4, 5',
    explanation: 'A seat qualifies if free=1 and either adjacent seat_id also has free=1.',
    schemaDdl: `CREATE TABLE Cinema (
  seat_id INT PRIMARY KEY,
  free INT
);
INSERT INTO Cinema VALUES (1, 1), (2, 0), (3, 1), (4, 1), (5, 1);`,
    expectedQuery: `WITH Neighbor AS (
  SELECT seat_id, free,
    LAG(free) OVER (ORDER BY seat_id) AS prev_free,
    LEAD(free) OVER (ORDER BY seat_id) AS next_free
  FROM Cinema
)
SELECT seat_id
FROM Neighbor
WHERE free = 1 AND (prev_free = 1 OR next_free = 1)
ORDER BY seat_id;`,
    expectedRows: [{ seat_id: 3 }, { seat_id: 4 }, { seat_id: 5 }],
  }),

  makeSqlProblem({
    id: 565,
    title: 'Customer Who Visited but Did Not Make Any Transactions',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'LEFT JOIN Anti-Join + COUNT',
    statement: 'Find customer_id values who visited the mall without making any transactions and count how many such visits (count_no_trans) they made.',
    inputSummary: 'Visits (7 visits), Transactions (4 purchases)',
    outputSummary: '54: 2, 30: 1, 96: 1',
    explanation: 'Filter LEFT JOIN where transaction_id IS NULL and group by customer_id.',
    schemaDdl: `CREATE TABLE Visits (
  visit_id INT PRIMARY KEY,
  customer_id INT
);
INSERT INTO Visits VALUES (1, 23), (2, 9), (4, 30), (5, 54), (6, 96), (7, 54), (8, 54);
CREATE TABLE Transactions (
  transaction_id INT PRIMARY KEY,
  visit_id INT,
  amount INT
);
INSERT INTO Transactions VALUES (2, 5, 310), (3, 5, 300), (9, 5, 200), (12, 1, 910), (13, 2, 970);`,
    expectedQuery: `SELECT v.customer_id, COUNT(*) AS count_no_trans
FROM Visits v
LEFT JOIN Transactions t ON v.visit_id = t.visit_id
WHERE t.transaction_id IS NULL
GROUP BY v.customer_id
ORDER BY count_no_trans DESC, v.customer_id ASC;`,
    expectedRows: [
      { customer_id: 54, count_no_trans: 2 },
      { customer_id: 30, count_no_trans: 1 },
      { customer_id: 96, count_no_trans: 1 },
    ],
  }),

  makeSqlProblem({
    id: 566,
    title: 'Bank Account Summary II',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'JOIN + HAVING SUM > 10000',
    statement: 'Report the name and current balance of users with total transaction balance strictly greater than 10000.',
    inputSummary: 'Users (3 accounts), Transactions (7 ledger rows)',
    outputSummary: 'Alice: 11000',
    explanation: 'Alice: 7000 + 7000 - 3000 = 11000 > 10000.',
    schemaDdl: `CREATE TABLE Users (
  account INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Users VALUES (900001, 'Alice'), (900002, 'Bob'), (900003, 'Charlie');
CREATE TABLE Transactions (
  trans_id INT PRIMARY KEY,
  account INT,
  amount INT
);
INSERT INTO Transactions VALUES
  (1, 900001, 7000), (2, 900001, 7000), (3, 900001, -3000),
  (4, 900002, 1000), (5, 900003, 6000), (6, 900003, 6000), (7, 900003, -4000);`,
    expectedQuery: `SELECT u.name, SUM(t.amount) AS balance
FROM Users u
JOIN Transactions t ON u.account = t.account
GROUP BY u.account, u.name
HAVING SUM(t.amount) > 10000;`,
    expectedRows: [{ name: 'Alice', balance: 11000 }],
  }),

  makeSqlProblem({
    id: 567,
    title: 'Fix Names in a Table',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'String Case Normalization',
    statement: 'Format every user name so only the first character is uppercase and the rest are lowercase, ordered by user_id.',
    inputSummary: 'Users (aLice, bOB)',
    outputSummary: '1->Alice, 2->Bob',
    explanation: 'Use UPPER(substr(name, 1, 1)) || LOWER(substr(name, 2)) in SQLite.',
    schemaDdl: `CREATE TABLE Users (
  user_id INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Users VALUES (1, 'aLice'), (2, 'bOB');`,
    expectedQuery: `SELECT user_id,
  UPPER(substr(name, 1, 1)) || LOWER(substr(name, 2)) AS name
FROM Users
ORDER BY user_id;`,
    expectedRows: [
      { user_id: 1, name: 'Alice' },
      { user_id: 2, name: 'Bob' },
    ],
  }),

  makeSqlProblem({
    id: 568,
    title: 'Top Travellers',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'LEFT JOIN + COALESCE + Tie Sort',
    statement: 'Report name and travelled_distance of every user ordered by travelled_distance DESC, name ASC.',
    inputSummary: 'Users (4 rows), Rides (5 trip records)',
    outputSummary: 'Bob: 450, Elvis: 450, Alice: 120, Donald: 0',
    explanation: 'Users without rides appear with 0 via COALESCE(SUM(r.distance), 0).',
    schemaDdl: `CREATE TABLE Users (
  id INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Users VALUES (1, 'Alice'), (2, 'Bob'), (19, 'Elvis'), (4, 'Donald');
CREATE TABLE Rides (
  id INT PRIMARY KEY,
  user_id INT,
  distance INT
);
INSERT INTO Rides VALUES (1, 1, 120), (2, 2, 317), (3, 19, 400), (4, 19, 50), (5, 2, 133);`,
    expectedQuery: `SELECT u.name, COALESCE(SUM(r.distance), 0) AS travelled_distance
FROM Users u
LEFT JOIN Rides r ON u.id = r.user_id
GROUP BY u.id, u.name
ORDER BY travelled_distance DESC, u.name ASC;`,
    expectedRows: [
      { name: 'Bob', travelled_distance: 450 },
      { name: 'Elvis', travelled_distance: 450 },
      { name: 'Alice', travelled_distance: 120 },
      { name: 'Donald', travelled_distance: 0 },
    ],
  }),

  makeSqlProblem({
    id: 569,
    title: 'Group Sold Products By The Date',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Distinct Sort CTE + GROUP_CONCAT',
    statement:
      'For each sell_date report num_sold (number of distinct products) and products (comma-separated distinct product names sorted lexicographically). Order by sell_date.',
    inputSummary: 'Activities (7 sales rows)',
    outputSummary: 'Comma-separated product lists per date',
    explanation: 'Deduplicate and sort (sell_date, product) inside a CTE first, then GROUP_CONCAT(product, ",").',
    schemaDdl: `CREATE TABLE Activities (
  sell_date VARCHAR(20),
  product VARCHAR(40)
);
INSERT INTO Activities VALUES
  ('2020-05-30', 'Headphone'), ('2020-06-01', 'Pencil'), ('2020-06-02', 'Mask'),
  ('2020-05-30', 'Basketball'), ('2020-06-01', 'Bible'), ('2020-06-02', 'Mask'),
  ('2020-05-30', 'T-Shirt');`,
    expectedQuery: `WITH DistinctSales AS (
  SELECT DISTINCT sell_date, product
  FROM Activities
  ORDER BY sell_date ASC, product ASC
)
SELECT sell_date, COUNT(product) AS num_sold, GROUP_CONCAT(product, ',') AS products
FROM DistinctSales
GROUP BY sell_date
ORDER BY sell_date ASC;`,
    expectedRows: [
      { sell_date: '2020-05-30', num_sold: 3, products: 'Basketball,Headphone,T-Shirt' },
      { sell_date: '2020-06-01', num_sold: 2, products: 'Bible,Pencil' },
      { sell_date: '2020-06-02', num_sold: 1, products: 'Mask' },
    ],
  }),

  makeSqlProblem({
    id: 570,
    title: 'Patients With a Condition',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Prefix/Space Token LIKE Match',
    statement: 'Report patient_id, patient_name, and conditions for patients who have Type I Diabetes (condition token starting with DIAB1).',
    inputSummary: 'Patients (5 medical chart entries)',
    outputSummary: 'Bob (id=3), George (id=4)',
    explanation: 'Match DIAB1% at start OR % DIAB1% after a space so SADIAB100 is excluded.',
    schemaDdl: `CREATE TABLE Patients (
  patient_id INT PRIMARY KEY,
  patient_name VARCHAR(40),
  conditions VARCHAR(80)
);
INSERT INTO Patients VALUES
  (1, 'Daniel', 'YFEV COUGH'), (2, 'Alice', ''), (3, 'Bob', 'DIAB100 MYOP'),
  (4, 'George', 'ACNE DIAB100'), (5, 'Alain', 'DIAB201 SADIAB100');`,
    expectedQuery: `SELECT patient_id, patient_name, conditions
FROM Patients
WHERE conditions LIKE 'DIAB1%' OR conditions LIKE '% DIAB1%'
ORDER BY patient_id;`,
    expectedRows: [
      { patient_id: 3, patient_name: 'Bob', conditions: 'DIAB100 MYOP' },
      { patient_id: 4, patient_name: 'George', conditions: 'ACNE DIAB100' },
    ],
  }),

  makeSqlProblem({
    id: 571,
    title: 'The Latest Login in 2020',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Date Range Filter + MAX()',
    statement: 'Report user_id and last_stamp for users who logged in during calendar year 2020 ordered by user_id.',
    inputSummary: 'Logins (6 timestamps)',
    outputSummary: '2: 2020-01-16 02:49:50, 6: 2020-06-30 15:06:07, 8: 2020-12-30 00:46:50',
    explanation: 'Filter substr(time_stamp, 1, 4) = "2020" then GROUP BY user_id with MAX(time_stamp).',
    schemaDdl: `CREATE TABLE Logins (
  user_id INT,
  time_stamp VARCHAR(30)
);
INSERT INTO Logins VALUES
  (6, '2020-06-30 15:06:07'), (6, '2021-04-21 14:06:06'), (6, '2019-03-07 00:18:15'),
  (8, '2020-02-01 05:10:53'), (8, '2020-12-30 00:46:50'), (2, '2020-01-16 02:49:50');`,
    expectedQuery: `SELECT user_id, MAX(time_stamp) AS last_stamp
FROM Logins
WHERE substr(time_stamp, 1, 4) = '2020'
GROUP BY user_id
ORDER BY user_id;`,
    expectedRows: [
      { user_id: 2, last_stamp: '2020-01-16 02:49:50' },
      { user_id: 6, last_stamp: '2020-06-30 15:06:07' },
      { user_id: 8, last_stamp: '2020-12-30 00:46:50' },
    ],
  }),

  makeSqlProblem({
    id: 572,
    title: 'Employees With Missing Information',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Symmetric Anti-Join UNION',
    statement: 'Report employee_id values missing either their name (in Employees) or their salary (in Salaries), sorted ascending.',
    inputSummary: 'Employees (3 rows), Salaries (3 rows)',
    outputSummary: 'employee_id: 1, 2',
    explanation: 'Combine Employees lacking Salaries with Salaries lacking Employees via UNION.',
    schemaDdl: `CREATE TABLE Employees (
  employee_id INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Employees VALUES (2, 'Crew'), (4, 'Haven'), (5, 'Kristian');
CREATE TABLE Salaries (
  employee_id INT PRIMARY KEY,
  salary INT
);
INSERT INTO Salaries VALUES (5, 76071), (1, 22517), (4, 63539);`,
    expectedQuery: `SELECT e.employee_id FROM Employees e LEFT JOIN Salaries s ON e.employee_id = s.employee_id WHERE s.employee_id IS NULL
UNION
SELECT s.employee_id FROM Salaries s LEFT JOIN Employees e ON s.employee_id = e.employee_id WHERE e.employee_id IS NULL
ORDER BY employee_id ASC;`,
    expectedRows: [{ employee_id: 1 }, { employee_id: 2 }],
  }),

  makeSqlProblem({
    id: 573,
    title: 'Find Total Time Spent by Each Employee',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Duration Difference Aggregation',
    statement: 'Calculate total minutes spent at the office by each employee on each day (day, emp_id, total_time) ordered by day, emp_id.',
    inputSummary: 'Employees (5 punch-in/out sessions)',
    outputSummary: '2020-11-28 emp 1: 173, emp 2: 30; 2020-12-03 emp 1: 41; 2020-12-09 emp 2: 27',
    explanation: 'Sum (out_time - in_time) grouped by event_day and emp_id.',
    schemaDdl: `CREATE TABLE Employees (
  emp_id INT,
  event_day VARCHAR(20),
  in_time INT,
  out_time INT
);
INSERT INTO Employees VALUES
  (1, '2020-11-28', 4, 32), (1, '2020-11-28', 55, 200),
  (1, '2020-12-03', 1, 42), (2, '2020-11-28', 3, 33),
  (2, '2020-12-09', 47, 74);`,
    expectedQuery: `SELECT event_day AS day, emp_id, SUM(out_time - in_time) AS total_time
FROM Employees
GROUP BY event_day, emp_id
ORDER BY day, emp_id;`,
    expectedRows: [
      { day: '2020-11-28', emp_id: 1, total_time: 173 },
      { day: '2020-11-28', emp_id: 2, total_time: 30 },
      { day: '2020-12-03', emp_id: 1, total_time: 41 },
      { day: '2020-12-09', emp_id: 2, total_time: 27 },
    ],
  }),

  makeSqlProblem({
    id: 574,
    title: 'Recyclable and Low Fat Products',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'Boolean Flag Filtering',
    statement: 'Find product_id of products that are both low fat ("Y") and recyclable ("Y") ordered by product_id.',
    inputSummary: 'Products (5 items)',
    outputSummary: 'product_id: 1, 3',
    explanation: 'Direct compound WHERE filter on indexed boolean columns.',
    schemaDdl: `CREATE TABLE Products (
  product_id INT PRIMARY KEY,
  low_fats VARCHAR(2),
  recyclable VARCHAR(2)
);
INSERT INTO Products VALUES (0, 'Y', 'N'), (1, 'Y', 'Y'), (2, 'N', 'Y'), (3, 'Y', 'Y'), (4, 'N', 'N');`,
    expectedQuery: `SELECT product_id
FROM Products
WHERE low_fats = 'Y' AND recyclable = 'Y'
ORDER BY product_id;`,
    expectedRows: [{ product_id: 1 }, { product_id: 3 }],
  }),

  makeSqlProblem({
    id: 575,
    title: 'Rearrange Products Table',
    difficulty: 'Medium',
    topic: 'Common Table Expressions',
    pattern: 'UNION ALL Unpivot Columns to Rows',
    statement: 'Unpivot Products(product_id, store1, store2, store3) into (product_id, store, price) omitting NULL prices ordered by product_id, store.',
    inputSummary: 'Products (2 products across 3 stores)',
    outputSummary: '5 (product_id, store, price) pairs',
    explanation: 'Each SELECT branch extracts one store column where price IS NOT NULL.',
    schemaDdl: `CREATE TABLE Products (
  product_id INT PRIMARY KEY,
  store1 INT,
  store2 INT,
  store3 INT
);
INSERT INTO Products VALUES (0, 95, 100, 105), (1, 70, NULL, 80);`,
    expectedQuery: `SELECT product_id, 'store1' AS store, store1 AS price FROM Products WHERE store1 IS NOT NULL
UNION ALL
SELECT product_id, 'store2' AS store, store2 AS price FROM Products WHERE store2 IS NOT NULL
UNION ALL
SELECT product_id, 'store3' AS store, store3 AS price FROM Products WHERE store3 IS NOT NULL
ORDER BY product_id, store;`,
    expectedRows: [
      { product_id: 0, store: 'store1', price: 95 },
      { product_id: 0, store: 'store2', price: 100 },
      { product_id: 0, store: 'store3', price: 105 },
      { product_id: 1, store: 'store1', price: 70 },
      { product_id: 1, store: 'store3', price: 80 },
    ],
  }),
];
