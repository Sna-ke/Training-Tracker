/**
 * pages/builder/main.js — Plan Builder entry point
 * Mounts either the create form (no plan_id) or the week editor (plan_id set)
 */
import { html, createRoot } from '../../lib/react.js';
import { BuilderApp }   from './BuilderApp.js';
import { ErrorBoundary } from '../../shared/ErrorBoundary.js';

const root = document.getElementById('app');
if (root && window.BUILDER_BOOT) {
  createRoot(root).render(html`<${ErrorBoundary}><${BuilderApp} boot=${window.BUILDER_BOOT} /></${ErrorBoundary}>`);
}
