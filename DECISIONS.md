# Architectural and Engineering Decisions

Author: Harshal Patel (B.Tech ICT, Dhirubhai Ambani University)

## 1. Design System & Theme Token Architecture
- **Decision**: Built a CSS custom-property design token system supporting six switchable coding palettes (`Dark`, `Day`, `LeetCode`, `VS Code`, `Tokyo Night`, and `Monokai`).
- **Aesthetic Direction**: High-contrast, distraction-free developer workbench with obsidian surfaces, crisp subtle borders, tabular monospace metrics, and custom pixel-art character avatars (`PixelAvatars`).
- **Complete System Specification**: Documented in [DESIGN.md](file:///c:/Users/Harshal/Desktop/Compiler/DESIGN.md).

## 2. Sandbox Execution Strategy
- **Decision**: Custom hardened Docker execution container using `g++ -O2 -std=c++17`.
- **Reasoning**:
  - Off-the-shelf Judge0 CE or Piston often require heavy multi-container Docker deployments (Redis, PostgreSQL, Judge0 server, worker queue) consuming 2-4 GB minimum RAM.
  - A lightweight, purpose-built runner using Linux cgroups v2, unshare namespaces, read-only root filesystems, drop-capabilities, non-root user, memory limit (256MB), CPU quota (1 core), process limit (pids_limit=64), and strict execution timeouts (2.0s) provides equivalent or superior isolation with zero external orchestration overhead.
  - Allows precise extraction of CPU time (`ru_utime + ru_stime`) and peak memory (`ru_maxrss`) via `getrusage` / cgroup v2 metrics, excluding compiler overhead.

## 3. Secret Marker Protocol & Anti-Spoofing
- **Decision**: Enclosing program outputs between unique, run-bound UUID markers (`__CODEPREP_OUT_START_<hex>__` and `__CODEPREP_OUT_END_<hex>__`).
- **Reasoning**:
  - Prevents user debug statements (`std::cout << "..."`) or adversarial attempts to print fake test outcomes from corrupting the verdict comparator.
  - User debug output is extracted and displayed in a dedicated debug drawer rather than failing comparison.

## 4. Compiler Line Number Remapping
- **Decision**: Dynamic subtraction of generated harness prelude lines from GCC/Clang diagnostic error messages.
- **Reasoning**:
  - Raw compiler errors reference internal harness lines (e.g., `solution.cpp:145:10: error`), which disorients users who only see their concise `class Solution` code. Remapping shifts the error directly to the line number in the user's editor.

## 5. Idempotent Execution Queue
- **Decision**: In-memory execution queue with a 1500ms duplicate submission lock.
- **Reasoning**:
  - Users frequently double-click "Submit" or "Run" buttons under latency, which can trigger duplicate compiler invocations and lock up CPU cores. The idempotency guard drops identical rapid clicks.

## 6. Pure SVG Diagrammatic Visualizations
- **Decision**: Dynamic inline SVG generation for data structure representations (Doubly Linked Lists, Trees, Heaps) rather than static external image assets.
- **Reasoning**:
  - Complies with Section 3 requirements ("never as external images").
  - Ensures sharp vector rendering across retina and 4K displays, dark/light theme color adaptation, and zero external network dependencies.

## 7. Server-Authoritative Active Timer & Solution Gating
- **Decision**: Active duration tracked via 5s client heartbeats, validated on the server with idle gap detection (intervals > 10s treated as pauses; window blur and inactivity > 120s pause timer).
- **Reasoning**:
  - Completely eliminates client-side timer spoofing (e.g., modifying localStorage or Date objects).
  - Enforces 403 Forbidden until threshold: 15m (Easy), 30m (Medium), 45m (Hard), or until `isSolved` is true.
  - Unlocking before an Accepted verdict automatically marks `solvedWithAiHelp = true` for spaced repetition revision.

## 8. Deterministic Diagnostics Engine & Pre-Unlock Guardrails
- **Decision**: Local diagnostics engine delivers directional pattern nudges, compiler error hints, and failing-edge-case checks without leaking full solution implementations.
- **Reasoning**:
  - Encourages independent problem solving before unlocking reference solutions.
  - Operates deterministically and offline with zero external API keys or rate limits.

## 9. Empirical Big-O Least-Squares Regression Model
- **Decision**: Tests user code against 5 input tiers (N in [10, 100, 1000, 10000, 50000]) with median of 3 trials, fitting against O(1), O(log N), O(N), O(N log N), O(N^2) via least-squares slope optimization.
- **Reasoning**:
  - Uses empirical, reproducible timing measurements instead of guesswork to benchmark asymptotic growth.
  - Delivers actionable complexity feedback directly inside the workspace.

## 10. Avatar Magic Byte Inspection & Data Safety
- **Decision**: Validates image headers by inspecting raw magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`). Explicitly rejects SVGs, XML, HTML, and script tags to prevent stored XSS.
- **Reasoning**:
  - Prevents extension spoofing attacks (e.g., uploading PHP or SVG scripts disguised as .png).
  - Accompanied by automated rolling 14-day SQLite backups (`scripts/backup-db.js`) and portable JSON data exports.

## 11. 500 DSA Problem Batching & Scaling
- **Decision**: Partitioned the 500 DSA questions into 10 structured batches of 50 problems (`dsa_batch_1.ts` to `dsa_batch_10.ts`), maintaining problems 1..20 from initial verification without regressions.
- **Reasoning**:
  - Ensures clean modularity, avoiding massive single-file memory overheads and enabling rapid compilation.
  - Exact difficulty breakdown: 125 Easy (25%), 300 Medium (60%), 75 Hard (15%) across 18 classic interview topics.

## 12. Isolated SQLite Query Runner & DDL Blocker
- **Decision**: Read-only SQLite execution sandbox seeding schema DDL/data cleanly per execution with regex blocking of destructive DDL/DML (`DROP`, `ALTER`, `TRUNCATE`, `GRANT`, `INSERT`, `UPDATE`, `DELETE`) and order-insensitive relational result comparisons.
- **Reasoning**:
  - Protects application database stability while enabling relational SQL practice (joins, window functions, CTEs, retention analysis) with zero external server setup.

## 13. Embedded SQLite Architecture & Zero-Setup Authentication
- **Decision**: Embedded local SQLite file (`dev.db`) managed via Prisma with dynamic file path synchronization, automatic owner account initialization, and 1-click single-user authentication.
- **Reasoning**:
  - The platform is designed as a personal, single-user interview preparation workbench. Requiring external database services (e.g. running a separate PostgreSQL or MySQL daemon) creates unnecessary installation friction, port conflicts, and background service overhead.
  - SQLite runs completely in-process inside Node.js with zero configuration and zero external background processes.
  - To eliminate database path divergence between the Prisma CLI (`prisma/dev.db`) and runtime working directory (`./dev.db`), `prisma.service.ts` dynamically resolves and synchronizes the active SQLite database file.
  - The login interface supports standard email/password authentication, account registration (capped at `MAX_USERS = 100`), owner seeding via `OWNER_EMAIL` / `OWNER_PASSWORD` / `OWNER_NAME`, and a 1-click Guest Demo for interviewers.

---

## 14. Scaling from 600 to 3,000 Problems Without UI or DB Degradation
- **Decision**: Implemented an in-memory catalog metadata cache (`catalogMetaCache`) in `ProblemService`, server-side filtering + deterministic seeded shuffling (`shuffleSeed`), paginated API responses, and chunked seeding (`CHUNK_SIZE = 50`).
- **Reasoning**:
  - Loading 3,000 full problem statements and test harnesses on list routes would bloat memory and serialize multi-megabyte JSON responses.
  - Chunking inserts into batches of 50 respects SQLite bind limits while keeping startup `/health` probes non-blocking (`app.listen()` runs before background seeding).

## 15. Dedicated OOPs Track (100 C++ Problems + Study & MCQ Hub)
- **Decision**: Assigned IDs `#631`–`#730` (`category: 'OOP'`) in `backend/src/data/oop100.ts` spanning 5 core pillars (Encapsulation, Constructors & RAII, Inheritance & Polymorphism, Operator Overloading, and Design Patterns), paired with a dedicated `/oops` study/MCQ workbench in the navbar beside SQL.
- **Reasoning**:
  - OOP rounds test both conceptual clarity (vtables, virtual destructors, slicing, SOLID) and actual C++ class implementation—unifying study guides, MCQs, and compiled C++ harness verification solves both.

## 16. Truthful AI Code Coaching via `CodeAnalyzerService` Grounding
- **Decision**: Coupled `StudyGuideService` (`aiTeacher.service.ts`) with a deterministic static analyzer (`CodeAnalyzerService`) and live `Submission` context (`verdict`, `failedTestCase`, `stderr`) prior to invoking Gemini (`gemini-2.5-flash`).
- **Reasoning**:
  - Unconstrained LLM coaching can falsely praise broken or stubbed submissions (e.g., calling empty functions `O(1)`). Inspecting syntax risks, nested loop complexity, stub returns, and actual failing assertions first guarantees honest, code-specific feedback even when running locally offline.

## 17. Multi-User Isolation, Guest Demo & Persistent `/data` Deployment
- **Decision**: Added `UserProblemState` (composite `(problemId, userId)` key) for per-user bookmarks, notes, and AI solution state, configurable `MAX_USERS = 100`, 1-click Guest Demo access for interviewers, and `/data/codeprep.db` + `/data/uploads` persistent disk colocation on Render.
- **Reasoning**:
  - Allows interviewers to inspect a live Render link cleanly while protecting the owner's streak, submissions, notes, and uploaded profile photo across container redeploys.
