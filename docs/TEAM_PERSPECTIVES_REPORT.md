# Cross-Functional Engineering Report (Multi-Role Team View)

**Project:** CodePrep — Technical Interview Preparation Workbench  
**Planner, Lead Architect & Author:** Harshal Patel (B.Tech ICT, Dhirubhai Ambani University)  
**Purpose of This Document:** Interviewers and engineering reviewers evaluate full-stack systems through multiple lenses — product scope, database integrity, compiler security, frontend ergonomics, AI reliability, and deployment operations. This report documents CodePrep from each engineering perspective, grounding every claim in the actual repository architecture and fixes implemented before release.

---

## Role 1: Product & Requirements Lead

**Focus:** Problem prioritization, curriculum balance, interviewer accessibility, and avoiding bloat.

- **Key Decisions & Outcomes:**
  - Designed a cohesive single-workspace curriculum covering **3,000 practice problems**: **2,500 C++ DSA** (including logic-building foundations + high-frequency blind/NeetCode/GFG classics), **400 SQL Sandbox** problems (joins, aggregations, window functions, CTEs, gaps & islands), and **100 C++ OOP Design problems** (`#631`–`#730` across Encapsulation, Constructors & RAII, Inheritance & Polymorphism, Operator Overloading, and Design Patterns).
  - Built dedicated non-redundant hubs: **OOPs Study & MCQ Hub** (`/oops`), **Aptitude Drill Suite** (`/aptitude`), **Coding Interview Simulator** (`/interview-prep`), and **Profile/Analytics Dashboard** (`/dashboard`, `/profile`).
  - Replaced the original single-user lockdown with multi-user capacity (`MAX_USERS = 100`) plus a **1-click Guest Demo Sign-In**, allowing recruiters and interviewers opening the live Render URL to explore the compiler, SQL engine, OOP hub, and AI Coach immediately without disturbing personal study progress.

---

## Role 2: Database & Backend Architect

**Focus:** Schema modeling, query scalability at 3,000+ problems, data isolation, and persistence.

- **Key Decisions & Outcomes:**
  - Modeled **9 relational tables** in `backend/prisma/schema.prisma` (`User`, `RefreshToken`, `Problem`, `UserProblemState`, `ProblemDraft`, `ProblemActiveTimer`, `Submission`, `AiLesson`, `UserBadge`).
  - Introduced `UserProblemState` keyed by `@@unique([problemId, userId])` so personal notes, bookmarks, AI hint unlocks, and drafts remain strictly isolated across users while preserving primary-owner compatibility (`UserProblemStateService`).
  - Optimized catalog queries in `ProblemService` (`backend/src/services/problem.service.ts`) using an in-memory metadata cache (`catalogMetaCache`), server-side pagination, deterministic seeded shuffle (`shuffleSeed`), and chunked seeding (`CHUNK_SIZE = 50`) so expanding from 630 to 3,000 problems did not bloat client payloads or violate SQLite bind parameter limits.
  - Added startup schema auto-verification (`PRISMA_SCHEMA_DDL` & `POSTGRES_SCHEMA_DDL` in `prisma.service.ts`) so fresh container disks initialize all tables and indexes reliably before background seeding begins.

---

## Role 3: Systems & Judge Infrastructure Engineer

**Focus:** Fast, deterministic, unspoofable code and SQL execution inside a resource-constrained container.

- **Key Decisions & Outcomes:**
  - **C++17 Judge (`backend/src/judge/sandboxRunner.ts`):**
    - Pre-generates a C++17 precompiled header (`.gch`) during Docker image build (`Dockerfile` -> `/app/pch`) and caches compiled binaries in memory with a 1500ms idempotent execution queue to slash cold-start latency.
    - Injects randomized per-run hex boundary markers (`__CODEPREP_OUT_START_<hex>__`) around harness output so candidate `std::cout` statements cannot forge `PASS` verdicts.
    - Rejects candidate `int main()` definitions upfront and remaps `g++` compiler line numbers from the generated harness back to the user's editor line numbers.
    - Enforces a strict `2000ms` runtime ceiling (`SANDBOX_TIMEOUT_MS`).
  - **SQL Sandbox (`backend/src/judge/sqlRunner.ts`):**
    - Executes queries in an isolated SQLite instance seeded freshly per test run, blocking destructive keywords (`DROP`, `ALTER`, `INSERT`, `UPDATE`, `DELETE`, `PRAGMA`, `ATTACH`) prior to execution.

