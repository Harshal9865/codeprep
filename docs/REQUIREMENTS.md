# Understanding User Requirements & Product Specification

**Project:** CodePrep — Technical Interview Preparation Workbench  
**Author:** Harshal Patel (B.Tech ICT, Dhirubhai Ambani University)  
**Scope:** End-to-End Requirements Engineering, Personas, Constraints & Acceptance Criteria  

---

## 1. Problem Statement & Product Motivation

Preparing for software engineering interviews typically fragments a candidate's workflow across three or four disconnected tools:
1. One platform for Data Structures & Algorithms (often paywalled behind timers, frequency lists, or solution locks).
2. A separate site for interactive SQL queries.
3. Scattered PDFs or static blogs for Object-Oriented Programming (C++ RAII, virtual dispatch, design patterns) and Aptitude drills.
4. No honest link between active problem-solving time, compiler errors, and personalized code diagnostics.

**CodePrep** was scoped and planned to unify **3,000 curated + algorithmic practice problems (2,500 C++ DSA, 400 SQL, 100 C++ OOP Design)** alongside **Aptitude & OOPs MCQ practice, study guides, real sandboxed execution, and code-grounded AI coaching** inside one deterministic, self-hosted workbench deployable on a single container with persistent disk storage.

---

## 2. Target User Personas

| Persona | Primary Goal | Key Workflows Needed |
| :--- | :--- | :--- |
| **1. Primary Candidate / Student** *(Harshal & peers)* | Build consistent daily interview readiness across DSA, OOPs, SQL, and Aptitude without losing progress on redeploys. | Persistent streak & 365-day heatmap, per-problem bookmarks/notes, split-pane C++17 & SQLite IDE, 3-level progressive hints, server-tracked active timer, JSON backup/export. |
| **2. Technical Interviewer / Recruiter** | Evaluate the live deployed product and inspect architecture/code quality quickly with zero friction. | Publicly reachable Render link, 1-click **Guest Demo Sign-In**, inspectable live IDE & AI Coach, transparent `/health` status, accessible engineering documentation in `/about` and GitHub `/docs`. |
| **3. Peer / Self-Hosted Learner** *(Up to `MAX_USERS = 100`)* | Maintain completely isolated personal submissions, drafts, timers, notes, and streaks on a shared deployment. | Standard email/password registration & login, per-user isolation via `UserProblemState`, customizable theme (6 palettes) and pixel avatar or uploaded profile photo. |

---

## 3. Core User Stories & Functional Requirements

### FR-01: Unified 3,000-Problem Bank with Optimal Pagination & Shuffling
- **User Story:** *"As a candidate practicing daily, I want a massive, evenly structured bank of DSA (2,500), OOPs (100), and SQL (400) problems that loads instantaneously without freezing the browser."*
- **Requirements:**
  - Server-side filtering by `category` (`DSA`, `OOP`, `SQL`), `topic`, `difficulty` (`Easy`, `Medium`, `Hard`), `status` (`solved`, `unsolved`, `ai-solved`, `bookmarked`), `track`, and free-text search.
  - Deterministic seeded shuffling (`shuffleSeed`) so users can randomize practice order without duplicate or missing rows across pages.
  - Paginated responses (`page`, `pageSize`) backed by an in-memory metadata cache in `ProblemService` so shipping 3,000 problems avoids loading megabytes of testcases on list views.

### FR-02: Real Sandboxed C++17 Compiler & Anti-Spoofing Judge (`DSA` & `OOP`)
- **User Story:** *"As a developer writing C++ solutions, I want real compilation feedback (`g++ -O2 -std=c++17`), accurate line numbers pointing to my code, and thorough edge-case test suites."*
- **Requirements:**
  - Reject prohibited entry points (`int main(...)`) in candidate snippets because the backend wraps submissions inside an auto-generated test harness.
  - Remap `g++` stderr line numbers back to the candidate's editor line numbers.
  - Enforce a hard execution timeout (`SANDBOX_TIMEOUT_MS = 2000`) and wrap test stdout inside per-run random UUID boundary markers (`__CODEPREP_OUT_START_<hex>__`) so `cout` injection cannot spoof verdicts.
  - Debounce/coalesce duplicate submissions via a 1500ms execution queue and maintain precompiled header caches (`.gch`) to stay responsive under single-container CPU limits.

### FR-03: Isolated Read-Only SQLite Sandbox (`SQL`)
- **User Story:** *"As a candidate preparing for data/backend rounds, I want to run real `SELECT` / `WITH` queries against multi-table schemas and verify exact result rows."*
- **Requirements:**
  - Seed isolated per-run SQLite table schemas and rows cleanly in `SqlRunner`.
  - Parse and block mutating DDL/DML (`DROP`, `ALTER`, `INSERT`, `UPDATE`, `DELETE`, `PRAGMA`, `ATTACH`) before query execution.

