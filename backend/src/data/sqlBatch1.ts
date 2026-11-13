import { makeSqlProblem, SqlProblemDefinition } from './sqlHelper';

export const SQL_BATCH_1: SqlProblemDefinition[] = [
  makeSqlProblem({
    id: 501,
    title: 'Combine Two Tables',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'LEFT JOIN',
    statement:
      'Report the firstName, lastName, city, and state of each person in the Person table. If the address of a personId is not present in the Address table, return NULL for city and state.',
    inputSummary: 'Person (2 rows), Address (2 rows)',
    outputSummary: 'Allen Wang (NULL, NULL), Bob Alice (New York City, New York)',
    explanation: 'Use LEFT JOIN from Person to Address on personId so unmatched persons still appear.',
    schemaDdl: `CREATE TABLE Person (
  personId INT PRIMARY KEY,
  lastName VARCHAR(50),
  firstName VARCHAR(50)
);
INSERT INTO Person VALUES (1, 'Wang', 'Allen'), (2, 'Alice', 'Bob');
CREATE TABLE Address (
  addressId INT PRIMARY KEY,
  personId INT,
  city VARCHAR(50),
  state VARCHAR(50)
);
INSERT INTO Address VALUES (1, 2, 'New York City', 'New York'), (2, 3, 'Leetcode', 'California');`,
    expectedQuery: `SELECT p.firstName, p.lastName, a.city, a.state
FROM Person p
LEFT JOIN Address a ON p.personId = a.personId
ORDER BY p.personId;`,
    expectedRows: [
      { firstName: 'Allen', lastName: 'Wang', city: null, state: null },
      { firstName: 'Bob', lastName: 'Alice', city: 'New York City', state: 'New York' },
    ],
  }),

  makeSqlProblem({
    id: 502,
    title: 'Employees Earning More Than Their Managers',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Self Join',
    statement:
      'Find all employees who earn strictly more than their direct manager. Return the employee name column as Employee.',
    inputSummary: 'Employee (4 rows with managerId reference)',
    outputSummary: 'Employee: Joe',
    explanation: 'Joe earns 70000 while his manager Sam (id=3) earns 60000.',
    schemaDdl: `CREATE TABLE Employee (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  salary INT,
  managerId INT
);
INSERT INTO Employee VALUES (1, 'Joe', 70000, 3), (2, 'Henry', 80000, 4), (3, 'Sam', 60000, NULL), (4, 'Max', 90000, NULL);`,
    expectedQuery: `SELECT e.name AS Employee
FROM Employee e
JOIN Employee m ON e.managerId = m.id
WHERE e.salary > m.salary;`,
    expectedRows: [{ Employee: 'Joe' }],
  }),

  makeSqlProblem({
    id: 503,
    title: 'Duplicate Emails',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'GROUP BY + HAVING',
    statement: 'Report all duplicate email addresses present in the Person table as column Email.',
    inputSummary: 'Person (3 email records)',
    outputSummary: 'Email: a@b.com',
    explanation: 'a@b.com appears twice while c@d.com appears only once.',
    schemaDdl: `CREATE TABLE Person (
  id INT PRIMARY KEY,
  email VARCHAR(100)
);
INSERT INTO Person VALUES (1, 'a@b.com'), (2, 'c@d.com'), (3, 'a@b.com');`,
    expectedQuery: `SELECT email AS Email
FROM Person
GROUP BY email
HAVING COUNT(*) > 1;`,
    expectedRows: [{ Email: 'a@b.com' }],
  }),

  makeSqlProblem({
    id: 504,
    title: 'Customers Who Never Order',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'LEFT JOIN Anti-Join',
    statement: 'Find all customers who have never placed an order. Return their names under column Customers.',
    inputSummary: 'Customers (4 rows), Orders (2 rows)',
    outputSummary: 'Henry, Max',
    explanation: 'Customer IDs 1 and 3 appear in Orders; IDs 2 (Henry) and 4 (Max) have no matching orders.',
    schemaDdl: `CREATE TABLE Customers (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);
INSERT INTO Customers VALUES (1, 'Joe'), (2, 'Henry'), (3, 'Sam'), (4, 'Max');
CREATE TABLE Orders (
  id INT PRIMARY KEY,
  customerId INT
);
INSERT INTO Orders VALUES (1, 3), (2, 1);`,
    expectedQuery: `SELECT c.name AS Customers
FROM Customers c
LEFT JOIN Orders o ON c.id = o.customerId
WHERE o.id IS NULL
ORDER BY c.id;`,
    expectedRows: [{ Customers: 'Henry' }, { Customers: 'Max' }],
  }),

  makeSqlProblem({
    id: 505,
    title: 'Big Countries',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Filtering with OR',
    statement:
      'A country is considered big if its area is at least 3,000,000 sq km OR its population is at least 25,000,000. Report name, population, and area.',
    inputSummary: 'World (5 country records)',
    outputSummary: 'Afghanistan, Algeria',
    explanation: 'Afghanistan qualifies by population (>=25M); Algeria qualifies by population and area (>=3M? pop 37.1M >= 25M).',
    schemaDdl: `CREATE TABLE World (
  name VARCHAR(60) PRIMARY KEY,
  continent VARCHAR(40),
  area INT,
  population INT,
  gdp INT
);
INSERT INTO World VALUES
  ('Afghanistan', 'Asia', 652230, 25500100, 20343000),
  ('Albania', 'Europe', 28748, 2831741, 12960000),
  ('Algeria', 'Africa', 2381741, 37100000, 188681000),
  ('Andorra', 'Europe', 468, 78115, 3712000),
  ('Angola', 'Africa', 1246700, 20609294, 100990000);`,
    expectedQuery: `SELECT name, population, area
FROM World
WHERE area >= 3000000 OR population >= 25000000
ORDER BY name;`,
    expectedRows: [
      { name: 'Afghanistan', population: 25500100, area: 652230 },
      { name: 'Algeria', population: 37100000, area: 2381741 },
    ],
  }),

  makeSqlProblem({
    id: 506,
    title: 'Classes More Than 5 Students',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'GROUP BY + COUNT(DISTINCT)',
    statement: 'Find all classes that have at least five distinct students enrolled.',
    inputSummary: 'Courses (8 student-class rows)',
    outputSummary: 'Math',
    explanation: 'Math has 6 students; English and Biology each have 1.',
    schemaDdl: `CREATE TABLE Courses (
  student VARCHAR(30),
  class VARCHAR(30)
);
INSERT INTO Courses VALUES
  ('A', 'Math'), ('B', 'English'), ('C', 'Math'), ('D', 'Biology'),
  ('E', 'Math'), ('F', 'Math'), ('G', 'Math'), ('H', 'Math');`,
    expectedQuery: `SELECT class
FROM Courses
GROUP BY class
HAVING COUNT(DISTINCT student) >= 5;`,
    expectedRows: [{ class: 'Math' }],
  }),

  makeSqlProblem({
    id: 507,
    title: 'Not Boring Movies',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Modulo + String Filter + Sort',
    statement:
      'Report movies with an odd-numbered id and a description that is not "boring". Return columns ordered by rating descending.',
    inputSummary: 'Cinema (5 movie rows)',
    outputSummary: 'House card (id=5, rating=9.1), War (id=1, rating=8.9)',
    explanation: 'Id 3 has odd id but boring description; Ids 2 and 4 are even.',
    schemaDdl: `CREATE TABLE Cinema (
  id INT PRIMARY KEY,
  movie VARCHAR(60),
  description VARCHAR(80),
  rating REAL
);
INSERT INTO Cinema VALUES
  (1, 'War', 'great 3D', 8.9),
  (2, 'Science', 'fiction', 8.5),
  (3, 'Irish', 'boring', 6.2),
  (4, 'Ice song', 'Fantacy', 8.6),
  (5, 'House card', 'Interesting', 9.1);`,
    expectedQuery: `SELECT id, movie, description, rating
FROM Cinema
WHERE id % 2 = 1 AND description != 'boring'
ORDER BY rating DESC;`,
    expectedRows: [
      { id: 5, movie: 'House card', description: 'Interesting', rating: 9.1 },
      { id: 1, movie: 'War', description: 'great 3D', rating: 8.9 },
    ],
  }),

  makeSqlProblem({
    id: 508,
    title: 'Swap Salary',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Conditional CASE Projection',
    statement:
      'Write a read-only SELECT query on the Salary table returning (id, name, sex, salary) where all "f" and "m" values in sex are swapped (sorted by id ASC).',
    inputSummary: 'Salary (4 employee records)',
    outputSummary: 'A->f, B->m, C->f, D->m',
    explanation: 'CASE WHEN flips "m" to "f" and "f" to "m" cleanly in a read-only query.',
    schemaDdl: `CREATE TABLE Salary (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  sex VARCHAR(2),
  salary INT
);
INSERT INTO Salary VALUES (1, 'A', 'm', 2500), (2, 'B', 'f', 1500), (3, 'C', 'm', 5500), (4, 'D', 'f', 500);`,
    expectedQuery: `SELECT id, name,
  CASE WHEN sex = 'm' THEN 'f' ELSE 'm' END AS sex,
  salary
FROM Salary
ORDER BY id;`,
    expectedRows: [
      { id: 1, name: 'A', sex: 'f', salary: 2500 },
      { id: 2, name: 'B', sex: 'm', salary: 1500 },
      { id: 3, name: 'C', sex: 'f', salary: 5500 },
      { id: 4, name: 'D', sex: 'm', salary: 500 },
    ],
  }),

  makeSqlProblem({
    id: 509,
    title: 'Actors and Directors Who Cooperated At Least Three Times',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Multi-Column GROUP BY',
    statement:
      'Find all (actor_id, director_id) pairs where the actor has cooperated with the director at least 3 times.',
    inputSummary: 'ActorDirector (7 cooperation events)',
    outputSummary: 'actor_id=1, director_id=1',
    explanation: 'Pair (1,1) appears 3 times at timestamps 0, 1, 2.',
    schemaDdl: `CREATE TABLE ActorDirector (
  actor_id INT,
  director_id INT,
  timestamp INT PRIMARY KEY
);
INSERT INTO ActorDirector VALUES
  (1, 1, 0), (1, 1, 1), (1, 1, 2),
  (1, 2, 3), (1, 2, 4), (2, 1, 5), (2, 1, 6);`,
    expectedQuery: `SELECT actor_id, director_id
FROM ActorDirector
GROUP BY actor_id, director_id
HAVING COUNT(*) >= 3;`,
    expectedRows: [{ actor_id: 1, director_id: 1 }],
  }),

  makeSqlProblem({
    id: 510,
    title: 'Reformat Department Table',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Conditional Aggregation Pivot',
    statement:
      'Reformat Department revenue rows into columns id, Jan_Revenue, Feb_Revenue, and Mar_Revenue for each department id.',
    inputSummary: 'Department (5 monthly revenue entries)',
    outputSummary: 'Pivot columns Jan_Revenue, Feb_Revenue, Mar_Revenue',
    explanation: 'Use SUM(CASE WHEN month = ... THEN revenue END) grouped by department id.',
    schemaDdl: `CREATE TABLE Department (
  id INT,
  revenue INT,
  month VARCHAR(10)
);
INSERT INTO Department VALUES
  (1, 8000, 'Jan'), (2, 9000, 'Jan'), (3, 10000, 'Feb'), (1, 7000, 'Feb'), (1, 6000, 'Mar');`,
    expectedQuery: `SELECT id,
  SUM(CASE WHEN month = 'Jan' THEN revenue END) AS Jan_Revenue,
  SUM(CASE WHEN month = 'Feb' THEN revenue END) AS Feb_Revenue,
  SUM(CASE WHEN month = 'Mar' THEN revenue END) AS Mar_Revenue
FROM Department
GROUP BY id
ORDER BY id;`,
    expectedRows: [
      { id: 1, Jan_Revenue: 8000, Feb_Revenue: 7000, Mar_Revenue: 6000 },
      { id: 2, Jan_Revenue: 9000, Feb_Revenue: null, Mar_Revenue: null },
      { id: 3, Jan_Revenue: null, Feb_Revenue: 10000, Mar_Revenue: null },
    ],
  }),

  makeSqlProblem({
    id: 511,
    title: 'Game Play Analysis I',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'GROUP BY + MIN()',
    statement: 'Report the first login date (first_login) for each player in the Activity table ordered by player_id.',
    inputSummary: 'Activity (5 login events across 3 players)',
    outputSummary: 'Player 1: 2016-03-01, Player 2: 2017-06-25, Player 3: 2016-03-02',
    explanation: 'Group by player_id and select MIN(event_date).',
    schemaDdl: `CREATE TABLE Activity (
  player_id INT,
  device_id INT,
  event_date VARCHAR(20),
  games_played INT
);
INSERT INTO Activity VALUES
  (1, 2, '2016-03-01', 5),
  (1, 2, '2016-05-02', 6),
  (2, 3, '2017-06-25', 1),
  (3, 1, '2016-03-02', 0),
  (3, 4, '2018-07-03', 5);`,
    expectedQuery: `SELECT player_id, MIN(event_date) AS first_login
FROM Activity
GROUP BY player_id
ORDER BY player_id;`,
    expectedRows: [
      { player_id: 1, first_login: '2016-03-01' },
      { player_id: 2, first_login: '2017-06-25' },
      { player_id: 3, first_login: '2016-03-02' },
    ],
  }),

  makeSqlProblem({
    id: 512,
    title: 'Rising Temperature',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Self Join with Date Difference',
    statement: 'Find all Weather ids whose temperature is strictly higher than the previous calendar day.',
    inputSummary: 'Weather (4 daily temperature rows)',
    outputSummary: 'id: 2, 4',
    explanation: 'Compare w1 and w2 where julianday(w1.recordDate) - julianday(w2.recordDate) = 1.',
    schemaDdl: `CREATE TABLE Weather (
  id INT PRIMARY KEY,
  recordDate VARCHAR(20),
  temperature INT
);
INSERT INTO Weather VALUES
  (1, '2015-01-01', 10),
  (2, '2015-01-02', 25),
  (3, '2015-01-03', 20),
  (4, '2015-01-04', 30);`,
    expectedQuery: `SELECT w1.id
FROM Weather w1
JOIN Weather w2 ON ROUND(julianday(w1.recordDate) - julianday(w2.recordDate)) = 1
WHERE w1.temperature > w2.temperature
ORDER BY w1.id;`,
    expectedRows: [{ id: 2 }, { id: 4 }],
  }),

  makeSqlProblem({
    id: 513,
    title: 'Employee Bonus',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'LEFT JOIN + NULL Handling',
    statement: 'Report the name and bonus amount of every employee with a bonus strictly less than 1000 or no bonus record.',
    inputSummary: 'Employee (4 rows), Bonus (2 rows)',
    outputSummary: 'Brad (NULL), John (NULL), Dan (500)',
    explanation: 'Include rows where b.bonus < 1000 OR b.bonus IS NULL after LEFT JOIN.',
    schemaDdl: `CREATE TABLE Employee (
  empId INT PRIMARY KEY,
  name VARCHAR(50),
  supervisor INT,
  salary INT
);
INSERT INTO Employee VALUES (3, 'Brad', NULL, 4000), (1, 'John', 3, 1000), (2, 'Dan', 3, 2000), (4, 'Thomas', 3, 4000);
CREATE TABLE Bonus (
  empId INT PRIMARY KEY,
  bonus INT
);
INSERT INTO Bonus VALUES (2, 500), (4, 2000);`,
    expectedQuery: `SELECT e.name, b.bonus
FROM Employee e
LEFT JOIN Bonus b ON e.empId = b.empId
WHERE b.bonus < 1000 OR b.bonus IS NULL
ORDER BY e.empId;`,
    expectedRows: [
      { name: 'John', bonus: null },
      { name: 'Dan', bonus: 500 },
      { name: 'Brad', bonus: null },
    ],
  }),

  makeSqlProblem({
    id: 514,
    title: 'Find Customer Referee',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'NULL-Safe Inequality',
    statement: 'Find the names of customers that are NOT referred by customer with id = 2 (including those with NULL referee_id).',
    inputSummary: 'Customer (6 rows)',
    outputSummary: 'Will, Jane, Bill, Zack',
    explanation: 'In SQL, NULL != 2 evaluates to UNKNOWN, so check referee_id IS NULL explicitly.',
    schemaDdl: `CREATE TABLE Customer (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  referee_id INT
);
INSERT INTO Customer VALUES (1, 'Will', NULL), (2, 'Jane', NULL), (3, 'Alex', 2), (4, 'Bill', NULL), (5, 'Zack', 1), (6, 'Mark', 2);`,
    expectedQuery: `SELECT name
FROM Customer
WHERE referee_id != 2 OR referee_id IS NULL
ORDER BY id;`,
    expectedRows: [{ name: 'Will' }, { name: 'Jane' }, { name: 'Bill' }, { name: 'Zack' }],
  }),

  makeSqlProblem({
    id: 515,
    title: 'Customer Placing the Largest Number of Orders',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'GROUP BY + ORDER BY COUNT DESC LIMIT 1',
    statement: 'Find the customer_number for the customer who has placed the largest number of orders.',
    inputSummary: 'Orders (4 rows)',
    outputSummary: 'customer_number: 3',
    explanation: 'Customer 3 placed 2 orders whereas 1 and 2 placed 1 order each.',
    schemaDdl: `CREATE TABLE Orders (
  order_number INT PRIMARY KEY,
  customer_number INT
);
INSERT INTO Orders VALUES (1, 1), (2, 2), (3, 3), (4, 3);`,
    expectedQuery: `SELECT customer_number
FROM Orders
GROUP BY customer_number
ORDER BY COUNT(*) DESC
LIMIT 1;`,
    expectedRows: [{ customer_number: 3 }],
  }),

  makeSqlProblem({
    id: 516,
    title: 'Sales Person',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'NOT IN Subquery',
    statement: 'Find the names of all salespersons who did not have any orders related to the company named "RED".',
    inputSummary: 'SalesPerson (5 rows), Company (4 rows), Orders (4 rows)',
    outputSummary: 'Amy, Mark, Alex',
    explanation: 'Exclude sales_id matching orders for Company name = RED.',
    schemaDdl: `CREATE TABLE SalesPerson (
  sales_id INT PRIMARY KEY,
  name VARCHAR(40),
  salary INT
);
INSERT INTO SalesPerson VALUES (1, 'John', 100000), (2, 'Amy', 12000), (3, 'Mark', 65000), (4, 'Pam', 25000), (5, 'Alex', 5000);
CREATE TABLE Company (
  com_id INT PRIMARY KEY,
  name VARCHAR(40),
  city VARCHAR(40)
);
INSERT INTO Company VALUES (1, 'RED', 'Boston'), (2, 'ORANGE', 'New York'), (3, 'YELLOW', 'Boston'), (4, 'GREEN', 'Austin');
CREATE TABLE Orders (
  order_id INT PRIMARY KEY,
  com_id INT,
  sales_id INT,
  amount INT
);
INSERT INTO Orders VALUES (1, 3, 4, 10000), (2, 4, 5, 5000), (3, 1, 1, 50000), (4, 1, 4, 25000);`,
    expectedQuery: `SELECT name
FROM SalesPerson
WHERE sales_id NOT IN (
  SELECT o.sales_id
  FROM Orders o
  JOIN Company c ON o.com_id = c.com_id
  WHERE c.name = 'RED'
)
ORDER BY sales_id;`,
    expectedRows: [{ name: 'Amy' }, { name: 'Mark' }, { name: 'Alex' }],
  }),

  makeSqlProblem({
    id: 517,
    title: 'Triangle Judgement',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Triangle Inequality CASE',
    statement: 'Report for every three line segments (x, y, z) whether they can form a valid triangle ("Yes" or "No") as column triangle.',
    inputSummary: 'Triangle (2 triples)',
    outputSummary: '(13,15,30)->No, (10,20,15)->Yes',
    explanation: 'Three sides form a triangle iff every pair sum exceeds the third side.',
    schemaDdl: `CREATE TABLE Triangle (
  x INT,
  y INT,
  z INT
);
INSERT INTO Triangle VALUES (13, 15, 30), (10, 20, 15);`,
    expectedQuery: `SELECT x, y, z,
  CASE WHEN x + y > z AND x + z > y AND y + z > x THEN 'Yes' ELSE 'No' END AS triangle
FROM Triangle;`,
    expectedRows: [
      { x: 13, y: 15, z: 30, triangle: 'No' },
      { x: 10, y: 20, z: 15, triangle: 'Yes' },
    ],
  }),

  makeSqlProblem({
    id: 518,
    title: 'Shortest Distance in a Line',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Non-Equi Self Join',
    statement: 'Find the shortest positive distance between any two distinct points on the x-axis.',
    inputSummary: 'Point (-1, 0, 2)',
    outputSummary: 'shortest: 1',
    explanation: 'ABS(-1 - 0) = 1 is smaller than ABS(2 - 0) = 2 and ABS(2 - (-1)) = 3.',
    schemaDdl: `CREATE TABLE Point (
  x INT PRIMARY KEY
);
INSERT INTO Point VALUES (-1), (0), (2);`,
    expectedQuery: `SELECT MIN(ABS(p1.x - p2.x)) AS shortest
FROM Point p1
JOIN Point p2 ON p1.x < p2.x;`,
    expectedRows: [{ shortest: 1 }],
  }),

  makeSqlProblem({
    id: 519,
    title: 'User Activity for the Past 30 Days I',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Date Window + COUNT(DISTINCT)',
    statement:
      'Find the daily active user count for the 30-day window ending 2019-07-27 inclusively (2019-06-28 to 2019-07-27), returning day and active_users.',
    inputSummary: 'Activity (6 activity sessions)',
    outputSummary: '2019-07-20: 2, 2019-07-21: 2',
    explanation: '2019-06-25 falls outside the 30-day range ending 2019-07-27.',
    schemaDdl: `CREATE TABLE Activity (
  user_id INT,
  session_id INT,
  activity_date VARCHAR(20),
  activity_type VARCHAR(30)
);
INSERT INTO Activity VALUES
  (1, 1, '2019-07-20', 'open_session'),
  (1, 1, '2019-07-20', 'scroll_down'),
  (2, 4, '2019-07-20', 'open_session'),
  (2, 4, '2019-07-21', 'send_message'),
  (3, 2, '2019-07-21', 'open_session'),
  (4, 3, '2019-06-25', 'open_session');`,
    expectedQuery: `SELECT activity_date AS day, COUNT(DISTINCT user_id) AS active_users
FROM Activity
WHERE activity_date BETWEEN '2019-06-28' AND '2019-07-27'
GROUP BY activity_date
ORDER BY activity_date;`,
    expectedRows: [
      { day: '2019-07-20', active_users: 2 },
      { day: '2019-07-21', active_users: 2 },
    ],
  }),

  makeSqlProblem({
    id: 520,
    title: 'Article Views I',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'DISTINCT Self-View Filter',
    statement: 'Find all authors who viewed at least one of their own articles. Return result sorted by id ascending.',
    inputSummary: 'Views (6 view logs)',
    outputSummary: 'id: 4, 7',
    explanation: 'Author 4 viewed article 4 and author 7 viewed article 3.',
    schemaDdl: `CREATE TABLE Views (
  article_id INT,
  author_id INT,
  viewer_id INT,
  view_date VARCHAR(20)
);
INSERT INTO Views VALUES
  (1, 3, 5, '2019-08-01'),
  (1, 3, 6, '2019-08-02'),
  (2, 7, 7, '2019-08-01'),
  (2, 7, 6, '2019-08-02'),
  (4, 7, 1, '2019-07-22'),
  (3, 4, 4, '2019-07-21');`,
    expectedQuery: `SELECT DISTINCT author_id AS id
FROM Views
WHERE author_id = viewer_id
ORDER BY id ASC;`,
    expectedRows: [{ id: 4 }, { id: 7 }],
  }),

  makeSqlProblem({
    id: 521,
    title: 'Project Employees I',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'JOIN + ROUND(AVG)',
    statement: 'Report the average experience years of all employees for each project, rounded to 2 decimal places as average_years.',
    inputSummary: 'Project (5 pairs), Employee (4 rows)',
    outputSummary: 'Project 1: 2.0, Project 2: 2.5',
    explanation: 'Multiply or cast before AVG so decimal precision is preserved.',
    schemaDdl: `CREATE TABLE Project (
  project_id INT,
  employee_id INT
);
INSERT INTO Project VALUES (1, 1), (1, 2), (1, 3), (2, 1), (2, 4);
CREATE TABLE Employee (
  employee_id INT PRIMARY KEY,
  name VARCHAR(40),
  experience_years INT
);
INSERT INTO Employee VALUES (1, 'Khaled', 3), (2, 'Ali', 2), (3, 'John', 1), (4, 'Doe', 2);`,
    expectedQuery: `SELECT p.project_id, ROUND(AVG(e.experience_years * 1.0), 2) AS average_years
FROM Project p
JOIN Employee e ON p.employee_id = e.employee_id
GROUP BY p.project_id
ORDER BY p.project_id;`,
    expectedRows: [
      { project_id: 1, average_years: 2.0 },
      { project_id: 2, average_years: 2.5 },
    ],
  }),

  makeSqlProblem({
    id: 522,
    title: 'Sales Analysis III',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'HAVING MIN/MAX Date Bounds',
    statement: 'Report products (product_id, product_name) that were ONLY sold in Q1 2019 (between 2019-01-01 and 2019-03-31 inclusive).',
    inputSummary: 'Product (3 items), Sales (4 orders)',
    outputSummary: 'product_id: 1 (S8)',
    explanation: 'S8 was only sold on 2019-01-21; G4 had a sale on 2019-02-17 and 2019-06-02; iPhone in May.',
    schemaDdl: `CREATE TABLE Product (
  product_id INT PRIMARY KEY,
  product_name VARCHAR(40),
  unit_price INT
);
INSERT INTO Product VALUES (1, 'S8', 1000), (2, 'G4', 800), (3, 'iPhone', 1400);
CREATE TABLE Sales (
  seller_id INT,
  product_id INT,
  sale_date VARCHAR(20),
  quantity INT,
  price INT
);
INSERT INTO Sales VALUES
  (1, 1, '2019-01-21', 2, 2000),
  (1, 2, '2019-02-17', 1, 800),
  (2, 2, '2019-06-02', 1, 800),
  (3, 3, '2019-05-13', 2, 2800);`,
    expectedQuery: `SELECT p.product_id, p.product_name
FROM Product p
JOIN Sales s ON p.product_id = s.product_id
GROUP BY p.product_id, p.product_name
HAVING MIN(s.sale_date) >= '2019-01-01' AND MAX(s.sale_date) <= '2019-03-31';`,
    expectedRows: [{ product_id: 1, product_name: 'S8' }],
  }),

  makeSqlProblem({
    id: 523,
    title: 'Average Selling Price',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Weighted Average with Range Join',
    statement: 'Compute the weighted average selling price for each product rounded to 2 decimal places (0 if no units sold).',
    inputSummary: 'Prices (4 price periods), UnitsSold (4 purchase rows)',
    outputSummary: 'product 1: 6.96, product 2: 16.96',
    explanation: 'Match purchase_date BETWEEN start_date AND end_date, then SUM(price * units) / SUM(units).',
    schemaDdl: `CREATE TABLE Prices (
  product_id INT,
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  price INT
);
INSERT INTO Prices VALUES
  (1, '2019-02-17', '2019-02-28', 5),
  (1, '2019-03-01', '2019-03-22', 20),
  (2, '2019-02-01', '2019-02-20', 15),
  (2, '2019-02-21', '2019-03-31', 30);
CREATE TABLE UnitsSold (
  product_id INT,
  purchase_date VARCHAR(20),
  units INT
);
INSERT INTO UnitsSold VALUES
  (1, '2019-02-25', 100),
  (1, '2019-03-01', 15),
  (2, '2019-02-10', 200),
  (2, '2019-03-22', 30);`,
    expectedQuery: `SELECT p.product_id,
  ROUND(COALESCE(SUM(u.units * p.price) * 1.0 / NULLIF(SUM(u.units), 0), 0), 2) AS average_price
FROM Prices p
LEFT JOIN UnitsSold u
  ON p.product_id = u.product_id
 AND u.purchase_date BETWEEN p.start_date AND p.end_date
GROUP BY p.product_id
ORDER BY p.product_id;`,
    expectedRows: [
      { product_id: 1, average_price: 6.96 },
      { product_id: 2, average_price: 16.96 },
    ],
  }),

  makeSqlProblem({
    id: 524,
    title: 'Students and Examinations',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'CROSS JOIN + LEFT JOIN',
    statement:
      'Find how many times each student attended each exam across all subjects. Order by student_id ASC, subject_name ASC.',
    inputSummary: 'Students (2 rows), Subjects (2 rows), Examinations (4 rows)',
    outputSummary: '4 student-subject combinations with attendance counts',
    explanation: 'CROSS JOIN Students with Subjects before LEFT JOINing Examinations so zero counts appear.',
    schemaDdl: `CREATE TABLE Students (
  student_id INT PRIMARY KEY,
  student_name VARCHAR(40)
);
INSERT INTO Students VALUES (1, 'Alice'), (2, 'Bob');
CREATE TABLE Subjects (
  subject_name VARCHAR(40) PRIMARY KEY
);
INSERT INTO Subjects VALUES ('Math'), ('Physics');
CREATE TABLE Examinations (
  student_id INT,
  subject_name VARCHAR(40)
);
INSERT INTO Examinations VALUES (1, 'Math'), (1, 'Physics'), (1, 'Math'), (2, 'Math');`,
    expectedQuery: `SELECT s.student_id, s.student_name, sub.subject_name, COUNT(e.subject_name) AS attended_exams
FROM Students s
CROSS JOIN Subjects sub
LEFT JOIN Examinations e
  ON s.student_id = e.student_id AND sub.subject_name = e.subject_name
GROUP BY s.student_id, s.student_name, sub.subject_name
ORDER BY s.student_id, sub.subject_name;`,
    expectedRows: [
      { student_id: 1, student_name: 'Alice', subject_name: 'Math', attended_exams: 2 },
      { student_id: 1, student_name: 'Alice', subject_name: 'Physics', attended_exams: 1 },
      { student_id: 2, student_name: 'Bob', subject_name: 'Math', attended_exams: 1 },
      { student_id: 2, student_name: 'Bob', subject_name: 'Physics', attended_exams: 0 },
    ],
  }),

  makeSqlProblem({
    id: 525,
    title: 'Queries Quality and Percentage',
    difficulty: 'Easy',
    topic: 'Aggregations & Joins',
    pattern: 'Ratio AVG + Poor Rating Percentage',
    statement:
      'For each query_name compute quality = AVG(rating / position) and poor_query_percentage (% with rating < 3), rounded to 2 decimal places.',
    inputSummary: 'Queries (6 search result rows)',
    outputSummary: 'Cat: quality=0.66 poor=33.33, Dog: quality=2.5 poor=33.33',
    explanation: 'Average rating*1.0/position gives quality; AVG(CASE WHEN rating < 3 THEN 100.0 ELSE 0.0 END) gives poor %.',
    schemaDdl: `CREATE TABLE Queries (
  query_name VARCHAR(40),
  result VARCHAR(60),
  position INT,
  rating INT
);
INSERT INTO Queries VALUES
  ('Dog', 'Golden Retriever', 1, 5),
  ('Dog', 'German Shepherd', 2, 5),
  ('Dog', 'Mule', 200, 1),
  ('Cat', 'Shirazi', 5, 2),
  ('Cat', 'Siamese', 3, 3),
  ('Cat', 'Sphynx', 7, 4);`,
    expectedQuery: `SELECT query_name,
  ROUND(AVG(rating * 1.0 / position), 2) AS quality,
  ROUND(AVG(CASE WHEN rating < 3 THEN 100.0 ELSE 0.0 END), 2) AS poor_query_percentage
FROM Queries
GROUP BY query_name
ORDER BY query_name;`,
    expectedRows: [
      { query_name: 'Cat', quality: 0.66, poor_query_percentage: 33.33 },
      { query_name: 'Dog', quality: 2.5, poor_query_percentage: 33.33 },
    ],
  }),

  makeSqlProblem({
    id: 526,
    title: 'Second Highest Salary',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'DISTINCT + LIMIT OFFSET / MAX Subquery',
    statement: 'Find the second highest distinct salary from the Employee table. If there is no second highest salary, return NULL as SecondHighestSalary.',
    inputSummary: 'Employee (3 salary entries)',
    outputSummary: 'SecondHighestSalary: 200',
    explanation: 'Wrapping the LIMIT 1 OFFSET 1 subquery inside SELECT (...) guarantees NULL when absent.',
    schemaDdl: `CREATE TABLE Employee (
  id INT PRIMARY KEY,
  salary INT
);
INSERT INTO Employee VALUES (1, 100), (2, 200), (3, 300);`,
    expectedQuery: `SELECT (
  SELECT DISTINCT salary
  FROM Employee
  ORDER BY salary DESC
  LIMIT 1 OFFSET 1
) AS SecondHighestSalary;`,
    expectedRows: [{ SecondHighestSalary: 200 }],
  }),

  makeSqlProblem({
    id: 527,
    title: 'Nth Highest Salary',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'DENSE_RANK() = 3',
    statement: 'Write a SQL query to find the 3rd highest distinct salary from the Employee table as ThirdHighestSalary.',
    inputSummary: 'Employee (5 salary rows)',
    outputSummary: 'ThirdHighestSalary: 200',
    explanation: 'Distinct salaries are 400, 300, 200, 100 — so the 3rd highest distinct salary is 200.',
    schemaDdl: `CREATE TABLE Employee (
  id INT PRIMARY KEY,
  salary INT
);
INSERT INTO Employee VALUES (1, 100), (2, 200), (3, 300), (4, 400), (5, 300);`,
    expectedQuery: `WITH Ranked AS (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM Employee
)
SELECT MAX(salary) AS ThirdHighestSalary
FROM Ranked
WHERE rnk = 3;`,
    expectedRows: [{ ThirdHighestSalary: 200 }],
  }),

  makeSqlProblem({
    id: 528,
    title: 'Rank Scores',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'DENSE_RANK() Window',
    statement: 'Rank scores from highest to lowest using dense ranking (no gaps after ties). Return score and rank ordered by score DESC.',
    inputSummary: 'Scores (6 rows with tied scores)',
    outputSummary: '4.00->1, 4.00->1, 3.85->2, 3.65->3, 3.65->3, 3.50->4',
    explanation: 'DENSE_RANK() OVER (ORDER BY score DESC) assigns contiguous integers starting at 1.',
    schemaDdl: `CREATE TABLE Scores (
  id INT PRIMARY KEY,
  score REAL
);
INSERT INTO Scores VALUES (1, 3.50), (2, 3.65), (3, 4.00), (4, 3.85), (5, 4.00), (6, 3.65);`,
    expectedQuery: `SELECT score, DENSE_RANK() OVER (ORDER BY score DESC) AS rank
FROM Scores
ORDER BY score DESC;`,
    expectedRows: [
      { score: 4.0, rank: 1 },
      { score: 4.0, rank: 1 },
      { score: 3.85, rank: 2 },
      { score: 3.65, rank: 3 },
      { score: 3.65, rank: 3 },
      { score: 3.5, rank: 4 },
    ],
  }),

  makeSqlProblem({
    id: 529,
    title: 'Consecutive Numbers',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'LAG / LEAD Window Comparison',
    statement: 'Find all distinct numbers that appear at least three times consecutively in the Logs table ordered by id.',
    inputSummary: 'Logs (7 log entries)',
    outputSummary: 'ConsecutiveNums: 1',
    explanation: 'Only num = 1 appears in three adjacent ids (1, 2, 3).',
    schemaDdl: `CREATE TABLE Logs (
  id INT PRIMARY KEY,
  num INT
);
INSERT INTO Logs VALUES (1, 1), (2, 1), (3, 1), (4, 2), (5, 1), (6, 2), (7, 2);`,
    expectedQuery: `WITH Neighbors AS (
  SELECT num,
    LAG(num, 1) OVER (ORDER BY id) AS prev1,
    LAG(num, 2) OVER (ORDER BY id) AS prev2
  FROM Logs
)
SELECT DISTINCT num AS ConsecutiveNums
FROM Neighbors
WHERE num = prev1 AND num = prev2;`,
    expectedRows: [{ ConsecutiveNums: 1 }],
  }),

  makeSqlProblem({
    id: 530,
    title: 'Department Highest Salary',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'RANK() PARTITION BY Department',
    statement: 'Find employees who earn the highest salary in each department. Return Department, Employee, and Salary columns.',
    inputSummary: 'Employee (5 rows), Department (2 departments)',
    outputSummary: 'IT: Jim & Max (90000), Sales: Henry (80000)',
    explanation: 'Use RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC) = 1.',
    schemaDdl: `CREATE TABLE Department (
  id INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Department VALUES (1, 'IT'), (2, 'Sales');
CREATE TABLE Employee (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  salary INT,
  departmentId INT
);
INSERT INTO Employee VALUES (1, 'Joe', 70000, 1), (2, 'Jim', 90000, 1), (3, 'Henry', 80000, 2), (4, 'Sam', 60000, 2), (5, 'Max', 90000, 1);`,
    expectedQuery: `WITH Ranked AS (
  SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary,
    RANK() OVER (PARTITION BY e.departmentId ORDER BY e.salary DESC) AS rnk
  FROM Employee e
  JOIN Department d ON e.departmentId = d.id
)
SELECT Department, Employee, Salary
FROM Ranked
WHERE rnk = 1
ORDER BY Department, Employee;`,
    expectedRows: [
      { Department: 'IT', Employee: 'Jim', Salary: 90000 },
      { Department: 'IT', Employee: 'Max', Salary: 90000 },
      { Department: 'Sales', Employee: 'Henry', Salary: 80000 },
    ],
  }),

  makeSqlProblem({
    id: 531,
    title: 'Department Top Three Salaries',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'DENSE_RANK() <= 3 per Partition',
    statement: 'Find employees who earn one of the top three unique salaries in each department.',
    inputSummary: 'Employee (7 rows), Department (2 rows)',
    outputSummary: 'Top 3 unique earners per department',
    explanation: 'DENSE_RANK() ensures tied top salaries share the same rank tier.',
    schemaDdl: `CREATE TABLE Department (
  id INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Department VALUES (1, 'IT'), (2, 'Sales');
CREATE TABLE Employee (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  salary INT,
  departmentId INT
);
INSERT INTO Employee VALUES
  (1, 'Joe', 85000, 1), (2, 'Henry', 80000, 2), (3, 'Sam', 60000, 2),
  (4, 'Max', 90000, 1), (5, 'Janet', 69000, 1), (6, 'Randy', 85000, 1), (7, 'Will', 70000, 1);`,
    expectedQuery: `WITH Ranked AS (
  SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary,
    DENSE_RANK() OVER (PARTITION BY e.departmentId ORDER BY e.salary DESC) AS rnk
  FROM Employee e
  JOIN Department d ON e.departmentId = d.id
)
SELECT Department, Employee, Salary
FROM Ranked
WHERE rnk <= 3
ORDER BY Department, Salary DESC, Employee;`,
    expectedRows: [
      { Department: 'IT', Employee: 'Max', Salary: 90000 },
      { Department: 'IT', Employee: 'Joe', Salary: 85000 },
      { Department: 'IT', Employee: 'Randy', Salary: 85000 },
      { Department: 'IT', Employee: 'Will', Salary: 70000 },
      { Department: 'Sales', Employee: 'Henry', Salary: 80000 },
      { Department: 'Sales', Employee: 'Sam', Salary: 60000 },
    ],
  }),

  makeSqlProblem({
    id: 532,
    title: 'Exchange Seats',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Odd/Even ID Swap Projection',
    statement: 'Swap the seat id of every two consecutive students. If the total count is odd, leave the last student unchanged.',
    inputSummary: 'Seat (5 student seats)',
    outputSummary: '1->Doris, 2->Abbot, 3->Green, 4->Emerson, 5->Jeames',
    explanation: 'Shift odd ids +1 if next exists, even ids -1, then order by new id ASC.',
    schemaDdl: `CREATE TABLE Seat (
  id INT PRIMARY KEY,
  student VARCHAR(40)
);
INSERT INTO Seat VALUES (1, 'Abbot'), (2, 'Doris'), (3, 'Emerson'), (4, 'Green'), (5, 'Jeames');`,
    expectedQuery: `SELECT
  CASE
    WHEN id % 2 = 1 AND id = (SELECT MAX(id) FROM Seat) THEN id
    WHEN id % 2 = 1 THEN id + 1
    ELSE id - 1
  END AS id,
  student
FROM Seat
ORDER BY id ASC;`,
    expectedRows: [
      { id: 1, student: 'Doris' },
      { id: 2, student: 'Abbot' },
      { id: 3, student: 'Green' },
      { id: 4, student: 'Emerson' },
      { id: 5, student: 'Jeames' },
    ],
  }),

  makeSqlProblem({
    id: 533,
    title: 'Tree Node Classification',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'CASE WHEN + Parent Subquery',
    statement: 'Classify each node in Tree(id, p_id) as "Root", "Inner", or "Leaf" ordered by id.',
    inputSummary: 'Tree (5 hierarchical nodes)',
    outputSummary: '1->Root, 2->Inner, 3->Leaf, 4->Leaf, 5->Leaf',
    explanation: 'p_id IS NULL is Root; id in set of p_id values is Inner; remaining nodes are Leaf.',
    schemaDdl: `CREATE TABLE Tree (
  id INT PRIMARY KEY,
  p_id INT
);
INSERT INTO Tree VALUES (1, NULL), (2, 1), (3, 1), (4, 2), (5, 2);`,
    expectedQuery: `SELECT id,
  CASE
    WHEN p_id IS NULL THEN 'Root'
    WHEN id IN (SELECT DISTINCT p_id FROM Tree WHERE p_id IS NOT NULL) THEN 'Inner'
    ELSE 'Leaf'
  END AS type
FROM Tree
ORDER BY id;`,
    expectedRows: [
      { id: 1, type: 'Root' },
      { id: 2, type: 'Inner' },
      { id: 3, type: 'Leaf' },
      { id: 4, type: 'Leaf' },
      { id: 5, type: 'Leaf' },
    ],
  }),

  makeSqlProblem({
    id: 534,
    title: 'Winning Candidate',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'JOIN + Vote Count Aggregation',
    statement: 'Report the name of the candidate who received the largest number of votes.',
    inputSummary: 'Candidate (5 candidates), Vote (5 ballots)',
    outputSummary: 'name: B',
    explanation: 'Candidate id 2 (B) received 2 votes while C, D, E received 1 vote each.',
    schemaDdl: `CREATE TABLE Candidate (
  id INT PRIMARY KEY,
  name VARCHAR(40)
);
INSERT INTO Candidate VALUES (1, 'A'), (2, 'B'), (3, 'C'), (4, 'D'), (5, 'E');
CREATE TABLE Vote (
  id INT PRIMARY KEY,
  candidateId INT
);
INSERT INTO Vote VALUES (1, 2), (2, 4), (3, 3), (4, 2), (5, 5);`,
    expectedQuery: `SELECT c.name
FROM Candidate c
JOIN Vote v ON c.id = v.candidateId
GROUP BY c.id, c.name
ORDER BY COUNT(*) DESC
LIMIT 1;`,
    expectedRows: [{ name: 'B' }],
  }),

  makeSqlProblem({
    id: 535,
    title: 'Investments in 2016',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Window Count Partition Filtering',
    statement:
      'Report sum of tiv_2016 (rounded to 2 decimals) for policyholders whose tiv_2015 matches at least one other policyholder AND whose (lat, lon) location is unique.',
    inputSummary: 'Insurance (4 policyholder records)',
    outputSummary: 'tiv_2016: 45.0',
    explanation: 'Rows 1 and 4 share tiv_2015=10 and have unique (lat, lon) pairs: 5 + 40 = 45.00.',
    schemaDdl: `CREATE TABLE Insurance (
  pid INT PRIMARY KEY,
  tiv_2015 REAL,
  tiv_2016 REAL,
  lat REAL,
  lon REAL
);
INSERT INTO Insurance VALUES (1, 10, 5, 10, 10), (2, 20, 20, 20, 20), (3, 10, 30, 20, 20), (4, 10, 40, 40, 40);`,
    expectedQuery: `WITH Flags AS (
  SELECT tiv_2016,
    COUNT(*) OVER (PARTITION BY tiv_2015) AS tiv_cnt,
    COUNT(*) OVER (PARTITION BY lat, lon) AS loc_cnt
  FROM Insurance
)
SELECT ROUND(SUM(tiv_2016), 2) AS tiv_2016
FROM Flags
WHERE tiv_cnt > 1 AND loc_cnt = 1;`,
    expectedRows: [{ tiv_2016: 45.0 }],
  }),

  makeSqlProblem({
    id: 536,
    title: 'Friend Requests II: Who Has the Most Friends',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'UNION ALL Bidirectional Degree Count',
    statement: 'Find the person id with the most accepted friends and their total friend count (columns id, num).',
    inputSummary: 'RequestAccepted (4 friendships)',
    outputSummary: 'id: 3, num: 3',
    explanation: 'Union requester_id and accepter_id to count total edges incident to every person.',
    schemaDdl: `CREATE TABLE RequestAccepted (
  requester_id INT,
  accepter_id INT,
  accept_date VARCHAR(20)
);
INSERT INTO RequestAccepted VALUES (1, 2, '2016-06-03'), (1, 3, '2016-06-08'), (2, 3, '2016-06-08'), (3, 4, '2016-06-09');`,
    expectedQuery: `WITH Edges AS (
  SELECT requester_id AS id FROM RequestAccepted
  UNION ALL
  SELECT accepter_id AS id FROM RequestAccepted
)
SELECT id, COUNT(*) AS num
FROM Edges
GROUP BY id
ORDER BY num DESC, id ASC
LIMIT 1;`,
    expectedRows: [{ id: 3, num: 3 }],
  }),

  makeSqlProblem({
    id: 537,
    title: 'Get Highest Answer Rate Question',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Conditional Rate Aggregation',
    statement: 'Find the question_id with the highest answer-to-show rate (log column: survey_log). Break ties by smallest question_id.',
    inputSummary: 'SurveyLog (4 survey events)',
    outputSummary: 'survey_log: 285',
    explanation: 'Question 285 has 1 answer / 1 show = 1.0; question 369 has 0 / 1 = 0.0.',
    schemaDdl: `CREATE TABLE SurveyLog (
  id INT,
  action VARCHAR(20),
  question_id INT,
  answer_id INT,
  q_num INT
);
INSERT INTO SurveyLog VALUES (5, 'show', 285, NULL, 1), (5, 'answer', 285, 124124, 1), (5, 'show', 369, NULL, 2), (5, 'skip', 369, NULL, 2);`,
    expectedQuery: `SELECT question_id AS survey_log
FROM SurveyLog
GROUP BY question_id
ORDER BY SUM(CASE WHEN action = 'answer' THEN 1.0 ELSE 0.0 END) / NULLIF(SUM(CASE WHEN action = 'show' THEN 1 ELSE 0 END), 0) DESC, question_id ASC
LIMIT 1;`,
    expectedRows: [{ survey_log: 285 }],
  }),

  makeSqlProblem({
    id: 538,
    title: 'Count Student Number in Departments',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'LEFT JOIN + COUNT Order',
    statement: 'Report each department name and student_number (0 for empty departments), sorted by student_number DESC, dept_name ASC.',
    inputSummary: 'Student (3 rows), Department (3 departments)',
    outputSummary: 'Engineering: 2, Science: 1, Law: 0',
    explanation: 'LEFT JOIN Department to Student and count non-null student_id values.',
    schemaDdl: `CREATE TABLE Department (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(40)
);
INSERT INTO Department VALUES (1, 'Engineering'), (2, 'Science'), (3, 'Law');
CREATE TABLE Student (
  student_id INT PRIMARY KEY,
  student_name VARCHAR(40),
  gender VARCHAR(10),
  dept_id INT
);
INSERT INTO Student VALUES (1, 'Jack', 'M', 1), (2, 'Jane', 'F', 1), (3, 'Mark', 'M', 2);`,
    expectedQuery: `SELECT d.dept_name, COUNT(s.student_id) AS student_number
FROM Department d
LEFT JOIN Student s ON d.dept_id = s.dept_id
GROUP BY d.dept_id, d.dept_name
ORDER BY student_number DESC, d.dept_name ASC;`,
    expectedRows: [
      { dept_name: 'Engineering', student_number: 2 },
      { dept_name: 'Science', student_number: 1 },
      { dept_name: 'Law', student_number: 0 },
    ],
  }),

  makeSqlProblem({
    id: 539,
    title: 'Managers with at Least 5 Direct Reports',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Self-Join + HAVING COUNT >= 5',
    statement: 'Find managers who have at least 5 direct reports. Return their name.',
    inputSummary: 'Employee (6 staff rows)',
    outputSummary: 'name: John',
    explanation: 'Employee id 101 (John) is referenced by 5 direct reports (102..106).',
    schemaDdl: `CREATE TABLE Employee (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  department VARCHAR(40),
  managerId INT
);
INSERT INTO Employee VALUES
  (101, 'John', 'A', NULL), (102, 'Dan', 'A', 101), (103, 'James', 'A', 101),
  (104, 'Amy', 'A', 101), (105, 'Anne', 'A', 101), (106, 'Ron', 'B', 101);`,
    expectedQuery: `SELECT m.name
FROM Employee m
JOIN Employee e ON m.id = e.managerId
GROUP BY m.id, m.name
HAVING COUNT(*) >= 5;`,
    expectedRows: [{ name: 'John' }],
  }),

  makeSqlProblem({
    id: 540,
    title: 'Product Sales Analysis III',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'First Year Window / MIN Filter',
    statement: 'Select product_id, first_year, quantity, and price for the first year of every product sold.',
    inputSummary: 'Sales (3 sales rows across 2 products)',
    outputSummary: 'Product 100 (2008), Product 200 (2011)',
    explanation: 'Use RANK() OVER (PARTITION BY product_id ORDER BY year ASC) = 1.',
    schemaDdl: `CREATE TABLE Sales (
  sale_id INT,
  product_id INT,
  year INT,
  quantity INT,
  price INT
);
INSERT INTO Sales VALUES (1, 100, 2008, 10, 5000), (2, 100, 2009, 12, 5000), (7, 200, 2011, 15, 9000);`,
    expectedQuery: `WITH Ranked AS (
  SELECT product_id, year AS first_year, quantity, price,
    RANK() OVER (PARTITION BY product_id ORDER BY year ASC) AS rnk
  FROM Sales
)
SELECT product_id, first_year, quantity, price
FROM Ranked
WHERE rnk = 1
ORDER BY product_id;`,
    expectedRows: [
      { product_id: 100, first_year: 2008, quantity: 10, price: 5000 },
      { product_id: 200, first_year: 2011, quantity: 15, price: 9000 },
    ],
  }),

  makeSqlProblem({
    id: 541,
    title: 'Game Play Analysis II',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'ROW_NUMBER() First Device',
    statement: 'Report the device_id that was first logged in for each player ordered by player_id.',
    inputSummary: 'Activity (5 login records)',
    outputSummary: '1->2, 2->3, 3->1',
    explanation: 'Partition by player_id, order by event_date ASC, and keep rn = 1.',
    schemaDdl: `CREATE TABLE Activity (
  player_id INT,
  device_id INT,
  event_date VARCHAR(20),
  games_played INT
);
INSERT INTO Activity VALUES
  (1, 2, '2016-03-01', 5), (1, 2, '2016-05-02', 6),
  (2, 3, '2017-06-25', 1), (3, 1, '2016-03-02', 0), (3, 4, '2018-07-03', 5);`,
    expectedQuery: `WITH FirstLogin AS (
  SELECT player_id, device_id,
    ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY event_date ASC) AS rn
  FROM Activity
)
SELECT player_id, device_id
FROM FirstLogin
WHERE rn = 1
ORDER BY player_id;`,
    expectedRows: [
      { player_id: 1, device_id: 2 },
      { player_id: 2, device_id: 3 },
      { player_id: 3, device_id: 1 },
    ],
  }),

  makeSqlProblem({
    id: 542,
    title: 'Game Play Analysis III',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Running SUM() OVER',
    statement: 'Report for each player and date, how many games total have been played so far (games_played_so_far), sorted by player_id and event_date.',
    inputSummary: 'Activity (5 sessions)',
    outputSummary: 'Cumulative running total per player',
    explanation: 'SUM(games_played) OVER (PARTITION BY player_id ORDER BY event_date) accumulates chronologically.',
    schemaDdl: `CREATE TABLE Activity (
  player_id INT,
  device_id INT,
  event_date VARCHAR(20),
  games_played INT
);
INSERT INTO Activity VALUES
  (1, 2, '2016-03-01', 5), (1, 2, '2016-05-02', 6), (1, 3, '2017-06-25', 1),
  (3, 1, '2016-03-02', 0), (3, 4, '2018-07-03', 5);`,
    expectedQuery: `SELECT player_id, event_date,
  SUM(games_played) OVER (PARTITION BY player_id ORDER BY event_date) AS games_played_so_far
FROM Activity
ORDER BY player_id, event_date;`,
    expectedRows: [
      { player_id: 1, event_date: '2016-03-01', games_played_so_far: 5 },
      { player_id: 1, event_date: '2016-05-02', games_played_so_far: 11 },
      { player_id: 1, event_date: '2017-06-25', games_played_so_far: 12 },
      { player_id: 3, event_date: '2016-03-02', games_played_so_far: 0 },
      { player_id: 3, event_date: '2018-07-03', games_played_so_far: 5 },
    ],
  }),

  makeSqlProblem({
    id: 543,
    title: 'Game Play Analysis IV (Day 1 Retention)',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'First Login + Next Day Self-Join',
    statement: 'Report the fraction of players that logged in again on the day right after their first login, rounded to 2 decimal places as fraction.',
    inputSummary: 'Activity (5 login rows across 3 players)',
    outputSummary: 'fraction: 0.33',
    explanation: 'Player 1 logged in 2016-03-01 and returned 2016-03-02 (1 out of 3 players = 0.33).',
    schemaDdl: `CREATE TABLE Activity (
  player_id INT,
  device_id INT,
  event_date VARCHAR(20),
  games_played INT
);
INSERT INTO Activity VALUES
  (1, 2, '2016-03-01', 5), (1, 2, '2016-03-02', 6),
  (2, 3, '2017-06-25', 1), (3, 1, '2016-03-02', 0), (3, 4, '2018-07-03', 5);`,
    expectedQuery: `WITH Firsts AS (
  SELECT player_id, MIN(event_date) AS first_date
  FROM Activity
  GROUP BY player_id
)
SELECT ROUND(COUNT(DISTINCT a.player_id) * 1.0 / COUNT(DISTINCT f.player_id), 2) AS fraction
FROM Firsts f
LEFT JOIN Activity a
  ON f.player_id = a.player_id
 AND ROUND(julianday(a.event_date) - julianday(f.first_date)) = 1;`,
    expectedRows: [{ fraction: 0.33 }],
  }),

  makeSqlProblem({
    id: 544,
    title: 'Median Employee Salary',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'ROW_NUMBER + COUNT Window Median',
    statement: 'Find the id, company, and salary of employees representing the median salary row(s) of each company.',
    inputSummary: 'Employee (9 rows across companies A and B)',
    outputSummary: 'Company A: ids 5, 6; Company B: id 7',
    explanation: 'Filter rows where rn BETWEEN cnt / 2.0 AND cnt / 2.0 + 1.',
    schemaDdl: `CREATE TABLE Employee (
  id INT PRIMARY KEY,
  company VARCHAR(20),
  salary INT
);
INSERT INTO Employee VALUES
  (1, 'A', 2341), (2, 'A', 341), (3, 'A', 15), (4, 'A', 15314), (5, 'A', 451), (6, 'A', 513),
  (7, 'B', 15), (8, 'B', 13), (9, 'B', 1154);`,
    expectedQuery: `WITH Ranked AS (
  SELECT id, company, salary,
    ROW_NUMBER() OVER (PARTITION BY company ORDER BY salary ASC, id ASC) AS rn,
    COUNT(*) OVER (PARTITION BY company) AS cnt
  FROM Employee
)
SELECT id, company, salary
FROM Ranked
WHERE rn BETWEEN cnt * 1.0 / 2.0 AND cnt * 1.0 / 2.0 + 1.0
ORDER BY company, id;`,
    expectedRows: [
      { id: 5, company: 'A', salary: 451 },
      { id: 6, company: 'A', salary: 513 },
      { id: 7, company: 'B', salary: 15 },
    ],
  }),

  makeSqlProblem({
    id: 545,
    title: 'Managers with Highest Number of Reports',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'GROUP BY + RANK()',
    statement: 'Find the manager name(s) and report_count for managers tied for the highest number of direct reports.',
    inputSummary: 'OrgChart (7 employees)',
    outputSummary: 'Alice: 3 reports',
    explanation: 'Compute COUNT(*) grouped by manager_id and rank descending.',
    schemaDdl: `CREATE TABLE OrgChart (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  manager_id INT
);
INSERT INTO OrgChart VALUES
  (1, 'Alice', NULL), (2, 'Bob', 1), (3, 'Carol', 1), (4, 'Dave', 1),
  (5, 'Eve', 2), (6, 'Frank', 2), (7, 'Grace', 3);`,
    expectedQuery: `WITH Counts AS (
  SELECT m.name, COUNT(e.id) AS report_count,
    RANK() OVER (ORDER BY COUNT(e.id) DESC) AS rnk
  FROM OrgChart m
  JOIN OrgChart e ON m.id = e.manager_id
  GROUP BY m.id, m.name
)
SELECT name, report_count
FROM Counts
WHERE rnk = 1
ORDER BY name;`,
    expectedRows: [{ name: 'Alice', report_count: 3 }],
  }),

  makeSqlProblem({
    id: 546,
    title: 'Active Businesses',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'AVG() OVER Event Type Partition',
    statement: 'An active business has more than one event_type whose occurrences exceed the average occurrences of that event_type across all businesses. Return business_id.',
    inputSummary: 'Events (7 telemetry rows)',
    outputSummary: 'business_id: 1',
    explanation: 'Business 1 exceeds averages for both reviews and ads.',
    schemaDdl: `CREATE TABLE Events (
  business_id INT,
  event_type VARCHAR(30),
  occurrences INT
);
INSERT INTO Events VALUES
  (1, 'reviews', 7), (3, 'reviews', 3),
  (1, 'ads', 11), (2, 'ads', 7), (3, 'ads', 6),
  (1, 'page views', 3), (2, 'page views', 12);`,
    expectedQuery: `WITH WithAvg AS (
  SELECT business_id, event_type, occurrences,
    AVG(occurrences * 1.0) OVER (PARTITION BY event_type) AS avg_occ
  FROM Events
)
SELECT business_id
FROM WithAvg
WHERE occurrences > avg_occ
GROUP BY business_id
HAVING COUNT(*) > 1;`,
    expectedRows: [{ business_id: 1 }],
  }),

  makeSqlProblem({
    id: 547,
    title: 'Activity Participants',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'HAVING Excluding MIN & MAX',
    statement: 'Find names of all activities with neither the maximum nor the minimum number of participants.',
    inputSummary: 'Friends (6 rows), Activities (3 activities)',
    outputSummary: 'activity: Singing',
    explanation: 'Eating=3 (max), Horse Riding=1 (min), Singing=2 -> Singing only.',
    schemaDdl: `CREATE TABLE Friends (
  id INT PRIMARY KEY,
  name VARCHAR(40),
  activity VARCHAR(40)
);
INSERT INTO Friends VALUES
  (1, 'Jonathan D.', 'Eating'), (2, 'Jade W.', 'Singing'),
  (3, 'Victor J.', 'Singing'), (4, 'Elvis Q.', 'Eating'),
  (5, 'Daniel A.', 'Eating'), (6, 'Bob B.', 'Horse Riding');`,
    expectedQuery: `WITH ActCounts AS (
  SELECT activity, COUNT(*) AS cnt
  FROM Friends
  GROUP BY activity
)
SELECT activity
FROM ActCounts
WHERE cnt <> (SELECT MAX(cnt) FROM ActCounts)
  AND cnt <> (SELECT MIN(cnt) FROM ActCounts);`,
    expectedRows: [{ activity: 'Singing' }],
  }),

  makeSqlProblem({
    id: 548,
    title: 'Restaurant Growth (7-Day Rolling Average)',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'ROWS BETWEEN 6 PRECEDING Frame',
    statement:
      'Compute the 7-day rolling sum (amount) and average (average_amount rounded to 2 decimals) per visited_on starting on the 7th day.',
    inputSummary: 'Customer (7 consecutive days)',
    outputSummary: '2019-01-07: amount=860, average_amount=122.86',
    explanation: 'Aggregate daily totals first, then apply SUM/AVG OVER (ROWS BETWEEN 6 PRECEDING AND CURRENT ROW).',
    schemaDdl: `CREATE TABLE Customer (
  customer_id INT,
  name VARCHAR(40),
  visited_on VARCHAR(20),
  amount INT
);
INSERT INTO Customer VALUES
  (1, 'Jhon', '2019-01-01', 100), (2, 'Daniel', '2019-01-02', 110),
  (3, 'Jade', '2019-01-03', 120), (4, 'Khaled', '2019-01-04', 130),
  (5, 'Winston', '2019-01-05', 110), (6, 'Elvis', '2019-01-06', 140),
  (7, 'Anna', '2019-01-07', 150);`,
    expectedQuery: `WITH Daily AS (
  SELECT visited_on, SUM(amount) AS day_sum
  FROM Customer
  GROUP BY visited_on
),
Rolling AS (
  SELECT visited_on,
    SUM(day_sum) OVER (ORDER BY visited_on ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS amount,
    ROUND(AVG(day_sum * 1.0) OVER (ORDER BY visited_on ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS average_amount,
    ROW_NUMBER() OVER (ORDER BY visited_on) AS rn
  FROM Daily
)
SELECT visited_on, amount, average_amount
FROM Rolling
WHERE rn >= 7
ORDER BY visited_on;`,
    expectedRows: [{ visited_on: '2019-01-07', amount: 860, average_amount: 122.86 }],
  }),

  makeSqlProblem({
    id: 549,
    title: 'Immediate Food Delivery II',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'First Order Immediate Rate',
    statement:
      'Find the percentage of immediate first orders (order_date = customer_pref_delivery_date) across all customers, rounded to 2 decimals as immediate_percentage.',
    inputSummary: 'Delivery (6 food orders across 4 customers)',
    outputSummary: 'immediate_percentage: 50.0',
    explanation: 'Out of 4 first orders (customers 1..4), customers 2 and 3 received immediate delivery on their first order.',
    schemaDdl: `CREATE TABLE Delivery (
  delivery_id INT PRIMARY KEY,
  customer_id INT,
  order_date VARCHAR(20),
  customer_pref_delivery_date VARCHAR(20)
);
INSERT INTO Delivery VALUES
  (1, 1, '2019-08-01', '2019-08-02'),
  (2, 2, '2019-08-02', '2019-08-02'),
  (3, 1, '2019-08-11', '2019-08-12'),
  (4, 3, '2019-08-24', '2019-08-24'),
  (5, 3, '2019-08-21', '2019-08-22'),
  (6, 4, '2019-08-09', '2019-08-15');`,
    expectedQuery: `WITH FirstOrders AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date ASC) AS rn
  FROM Delivery
)
SELECT ROUND(AVG(CASE WHEN order_date = customer_pref_delivery_date THEN 100.0 ELSE 0.0 END), 2) AS immediate_percentage
FROM FirstOrders
WHERE rn = 1;`,
    expectedRows: [{ immediate_percentage: 50.0 }],
  }),

  makeSqlProblem({
    id: 550,
    title: 'Monthly Transactions I',
    difficulty: 'Medium',
    topic: 'Window Functions',
    pattern: 'Month Grouping + Conditional Sums',
    statement:
      'For each month (YYYY-MM) and country report trans_count, approved_count, trans_total_amount, and approved_total_amount.',
    inputSummary: 'Transactions (4 transaction records)',
    outputSummary: '2018-12 US (2 trans, 1 approved), 2019-01 US & DE',
    explanation: 'Extract substr(trans_date, 1, 7) AS month and conditionally aggregate approved rows.',
    schemaDdl: `CREATE TABLE Transactions (
  id INT PRIMARY KEY,
  country VARCHAR(10),
  state VARCHAR(20),
  amount INT,
  trans_date VARCHAR(20)
);
INSERT INTO Transactions VALUES
  (121, 'US', 'approved', 1000, '2018-12-18'),
  (122, 'US', 'declined', 2000, '2018-12-19'),
  (123, 'US', 'approved', 2000, '2019-01-01'),
  (124, 'DE', 'approved', 2000, '2019-01-07');`,
    expectedQuery: `SELECT substr(trans_date, 1, 7) AS month, country,
  COUNT(*) AS trans_count,
  SUM(CASE WHEN state = 'approved' THEN 1 ELSE 0 END) AS approved_count,
  SUM(amount) AS trans_total_amount,
  SUM(CASE WHEN state = 'approved' THEN amount ELSE 0 END) AS approved_total_amount
FROM Transactions
GROUP BY substr(trans_date, 1, 7), country
ORDER BY month, country DESC;`,
    expectedRows: [
      { month: '2018-12', country: 'US', trans_count: 2, approved_count: 1, trans_total_amount: 3000, approved_total_amount: 1000 },
      { month: '2019-01', country: 'US', trans_count: 1, approved_count: 1, trans_total_amount: 2000, approved_total_amount: 2000 },
      { month: '2019-01', country: 'DE', trans_count: 1, approved_count: 1, trans_total_amount: 2000, approved_total_amount: 2000 },
    ],
  }),
];