---

## Role 4: AI & Learning Experience Engineer

**Focus:** Eliminating hallucinated praise, preventing premature solution peeking, and actionable diagnostics.

- **Key Decisions & Outcomes:**
  - **Diagnosed & Fixed a Critical AI Bug:** Earlier iterations allowed LLM prompts to praise incomplete or buggy code (e.g., claiming `O(1)` on broken stubs). To eliminate this, `CodeAnalyzerService` (`backend/src/services/codeAnalyzer.service.ts`) was engineered to inspect the actual submitted AST/code structure (missing returns, syntax smells, loop nesting, empty bodies) AND attach the live `Submission` verdict / `failedTestCase` / `stderr` **before** formatting the `StudyGuideService` (`aiTeacher.service.ts`) prompt to Gemini (`gemini-2.5-flash`).
  - Built deterministic local diagnostics + Big-O curve fitting (`AnalyticsService`) so the platform still gives accurate algorithmic feedback even when no external AI key is configured.
  - Enforced active focus tracking via `TimerService` (5s client tab-visibility heartbeat) synced to `ProblemActiveTimer` in SQLite.

---

## Role 5: Frontend & UI/UX Systems Engineer

**Focus:** High-density IDE ergonomics, instant theme rendering, clean information architecture, and smooth feedback.

- **Key Decisions & Outcomes:**
  - Implemented 6 full semantic CSS-variable themes (`Dark`, `Day`, `LeetCode`, `VS Code`, `Tokyo Night`, `Monokai`) bootstrapped synchronously in `<head>` to eliminate FOUC.
  - Built split-pane workspace controls, pagination + seeded problem shuffle on `ProblemListPage`, `SqlListPage`, and `OopListPage` (`/oops`), plus dedicated study and quiz modes for Aptitude and OOPs.
  - Engineered pure SVG pixel-art avatars (`PixelAvatars`), a custom 365-day activity heatmap (`ActivityHeatmap`), solved-difficulty gauges, and a non-intrusive on-screen streak celebration animation triggered when completing today's first solve.
  - Maintained zero-emoji iconography discipline using crisp uniform-stroke Lucide icons under TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`).

---

## Role 6: QA, Security & Release / DevOps Engineer

**Focus:** Vulnerability hardening, container readiness, Render persistent storage, and pre-deploy verification.

- **Key Decisions & Outcomes:**
  - **Pre-Deploy Audit & Bugs Resolved:**
    - Resolved Render `/health` boot timeouts by ensuring `app.listen(env.PORT)` binds immediately while heavy seeding/warmup tasks execute asynchronously in the background.
    - Colocated `/uploads` onto the `/data/uploads` persistent disk volume whenever `DATABASE_URL` points to `/data/codeprep.db` so uploaded profile photos survive container rebuilds.
    - Hardened avatar uploads via magic-byte header inspection (`JPEG`, `PNG`, `WEBP`; blocking `SVG`/XSS vectors), `HttpOnly` cookie sessions (`SameSite=Lax`), SHA-256 refresh token hashing, and Express rate limiting.
    - Caught and fixed UI/edge bugs prior to release: dynamic `3,000` problem counts on the Login showcase and footer, truthful `0/N` display in SQL Simulator pool errors, safe empty-state guards in `DashboardPage` / `ProfilePage`, and explicit error surfacing if browser storage quota or network calls fail.

---

## 7. How This Project Was Built: Ownership & Tooling Transparency

I planned, architected, debugged, and integrated **CodePrep** end-to-end—defining the user requirements, designing the 9-table Prisma schema, isolating per-user state, debugging the C++ sandbox edge cases, and diagnosing deployment issues on Render.

Like modern software teams, I also used AI coding tools intentionally as an **acceleration multiplier**—specifically for drafting repetitive curriculum variations toward the 3,000-problem scale, speeding up boilerplate test-case scaffolds, and iterating on React component layouts. Every architectural boundary, schema constraint, security guardrail (magic-byte validation, UUID judge markers, SQL DDL blocking), bug diagnosis (such as refactoring `CodeAnalyzerService` when AI feedback hallucinated praise on failing code), and pre-deploy verification check was driven, reviewed, and verified against the live codebase by me.
