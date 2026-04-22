# Training Tracker

A mobile-first web application for managing multi-week training plans. Athletes log workouts day by day, track progress across a plan's full timeline, and review exercise history. Coaches can build structured training plans from scratch or import them from a JSON template.

Built for self-hosting on a standard PHP/MySQL stack with an Angular frontend.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Setup & Installation](#setup--installation)
- [Building the Frontend](#building-the-frontend)
- [Key Design Decisions](#key-design-decisions)
- [Pages & Routes](#pages--routes)
- [API Endpoints](#api-endpoints)
- [CSS Architecture](#css-architecture)

---

## Features

- **Journey tracking** — start a training plan ("journey"), track week-by-week progress with a visual completion grid
- **Day cards** — expand each day to log sets, reps, weight, distance, pace, HR and notes per exercise
- **Skip / restore days** — skipping a day marks it as rest and shifts all subsequent workout days forward by one (n+1 cascade); unskipping reverses this
- **Exercise history** — per-exercise chart of logged values across the full plan
- **How-to media** — YouTube, Nike Run Club, and web links attached to exercises
- **Plan builder** — week-by-week drag-and-assign interface for building custom training templates
- **Plan import** — upload a structured JSON file to create a template with exercises, workout types, and media links
- **Exercise catalog** — searchable, filterable list of all exercises with inline editing and creation
- **Multi-user** — session-based auth, athlete and admin roles, admin user management panel
- **Planned value fallback** — when logging, planned values (sets, reps, distance etc.) are saved as the log entry if the user leaves a field blank

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend language** | PHP 8.1 |
| **Database** | MySQL 8 / MariaDB (via MAMP in development) |
| **Frontend framework** | Angular 17 (standalone components) |
| **UI component library** | PrimeNG 17 + PrimeIcons 7 |
| **Frontend build tool** | Angular CLI 17 / esbuild |
| **HTTP client** | Angular `HttpClient` |
| **Forms** | Angular `FormsModule` with `[(ngModel)]` two-way binding |
| **Change detection** | Zone.js ~0.14 (loaded externally, not bundled) |
| **TypeScript** | 5.4 |
| **CSS** | Single global stylesheet compiled by Angular build |
| **Development server** | MAMP (macOS) |

---

## Architecture

### Backend — PHP Repository / Service pattern

All SQL lives in **Repository** classes, one per domain. **Service** classes hold business logic. PHP controller scripts (`index.php`, `journeys.php`, etc.) are thin — they load data, serialise it to JSON, and render the HTML shell.

```
Controller (PHP page)
  └── Repository  ←── all SQL here
  └── Service     ←── business logic (scheduling, import)
  └── Model       ←── value objects / immutable data
```

No SQL appears in controllers or views.

### Frontend — Angular bootstrapped inside PHP shell

Each PHP page sets two global JavaScript variables before the Angular bundle loads:

```js
window.APP_PAGE = "tracker";           // tells Angular which component to render
window.TRACKER_BOOT = { ... };         // page data, no extra HTTP round-trip needed
```

Angular's `AppComponent` reads `APP_PAGE` and renders the corresponding page component via `@switch`. The PHP-rendered sidebar shell is always present; Angular mounts inside `<app-root>` within the `<main class="tt-main">` content area.

```
Browser request
  → PHP controller (loads data from DB)
  → PHP renders: sidebar shell + <app-root> + window.APP_PAGE + window.*_BOOT
  → Angular bootstraps, reads boot data, renders page component
```

### CSS — Single source of truth

| File | Purpose |
|---|---|
| `public/css/app.css` | **Shell layout only** — sidebar, topbar, `.tt-main`. No component styles, no resets. |
| `frontend/src/styles.css` → `public/dist/styles.css` | **Everything else** — PrimeNG theme, design tokens, all component classes. Loaded on every page. |

No page-specific CSS files. No scoped `styles:[]` in Angular components. Every class is defined once in the global stylesheet and referenced by name in templates.

---

## Project Structure

```
/
├── app/                          PHP application classes
│   ├── autoload.php              PSR-4 autoloader
│   ├── Auth.php                  Session-based auth singleton
│   ├── Database.php              PDO singleton wrapper
│   ├── Models/
│   │   ├── Exercise.php          Immutable value object + CATEGORIES const
│   │   ├── Plan.php
│   │   ├── PlanDay.php
│   │   └── User.php
│   ├── Repositories/
│   │   ├── BaseRepository.php
│   │   ├── ExerciseRepository.php
│   │   ├── PlanDayRepository.php   findByWeek orders by scheduled_date
│   │   ├── PlanRepository.php      findAllWithProgress includes week_summaries
│   │   ├── UserRepository.php
│   │   └── WorkoutRepository.php
│   └── Services/
│       ├── PlanBuilderService.php
│       ├── PlanScheduleService.php   skip/unskip day shifting logic
│       └── TemplateImportService.php JSON plan import
│
├── frontend/                     Angular 17 workspace
│   ├── package.json
│   ├── angular.json              Outputs to public/dist/ (browser:"" — no subdirectory)
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts               Bootstrap entry point
│       ├── styles.css            Global stylesheet (single source of truth)
│       └── app/
│           ├── app.component.ts       Root — switches on window.APP_PAGE
│           ├── app.config.ts          Provides HttpClient, Animations, MessageService
│           ├── models/index.ts        All TypeScript interfaces
│           ├── services/
│           │   └── api.service.ts     All save.php + builder_api.php calls
│           ├── tracker/
│           │   ├── tracker.component.ts    Week strip, progress bar, day list
│           │   └── day-card.component.ts   Exercise logging, skip/done actions
│           ├── builder/
│           │   └── builder.component.ts    Create plan form + week-by-week editor
│           ├── journeys/
│           │   └── journeys.component.ts   Journey list with weekly progress grid
│           ├── exercises/
│           │   └── exercises.component.ts  Catalog with inline create/edit
│           ├── admin/
│           │   └── admin.component.ts      User management
│           └── shared/
│               ├── exercise-modal.component.ts   History + Media tabs dialog
│               ├── exercise-picker.component.ts  Exercise search/filter dialog
│               └── toast.component.ts            Stub (PrimeNG toast used directly)
│
├── public/
│   ├── css/
│   │   └── app.css               Shell layout only (sidebar/topbar/main)
│   └── dist/                     Angular build output — not committed to git
│       ├── main.js
│       ├── styles.css
│       └── zone.js               Copied from node_modules by postbuild script
│
├── layout/
│   ├── header.php                Sidebar shell, nav, loads app.css + dist/styles.css
│   └── footer.php                Closes shell, loads zone.js + main.js (Angular pages only)
│
├── index.php                     Journey tracker (APP_PAGE=tracker)
├── journeys.php                  Journey list (APP_PAGE=journeys)
├── builder.php                   Plan builder (APP_PAGE=builder)
├── exercises.php                 Exercise catalog (APP_PAGE=exercises)
├── plans.php                     Template manager (pure PHP, no Angular)
├── plan_editor.php               Template day editor
├── save.php                      Main AJAX API (GET + POST actions)
├── builder_api.php               Builder-specific AJAX API
├── admin/users.php               Admin panel (APP_PAGE=admin)
├── admin/save.php                Admin AJAX API
├── login.php / logout.php / register.php
├── config.php                    DB credentials
├── schema.sql                    Core tables
├── schema_media.sql              exercise_media table
├── schema_builder.sql            Builder-specific alterations
├── schema_v3.sql                 exercise.description column
└── schema_v4.sql                 users, user_sessions, multi-user columns
```

---

## Database Schema

All schema files must be applied in order: `schema.sql` → `schema_media.sql` → `schema_builder.sql` → `schema_v3.sql` → `schema_v4.sql`

### Core tables

| Table | Purpose |
|---|---|
| `exercises` | Exercise definitions — slug, name, category, unit_type |
| `exercise_media` | YouTube / NRC / web links attached to exercises |
| `workout_types` | Named workout sessions (e.g. "Easy Run", "Strength A") |
| `workout_items` | Exercises within a workout type, with planned sets/reps/distance |
| `plan_templates` | Reusable training plan blueprints |
| `plan_template_days` | Week/day assignments within a template |
| `training_plans` | A user's instance of a template ("journey") |
| `plan_days` | Individual scheduled days within a journey — `scheduled_date` shifts on skip |
| `exercise_logs` | Logged values per workout item per plan day. UNIQUE KEY `(plan_day_id, workout_item_id)` |
| `users` | Accounts with `athlete` / `admin` roles |
| `user_sessions` | Session tokens |

### Key column notes

- `plan_days.scheduled_date` — shifts forward when a day is skipped, back when restored. `week_number` never changes.
- `plan_days.original_date` — immutable; used as the stable week boundary anchor.
- `exercise_logs.sets_done` etc. — nullable; PHP fallback fills planned values when blank.

---

## Setup & Installation

### Prerequisites

- PHP 8.1+ with PDO MySQL extension
- MySQL 8 or MariaDB 10.6+
- Node.js 18+ (Angular build only)
- MAMP, XAMPP, or any PHP/MySQL local server

### 1. Database

```sql
-- Apply schemas in order
SOURCE schema.sql;
SOURCE schema_media.sql;
SOURCE schema_builder.sql;
SOURCE schema_v3.sql;
SOURCE schema_v4.sql;
```

### 2. PHP config

Copy the example config and fill in your database credentials:

```bash
cp config.example.php config.php
```

Then edit `config.php`:

```php
return [
    'db_host' => 'localhost',
    'db_port' => '3306',
    'db_name' => 'training_tracker',
    'db_user' => 'root',
    'db_pass' => 'your_password',
];
```

`config.php` is in `.gitignore` and must never be committed.

### 3. Angular build

```bash
cd frontend
npm install
npm run build
```

This outputs `public/dist/main.js`, `public/dist/styles.css`, and copies `zone.js` from `node_modules` via the `postbuild` script.

### 4. Browse

Point your web server root at the project directory and open it in a browser. Register the first user — they will automatically be granted admin role.

---

## Building the Frontend

| Command | Effect |
|---|---|
| `npm run build` | Production build → `public/dist/` |
| `npm run watch` | Development build with file watching |

**Important:** `public/dist/` is not committed to git. Always run `npm run build` after cloning or pulling changes to the `frontend/` directory.

The `postbuild` npm lifecycle hook automatically copies `zone.js` from `node_modules` to `public/dist/zone.js` using Node's `require.resolve()` — no manual step required.

Zone.js is loaded synchronously in `layout/footer.php` **before** `main.js` (which is deferred). This order is required for Angular's change detection to work correctly.

---

## Key Design Decisions

**PHP sends boot data via `window.*_BOOT`** — Each PHP page loads its required data from the database and serialises it directly into a `<script>` tag before Angular loads. Angular reads this on `ngOnInit`, so the page is ready with data immediately without a separate HTTP round-trip.

**`scheduled_date` shifts, `week_number` does not** — Skipping a day moves its `scheduled_date` forward one day and cascades all subsequent non-rest, non-completed days. The `week_number` is permanent — it's used to determine which days belong to which week view. `PlanDayRepository::findByWeek()` orders by `scheduled_date` so days appear in their new order within the week.

**`get_day` merges logs with a separate query** — The workout items query and the exercise logs query are separate, then merged in PHP. This eliminates LEFT JOIN ambiguity (where a failed join returns NULLs silently) and ensures saved log data always appears correctly in the day card.

**`[(ngModel)]` two-way binding for exercise inputs** — Each exercise item gets a `LogForm` object pre-populated from saved log data when the day card opens. Angular's two-way binding handles both display of saved values and capture of user edits, solving the React controlled/uncontrolled input problem that previously caused pre-filled values not to display.

**Planned values as log fallback** — When `Save & Done` is triggered with blank input fields, `buildPayloads()` uses the item's `planned_sets`, `planned_reps`, `planned_distance_km` etc. as the logged value. This ensures a completion always records something meaningful.

**Zone.js loaded from CDN-equivalent local copy** — Angular 17's esbuild pipeline wraps zone.js in a way that causes `ce[T] is not a function` errors in Safari when bundled. Zone.js is excluded from Angular's polyfills (`"polyfills": []` in `angular.json`) and instead copied from `node_modules` verbatim, then loaded as a plain synchronous script tag.

---

## Pages & Routes

| URL | PHP Controller | Angular Page | Description |
|---|---|---|---|
| `/journeys.php` | `journeys.php` | `app-journeys` | List of all journeys with progress grids |
| `/index.php?plan_id=N&week=W` | `index.php` | `app-tracker` | Week view for a journey |
| `/builder.php` | `builder.php` | `app-builder` | Create plan form |
| `/builder.php?plan_id=N` | `builder.php` | `app-builder` | Week-by-week plan editor |
| `/exercises.php` | `exercises.php` | `app-exercises` | Exercise catalog |
| `/plans.php` | `plans.php` | *(pure PHP)* | Template manager + JSON import |
| `/admin/users.php` | `admin/users.php` | `app-admin` | User management (admin only) |
| `/login.php` | `login.php` | *(pure PHP)* | Login form |
| `/register.php` | `register.php` | *(pure PHP)* | Registration form |

---

## API Endpoints

### `save.php` — Main API (GET + POST JSON)

| Action | Method | Description |
|---|---|---|
| `get_day` | GET | Workout items + merged exercise logs for a plan day |
| `exercise_history` | GET | Logged history for one exercise across a plan |
| `exercise_media` | GET | Media links for an exercise |
| `exercises_list` | GET | All exercises, optionally filtered by category / search |
| `log` | POST | Upsert an exercise log entry |
| `complete` | POST | Mark a plan day complete or incomplete |
| `skip` | POST | Skip a day (shifts subsequent days +1) |
| `unskip` | POST | Restore a skipped day (shifts subsequent days -1) |
| `create_plan` | POST | Create a new training plan from a template |
| `delete_plan` | POST | Delete a training plan |
| `update_exercise` | POST | Update an exercise's name, category, unit type |
| `create_exercise` | POST | Create a new exercise |
| `add_media` | POST | Add a media link to an exercise |
| `update_media` | POST | Update a media link |
| `delete_media` | POST | Delete a media link |

### `builder_api.php` — Builder API (GET + POST JSON)

| Action | Method | Description |
|---|---|---|
| `week_days` | GET | All days for a plan week with their exercises |
| `exercises` | GET | Exercise list for the picker |
| `create_plan` | POST | Create a new custom plan + template |
| `save_day` | POST | Save exercises for a day |
| `copy_week` | POST | Copy one week's structure to other weeks |
| `save_exercise` | POST | Create a new exercise from the builder |

### `admin/save.php` — Admin API (POST JSON, admin role required)

| Action | Description |
|---|---|
| `add_user` | Create a new user account |
| `set_role` | Change a user's role |
| `reset_password` | Set a new password for a user |
| `set_active` | Activate or deactivate a user account |

---

## CSS Architecture

```
Browser loads two files on every page:

public/css/app.css          ← shell layout (133 lines)
  Sidebar, topbar, .tt-main, mobile breakpoints.
  No design tokens. No component styles. No CSS reset.

public/dist/styles.css      ← everything else (607 lines, compiled by Angular)
  PrimeNG lara-light-blue theme
  Design tokens (CSS custom properties)
  Page structure: .page-header, .page-eyebrow, .page-title, .page-body
  All component classes: .journey-card, .day-card, .wk-btn, .ex-row, etc.
  Category chips: .cat-strength, .cat-run, etc.
  PrimeNG overrides (tighter padding for mobile)
  Responsive breakpoints
```

Every colour in the application resolves to a CSS custom property. Hardcoded hex values exist only in `app.css` (sidebar brand colour) and in the compiled PrimeNG theme.

Angular components have **no `styles:[]` blocks**. All styles are global and defined once.

---

## Git Workflow

### What is and isn't committed

| Path | Committed | Reason |
|---|---|---|
| `config.php` | ✗ | Contains DB credentials — use `config.example.php` |
| `public/dist/` | ✗ | Build output — regenerated by `npm run build` |
| `public/dist/.gitkeep` | ✓ | Keeps the directory present for the web server |
| `frontend/node_modules/` | ✗ | Restored by `npm install` |
| `frontend/.angular/` | ✗ | Angular CLI cache |

### First time on a new machine

```bash
git clone <repo-url>
cd <repo>

# 1. Configure database
cp config.example.php config.php
# edit config.php with your credentials

# 2. Apply database schemas (in order)
mysql -u root -p training_tracker < schema.sql
mysql -u root -p training_tracker < schema_media.sql
mysql -u root -p training_tracker < schema_builder.sql
mysql -u root -p training_tracker < schema_v3.sql
mysql -u root -p training_tracker < schema_v4.sql

# 3. Build the frontend
cd frontend
npm install
npm run build
cd ..

# 4. Point your web server at the project root and open in browser
```

### After pulling changes

```bash
git pull

# If frontend source files changed:
cd frontend && npm run build && cd ..
```
