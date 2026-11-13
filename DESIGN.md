# CodePrep UI & Design System Specification

Author: Harshal Patel (B.Tech ICT, Dhirubhai Ambani University)  
Compliance: Strict WCAG AA contrast targets, 8px spatial grid, Lucide SVG icons + custom PixelAvatars.

---

## 1. Design Principles

1. **Computational Precision & Focus**: Distraction-free, dense, engineered layouts. The visual language conveys speed, deterministic execution, and cryptographic security.
2. **Deep Obsidian Foundation**: Dark mode relies on deep neutral obsidian and slate-tinted containers with 1px luminous borders (`border-white/10` or `rgba(255,255,255,0.08)`) rather than heavy drop shadows.
3. **Restrained Color Hierarchy**:
   - Electric Cobalt / Sapphire Blue (`#2573e6` / `#3b82f6`) for primary focus, active navigation, and primary execution CTAs.
   - Emerald (`#10b981`) for Accepted verdicts, operational sandbox indicators, and successful test assertions.
   - Amber / Goldenrod (`#f59e0b` / `#d16900`) for Medium difficulty, TLE warnings, active timer highlights, and spaced repetition notices.
   - Rose / Crimson (`#ef4444` / `#dc2626`) for Hard difficulty, Wrong Answer, runtime errors, and destructive actions.
4. **Zero Emojis**: Strictly prohibited. All iconography uses standard Lucide SVG symbols at uniform stroke widths (1.5px to 2px) and standard dimensions (16px, 20px, 24px).
5. **Dual Theme Harmony**: Seamless dark and light modes with identical semantic tokens implemented as CSS custom properties.

---

## 2. Color Tokens & Palette

### Semantic Tokens (CSS Variables)

| Token Name | Dark Mode (Default) | Light Mode | Description / Usage |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#08090c` | `#f8fafc` | Deepest root background / viewport canvas |
| `--bg-surface` | `#11131a` | `#ffffff` | Primary panel and card surface |
| `--bg-surface-elevated` | `#191b23` | `#f1f5f9` | Elevated containers, dialogs, dropdowns |
| `--bg-surface-high` | `#272a31` | `#e2e8f0` | Highest contrast containers, hovered rows |
| `--bg-surface-subtle` | `#0b0e15` | `#f8fafc` | Depressed areas, code editors, output wells |
| `--border-subtle` | `#1f2430` | `#e2e8f0` | Minimal dividers, inactive borders (1px) |
| `--border-default` | `#2d3345` | `#cbd5e1` | Standard card and container borders |
| `--border-active` | `#3b82f6` | `#2573e6` | Focus rings, active inputs, selected tabs |
| `--border-hover` | `rgba(255,255,255,0.15)` | `rgba(0,0,0,0.15)` | Interactive card/button hover outlines |
| `--text-primary` | `#f1f5f9` | `#0f172a` | High-contrast body, titles, headlines |
| `--text-secondary` | `#94a3b8` | `#475569` | Metadata, subtitles, secondary labels |
| `--text-muted` | `#64748b` | `#94a3b8` | Placeholders, inactive breadcrumbs, shortcuts |
| `--color-primary` | `#2573e6` | `#2573e6` | Primary brand accent and interactive CTAs |
| `--color-primary-hover` | `#3b82f6` | `#1d4ed8` | Hover state for primary buttons |
| `--color-primary-subtle` | `rgba(37,115,230,0.12)`| `rgba(37,115,230,0.08)`| Badges, selected item backgrounds |
| `--color-success` | `#10b981` | `#059669` | Accepted verdicts, passing tests, operational dot |
| `--color-success-subtle`| `rgba(16,185,129,0.12)`| `rgba(16,185,129,0.08)`| Easy difficulty tag, Accepted pill background |
| `--color-warning` | `#f59e0b` | `#d97706` | Medium difficulty, progressive hints, active timer |
| `--color-warning-subtle`| `rgba(245,158,11,0.12)`| `rgba(245,158,11,0.08)`| Medium difficulty tag background |
| `--color-danger` | `#ef4444` | `#dc2626` | Hard difficulty, WA, TLE, RE verdicts |
| `--color-danger-subtle` | `rgba(239,68,68,0.12)` | `rgba(239,68,68,0.08)` | Hard difficulty tag background |

---

## 3. Typography Scale

Typography relies on three disciplined typefaces:
- **Headlines & Display**: `Plus Jakarta Sans`, sans-serif (Geometric, high-energy, clean letterforms)
- **Body & Controls**: `Inter`, sans-serif (Engineered for optical density, readability at small sizes)
- **Code & Telemetry**: `JetBrains Mono`, monospace (Tabular numerals, code blocks, metrics, timestamps)

