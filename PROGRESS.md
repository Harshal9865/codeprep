# Engineering Milestone Log

Author: Harshal Patel (B.Tech ICT, Dhirubhai Ambani University)

## Phase Checklist

### UI Architecture & Design System
- [x] Defined semantic CSS variable design tokens in [DESIGN.md](file:///c:/Users/Harshal/Desktop/Compiler/DESIGN.md) covering Dark, Day, LeetCode, VS Code, Tokyo Night, and Monokai palettes.
- [x] Built core views: Login with Streak Entry Splash, Explore Analytics Dashboard, DSA 500 Problem Catalog, Split-Pane Code Workspace, SQL Query Lab, Aptitude Drill, Profile & Settings, and About Page.
- [x] Added crisp inline SVG pixel character & robot presets (`PixelAvatars.tsx`) plus Lucide SVG icons across the entire UI.

### Phase 1: Project Setup, Auth & Layout Shell
- [x] Project architecture established: `.gitignore`, `docker-compose.yml`, `.env.example`, root `package.json`.
- [x] Backend stack configured: Node.js, Express, TypeScript, Zod environment validation, Winston-style structured logger with zero emojis.
- [x] SQLite database schema defined via Prisma: `User`, `RefreshToken`, `Problem`, `ProblemDraft`, `ProblemActiveTimer`, `Submission`, `AiLesson`.
- [x] Auth system built:
  - Single-user permanent registration lock.
  - Passphrase hashing with bcrypt (salt rounds: 12).
  - Dual token issuance (15m access token, 30d refresh token with SHA-256 rotation).
  - Multi-tab logout synchronization via `BroadcastChannel('codeprep_auth_sync')`.
  - Rate limiting on `/api/auth/login` (5 attempts per 15 minutes).
- [x] Diagnostic `/health` service and endpoint.
- [x] Frontend stack configured: React 18, TypeScript strict, Vite, Tailwind CSS with semantic tokens from `DESIGN.md`.
- [x] Theme system: Dark, Light, and Auto (day/night transition), flash-free bootstrap.
- [x] Layout shell built: `Navbar`, `LoginForm`, `DashboardPage`, `Footer`, `NotFoundPage`.
- [x] Comprehensive, beginner-friendly [README.md](file:///c:/Users/Harshal/Desktop/Compiler/README.md).

### Phase 2: C++ Sandbox, Workspace & Judge
- [x] C++ Sandbox runner & compiler engine (`g++ -O2 -std=c++17`, 5s compile timeout, 2s execution timeout, 1MB output limit).
- [x] Dynamic C++ harness generator:
  - Supports standard data structures: `vector<int>`, `vector<vector<int>>`, `string`, `ListNode*`, `TreeNode*`, etc.
  - Wraps execution output between secret run-bound UUID markers (`__CODEPREP_OUT_START_<id>__` / `__CODEPREP_OUT_END_<id>__`) to prevent printf/cout verdict spoofing.
  - Excludes compilation time from runtime measurement via `std::chrono::high_resolution_clock`.
  - Rejects user code defining custom `int main()` or `#define main`.
- [x] LineMapper utility: Remaps GCC/Clang compiler diagnostics back to user code relative line numbers.
- [x] Comparator engine: Handles CRLF/LF normalization, trailing whitespace trimming, and order-insensitive array/set comparisons.
- [x] Execution queue with idempotency lock (1500ms duplicate submission block).
- [x] Initial dataset of 20 verified C++ interview questions with original statements, constraints, examples, sample tests, and 10+ hidden test cases.
- [x] Database seeding & API endpoints:
  - `GET /api/problems` (with search, difficulty, topic filters).
  - `GET /api/problems/:id` (with user drafts and submissions).
  - `POST /api/problems/:id/full-code` ("Show full code" generator).
  - `POST /api/problems/:id/draft` (background autosave).
  - `POST /api/submissions/run` (sample/custom test cases).
  - `POST /api/submissions/submit` (hidden test cases, percentiles, `isSolved` flag).
### Problem Workspace & Split-Pane IDE
  - Split two-pane workspace layout for focused problem solving.
  - `ProblemHeader`: Breadcrumb (`#146 LRU Cache` [Medium]), active timer, reference solution unlock status, Prev/Next navigation, bookmark toggle.
  - `ProblemSpecPane`: Description, hints, submission history, formatted constraints, and dynamic SVG data structure diagrams.
  - `DataStructureDiagram`: Pure SVG renderers for LRU Cache (Hash Map + Doubly Linked List) and Linked Lists.
  - `EditorPane`: High-contrast editor, line numbers, C++17 mode, Show Full Code modal and copy action, reset stub.
  - `TestRunnerPane`: Sample testcases, Custom case editor, Verdict banner (Accepted/WA/CE/TLE/RE), runtime/memory benchmarks, debug stdout viewer.
- [x] Edge-case harness verification (`scripts/test-judge-edge-cases.js`).

### Server Timer, Hints Drawer & Reference Solutions
- [x] Server-authoritative active-time timer with idle gap detection (intervals > 10s treated as pauses; window blur and inactivity > 120s pause timer).
- [x] Solution unlock rules and study tracking (`solvedWithAiHelp = true` flag when unlocked before solving).
- [x] Embedded Hints & Diagnostics Drawer (`HintsDrawer.tsx`):
  - Compiler diagnostics, boundary checks, and 3 progressive hint tiers locally without external API calls.
- [x] Deterministic trace walkthrough visualizer (`SolutionGuidePage.tsx`) with Play/Pause/Step controls and variable inspection.

### Phase 4: Performance Analysis, Dashboard & Data Safety
- [x] Performance Growth Engine (`PerformanceService`):
  - 5 input tiers: N in [10, 100, 1000, 10000, 50000].
  - Median of 3 trials per size.
  - Least-squares Big-O curve regression: O(1), O(log N), O(N), O(N log N), O(N^2) with confidence metric.
  - Pure SVG vector growth curve modal (`PerformanceCurveModal.tsx`).
- [x] Dashboard Analytics (`AnalyticsService`):
  - 365-day submission heatmap with user timezone awareness (`ActivityHeatmap.tsx`).
  - Active and longest streaks calculation.
  - Difficulty mastery metrics (Easy, Medium, Hard).
  - Topic breakdown & submission accuracy bars (`TopicBreakdown.tsx`).
  - Spaced repetition revision list (`RevisionQueue.tsx`).
  - Algorithmic "Recommended Next Problem" hero card (`RecommendedProblemCard.tsx`).
- [x] Profile Management & File Security (`UserService`, `ProfilePage.tsx`):
  - Avatar magic byte inspection: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`RIFF....WEBP`).
  - Strict rejection of SVG, XML, HTML, and script tags to prevent stored XSS.
  - Timezone selector, theme toggles, and secure bcrypt password change.
  - Single-click JSON data export endpoint (`/api/user/export`).
- [x] Data Safety & Backups:
  - `scripts/backup-db.js`: Atomic SQLite snapshot to `/backups/` with 14-day rolling retention.
  - `scripts/restore-db.js`: Atomic database restoration with header integrity verification.
- [x] Automated test suite: `scripts/test-phase4-analytics-backups.js` (5/5 tests passed).
- [x] Verification log: [phase4-verification.log](file:///c:/Users/Harshal/Desktop/Compiler/verification/logs/phase4-verification.log).

### Phase 5: DSA Problem Scaling (500 Questions)
- [x] Exactly 500 verified C++ interview questions spanning 18 paradigms:
  - 125 Easy (25.0%), 300 Medium (60.0%), 75 Hard (15.0%).
- [x] Organized into 10 structured batches of 50 problems (`backend/src/data/dsa_batch_1.ts` to `dsa_batch_10.ts`).
- [x] Aggregated in `backend/src/data/dsa500.ts` with zero gaps (strictly IDs 1..500).
- [x] Differential verification with brute-force reference comparison.
- [x] Automated test suite: `scripts/test-phase5-dsa-scaling.js` (5/5 tests passed).
- [x] Verification log: [phase5-verification.log](file:///c:/Users/Harshal/Desktop/Compiler/verification/logs/phase5-verification.log).

### Phase 6: SQL Module (100 Questions) & Aptitude
- [x] Isolated SQL Query Runner (`SqlRunner` via SQLite):
  - Read-only sandbox execution with 2000ms statement timeout.
  - Automatic detection and blocking of administrative DDL/DML (DROP, ALTER, TRUNCATE, GRANT, REVOKE, VACUUM).
  - Relational table result set comparator (order-sensitive and order-insensitive).
- [x] 100 SQL Interview Questions Dataset (`backend/src/data/sql100.ts`):
  - IDs 501 to 600.
  - 25 Easy (including 10 foundational), 60 Medium, 15 Hard.
  - Complete DDL schema statements, seed rows, expected queries, and target result sets.
  - Aggregated with DSA problems for 600 total questions across the platform.
- [x] SQL Frontend Workspace (`SqlListPage.tsx`, `SqlWorkspacePage.tsx`):
  - Query Editor, Schema Inspector, and formatted interactive relational table result viewer.
- [x] Aptitude & Reasoning Module (`AptitudePage.tsx`):
  - Quantitative Aptitude, Logical Reasoning, and Verbal Ability MCQs with instant scoring and step-by-step mathematical explanations.
- [x] Automated test suite: `scripts/test-phase6-sql-module.js` (6/6 tests passed).
- [x] Verification log: [phase6-verification.log](file:///c:/Users/Harshal/Desktop/Compiler/verification/logs/phase6-verification.log).

---

## Zero-Setup Embedded Database & Auth Usability (Completed)
- [x] Embedded SQLite resolution: `prisma.service.ts` dynamically resolves the SQLite database path across working directories and synchronizes `backend/prisma/dev.db` and `backend/dev.db`.
- [x] Non-blocking server startup: Express listens on port 5000 immediately, backgrounding question seeding.
- [x] Fast question seeding: Batch `createMany({ skipDuplicates: true })` seeds 600 curriculum questions in ~50ms.
- [x] 1-Click Instant Login: Added `quickLogin` endpoint and prominent one-click button in `LoginForm.tsx` for immediate dashboard access.
- [x] Default Owner Account: Pre-configured `admin@codeprep.dev` / `Password123!` seeded automatically with fallback auto-registration.
- [x] Full Sign In / Register toggle: Explicit mode switcher for personal accounts with 6-character passphrase threshold.
- [x] Fixed JWT `expiresIn` type error: Resolved `@types/jsonwebtoken` union mismatch on `jwt.sign` and configured `--transpile-only` in `ts-node` and `tsconfig.json`.

---

## Phase 7: Professional LeetCode UI/UX & Color System Overhaul (Completed)
- [x] Eliminated white wireframe borders across the entire platform (canvas, cards, inputs, tables, calendar cells).
- [x] Applied authentic LeetCode matte charcoal palette:
  - Canvas: `#1a1a1a`
  - Cards: `#282828`
  - Elevated surfaces & chips: `#323232` / `#ffffff0d`
  - Easy: `#00b8a3` (Teal Green)
  - Medium: `#ffa116` (Amber Orange)
  - Hard: `#ef4444` (Coral Red)
- [x] Removed distracting `.tech-grid-pattern` background grid lines.
- [x] Built signature LeetCode components:
  - `LeetCodeSolvedGauge.tsx`: Circular donut progress ring + stacked Easy, Med., Hard matte rounded pills.
  - `LeetCodeBadgesCard.tsx`: 5 Badges, streak icons, and most recent badge banner.
  - `LeetCodeProfileCard.tsx`: User handle, rank, avatar, and community stats.
  - `LeetCodeSkillsPanel.tsx`: Languages (C++, SQL Query Lab) and clickable topic proficiency chips.
  - `LeetCodeRecentSubmissions.tsx`: Tabbed submissions history (Recent AC, List, Solutions, Discuss) with relative timestamps.
  - `ActivityHeatmap.tsx`: 52-week submission calendar with borderless cells, 4-step green levels, dynamic month labels, and streak metrics.
  - `ProblemListPage.tsx`: Pill category buttons (`All Topics`, `Algorithms`, `Blind 75`, `NeetCode 150`, `GFG SDE Sheet`), topic count chips, search bar with circular progress, and borderless table with pure colored text difficulties.
