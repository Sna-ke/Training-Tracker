/**
 * shared/Toast.js — App-level toast notification
 * Usage: <Toast message={toast} />
 * Shows when message is non-null, hidden when null.
 */

import { html } from '../lib/react.js';
export function Toast({ message }) {
  return html`
    <div class="toast" style=${`opacity:${message ? 1 : 0}; pointer-events:${message ? 'auto' : 'none'}`}>
      ${message}
    </div>
  `;
}

export default Toast;
