/**
 * pages/exercises/main.js — Exercise catalog manager
 */
import { html, createRoot, useState, useCallback } from '../../lib/react.js';
import { api }                     from '../../shared/api.js';
import { Toast }                   from '../../shared/Toast.js';
import { ErrorBoundary } from '../../shared/ErrorBoundary.js';

const UNITS = { reps: 'Reps', seconds: 'Seconds', distance: 'km', duration: 'Minutes' };

// ── Media helpers ─────────────────────────────────────────────

function ytId(m) {
  const patterns = [/youtube\.com\/watch\?v=([\w-]+)/, /youtu\.be\/([\w-]+)/, /youtube\.com\/embed\/([\w-]+)/];
  for (const p of patterns) { const match = m.url?.match(p); if (match) return match[1]; }
  return null;
}
function isImage(m) {
  return m.media_type === 'image' || m.source === 'image_url' || /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(m.url ?? '');
}

// ── MediaCard ─────────────────────────────────────────────────

function MediaCard({ m, onDelete }) {
  const vid = ytId(m);
  const img = !vid && isImage(m);
  const srcColor = { youtube:'#ff4444', nike_nrc:'var(--c2)', image_url:'#a78bfa' }[m.source] ?? 'var(--t3)';
  const srcLabel = { youtube:'YouTube', nike_nrc:'Nike Run Club', image_url:'Image', web:'Web' }[m.source] ?? m.source;

  return html`
    <div class="media-card">
      <div class="media-card-hdr">
        <span class="media-label">${m.label || m.url}</span>
        <span class="media-source" style=${`background:${srcColor}22;color:${srcColor}`}>${srcLabel}</span>
        <button class="media-del" onClick=${() => onDelete(m)} title="Remove">✕</button>
      </div>
      ${vid && html`
        <div class="yt-embed">
          <iframe src=${`https://www.youtube.com/embed/${vid}`}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope"
                  allowfullscreen loading="lazy" />
        </div>
      `}
      ${img && html`
        <img src=${m.url} alt=${m.label} class="img-embed" loading="lazy"
             onError=${(e) => e.target.style.display = 'none'} />
      `}
      ${!vid && !img && html`
        <a href=${m.url} target="_blank" rel="noopener" class="link-embed">
          <span>${m.source === 'nike_nrc' ? '👟' : '🔗'}</span>
          <span style="font-size:.68rem;word-break:break-all">${m.url.length > 60 ? m.url.slice(0, 60) + '…' : m.url}</span>
          <span style="margin-left:auto;font-size:.65rem;color:var(--t4)">Open ↗</span>
        </a>
      `}
    </div>
  `;
}

// ── ExerciseCard ──────────────────────────────────────────────

