/**
 * pages/tracker/main.js — Entry point for the journey tracker page
 * Reads window.TRACKER_BOOT set by index.php and mounts the React app.
 */
import { html, createRoot } from '../../lib/react.js';
import { TrackerApp } from './TrackerApp.js';

const boot = window.TRACKER_BOOT;
const root = document.getElementById('app');
if (root && boot) {
  createRoot(root).render(html`<${TrackerApp} boot=${boot} />`);
}
