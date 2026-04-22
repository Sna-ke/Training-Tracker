/**
 * shared/Modal.js — Bottom-sheet modal shell
 *
 * Props:
 *   open      boolean
 *   onClose   fn
 *   title     string
 *   children  ReactNode
 */

import { html, useEffect } from '../lib/react.js';
export function Modal({ open, onClose, title, children }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return html`
    <div class="overlay" style="display:flex" onClick=${(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal">
        <div class="modal-hdr">
          <div class="modal-title">${title}</div>
          <button class="modal-close" onClick=${onClose}>✕</button>
        </div>
        ${children}
      </div>
    </div>
  `;
}

export default Modal;
