/**
 * shared/ExerciseModal.js — Exercise history + media modal (two-tab)
 *
 * Props:
 *   open      boolean
 *   onClose   fn
 *   exerciseId  number|null
 *   exerciseName string
 *   initialTab  'history'|'media'
 *   planId      number (required for history tab)
 */
import { html, useState, useEffect, useRef } from '../lib/react.js';
import { Modal }                       from './Modal.js';
import { api }                         from './api.js';

// ── Media helpers (pure functions) ────────────────────────────

function ytId(m) {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];
  for (const p of patterns) {
    const match = m.url?.match(p);
    if (match) return match[1];
  }
  return null;
}

function isImage(m) {
  return m.media_type === 'image'
      || m.source === 'image_url'
      || /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(m.url ?? '');
}

function srcLabel(m) {
  return { youtube: 'YouTube', nike_nrc: 'Nike Run Club', image_url: 'Image', web: 'Web' }[m.source] ?? m.source;
}

function srcColor(m) {
  return { youtube: '#ff4444', nike_nrc: 'var(--c2)', image_url: '#a78bfa' }[m.source] ?? 'var(--t3)';
}

// ── MediaCard ─────────────────────────────────────────────────

function MediaCard({ m }) {
  const vid = ytId(m);
  const img = !vid && isImage(m);

  function openNRC(deep, fallback) {
    window.location.href = deep;
    setTimeout(() => { if (!document.hidden) window.location.href = fallback; }, 800);
  }

  return html`
    <div class="mcard" style="overflow:hidden;margin-bottom:.5rem">
      <div style=${`padding:.5rem .7rem .3rem;font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:${srcColor(m)}`}>
        ${srcLabel(m)}
      </div>
      <div style="padding:0 .7rem .5rem;font-size:.78rem;font-weight:500;color:var(--tx)">${m.label}</div>

      ${vid && html`
        <div style="position:relative;padding-top:56.25%;background:#000;overflow:hidden">
          <iframe src=${`https://www.youtube.com/embed/${vid}`}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope"
                  allowfullscreen loading="lazy"
                  style="position:absolute;inset:0;width:100%;height:100%;border:none" />
        </div>
      `}

      ${img && html`
        <img src=${m.url} alt=${m.label} loading="lazy"
             style="width:100%;max-height:200px;object-fit:cover;display:block"
             onError=${(e) => e.target.style.display = 'none'} />
      `}

      ${!vid && !img && m.source === 'nike_nrc' && m.url?.startsWith('nrc://') && html`
        <button class="mc-btn nrc" onClick=${() => openNRC(m.url, m.url_web ?? 'https://www.nike.com/nrc-app')}
                style="margin:.3rem .7rem .55rem;width:calc(100% - 1.4rem)">
          <span>👟</span>
          <span style="font-size:.7rem;color:var(--t4)">Opens Nike Run Club app</span>
        </button>
      `}

      ${!vid && !img && !(m.source === 'nike_nrc' && m.url?.startsWith('nrc://')) && html`
        <a href=${m.url} target="_blank" rel="noopener"
           class=${`mc-btn ${m.source === 'youtube' ? 'yt' : 'web'}`}
           style="margin:.3rem .7rem .55rem;width:calc(100% - 1.4rem);text-decoration:none">
          <span>${m.source === 'youtube' ? '▶' : '🔗'}</span>
          <span style="font-size:.7rem;color:var(--t4)">
            ${m.source === 'youtube' ? 'Opens YouTube search' : 'Opens in browser'}
          </span>
          <span style="margin-left:auto;font-size:.65rem;color:var(--t4)">↗</span>
        </a>
      `}
    </div>
  `;
}

// ── HistoryTable ──────────────────────────────────────────────