function ExerciseCard({ exercise, categories, onToast, isAdmin, userId }) {
  const [open,          setOpen]          = useState(false);
  const [loaded,        setLoaded]        = useState(false);
  const [form,          setForm]          = useState({ name: exercise.name, description: exercise.description ?? '', category: exercise.category, unit_type: exercise.unit_type });
  const [media,         setMedia]         = useState([]);
  const [saving,        setSaving]        = useState(false);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [newMedia,      setNewMedia]      = useState({ source: 'youtube', url: '', label: '' });

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      try {
        const data = await api.exerciseDetail(exercise.id);
        setMedia(data.media ?? []);
        setLoaded(true);
      } catch (e) { onToast('Error loading media'); }
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateExercise(exercise.id, form);
      onToast('Saved ✓');
    } catch (e) { onToast('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  async function addMedia() {
    if (!newMedia.url.trim()) { onToast('URL required'); return; }
    const type = newMedia.source === 'image_url' ? 'image' : 'video';
    try {
      const m = await api.addMedia(exercise.id, newMedia.url.trim(), newMedia.label.trim(), type, newMedia.source);
      setMedia(prev => [...prev, m]);
      setNewMedia({ source: 'youtube', url: '', label: '' });
      setShowMediaForm(false);
      onToast('Link added ✓');
    } catch (e) { onToast('Error: ' + e.message); }
  }

  async function deleteMedia(m) {
    if (!confirm('Remove this media link?')) return;
    try {
      await api.deleteMedia(m.id);
      setMedia(prev => prev.filter(x => x.id !== m.id));
      onToast('Removed ✓');
    } catch (e) { onToast('Error'); }
  }

  const col      = categories[exercise.category]?.color ?? '#64748b';
  const isGlobal = exercise.created_by == null;
  const canEdit  = isAdmin || (!isGlobal && exercise.created_by === userId);

  return html`
    <div class="ex-item" data-name=${exercise.name.toLowerCase()} data-cat=${exercise.category}>
      <!-- Header row -->
      <div class="ex-row" onClick=${toggle} style="cursor:pointer">
        <div style=${`width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${col}`}></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.82rem;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${form.name}</div>
          <div style="font-size:.58rem;color:var(--t4);margin-top:1px">
            ${categories[form.category]?.label ?? form.category} · ${UNITS[form.unit_type] ?? form.unit_type}
            ${isGlobal
              ? html`<span style="margin-left:.5rem;color:var(--c2);font-size:.55rem">🌍 global</span>`
              : html`<span style="margin-left:.5rem;color:var(--t4);font-size:.55rem">my exercise</span>`
            }
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
          ${loaded && media.length > 0 && html`<span style="font-size:.6rem;color:var(--t3)">${media.length} link${media.length !== 1 ? 's' : ''}</span>`}
          <span style=${`font-size:.65rem;color:var(--t4);transition:transform .2s;display:inline-block;transform:${open ? 'rotate(180deg)' : ''}`}>▾</span>
        </div>
      </div>

      ${open && html`
        <div class="ex-detail">
          <!-- Edit form -->
          <div style="margin-top:.75rem">
            <div class="field" style="margin-bottom:.65rem">
              <label>Name</label>
              <input type="text" value=${form.name} onChange=${(e) => setForm(f => ({ ...f, name: e.target.value }))} maxLength="200" />
            </div>
            <div class="field" style="margin-bottom:.65rem">
              <label>Description</label>
              <textarea value=${form.description} rows="3" maxLength="2000" placeholder="How to perform, cues, variations…"
                        style="min-height:72px;resize:vertical;width:100%;background:var(--bg);border:1px solid var(--bd2);border-radius:var(--rs);padding:.6rem .7rem;color:var(--tx);font-size:15px"
                        onChange=${(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.65rem">
              <div class="field" style="flex:1;min-width:120px">
                <label>Category</label>
                <select value=${form.category} onChange=${(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                  ${Object.entries(categories).map(([s, c]) => html`<option key=${s} value=${s}>${c.icon} ${c.label}</option>`)}
                </select>
              </div>
              <div class="field" style="flex:1;min-width:120px">
                <label>Measure In</label>
                <select value=${form.unit_type} onChange=${(e) => setForm(f => ({ ...f, unit_type: e.target.value }))}>
                  ${Object.entries(UNITS).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
                </select>
              </div>
            </div>
            ${canEdit && html`
              <button class="btn-save-ex" disabled=${saving} onClick=${save} style="width:100%">
                ${saving ? 'Saving…' : 'Save Changes'}
              </button>
            `}
          </div>

          <!-- Media -->
          <div class="media-sec-label" style="margin-top:1rem">Media Links</div>
          <div class="media-list">
            ${media.map(m => html`<${MediaCard} key=${m.id} m=${m} onDelete=${deleteMedia} />`)}
          </div>

          ${showMediaForm && html`
            <div class="add-media-form">
              <div class="source-tabs">
                ${[['youtube','▶ YouTube'],['image_url','🖼 Image'],['nike_nrc','👟 Nike NRC'],['web','🔗 Other']].map(([s, l]) => html`
                  <button key=${s} class=${`src-tab ${newMedia.source === s ? 'on' : ''}`}
                          onClick=${() => setNewMedia(m => ({ ...m, source: s }))}>${l}</button>
                `)}
              </div>
              <div class="field" style="margin-bottom:.55rem">
                <label>URL</label>
                <input type="url" value=${newMedia.url} onChange=${(e) => setNewMedia(m => ({ ...m, url: e.target.value }))}
                       placeholder="https://…" style="min-height:42px" />
              </div>
              <div class="field" style="margin-bottom:.6rem">
                <label>Label</label>
                <input type="text" value=${newMedia.label} onChange=${(e) => setNewMedia(m => ({ ...m, label: e.target.value }))}
                       maxLength="200" placeholder="e.g. Form demo — Jeff Nippard" style="min-height:42px" />
              </div>
              <div style="display:flex;gap:.4rem">
                <button style="background:var(--bg3);border:1px solid var(--bd2);border-radius:var(--rs);padding:.6rem .85rem;color:var(--t2);font-size:.8rem;min-height:42px;cursor:pointer"
                        onClick=${() => setShowMediaForm(false)}>Cancel</button>
                <button class="btn-save-ex" style="flex:1;font-size:.78rem" onClick=${addMedia}>Add Link</button>
              </div>
            </div>
          `}

          ${!showMediaForm && html`
            <button class="btn btn-ghost" style="width:100%;justify-content:center;font-size:.78rem;min-height:40px;margin-top:.4rem"
                    onClick=${() => setShowMediaForm(true)}>＋ Add Media Link</button>
          `}
        </div>
      `}
    </div>
  `;
}

// ── ExercisesApp ──────────────────────────────────────────────

function ExercisesApp({ boot }) {
  const { exercises: initial, categories, isAdmin, userId } = boot;

  const [toast,       setToast]       = useState(null);
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('all');
  const [exercises,   setExercises]   = useState(initial);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEx,       setNewEx]       = useState({ name: '', description: '', category: 'strength', unit_type: 'reps' });
  const [saving,      setSaving]      = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const filtered = exercises.filter(ex => {
    const matchQ   = !search   || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || ex.category === catFilter;
    return matchQ && matchCat;
  });

  async function addExercise() {
    if (!newEx.name.trim()) { showToast('Name required'); return; }
    setSaving(true);
    try {
      const ex = await api.saveExercise(newEx.name.trim(), newEx.category, newEx.unit_type, newEx.description || null);
      setExercises(prev => [...prev, { ...ex, description: newEx.description }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewEx({ name: '', description: '', category: 'strength', unit_type: 'reps' });
      setShowAddForm(false);
      showToast('Exercise added ✓');
    } catch (e) { showToast('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  return html`
    <div>
      <!-- Filter bar -->
      <div style="display:flex;gap:.5rem;margin-bottom:.85rem;flex-wrap:wrap;align-items:center">
        <input type="search" value=${search} onChange=${(e) => setSearch(e.target.value)}
               placeholder="Search exercises…"
               style="flex:1;min-width:160px;background:var(--bg2);border:1px solid var(--bd2);border-radius:var(--rs);padding:.55rem .75rem;color:var(--tx);font-size:16px;min-height:42px" />
        <select value=${catFilter} onChange=${(e) => setCatFilter(e.target.value)}
                style="background:var(--bg2);border:1px solid var(--bd2);border-radius:var(--rs);padding:.55rem .65rem;color:var(--tx);font-size:16px;min-height:42px">
          <option value="all">All categories</option>
          ${Object.entries(categories).map(([s, c]) => html`<option key=${s} value=${s}>${c.icon} ${c.label}</option>`)}
        </select>
      </div>

      <!-- Add new -->
      <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-bottom:.85rem;min-height:44px"
              onClick=${() => setShowAddForm(!showAddForm)}>
        ${showAddForm ? 'Cancel' : '＋ Add New Exercise'}
      </button>

      ${showAddForm && html`
        <div style="background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:.9rem;margin-bottom:.85rem">
          <div style="font-size:.82rem;color:#f8fafc;margin-bottom:.75rem">New Exercise</div>
          <div class="field" style="margin-bottom:.65rem">
            <label>Name *</label>
            <input type="text" value=${newEx.name} onChange=${(e) => setNewEx(f => ({ ...f, name: e.target.value }))} maxLength="200" placeholder="e.g. Cable Lateral Raise" />
          </div>
          <div class="field" style="margin-bottom:.65rem">
            <label>Description</label>
            <textarea value=${newEx.description} rows="2" maxLength="2000" placeholder="How to perform, cues…"
                      style="min-height:60px;resize:vertical;width:100%;background:var(--bg);border:1px solid var(--bd2);border-radius:var(--rs);padding:.6rem .7rem;color:var(--tx);font-size:15px"
                      onChange=${(e) => setNewEx(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem">
            <div class="field" style="flex:1;min-width:120px">
              <label>Category</label>
              <select value=${newEx.category} onChange=${(e) => setNewEx(f => ({ ...f, category: e.target.value }))}>
                ${Object.entries(categories).map(([s, c]) => html`<option key=${s} value=${s}>${c.icon} ${c.label}</option>`)}
              </select>
            </div>
            <div class="field" style="flex:1;min-width:120px">
              <label>Measure In</label>
              <select value=${newEx.unit_type} onChange=${(e) => setNewEx(f => ({ ...f, unit_type: e.target.value }))}>
                ${Object.entries(UNITS).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
              </select>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%" disabled=${saving} onClick=${addExercise}>
            ${saving ? 'Saving…' : 'Save Exercise'}
          </button>
        </div>
      `}

      <!-- List -->
      <div class="ex-list">
        ${filtered.map(ex => html`
          <${ExerciseCard} key=${ex.id} exercise=${ex} categories=${categories} onToast=${showToast} isAdmin=${isAdmin} userId=${userId} />
        `)}
        ${filtered.length === 0 && html`
          <div style="text-align:center;padding:2rem;color:var(--t3);font-size:.82rem">No exercises match your filter.</div>
        `}
      </div>

      <${Toast} message=${toast} />
    </div>
  `;
}

// ── Mount ─────────────────────────────────────────────────────
const root = document.getElementById('app');
if (root && window.EXERCISES_BOOT) {
  createRoot(root).render(html`<${ErrorBoundary}><${ExercisesApp} boot=${window.EXERCISES_BOOT} /></${ErrorBoundary}>`);
}
