# Database Architecture & Schema Specification

**Project:** CodePrep — Technical Interview Preparation Workbench  
**Author:** Harshal Patel (B.Tech ICT, Dhirubhai Ambani University)  
**ORM / Engines:** Prisma ORM (`schema.prisma` for SQLite WAL; `schema.postgres.prisma` compatibility client)  
**Production Storage:** Persistent `/data/codeprep.db` SQLite volume with automatic startup DDL verification (`prisma.service.ts`)

---

## 1. Architectural Rationale: Why Embedded SQLite (WAL) + Auto-DDL Bootstrap?

When deploying a full-stack interview workbench on a single container (`Dockerfile` + `render.yaml` Starter plan with a 1 GB `/data` disk):
1. **Zero Network Hop Latency:** Problem metadata lookups, active timer heartbeats (every 5s), and submission inserts execute over local disk/memory instead of traversing a separate managed database instance.
2. **Write-Ahead Logging (`WAL`):** Configured cleanly via SQLite runtime pragmas so concurrent reads (e.g., `/health` probes, catalog queries, heatmap aggregations) never block submission writes.
3. **Self-Healing Startup DDL (`PRISMA_SCHEMA_DDL` / `POSTGRES_SCHEMA_DDL`):** In `backend/src/services/prisma.service.ts`, if a fresh Render volume mounts an empty `/data` directory where no SQLite file exists yet, the backend ensures all 9 tables and composite indexes exist before background seeding runs—while also supporting PostgreSQL URLs seamlessly via a dual-generated `.prisma/client-pg` build step in `Dockerfile`.
4. **Data Portability:** Every user's submissions, drafts, timers, notes, bookmarks, badges, and profile settings can be exported to JSON and restored cleanly via `/api/user/export` and `/api/user/import`.

---

## 2. Entity-Relationship Diagram

```text
+-------------------+         1 : N        +----------------------+
|       User        |--------------------->|     RefreshToken     |
|-------------------|                      |----------------------|
| id (UUID, PK)     |                      | id (UUID, PK)        |
| email (Unique)    |                      | tokenHash (Unique)   |
| passwordHash      |                      | userId (FK -> User)  |
| displayName       |                      | expiresAt            |
| avatarUrl         |                      +----------------------+
| themePreference   |
| timezone          |         1 : N        +----------------------+
| lastLoginAt       |--------------------->|      UserBadge       |
+-------------------+                      |----------------------|
   |   |   |   |                           | id (cuid, PK)        |
   |   |   |   |                           | userId (FK -> User)  |
   |   |   |   |                           | badgeKey             |
   |   |   |   |                           | @@unique(user,badge) |
   |   |   |   |                           +----------------------+
   |   |   |   |
   |   |   |   +--- 1 : N ---> UserProblemState <--- N : 1 ---+
   |   |   +------- 1 : N ---> ProblemDraft     <--- N : 1 ---+
   |   +----------- 1 : N ---> ProblemActiveTimer <- N : 1 ---+
   +--------------- 1 : N ---> Submission       <--- N : 1 ---+
                                                              |
+-------------------+         1 : 1        +------------------+---+
|     AiLesson      |<---------------------|       Problem        |
|-------------------|                      |----------------------|
| id (cuid, PK)     |                      | id (Int, PK: 1..3000)|
| problemId (Uniq)  |                      | slug (Unique)        |
| techniqueLesson   |                      | title, difficulty    |
| visualTraceJson   |                      | category, topic      |
| workedExamples    |                      | pattern, statement   |
| approachProgress. |                      | constraints          |
| verifiedSolution  |                      | examplesJson         |
| similarProbsJson  |                      | functionSignature    |
+-------------------+                      | cppHarnessTemplate   |
                                           +----------------------+
```

---

## 3. Model-by-Model Schema Reference

Grounded directly in `backend/prisma/schema.prisma`:

### 3.1 `User`
Stores authentication credentials, UI preferences, timezone for streak calculations, and uploaded/preset avatar references.

| Column | Type | Constraints / Default | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary user identifier. |
| `email` | `String` | `@unique` | Normalized sign-in identifier. |
| `passwordHash` | `String` | Required | `bcrypt` (12 rounds) credential hash. |
| `displayName` | `String` | `@default("Developer")` | Public/UI profile name. |
| `avatarUrl` | `String?` | Nullable | Pixel avatar key (`pixel:...`) or `/uploads/...` path on `/data/uploads`. |
| `themePreference` | `String` | `@default("dark")` | `"dark" \| "light" \| "leetcode" \| "vscode" \| "tokyo" \| "monokai"`. |
| `timezone` | `String` | `@default("Asia/Kolkata")` | Determines calendar day boundaries for streaks & POTD. |
| `createdAt` / `updatedAt` | `DateTime` | Auto-managed | Account audit timestamps. |
| `lastLoginAt` | `DateTime?` | Nullable | Tracks most recent authenticated session. |

### 3.2 `RefreshToken`
Supports rolling `HttpOnly` refresh cookies with immediate revocation on logout or password reset.

| Column | Type | Constraints / Default | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Token record ID. |
| `tokenHash` | `String` | `@unique` | SHA-256 digest of refresh token (raw secret is never stored). |
| `userId` | `String` | FK -> `User.id` (`CASCADE`) | Owning user. Indexed via `@@index([userId])`. |
| `expiresAt` | `DateTime` | Required | 30-day rolling expiration timestamp. |
| `createdAt` | `DateTime` | `@default(now())` | Issuance timestamp. |

### 3.3 `Problem`
Canonical catalog storing **3,000 problems** (`DSA`, `OOP`, and `SQL`). Seeding executes in safe chunks of `50` records to respect SQLite bind variable limits.

