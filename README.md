# CodePrep • Technical Interview Preparation Workbench

Built by **Harshal Patel** (B.Tech ICT, Dhirubhai Ambani University).

CodePrep is a local-first, LeetCode-style interview preparation workbench engineered to practice algorithms, relational SQL queries, and aptitude assessments in one unified interface.

- **Primary Focus**: 500 C++ Data Structures & Algorithms problems across 18 core patterns.
- **Secondary Focus**: 100 SQL problems spanning joins, aggregations, window functions, and CTEs.
- **Study Workflow**: Active-time timer locks, deterministic hints drawer, and step-by-step trace visualizers.

---

## 1. System Architecture

CodePrep is designed as a self-hosted web application with clean separation of concerns:

```
[ Web Browser ]
      |
      |-- HTTP / Cookies (SameSite=Lax, HttpOnly)
      v
[ Frontend: React + TypeScript + Vite + Tailwind ]
      |
      |-- Reverse Proxy / API Requests
      v
[ Backend: Node.js + Express + TypeScript + Prisma ]
      |
      +---> [ Application DB: SQLite WAL (Single-file Storage) ]
      |
      +---> [ C++ Sandbox: g++ -O2 -std=c++17 Harness Runner ]
      |
      +---> [ SQL Sandbox: Isolated SQLite Query Runner ]
      |
      +---> [ Study Engine: Deterministic Diagnostics & Hint Levels ]
```

### Components

1. **Frontend**:
   - Built with React 18, TypeScript, Vite, and Tailwind CSS with CSS-variable themes (`Dark`, `Day`, `LeetCode`, `VS Code`, `Tokyo Night`, `Monokai`).
   - Crisp Lucide SVG icons paired with custom pixel-art character avatars (`PixelAvatars`).
   - Synchronous theme bootstrap in `<head>` prevents flash of unstyled theme on page load.
   - Multi-tab session synchronization via `BroadcastChannel`.

2. **Backend**:
   - Node.js with Express and TypeScript.
   - Prisma ORM managing an embedded SQLite database (`dev.db`).
   - Single-user ownership model with bcrypt password hashing (12 rounds).
   - Dual-token session management: short-lived access tokens (15m) and rolling refresh tokens (30 days) stored in httpOnly cookies.

3. **Code Execution Sandbox (C++)**:
   - Compiles and executes candidate solutions using `g++ -O2 -std=c++17`.
   - Enforces execution timeouts (2.0 seconds) and random boundary markers per run to prevent stdout verdict spoofing.

4. **SQL Execution Sandbox**:
   - Isolated SQLite query context seeded cleanly per problem execution.
   - Read-only `SELECT` / `WITH` queries permitted; destructive DDL/DML queries are rejected prior to execution.

---

## 2. Resource & Sizing Requirements

CodePrep runs comfortably on standard development laptops without heavy external dependencies.

| Resource | Minimum Required | Recommended | Plain-Language Explanation |
| :--- | :--- | :--- | :--- |
| **System RAM** | 2.0 GB Free | 4.0 GB Free | Node.js backend and Vite dev server run lightly alongside the C++ compiler sandbox. |
| **Disk Space** | 1.5 GB Free | 3.0 GB Free | Stores workspace dependencies, SQLite curriculum database, and local JSON backups. |
| **CPU** | 2 Cores | 4 Cores | Compiling C++17 programs with `-O2` and executing multi-case test harnesses stays snappy. |
| **Operating System** | Windows / Linux / macOS | Windows 11 / Linux / macOS | Runs natively with Node.js + g++ or inside Docker Compose. |

---

## 3. Quick Start Guide

### Option A: One-Command Docker Launch

1. Ensure Docker Desktop is installed and running.
2. Clone or navigate to the repository directory.
3. Create your local environment configuration file:
   ```bash
   cp .env.example .env
   ```
4. Launch services with Docker Compose:
   ```bash
   docker compose up --build -d
   ```
5. Open your browser and navigate to:
   - **Frontend Application**: `http://localhost:5173`
   - **System Health Diagnostics**: `http://localhost:5000/health`

---

### Option B: Local Development Setup (Manual)

If you are developing locally without Docker containers:

#### Step 1: Backend Setup
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Setup SQLite database with Prisma
npx prisma generate
npx prisma migrate dev --name init

# 4. Start backend development server (Port 5000)
npm run dev
```

#### Step 2: Frontend Setup
```bash
# 1. In a new terminal window, navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite frontend server (Port 5173)
npm run dev
```

#### Step 3: Access the Application
- Open `http://localhost:5173` in your browser.
- Register your single owner account to lock the instance.

---

## 4. Single-User Account & Security Model

CodePrep is your private personal prep environment:

1. **Initial Registration**:
   - The first visitor to the platform sees the "Initialize Instance" screen and registers the master owner account.
   - Once registered, the database closes registration permanently. Any subsequent attempt to register returns `HTTP 403 Forbidden`.

2. **Master Passphrase Reset**:
   - Because CodePrep runs privately without third-party email providers (like SendGrid or AWS SES), there is no email reset link.
   - If you ever forget your master passphrase, you can reset it directly from the host terminal via:
     ```bash
     node scripts/reset-password.js "YourNewSecurePassphrase123"
     ```
   - This invalidates all existing active refresh tokens and updates your master password hash.

3. **Multi-Tab Synchronization**:
   - If you have CodePrep open across multiple browser tabs, logging out from one tab sends an internal `BroadcastChannel` signal that instantly terminates the session in all open tabs.