| Level / Class | Font Family | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display-xl` | Plus Jakarta Sans | 36px | 700 (Bold) | 44px | -0.025em | Main hero metric displays |
| `headline-lg` | Plus Jakarta Sans | 32px | 700 (Bold) | 40px | -0.02em | Page headers, problem title |
| `headline-md` | Plus Jakarta Sans | 24px | 600 (Semibold)| 32px | -0.015em | Section headers, card titles |
| `headline-sm` | Plus Jakarta Sans | 20px | 600 (Semibold)| 28px | -0.01em | Modal headers, sub-sections |
| `body-lg` | Inter | 18px | 400 (Regular) | 28px | 0em | Problem description prose |
| `body-md` | Inter | 15px | 400 (Regular) | 24px | 0em | Standard body copy, hints |
| `body-sm` | Inter | 13px | 400 (Regular) | 20px | +0.005em | Table cell copy, secondary notes|
| `label-md` | Inter / Public Sans | 12px | 500 (Medium) | 16px | +0.02em | Buttons, tabs, dropdown items |
| `label-mono` | JetBrains Mono | 12px | 500 (Medium) | 16px | +0.04em | Badges, tags, shortcut chips |
| `code-editor` | JetBrains Mono | 13px | 400 (Regular) | 22px | 0em | Monaco code editing |
| `micro-caps` | JetBrains Mono | 10px | 600 (Semibold)| 14px | +0.08em | Security labels, column headers |

---

## 4. Spacing Scale & Layout Grids

Spatial increments strictly adhere to an **8px base grid** with **4px sub-increments**:

| Token | Size | Rem Equivalent | Common Application |
| :--- | :--- | :--- | :--- |
| `space-2xs` | 2px | 0.125rem | Micro borders, hairline offsets |
| `space-xs` | 4px | 0.25rem | Icon gaps, tight badge padding |
| `space-sm` | 8px | 0.5rem | Button padding (Y), chip spacing, table gaps |
| `space-md` | 16px | 1.0rem | Standard container padding, form field gaps |
| `space-lg` | 24px | 1.5rem | Card padding, section spacing, column gaps |
| `space-xl` | 32px | 2.0rem | Major layout divisions, page margins |
| `space-2xl` | 48px | 3.0rem | Outer page section margins |

### Layout Grids
- **Global App Shell**:
  - Top Navigation: Docked 56px height, 100% viewport width, sticky, backdrop filter blur 12px.
  - Sub-Navigation / Status Strip: 32px height, pinned to bottom.
- **Problem Workspace**:
  - Two-pane split IDE with a resizable divider (default 45% specification, 55% Monaco editor & runner).
  - Minimum pane width: 400px.
- **Dashboard Layout**:
  - 12-column responsive desktop grid (`max-w-[1440px] mx-auto px-6`).
  - Left column (8 cols): Progress rings, submission heatmap, recent runs.
  - Right column (4 cols): Weak topic radar, revision list, quick action triggers.

---

## 5. Border Radius & Elevation (Depth)

### Border Radii
- `rounded-xs`: 4px (`0.25rem`) - Code tags, keyboard shortcut chips (`↵ Enter`).
- `rounded-sm`: 6px (`0.375rem`) - Small badges, table status indicators.
- `rounded-md`: 8px (`0.5rem`) - Form inputs, standard buttons, tabs, dropdowns.
- `rounded-lg`: 12px (`0.75rem`) - Main content cards, Monaco container.
- `rounded-xl`: 16px (`1.0rem`) - Authentication monolith, modals, dialogs.
- `rounded-full`: 9999px - Circular avatars, status beacons, pills.

### Elevation & Shadows
- **Level 0 (Flat)**: `bg-surface border border-subtle` (Default panels).
- **Level 1 (Card)**: `shadow-sm shadow-black/20 border border-white/5` (List items, table rows).
- **Level 2 (Elevated)**: `shadow-md shadow-black/40 border border-white/10` (Floating toolbars, tooltips).
- **Level 3 (Modal / Monolith)**: `shadow-2xl shadow-blue-950/30 border border-white/10` (Login card, confirm dialogs).
- **Luminous Accent Glow**: `shadow-[0_0_24px_-4px_rgba(37,115,230,0.35)]` (Primary action buttons, active indicator).

---

## 6. Component Rules

### 6.1. Buttons
- **Primary**:
  - Background: `--color-primary` (`#2573e6`), hover: `--color-primary-hover` (`#3b82f6`).
  - Text: High-contrast `#ffffff`, font-medium (13px), radius: 8px.
  - Subtle top specular highlight: `inset 0 1px 0 rgba(255,255,255,0.2)`.
  - Focused: Visible 2px ring in `--color-primary` with 2px offset.
