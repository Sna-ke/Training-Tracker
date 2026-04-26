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
- **Multi-user** — session-based auth, athlete/coach/admin roles, admin user management panel
- **User profiles** — each user can set an emoji avatar, display name, email, and bio via `/user/edit_profile.php`
- **Privacy & sharing** — users control what others can see: current journeys, recent exercise logs, status messages
- **Coach relationships** — athletes can invite users with the Coach role; coaches bypass privacy restrictions and see full activity
- **Public profile view** — any logged-in user can view a summary profile of another user at `/user/view_profile.php?user_id=N`
- **Consecutive day streak** — tally of unbroken active training days shown on public profiles
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

### Frontend — Angular 17 (standalone components)

One Angular app (`frontend/`) compiles to `public/dist/`. Each PHP page sets `window.APP_PAGE` to tell the root `AppComponent` which page component to render, and passes boot data as `window.*_BOOT` globals to avoid a redundant initial HTTP round-trip.

---

## Project Structure

```
├── app/
│   ├── autoload.php              Simple PSR-4 class autoloader
│   ├── Auth.php                  Cookie-based session auth (require / requireAdmin / bustCache)
│   ├── Database.php              PDO wrapper (singleton)
│   ├── Models/
│   │   ├── User.php              User value object (id, name, email, avatar, bio, role)
│   │   ├── Plan.php
│   │   ├── Exercise.php
│   │   └── ...
│   ├── Repositories/
│   │   ├── BaseRepository.php
│   │   ├── UserRepository.php    findById/findAll/findCoaches/privacy/coaches/activity/sessions
│   │   ├── PlanRepository.php
│   │   ├── ExerciseRepository.php
│   │   └── ...
│   └── Services/
│       └── ...
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   │   └── index.ts           TypeScript interfaces
│   │   │   ├── services/
│   │   │   │   └── api.service.ts     All save.php + builder_api.php calls
│   │   │   ├── tracker/
│   │   │   │   ├── tracker.component.ts    Week strip, progress bar, day list
│   │   │   │   └── day-card.component.ts   Exercise logging, skip/done actions
│   │   │   ├── builder/
│   │   │   │   └── builder.component.ts    Create plan form + week-by-week editor
│   │   │   ├── journeys/
│   │   │   │   └── journeys.component.ts   Journey list with weekly progress grid
│   │   │   ├── exercises/
│   │   │   │   └── exercises.component.ts  Catalog with inline create/edit
│   │   │   ├── admin/
│   │   │   │   └── admin.component.ts      User management
│   │   │   └── shared/
│   │   │       ├── exercise-modal.component.ts   History + Media tabs dialog
│   │   │       ├── exercise-picker.component.ts  Exercise search/filter dialog
│   │   │       └── toast.component.ts            Stub (PrimeNG toast used directly)
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
│   ├── header.php                Sidebar shell, nav, user popup menu, loads styles
│   └── footer.php                Closes shell, loads zone.js + main.js (Angular pages only)
│
├── user/
│   ├── edit_profile.php          Edit own profile: avatar, name, email, bio, password,
│   │                             sharing preferences, coach invitations
│   └── view_profile.php          Public profile view (?user_id=N): avatar, name, bio,
│                                 streak, recent journeys & exercise logs (per privacy)
│
├── index.php                     Journey tracker (APP_PAGE=tracker)
├── journeys.php                  Journey list (APP_PAGE=journeys)
├── builder.php                   Plan builder (APP_PAGE=builder)
├── exercises.php                 Exercise catalog (APP_PAGE=exercises)
├── plans.php                     Template manager (pure PHP, no Angular)
├── plan_editor.php               Template day editor
├── profile.php                   301 redirect → user/edit_profile.php (backward compat)
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
├── schema_v4.sql                 users, user_sessions, multi-user columns
├── schema_v5.sql                 users.avatar + users.bio columns
└── schema_v6.sql                 user_privacy_settings, user_coaches; coach role
```

---

## Database Schema

All schema files must be applied in order:
`schema.sql` → `schema_media.sql` → `schema_builder.sql` → `schema_v3.sql` → `schema_v4.sql` → `schema_v5.sql` → `schema_v6.sql`