function HistoryTable({ ex, rows }) {
  if (!rows.length) {
    return html`<div style="padding:2rem;text-align:center;color:var(--t3);font-size:.78rem">No logged sessions yet.</div>`;
  }

  const isRun = ex.unit_type === 'distance' || ex.unit_type === 'duration';
  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  function delta(h) {
    if (h.reps_done == null || h.planned_reps == null) return null;
    const n = h.reps_done - h.planned_reps;
    return { n, cls: n > 0 ? 'up' : n === 0 ? 'same' : 'down', sign: n > 0 ? '+' : '' };
  }

  return html`
    <div style="overflow-x:auto">
      <table class="htbl">
        <thead>
          <tr>
            <th>Wk</th><th>Date</th><th>Plan</th>
            ${isRun
              ? html`<th>Dist</th><th>Time</th><th>Pace</th>`
              : html`<th>Sets</th><th>Reps</th><th>Weight</th>`
            }
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(h => {
            const d = delta(h);
            const plan = h.planned_sets && h.planned_reps
              ? `${h.planned_sets}×${h.planned_reps}`
              : (h.eff_distance ? h.eff_distance + 'km' : '—');
            return html`
              <tr key=${h.scheduled_date + h.week_number}>
                <td style="font-family:var(--mono);color:var(--t2);font-size:.65rem">W${h.week_number}</td>
                <td style="color:var(--t3);font-size:.62rem">${fmtDate(h.scheduled_date)}</td>
                <td style="color:var(--t4)">${plan}</td>
                ${isRun ? html`
                  <td class="hact">${h.distance_km ? h.distance_km + 'km' : '—'}</td>
                  <td class="hact">${h.duration_min ? h.duration_min + 'm' : '—'}</td>
                  <td class="hact">${h.pace_per_km ?? '—'}</td>
                ` : html`
                  <td class="hact">${h.sets_done ?? '—'}</td>
                  <td>
                    <span class="hact">${h.reps_done ?? '—'}</span>
                    ${d && html`<span class=${`hdelta ${d.cls}`} style="margin-left:.25rem">${d.sign}${d.n}</span>`}
                  </td>
                  <td class="hact">${h.weight_kg != null ? h.weight_kg + 'kg' : '—'}</td>
                `}
                <td style="color:var(--t4);font-size:.62rem;max-width:80px;overflow:hidden;text-overflow:ellipsis">${h.notes ?? ''}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}

// ── ExerciseModal ─────────────────────────────────────────────

export function ExerciseModal({ open, onClose, exerciseId, exerciseName, initialTab = 'history', planId }) {
  const [tab,     setTab]     = useState(initialTab);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef({ history: {}, media: {} });

  // Reset and load when opening or switching tabs
  useEffect(() => {
    if (!open || !exerciseId) return;
    setTab(initialTab);
    loadTab(initialTab, exerciseId);
  }, [open, exerciseId, initialTab]);

  async function loadTab(t, id) {
    const cacheKey = t === 'history' ? cache.current.history : cache.current.media;
    if (cacheKey[id]) { setContent(cacheKey[id]); return; }

    setLoading(true);
    setContent(null);
    try {
      const data = t === 'history'
        ? await api.exerciseHistory(id, planId)
        : await api.exerciseMedia(id);
      const result = { type: t, ...data };
      cacheKey[id] = result;
      setContent(result);
    } catch (e) {
      setContent({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t) {
    setTab(t);
    loadTab(t, exerciseId);
  }

  return html`
    <${Modal} open=${open} onClose=${onClose} title=${exerciseName}>
      <!-- Tabs -->
      <div class="mtabs">
        <button class=${`mtab ${tab === 'history' ? 'on' : ''}`} onClick=${() => switchTab('history')}>📈 History</button>
        <button class=${`mtab ${tab === 'media'   ? 'on' : ''}`} onClick=${() => switchTab('media')}>🎬 How To</button>
      </div>

      <div class="modal-body">
        ${loading && html`
          <div style="display:flex;align-items:center;gap:.5rem;padding:1rem 0;color:var(--t3);font-size:.78rem">
            <span class="spin"></span> Loading…
          </div>
        `}
        ${content?.type === 'error' && html`
          <div style="padding:1.5rem;text-align:center;color:#fb7185;font-size:.78rem">${content.message}</div>
        `}
        ${!loading && content?.type === 'history' && html`
          <${HistoryTable} ex=${content.exercise} rows=${content.history} />
        `}
        ${!loading && content?.type === 'media' && html`
          <div>
            ${!content.media.length && html`
              <div style="padding:2rem;text-align:center;color:var(--t3);font-size:.78rem;line-height:1.6">
                No media links yet.<br/>
                <a href="exercises.php" style="color:var(--c2);font-size:.72rem">Add links in Exercises ›</a>
              </div>
            `}
            ${content.media.map(m => html`<${MediaCard} key=${m.id} m=${m} />`)}
          </div>
        `}
      </div>
    <//>
  `;
}

export default ExerciseModal;