- **Secondary / Ghost**:
  - Background: `rgba(255,255,255,0.03)` or transparent, hover: `rgba(255,255,255,0.08)`.
  - Border: 1px `border-subtle` (`#2d3345`).
  - Text: `--text-primary`.
- **Destructive**:
  - Background: `rgba(239,68,68,0.12)`, hover: `rgba(239,68,68,0.24)`.
  - Border: 1px `rgba(239,68,68,0.3)`. Text: `#ef4444`.
- **Keyboard Shortcut Affordances**:
  - Primary buttons with shortcuts display an inline muted mono chip: `[ ⌘ ↵ ]` or `[ ↵ ]`.

### 6.2. Input Fields
- Background: `--bg-surface-subtle` (`#0b0e15`), border: 1px `--border-default` (`#2d3345`).
- Text: `--text-primary`, font-mono for credentials/code inputs, font-sans for standard search.
- Padding: 10px 14px (height: 40px standard, 32px compact).
- Active / Focus: Border changes to `--color-primary` (`#2573e6`) with `box-shadow: 0 0 0 1px #2573e6`.
- Error State: Border changes to `--color-danger` (`#ef4444`) with assistive microcopy below.

### 6.3. Cards & Panels
- Background: `--bg-surface` (`#11131a`).
- Border: 1px `--border-subtle` (`#1f2430`).
- Header: Separated by a 1px border, containing title, icon badge, and optional action link.

### 6.4. Chips & Badges
- **Easy**: `text-emerald-400 bg-emerald-950/40 border border-emerald-800/50`.
- **Medium**: `text-amber-400 bg-amber-950/40 border border-amber-800/50`.
- **Hard**: `text-rose-400 bg-rose-950/40 border border-rose-800/50`.
- **Instance Status**: `text-slate-300 bg-slate-900 border border-slate-700/60` with a 6px pulsing emerald indicator dot.

### 6.5. Tables
- Header row: `--bg-surface-elevated`, font-mono micro-caps (`11px`), tracking `+0.06em`.
- Data rows: Alternating subtle hover state (`bg-white/[0.02]`), bottom border 1px `--border-subtle`.
- Numeric data (runtime, memory, timestamps): Right-aligned with tabular numbers (`font-mono`).

### 6.6. Modals & Dialogs
- Backdrop: `rgba(0,0,0,0.75)` with `backdrop-blur-sm`.
- Dialog card: Centered, max-w-lg, elevated shadow Level 3, autofocus on primary action.
- Close trigger: Top-right `X` icon button (`aria-label="Close dialog"`).

### 6.7. Toasts & Notifications
- Position: Bottom-right (`bottom-6 right-6`), stacked with z-index 1000.
- Surface: Glassmorphic dark card (`bg-slate-900/95 border border-slate-700 shadow-xl`).
- Duration: 4000ms auto-dismiss with an accessible dismiss button.

---

## 7. Lucide SVG Icon Mapping

To enforce the strict prohibition against emojis, every element across all screens is mapped to an official Lucide SVG icon:

| Context / Element | Replaced Concept | Lucide SVG Icon (`lucide-react`) | Default Size |
| :--- | :--- | :--- | :--- |
| Brand Glyph | Custom code symbol | `<Code2 />` or `<Terminal />` | 20px |
| Security / Instance Badge | Lock emoji | `<ShieldCheck />` / `<Lock />` | 16px |
| Operational Heartbeat | Green circle emoji | `<Activity />` (with pulsating SVG dot) | 14px |
| Streak Counter | Fire / Flame emoji | `<Flame />` or `<Zap />` | 16px |
| Timer / Elapsed Clock | Stopwatch emoji | `<Clock />` / `<Timer />` | 16px |
| Hints & Diagnostics | Help drawer | `<Terminal />` or `<Lightbulb />` | 18px |
| Reference Solution Lock | Lock / Unlock | `<LockKeyhole />` | 14px |
| Solved / Accepted | Checkmark emoji | `<CheckCircle2 />` | 16px |
| Wrong Answer | Cross / X emoji | `<XCircle />` | 16px |
| Time Limit Exceeded | Hourglass emoji | `<Hourglass />` | 16px |
| Memory Limit Exceeded | Memory chip emoji | `<Cpu />` | 16px |
| Run Code | Play button emoji | `<Play />` | 14px |
| Submit Code | Rocket / Send emoji | `<Check />` / `<Send />` | 14px |
| Code Boilerplate Toggle | Eye / Magnifier | `<FileCode />` / `<Eye />` | 16px |
| Copy Full Code | Clipboard emoji | `<Copy />` / `<Check />` (on copy) | 16px |
| Reset Code Stub | Refresh / Loop | `<RotateCcw />` | 16px |
| Bookmark Problem | Star / Pin emoji | `<Bookmark />` | 16px |
| Search Problems | Magnifying glass | `<Search />` | 16px |
| Filter Dropdowns | Funnel emoji | `<Filter />` / `<ChevronDown />` | 14px |
| Shuffle / Pick Random | Dice emoji | `<Shuffle />` | 16px |
| Dark / Light Theme Toggle | Sun / Moon emoji | `<Sun />` / `<Moon />` | 18px |
| User Profile | Person emoji | `<User />` | 18px |
| Backup / Export JSON | Floppy disk emoji | `<HardDriveDownload />` | 16px |
| Spaced Repetition Queue | Calendar / Clock | `<CalendarClock />` | 16px |

