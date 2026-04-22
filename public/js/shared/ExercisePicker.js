/**
 * shared/ExercisePicker.js — Exercise search / add bottom sheet
 *
 * Props:
 *   open       boolean
 *   onClose    fn
 *   onSelect   fn(exercise)   called when user taps an exercise
 *   categories object         Exercise::CATEGORIES map
 */
import { html, useState, useEffect, useRef } from '../lib/react.js';
import { api }                           from './api.js';

const UNITS = { reps: 'Reps', seconds: 'Seconds', distance: 'km', duration: 'Minutes' };

export function ExercisePicker({ open, onClose, onSelect, categories, initialExercises = [] }) {
  const [allExercises, setAllExercises] = useState(initialExercises);
  const [query,    setQuery]    = useState('');
  const [category, setCategory] = useState('all');
  const [showNew,  setShowNew]  = useState(false);
  const [newName,  setNewName]  = useState('');
  const [newCat,   setNewCat]   = useState('strength');
  const [newUnit,  setNewUnit]  = useState('reps');
  const [saving,   setSaving]   = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery(''); setCategory('all'); setShowNew(false);
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  // Derive filtered list
  const filtered = allExercises.filter(ex => {
    const matchQ   = !query || ex.name.toLowerCase().includes(query.toLowerCase());
    const matchCat = category === 'all' || ex.category === category;
    return matchQ && matchCat;
  });

  async function saveNewExercise() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const ex = await api.saveExercise(newName.trim(), newCat, newUnit);
      setAllExercises(prev => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setShowNew(false);
      onSelect(ex);
      onClose();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return html`
    <div class="overlay" style="display:flex" onClick=${(e) => e.target === e.currentTarget && onClose()}>
      <div class="picker">

        <!-- Header -->
        <div class="picker-hdr">
          <span style="font-size:.9rem;color:#f8fafc">Add Exercise</span>
          <button style="background:none;border:none;color:var(--t3);font-size:1.25rem;cursor:pointer;min-width:36px;min-height:36px"
                  onClick=${onClose}>✕</button>
        </div>

        <!-- Search -->
        <div style="padding:.6rem .9rem;border-bottom:1px solid var(--bd);flex-shrink:0">
          <input ref=${searchRef} type="search" value=${query}
                 onChange=${(e) => setQuery(e.target.value)}
                 placeholder="Search exercises…"
                 style="width:100%;background:var(--bg3);border:1px solid var(--bd2);border-radius:var(--rs);padding:.55rem .75rem;color:var(--tx);min-height:42px;font-size:16px" />
        </div>

        <!-- Category tabs -->
        <div class="cat-strip">
          <button class=${`ctab ${category === 'all' ? 'on' : ''}`} onClick=${() => setCategory('all')}>All</button>
          ${Object.entries(categories).map(([slug, cfg]) => html`
            <button key=${slug} class=${`ctab ${category === slug ? 'on' : ''}`}
                    style=${category === slug ? `border-color:${cfg.color};color:${cfg.color}` : ''}
                    onClick=${() => setCategory(slug)}>
              ${cfg.icon} ${cfg.label}
            </button>
          `)}
        </div>

        <!-- List -->
        <div class="picker-list">
          ${!filtered.length && html`
            <div style="padding:1.5rem;text-align:center;color:var(--t3);font-size:.78rem">No exercises found</div>
          `}
          ${filtered.map(ex => {
            const col = categories[ex.category]?.color ?? '#64748b';
            const cfg = categories[ex.category] ?? {};
            return html`
              <div key=${ex.id} class="picker-item" onClick=${() => { onSelect(ex); onClose(); }}>
                <div>
                  <div style="font-size:.82rem;color:var(--tx)">${ex.name}</div>
                  <div style="font-size:.6rem;color:var(--t4);margin-top:2px">${UNITS[ex.unit_type] ?? ex.unit_type}</div>
                </div>
                <div style="display:flex;align-items:center;gap:.5rem">
                  <span style=${`font-size:.6rem;border-radius:4px;padding:2px 7px;background:${col}22;color:${col}`}>
                    ${cfg.icon ?? ''} ${cfg.label ?? ex.category}
                  </span>
                  <span style="font-size:.9rem;color:var(--c2)">＋</span>
                </div>
              </div>
            `;
          })}
        </div>

        <!-- Footer: create new -->
        <div style="padding:.6rem .9rem;border-top:1px solid var(--bd);flex-shrink:0">
          <button style="width:100%;background:var(--bg3);border:1px solid var(--bd2);border-radius:var(--rs);padding:.65rem;color:var(--t2);font-size:.8rem;min-height:44px;cursor:pointer"
                  onClick=${() => setShowNew(!showNew)}>
            ${showNew ? 'Cancel' : '＋ Create New Exercise'}
          </button>

          ${showNew && html`
            <div style="margin-top:.6rem">
              <div class="field" style="margin-bottom:.5rem">
                <label>Name *</label>
                <input type="text" value=${newName} onChange=${(e) => setNewName(e.target.value)}
                       maxLength="200" placeholder="e.g. Cable Row" style="min-height:42px" />
              </div>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.6rem">
                <div class="field" style="flex:1;min-width:110px">
                  <label>Category</label>
                  <select value=${newCat} onChange=${(e) => setNewCat(e.target.value)}>
                    ${Object.entries(categories).map(([slug, cfg]) => html`
                      <option key=${slug} value=${slug}>${cfg.icon} ${cfg.label}</option>
                    `)}
                  </select>
                </div>
                <div class="field" style="flex:1;min-width:110px">
                  <label>Measure in</label>
                  <select value=${newUnit} onChange=${(e) => setNewUnit(e.target.value)}>
                    ${Object.entries(UNITS).map(([v, l]) => html`<option key=${v} value=${v}>${l}</option>`)}
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:.4rem">
                <button style="background:var(--bg3);border:1px solid var(--bd2);border-radius:var(--rs);padding:.6rem .85rem;color:var(--t2);font-size:.8rem;min-height:42px;cursor:pointer"
                        onClick=${() => setShowNew(false)}>Cancel</button>
                <button style=${`flex:1;background:var(--c2);color:#08090e;font-weight:600;border:none;border-radius:var(--rs);padding:.6rem;font-size:.8rem;min-height:42px;cursor:pointer;opacity:${saving ? .6 : 1}`}
                        disabled=${saving} onClick=${saveNewExercise}>
                  ${saving ? 'Saving…' : 'Save & Add'}
                </button>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

export default ExercisePicker;