### Core tables

| Table | Purpose |
|---|---|
| `exercises` | Exercise definitions — slug, name, category, unit_type |
| `exercise_media` | YouTube / NRC / web links attached to exercises |
| `workout_types` | Named workout sessions (e.g. "Easy Run", "Tempo") |
| `workout_items` | Exercises inside a workout type with planned values |
| `plan_templates` | Reusable plan blueprints (global or user-created) |
| `plan_template_days` | Day slots in a template (week × day_of_week) |
| `plan_template_day_items` | Workout assignments per template day |
| `training_plans` | A user's active journey instantiated from a template |
| `plan_days` | Concrete dated days within a journey |
| `exercise_logs` | Logged exercise results per plan day |
| `users` | Accounts — name, email, password_hash, avatar, bio, role (`admin`/`athlete`/`user`/`coach`) |
| `user_sessions` | DB-stored auth tokens with expiry |
| `user_privacy_settings` | Per-user sharing flags: share_journeys, share_exercise_logs, share_status |
| `user_coaches` | Coach–athlete relationships with status (`pending`/`accepted`/`declined`) |

---

## Setup & Installation

1. Clone the repo
2. Point MAMP (or your PHP server) document root at the project folder
3. Create database and apply schemas in order:
   ```bash
   mysql -u root -p < schema.sql
   mysql -u root -p training_plan < schema_media.sql
   mysql -u root -p training_plan < schema_builder.sql
   mysql -u root -p training_plan < schema_v3.sql
   mysql -u root -p training_plan < schema_v4.sql
   mysql -u root -p training_plan < schema_v5.sql
   mysql -u root -p training_plan < schema_v6.sql
   ```
4. Copy `config.example.php` → `config.php` and fill in DB credentials
5. Run `php seed_admin.php` to create the first admin account
6. Build the frontend (see below)

---

## Building the Frontend

```bash
cd frontend
npm install
npm run build        # production
npm run watch        # development (auto-rebuild)
```

Output goes to `public/dist/`.

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
| `/user/edit_profile.php` | `user/edit_profile.php` | *(pure PHP)* | Edit own profile, sharing prefs, coaches |
| `/user/view_profile.php?user_id=N` | `user/view_profile.php` | *(pure PHP)* | Public profile view of another user |
| `/profile.php` | `profile.php` | *(redirect)* | 301 → `/user/edit_profile.php` |
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
| `set_role` | Change a user's role (admin/athlete/user/coach) |
| `reset_password` | Set a new password for a user |
| `set_active` | Activate or deactivate a user account |

---

## CSS Architecture

```
Browser loads two files on every page:

public/css/app.css          ← shell layout (sidebar/topbar/main) [legacy, being phased out]
public/dist/styles.css      ← compiled Angular styles (all design tokens + components)
```

Design tokens live in `:root` in `frontend/src/styles.css` and are used across all PHP and Angular templates.

---

## Key Design Decisions

**Zone.js loaded from CDN-equivalent local copy** — Angular 17's esbuild pipeline wraps zone.js in a way that causes `ce[T] is not a function` errors in Safari when bundled. Zone.js is excluded from Angular's polyfills (`"polyfills": []` in `angular.json`) and instead copied from `node_modules` verbatim, then loaded as a plain synchronous script tag.

**Planned value fallback** — When a user logs a workout without filling in a field, the planned value is used as the logged value. This ensures a completion always records something meaningful.

**User popup menu** — Clicking the avatar/name in the sidebar footer opens an inline popup with links to Edit Profile and Sign Out. The popup is pure HTML/CSS/JS (no Angular) so it works on all PHP pages without a build step.

**Privacy-gated profiles** — The public profile page (`view_profile.php`) only shows activity the user has explicitly enabled sharing for. Coaches bypass these restrictions once their invite is accepted.

**Coach role** — A dedicated `coach` role (separate from `admin`/`athlete`/`user`) controls who appears in the coach-invite picker. Admins assign this role via the existing admin panel.