---

## 8. Screen-by-Screen Layout Specifications

### 8.1. Login Screen (`CodePrep - Developer Login`)
- **Backdrop**: Deep obsidian (`#08090c`) with 24px coordinate grid pattern.
- **Top Bar**: Minimalist brand logo with `SINGLE USER INSTANCE` monospace badge and green operational beacon.
- **Authentication Card**: Centered glassmorphic card (max-w-md), 40px internal padding.
  - Header: Shield emblem in rounded-lg container with sapphire border. Title: "Welcome back, Engineer".
  - Security Pill: `Argon2id + AES-256 GCM` badge.
  - Form: Developer Email input with mail icon; Master Passphrase input with key icon and visibility toggle.
  - Checkbox: Accessible "Remember for 30 days" toggle with session TTL notation.
  - Primary CTA: Solid `#2573e6` button with `Enter ↵` shortcut indicator.
  - Footer specs: "Zero Telemetry • Local Sandbox Active • SQLite Encrypted".

### 8.2. Developer Dashboard (`CodePrep - Developer Dashboard`)
- **Top Navigation Bar**: CodePrep logo, navigation links (`Dashboard`, `DSA 500`, `SQL 100`, `Revision Queue`, `Profile`), streak counter (`14 Days Streak`), theme switch, operational heartbeat.
- **Stats Overview Row**:
  - Total Solved Card (`142 / 600`, circular completion gauge).
  - Complexity Bars: Easy (78/200, green), Medium (52/300, amber), Hard (12/100, rose).
  - Accuracy: Acceptance Rate (68.4%), Average Solve Time (24m 18s).
- **Activity Heatmap**: 365-day GitHub/LeetCode style SVG grid tracking 418 submissions.
- **Recent Submissions Table**: Status badge, problem title, runtime, memory, date/time.
- **Sidebar**: Weak topics radar (DP 34%, Graphs 48%), `Recommend Next Problem` CTA button, Spaced Repetition Revision Queue card.
- **Data Safety Strip**: Anchored status bar with automated backup UTC timestamp, SHA-256 digest, and `Export JSON Backup` button.

### 8.3. Problem Workspace (`CodePrep - Problem Workspace`)
- **Navigation Dock**: Breadcrumb (`#146 LRU Cache` [Medium]), Prev/Next buttons (`[` / `]`), active session timer (`24:18`), `Reference Solution` unlock control.
- **Left Pane (Problem Specification)**:
  - Tabs: Description, Editorial (locked), Submissions (12), Discussions.
  - Tags: Algorithm pattern chips.
  - Dynamic Memory Diagram: SVG rendering of Doubly-Linked List + Hash Map node pointers (`HEAD <-> MRU <-> LRU <-> TAIL`).
  - Formatted Examples & Formal Constraints.
- **Right Pane (Monaco Editor & Test Runner)**:
  - Top Toolbar: C++17 (g++ -O2) selector, `Show full code` boilerplate toggle, Reset code, Vim toggle.
  - Monaco Container: Dark theme, line numbers, syntax highlighting, minimap.
  - Resizable Results Panel: `Accepted` status chip, runtime benchmark (42 ms, beats 88.4%), memory footprint (24.2 MB, beats 94.1%), testcase inputs and outputs.
  - Embedded Hints & Diagnostics Drawer: Contextual guidance drawer without full solution reveal.
  - Action Dock: `Run Code` (`⌘ + Enter`) and primary `Submit Solution`.