### FR-04: Dedicated OOPs Study, C++ Class Design & MCQ Workbench
- **User Story:** *"As an engineering candidate, I need OOP concepts (Encapsulation, Constructors/RAII, Inheritance/Polymorphism, Operator Overloading, Design Patterns) both as structured theory/MCQs and hands-on C++ coding problems."*
- **Requirements:**
  - Dedicated `/oops` study & quiz hub alongside 100 executable C++ OOP problems (`#631`–`#730`, `category: 'OOP'`).
  - Integrated into problem counts, dashboard skill breakdowns, and Coding Interview Simulator pools.

### FR-05: Truthful Static + Gemini AI Code Coach & Study Guide
- **User Story:** *"As a learner debugging a failing submission, I want the AI coach to diagnose my actual bugs and complexity rather than hallucinating praise on broken code."*
- **Requirements:**
  - Deterministic static analysis in `CodeAnalyzerService` (checking syntax risks, empty/stub returns, nested-loop time complexity, STL patterns, and actual failed test cases/compiler errors) runs **before** invoking Gemini (`gemini-2.5-flash` via `StudyGuideService`).
  - If an `AI_API_KEY` is absent or quota-limited, seamlessly fall back to grounded local diagnostics rather than generic placeholder strings.
  - Server-enforced focus heartbeat timer (`ProblemActiveTimer` updated via 5s `/api/ai/timer/heartbeat`) prevents accidental solution spoilers before sustained effort.

### FR-06: Multi-User Authentication, Interviewer Demo & Persistent State
- **User Story:** *"As the project owner deploying on Render, I want my streak, submissions, notes, and uploaded avatar to survive redeploys while letting interviewers test the app safely."*
- **Requirements:**
  - Dual-token JWT session (`15m` access token + `30d` rotating SHA-256 `RefreshToken`) in `HttpOnly`, `SameSite=Lax` cookies; bcrypt (`12` rounds) password hashing.
  - Configurable owner bootstrap (`OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_NAME`) and open multi-user capacity up to `MAX_USERS = 100`.
  - One-click Guest Demo access for reviewers without exposing owner data.
  - Full account-scoped state (`UserProblemState`, `ProblemDraft`, `ProblemActiveTimer`, `Submission`, `UserBadge`) plus full JSON export/import (`/api/user/export`, `/api/user/import`).

### FR-07: Gamification, Analytics & Streak Feedback
- Daily Problem of the Day (POTD) selector synchronized to user timezone (`Asia/Kolkata` default).
- Real-time timezone-aware streak calculation, animated on-screen streak celebration on first daily solve, 365-day activity heatmap, Big-O empirical curve fitting, and unlockable badges (`UserBadge`).

---

## 4. Non-Functional Requirements & System Constraints

| Category | Target / Constraint | Implementation Strategy |
| :--- | :--- | :--- |
| **Deployment Budget** | Single Render Starter container + `1 GB` persistent disk (`/data`) | Zero external DB daemon; embedded SQLite WAL (`file:/data/codeprep.db`) and colocated `/data/uploads`. |
| **Boot Readiness** | Render `/health` check must succeed rapidly before 3,000 problems finish seeding | Start Express HTTP listener (`app.listen`) immediately, then asynchronously run `SandboxRunner.warmupCompilerCache()`, `AuthService.seedDefaultUser()`, and chunked `ProblemService.seedInitialProblems()`. |
| **Security & XSS** | Untrusted code & file uploads cannot compromise host or browser | Server-side magic-byte validation (`JPEG`, `PNG`, `WEBP` — SVG rejected), CORS & Helmet security headers, API rate limiting (`rateLimiter.ts`), read-only SQL guard. |
| **Performance** | List queries & code execution remain snappy with 3,000 problems | Metadata cache in `ProblemService`, DB composite indexes on `[category, topic]`, `[difficulty]`, `[problemId, verdict]`, `[userId, submittedAt]`, Docker-baked `.gch` precompiled C++ headers. |
| **UX Determinism** | Zero flash of unstyled theme; multi-tab consistency | Synchronous `<head>` script reads persisted theme preference across 6 CSS-variable themes; `BroadcastChannel` syncs logout events across tabs. |

---

## 5. Acceptance Criteria Checklist

- [x] Interviewers opening the public deployment can inspect the live app via Guest Demo or register an isolated account (up to `MAX_USERS = 100`).
- [x] Redeploying the Docker container on Render preserves database rows (`/data/codeprep.db`) and uploaded profile photos (`/data/uploads`).
- [x] Submitting broken C++ code produces genuine error diagnostics and failed case details in AI Coach instead of false `O(1)` praise.
- [x] All 3,000 problems (2,500 DSA + 400 SQL + 100 OOP) are navigable, filterable, bookmarked per user, and trackable toward streaks and badges.
- [x] `/health` reports live component status for Database, Study Engine, Sandbox Compiler, and Persistent Storage.
