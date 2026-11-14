# CodePrep • Technical Interview Preparation Workbench

Built by **Harshal Patel** (B.Tech ICT, Dhirubhai Ambani University).

CodePrep is a full-stack, container-ready, LeetCode-style interview preparation workbench engineered to practice C++ algorithms, C++ Object-Oriented Design, relational SQL queries, and aptitude assessments in one unified workspace.

- **Primary Focus**: **2,500 C++ Data Structures & Algorithms** problems across classic patterns, high-frequency sheets, and logic-building drills.
- **OOPs Workbench**: **100 C++ OOP Design** coding problems (`#631`–`#730`) paired with a structured **OOPs Study & MCQ Hub** (`/oops`).
- **SQL Query Lab**: **400 SQL Sandbox** problems spanning joins, aggregations, window functions, CTEs, gaps & islands, and retention analytics.
- **Total Practice Bank**: **3,000 Executable Coding & SQL Problems** + curated Aptitude & OOPs MCQ drills, truthful code-grounded AI coaching, and Render persistent storage (`/data`).

---

## Engineering & Architecture Documentation

Built with full SDLC traceability for engineering reviews and technical interviews:

| Document | Audience & What It Covers |
| :--- | :--- |
| [**Requirements & Product Spec (`docs/REQUIREMENTS.md`)**](docs/REQUIREMENTS.md) | User personas, functional requirements (`FR-01`..`FR-07`), non-functional constraints, Render disk budget, and acceptance criteria. |
| [**Database Architecture & Schema (`docs/DATABASE_SCHEMA.md`)**](docs/DATABASE_SCHEMA.md) | ER diagram, all 9 Prisma models (`User`, `Problem`, `UserProblemState`, `Submission`, etc.), WAL tuning, startup DDL bootstrap, and JSON backups. |
| [**Multi-Role Team Report (`docs/TEAM_PERSPECTIVES_REPORT.md`)**](docs/TEAM_PERSPECTIVES_REPORT.md) | Findings from Product, DB/Backend, Compiler/Judge, AI/Learning, Frontend/UX, and QA/DevOps lenses + transparent AI-tooling ownership statement. |
| [**Architecture Decision Log (`DECISIONS.md`)**](DECISIONS.md) | 17 ADRs explaining key tradeoffs (`.gch` headers, UUID anti-spoofing, SQLite WAL, `CodeAnalyzerService`, multi-user isolation). |
| [**Build & Delivery Log (`PROGRESS.md`)**](PROGRESS.md) | Phase-by-phase engineering history and verification coverage. |

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
   - Prisma ORM managing embedded SQLite WAL (`/data/codeprep.db` in production, `dev.db` locally) with `UserProblemState` isolation.
   - Multi-user authentication (`MAX_USERS = 100`) + 1-click **Guest Demo** with bcrypt password hashing (12 rounds).
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
- Sign in with your seeded owner credentials, register a personal account, or click **Guest Demo** to explore immediately.

---

## 4. Multi-User Account Isolation, Guest Demo & Security Model

CodePrep isolates each user's progress cleanly while staying lightweight to self-host:

1. **Owner Bootstrap & Multi-User Capacity (`MAX_USERS = 100`)**:
   - Configure `OWNER_EMAIL`, `OWNER_PASSWORD`, and `OWNER_NAME` in environment variables so the primary owner account is ready on first boot.
   - Additional learners and reviewers can register personal accounts (up to `MAX_USERS = 100`), with isolated `UserProblemState`, drafts, active timers, streaks, notes, and submissions.
   - **Interviewer Guest Demo**: Visitors opening a deployed Render link can inspect the full IDE, compiler, SQL lab, OOPs hub, and AI Coach in one click via Guest Demo.

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

## 7. Curriculum Breakdown (3,000 Executable Problems + Study/MCQ Tracks)

| Curriculum | Topic / Scope | Count | Coverage Details |
| :--- | :--- | :--- | :--- |
| **C++ DSA** | Arrays, Two Pointers, Sliding Window, Strings, Linked Lists, Stacks/Queues, Binary Search, Trees, BST, Heaps, Graphs, Backtracking, DP, Greedy, Intervals, Bitwise, Math, Tries | **2,500** | Curated Blind 75 / NeetCode 150 / GFG SDE classics (`DSA_BATCH_1..10`, `famousCurriculum`), logic-building Easy drills (`dsa_logic_easy`), and extended algorithmic problems (`dsaExtended2000`). |
| **C++ OOP Design** | Encapsulation, Constructors & RAII, Inheritance & Polymorphism, Operator Overloading, Design Patterns | **100** | Problems `#631`–`#730` (`category: 'OOP'`), executable via the C++17 harness runner. |
| **SQL Sandbox** | Joins, Aggregations, Window Functions, CTEs, Gaps & Islands, Retention Analytics | **400** | `SQL_BATCH_1..3` + `SQL_EXTENDED_300` executed inside isolated read-only SQLite contexts. |
| **Study & MCQ Hubs** | OOPs Theory & MCQs (`/oops`), Quant/Logical/Verbal Aptitude (`/aptitude`), Mock Interview Simulator (`/interview-prep`) | **Included** | Interactive revision notes, timed drills, and code-grounded diagnostics. |
| **TOTAL EXECUTABLE BANK** | **Unified C++17 & SQLite Workbench** | **3,000 Problems** | Server-paginated (`ProblemService` metadata cache + seeded shuffle). |

---

## Author

Developed by **Harshal Patel**, B.Tech ICT student at **Dhirubhai Ambani University**.