4. **Cryptographic Protection**:
   - Access tokens are stored in memory and short-lived (15 minutes).
   - Refresh tokens are hashed using SHA-256 before storage in SQLite and rotated upon every refresh request.
   - Cookies are configured with `HttpOnly` and `SameSite=Lax`.

---

## 5. System Health Check (`/health`)

CodePrep includes a built-in health probe accessible at `/health` (or `/api/health`). It provides transparent, real-time diagnostics:

```json
{
  "overallStatus": "healthy",
  "timestamp": "2026-11-12T12:45:00.000Z",
  "uptimeSeconds": 1420,
  "memory": {
    "usedRssMb": 78,
    "heapUsedMb": 34,
    "systemFreeMb": 4820,
    "systemTotalMb": 16384
  },
  "components": {
    "database": {
      "status": "healthy",
      "message": "SQLite database connection verified and responsive.",
      "latencyMs": 2
    },
    "studyEngine": {
      "status": "healthy",
      "message": "Local diagnostics and progressive study guide engine ready."
    },
    "dockerSandbox": {
      "status": "healthy",
      "message": "Sandbox compiler runtime ready."
    },
    "fileStorage": {
      "status": "healthy",
      "message": "Local application data storage writable."
    }
  }
}
```

If a local runtime dependency is unavailable, the overall status transitions to `degraded` and shows diagnostic guidance in `/health`.

---

## 6. Verification & Utility Scripts

Verification scripts and snapshots live in `scripts/` and `verification/logs/`. Run utilities from your terminal:

```bash
# 1. Health Probe & Diagnostic Test
node scripts/test-health.js

# 2. C++ Judge Edge-Case Suite (Anti-spoofing, line remapping, main rejection, idempotency)
node scripts/test-judge-edge-cases.js

# 3. Study Timer & Diagnostics Guardrails Suite
node scripts/test-phase3-ai-timer.js

# 4. Performance Big-O Curve Fit, 365-Day Heatmap, Avatar Security & Backup Suite
node scripts/test-phase4-analytics-backups.js

# 5. DSA 500 Questions Scale & Differential Verification Suite
node scripts/test-phase5-dsa-scaling.js

# 6. SQL 100 Query Engine & Security Guardrails Suite
node scripts/test-phase6-sql-module.js

# Daily Database Backup & Restore Utilities
node scripts/backup-db.js
node scripts/restore-db.js
```

---

## 7. Curriculum Breakdown (600 Total Questions)

| Curriculum | Topic / Pattern | Question Count | Target Difficulties |
| :--- | :--- | :--- | :--- |
| **C++ DSA** | Arrays and Hashing | 50 | 12 Easy / 30 Med / 8 Hard |
| **C++ DSA** | Two Pointers | 30 | 8 Easy / 18 Med / 4 Hard |
| **C++ DSA** | Sliding Window | 25 | 6 Easy / 15 Med / 4 Hard |
| **C++ DSA** | Strings | 30 | 8 Easy / 18 Med / 4 Hard |
| **C++ DSA** | Linked List | 30 | 8 Easy / 18 Med / 4 Hard |
| **C++ DSA** | Stack & Queue | 30 | 8 Easy / 18 Med / 4 Hard |
| **C++ DSA** | Binary Search | 30 | 8 Easy / 18 Med / 4 Hard |
| **C++ DSA** | Trees (Binary Trees) | 40 | 10 Easy / 24 Med / 6 Hard |
| **C++ DSA** | Binary Search Tree (BST) | 10 | 3 Easy / 6 Med / 1 Hard |
| **C++ DSA** | Heap / Priority Queue | 20 | 5 Easy / 12 Med / 3 Hard |
| **C++ DSA** | Graphs (BFS, DFS, Dijkstra, Topo) | 45 | 11 Easy / 27 Med / 7 Hard |
| **C++ DSA** | Backtracking | 25 | 6 Easy / 15 Med / 4 Hard |
| **C++ DSA** | Dynamic Programming | 60 | 15 Easy / 36 Med / 9 Hard |
| **C++ DSA** | Greedy | 25 | 6 Easy / 15 Med / 4 Hard |
| **C++ DSA** | Intervals | 10 | 3 Easy / 6 Med / 1 Hard |
| **C++ DSA** | Bit Manipulation | 15 | 4 Easy / 9 Med / 2 Hard |
| **C++ DSA** | Math & Geometry | 15 | 4 Easy / 9 Med / 2 Hard |
| **C++ DSA** | Tries | 10 | 3 Easy / 6 Med / 1 Hard |
| **SQL Sandbox** | Aggregations & Joins | 25 | 10 Very Easy / 15 Easy |
| **SQL Sandbox** | Window Functions (ROW_NUMBER, DENSE_RANK) | 30 | 30 Medium |
| **SQL Sandbox** | Common Table Expressions (CTEs) | 20 | 20 Medium |
| **SQL Sandbox** | Gaps & Islands | 15 | 10 Medium / 5 Hard |
| **SQL Sandbox** | Advanced Analytics & Retention | 10 | 10 Hard |
| **Aptitude** | Quantitative, Logical & Verbal MCQs | Curated | Easy / Med / Hard |
| **TOTAL** | **Full System Scope** | **600 Questions** | **150 Easy / 360 Med / 90 Hard** |

---

## Author

Developed by **Harshal Patel**, B.Tech ICT student at **Dhirubhai Ambani University**.

