# Training Tracker — Angular Frontend

## Prerequisites

- Node.js 18+ and npm
- PHP 8.1+ with MAMP (or any PHP server)
- MySQL database (existing schema already applied)

## First-time setup

```bash
cd frontend
npm install
```

## Development build (with source maps)

```bash
cd frontend
npm run watch
```

Outputs to `public/dist/` and rebuilds on file changes. Refresh your browser to see changes.

## Production build

```bash
cd frontend
npm run build
```

Outputs minified bundle to `public/dist/main.js` and `public/dist/polyfills.js`.

## How it works

The PHP backend is **unchanged** — all repositories, services, models, `save.php`, and `builder_api.php` work identically.

Each PHP page sets two things before Angular loads:

```php
// Example from index.php:
$inlineScript = 'window.APP_PAGE="tracker";window.TRACKER_BOOT = ' . json_encode($bootData) . ';';
```

`APP_PAGE` tells the Angular `AppComponent` which page component to render. `*_BOOT` passes the PHP-loaded data (plan info, week data, etc.) so Angular doesn't need to make an extra HTTP request on startup.

`layout/footer.php` loads the Angular bundle:

```html
<script src="/public/dist/main.js" defer></script>
<script src="/public/dist/polyfills.js" defer></script>
```

`layout/header.php` still renders the static nav, app header, and CSS. The `<div id="app"></div>` in each PHP page is the Angular mount point, replaced by `<app-root>` at runtime.

## Project structure

```
frontend/src/app/
├── models/index.ts              TypeScript interfaces for all data shapes
├── services/api.service.ts      All save.php + builder_api.php HTTP calls
├── tracker/
│   ├── tracker.component.ts     Week view — renders DayCard list
│   └── day-card.component.ts    Expandable day card with exercise logging
├── builder/
│   └── builder.component.ts     Plan builder — create form + week editor
├── shared/
│   ├── exercise-modal.component.ts   History + Media tabs modal
│   ├── exercise-picker.component.ts  Bottom-sheet exercise selector
│   └── toast.component.ts            Toast notification
├── other-components.ts          Journeys, Exercises, Admin components
├── app.component.ts             Root — switches on window.APP_PAGE
├── app.config.ts                Provides HttpClient
└── main.ts                      Bootstrap entry point
```

## Key improvement over React version

The exercise log pre-fill that was broken in the React version is fixed in Angular. `[(ngModel)]` two-way binding is used for all exercise inputs. When `loadItems()` fetches data from `save.php?action=get_day`, saved log values are directly assigned to a `LogForm` object per exercise, and `[(ngModel)]` immediately reflects them in the UI. There is no controlled/uncontrolled input ambiguity.