| Column | Type | Constraints / Default | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `Int` | `@id` (explicit) | Stable numeric ID (`#1..#3000`; `#631..#730` reserved for OOP). |
| `slug` | `String` | `@unique` | URL-friendly canonical key. |
| `title` | `String` | Required | Problem display title. |
| `difficulty` | `String` | `"Easy" \| "Medium" \| "Hard"` | Indexed via `@@index([difficulty])`. |
| `category` | `String` | `"DSA" \| "OOP" \| "SQL"` | Primary workspace partition; composite `@@index([category, topic])`. |
| `topic` | `String` | Required | E.g. `"Arrays and Hashing"`, `"Inheritance & Polymorphism"`, `"Window Functions"`. |
| `pattern` | `String` | Required | Algorithmic or design pattern classification. |
| `statement` | `String` | Required | Full problem description / SQL schema context. |
| `constraints` | `String` | Required | Input bounds, time/memory goals, or SQL constraints. |
| `examplesJson` | `String` | Required (JSON) | Input/output/explanation pairs rendered on the problem pane. |
| `functionSignature` | `String` | Required | C++ target signature or SQL query instruction. |
| `cppHarnessTemplate` | `String?` | Nullable | Default starter stub shown in Monaco editor. |
| Legacy Owner Fields | `Boolean / String?` | `isBookmark`, `userNotes`, `unlockedAiSolution`, `solvedWithAiHelp` | Preserved for backward compatibility with single-owner exports; superseded per-user by `UserProblemState`. |

### 3.4 `UserProblemState`
Isolates per-user study metadata so up to `MAX_USERS = 100` learners (plus Guest Demo) never leak bookmarks, personal notes, or hint unlock states across accounts.

| Column | Type | Constraints / Default | Purpose |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Row primary key. |
| `problemId` | `Int` | FK -> `Problem.id` (`CASCADE`) | Target problem. |
| `userId` | `String` | FK -> `User.id` (`CASCADE`) | Owning user. |
| `isBookmark` | `Boolean` | `@default(false)` | Saved/bookmarked toggle. |
| `userNotes` | `String?` | Nullable | User's personal markdown/scratch notes. |
| `unlockedAiSolution` | `Boolean` | `@default(false)` | Whether full solution unlock criteria were met. |
| `solvedWithAiHelp` | `Boolean` | `@default(false)` | Distinguishes solo solves vs. AI-assisted solves in analytics. |
| `updatedAt` | `DateTime` | `@updatedAt` | Last state modification. |

**Indexes:** `@@unique([problemId, userId])`, `@@index([userId, isBookmark])`.

### 3.5 `ProblemDraft`
Persists in-progress editor code per `(problemId, userId)` so switching devices or closing tabs never discards unfinished code.
- **Unique Constraint:** `@@unique([problemId, userId])` with cascade deletes from `User` and `Problem`.

### 3.6 `ProblemActiveTimer`
Server-authoritative focus timer synced via 5-second `/api/ai/timer/heartbeat` pings whenever the browser tab is active.
- **Fields:** `activeSeconds` (`Int`, default `0`), `lastHeartbeat` (`DateTime`), `isPaused` (`Boolean`, default `true`).
- **Unique Constraint:** `@@unique([problemId, userId])`.

### 3.7 `Submission`
Immutable history of every C++ and SQL run/submit verdict, feeding the 365-day activity heatmap, streak calculations, recent submissions panel, and empirical runtime charts.

| Column | Type | Purpose |
| :--- | :--- | :--- |
| `id` | `String` (`cuid`) | Unique submission ID. |
| `problemId` / `userId` | `Int` / `String` | Foreign keys (`ON DELETE CASCADE`). |
| `language` | `String` | `"cpp"` or `"sql"`. |
| `code` | `String` | Exact candidate source submitted. |
| `verdict` | `String` | `"Accepted"`, `"Wrong Answer"`, `"Compilation Error"`, `"Time Limit Exceeded"`, `"Runtime Error"`, etc. |
| `runtimeMs` / `memoryKb` | `Float?` | Measured execution telemetry. |
| `failedTestCase` | `String?` | Serialized failing input/expected/actual payload used by both the UI diff viewer and `CodeAnalyzerService`. |
| `stdout` / `stderr` | `String?` | Captured compiler/runtime streams. |
| `submittedAt` | `DateTime` | Timestamp for heatmaps and streaks. |

**Indexes:** `@@index([problemId, verdict])`, `@@index([userId, submittedAt])`.

### 3.8 `AiLesson`
Stores structured study guides, visual trace states, worked examples, brute-to-optimal progressions, verified solutions, and related problem links keyed `1:1` to `Problem` (`@unique problemId`).

### 3.9 `UserBadge`
Tracks unlocked milestones and streak/topic mastery achievements per user.
- **Constraints & Indexes:** `@@unique([userId, badgeKey])`, `@@index([userId])`.

---

## 4. Persistence & Disaster Recovery Strategy

1. **Docker + Render Persistent Mount (`/data`):** `render.yaml` configures a `1 GB` persistent disk mounted at `/data` with `DATABASE_URL=file:/data/codeprep.db`. `backend/src/index.ts` automatically colocates user avatar uploads into `/data/uploads`, guaranteeing zero data loss across deploys.
2. **Primary-Owner Continuity:** When seeding the configured `OWNER_EMAIL` on startup, historical single-owner problem state fields seamlessly align with the primary owner's `UserProblemState`.
3. **Full Portable Backup:** `node scripts/backup-db.js` / `node scripts/restore-db.js` (host-level) and `/api/user/export` / `/api/user/import` (in-app JSON snapshot) provide clean zero-lock-in recovery.
