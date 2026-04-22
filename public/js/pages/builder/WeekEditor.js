/**
 * WeekEditor.js — Renders the 7 day cards for a week in the builder/editor
 *
 * Props:
 *   planId       number|null    (builder mode — uses builder_api)
 *   templateId   number|null    (editor mode — uses save_template_day)
 *   week         number
 *   totalWeeks   number
 *   exercises    array
 *   categories   object
 *   mode         'builder'|'editor'
 *   onToast      fn(msg)
 *   onContentChange  fn(week, hasContent)
 */
import { html, useState, useEffect, useRef } from '../../lib/react.js';
import { api }                           from '../../shared/api.js';
import { ExercisePicker }                from '../../shared/ExercisePicker.js';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const UNITS     = { reps: 'Reps', seconds: 'Seconds', distance: 'km', duration: 'Minutes' };

// ── ExerciseRow ───────────────────────────────────────────────

function ExerciseRow({ ex, categories, onRemove, onFieldChange }) {
  const cat     = ex.category ?? 'strength';
  const col     = categories[cat]?.color ?? '#64748b';
  const unit    = ex.unit_type ?? 'reps';
  const isRun   = unit === 'distance' || unit === 'duration';
  const isSec   = unit === 'seconds';
  const repLbl  = isSec ? 'Seconds' : isRun ? (unit === 'distance' ? 'km' : 'Minutes') : 'Reps';

  return html`
    <div style="background:var(--bg3);border:1px solid var(--bd);border-radius:var(--rs);padding:.65rem .7rem;margin-bottom:.4rem">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.4rem;margin-bottom:.55rem">
        <div style="font-size:.8rem;color:var(--tx);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
             title=${ex.exercise_name ?? ex.name}>
          ${ex.exercise_name ?? ex.name}
        </div>
        <span style=${`font-size:.56rem;border-radius:4px;padding:2px 6px;background:${col}22;color:${col};flex-shrink:0`}>
          ${categories[cat]?.icon ?? ''} ${categories[cat]?.label ?? cat}
        </span>
        <button style="background:none;border:none;color:var(--t4);font-size:.9rem;min-width:28px;min-height:28px;cursor:pointer"
                onClick=${onRemove}>✕</button>
      </div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">
        ${!isRun && html`
          <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:60px">
            <label style="font-size:.56rem;color:var(--t4);letter-spacing:.07em;text-transform:uppercase">Sets</label>
            <input type="number" inputMode="numeric" placeholder="3" value=${ex.planned_sets ?? ''} min="0" max="99"
                   style="background:var(--bg);border:1px solid var(--bd2);border-radius:5px;padding:.5rem .4rem;text-align:center;width:100%;min-height:42px;color:var(--tx);font-size:16px"
                   onChange=${(e) => onFieldChange('planned_sets', e.target.value || null)} />
          </div>
        `}
        <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:60px">
          <label style="font-size:.56rem;color:var(--t4);letter-spacing:.07em;text-transform:uppercase">${repLbl}</label>
          <input type="number" inputMode=${isRun ? 'decimal' : 'numeric'} placeholder="—"
                 value=${ex.planned_reps ?? ''} min="0"
                 style="background:var(--bg);border:1px solid var(--bd2);border-radius:5px;padding:.5rem .4rem;text-align:center;width:100%;min-height:42px;color:var(--tx);font-size:16px"
                 onChange=${(e) => onFieldChange('planned_reps', e.target.value || null)} />
        </div>
        ${!isRun && !isSec && html`
          <div style="display:flex;flex-direction:column;gap:3px;flex:1;min-width:60px">
            <label style="font-size:.56rem;color:var(--t4);letter-spacing:.07em;text-transform:uppercase">Weight kg</label>
            <input type="number" inputMode="decimal" placeholder="—" value=${ex.planned_weight_kg ?? ''} min="0" step="0.5"
                   style="background:var(--bg);border:1px solid var(--bd2);border-radius:5px;padding:.5rem .4rem;text-align:center;width:100%;min-height:42px;color:var(--tx);font-size:16px"
                   onChange=${(e) => onFieldChange('planned_weight_kg', e.target.value || null)} />
          </div>
        `}
        <div style="display:flex;flex-direction:column;gap:3px;flex:2;min-width:110px">
          <label style="font-size:.56rem;color:var(--t4);letter-spacing:.07em;text-transform:uppercase">Notes</label>
          <input type="text" placeholder="Optional…" value=${ex.item_note ?? ''} maxLength="200"
                 style="background:var(--bg);border:1px solid var(--bd2);border-radius:5px;padding:.5rem .6rem;width:100%;min-height:42px;color:var(--tx);font-size:16px"
                 onChange=${(e) => onFieldChange('item_note', e.target.value || null)} />
        </div>
      </div>
    </div>
  `;
}

// ── DayEditor ─────────────────────────────────────────────────

function DayEditor({ dayData, dayIdx, week, categories, exercises: allExercises, mode, planId, templateId, onToast, onSaved }) {
  const [open,     setOpen]     = useState(false);
  const [isRest,   setIsRest]   = useState(!!dayData?.is_rest);
  const [items,    setItems]    = useState(
    (dayData?.exercises ?? []).map(ex => ({ ...ex }))
  );
  const [saving,   setSaving]   = useState(false);
  const [picker,   setPicker]   = useState(false);
  const color = dayData?.wt_color ?? '#334155';
  const exCount = items.length;

  function addExercise(ex) {
    setItems(prev => [...prev, {
      exercise_id:         ex.id,
      exercise_name:       ex.name,
      category:            ex.category,
      unit_type:           ex.unit_type,
      planned_sets:        null,
      planned_reps:        null,
      planned_weight_kg:   null,
      item_note:           '',
    }]);
  }

  function removeExercise(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateField(idx, field, value) {
    setItems(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  }

  async function saveDay() {
    setSaving(true);
    const payload = items.map(ex => ({
      id:          ex.exercise_id ?? ex.id,
      sets:        ex.planned_sets    ?? null,
      reps:        ex.planned_reps    ?? null,
      weight_kg:   ex.planned_weight_kg ?? null,
      duration_min:ex.planned_duration_min ?? null,
      note:        ex.item_note       ?? null,
    }));

    try {
      if (mode === 'builder') {
        await api.saveDay(planId, week, dayIdx, isRest, payload);
      } else {
        await api.saveTemplateDay(templateId, week, dayIdx, isRest, payload);
      }
      onSaved(dayIdx, isRest, items.length);
      onToast(isRest ? 'Rest day saved ✓' : `${items.length} exercise${items.length !== 1 ? 's' : ''} saved ✓`);
    } catch (e) {
      onToast('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const dotColor = isRest ? '#334155' : (exCount > 0 ? 'var(--c2)' : color);

  return html`
    <div style="background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;margin-bottom:.45rem">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:.65rem .85rem;cursor:pointer;min-height:54px"
           onClick=${() => setOpen(!open)}>
        <div style="display:flex;align-items:center;gap:.6rem">
          <div style=${`width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0`}></div>
          <div style="font-size:.82rem;color:var(--tx);font-weight:500">${DAY_NAMES[dayIdx]}</div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          ${isRest && html`<span style="font-size:.58rem;color:var(--t3);background:var(--bg3);border:1px solid var(--bd);border-radius:4px;padding:2px 7px">Rest</span>`}
          ${!isRest && exCount > 0 && html`<span style="font-size:.65rem;color:var(--t3)">${exCount} exercise${exCount !== 1 ? 's' : ''}</span>`}
          <span style=${`font-size:.65rem;color:var(--t4);transition:transform .2s;display:inline-block;transform:${open ? 'rotate(180deg)' : ''}`}>▾</span>
        </div>
      </div>

      <!-- Body -->
      ${open && html`
        <div style="padding:.1rem .85rem .85rem;border-top:1px solid var(--bd)">
          <!-- Rest toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:.55rem 0 .65rem;border-bottom:1px solid var(--bd);margin-bottom:.6rem">
            <span style="font-size:.72rem;color:var(--t2)">Day type</span>
            <div style="display:flex;background:var(--bg3);border:1px solid var(--bd);border-radius:20px;padding:2px;gap:2px">
              <button onClick=${() => setIsRest(false)}
                      style=${`padding:.3rem .65rem;border-radius:18px;font-size:.68rem;border:none;cursor:pointer;min-height:30px;background:${!isRest ? 'var(--bd2)' : 'none'};color:${!isRest ? 'var(--tx)' : 'var(--t3)'}`}>
                Active
              </button>
              <button onClick=${() => setIsRest(true)}
                      style=${`padding:.3rem .65rem;border-radius:18px;font-size:.68rem;border:none;cursor:pointer;min-height:30px;background:${isRest ? 'var(--bd2)' : 'none'};color:${isRest ? 'var(--tx)' : 'var(--t3)'}`}>
                Rest
              </button>
            </div>
          </div>

          ${!isRest && html`
            <!-- Exercise list -->
            ${items.map((ex, idx) => html`
              <${ExerciseRow}
                key=${idx}
                ex=${ex}
                categories=${categories}
                onRemove=${() => removeExercise(idx)}
                onFieldChange=${(field, val) => updateField(idx, field, val)}
              />
            `)}

            <!-- Add exercise button -->
            <button onClick=${() => setPicker(true)}
                    style="width:100%;background:none;border:1px dashed var(--bd2);border-radius:var(--rs);padding:.6rem;color:var(--t3);font-size:.78rem;display:flex;align-items:center;justify-content:center;gap:.4rem;min-height:42px;margin:.4rem 0;cursor:pointer">
              ＋ Add Exercise
            </button>
          `}

          <!-- Save -->
          <button onClick=${saveDay} disabled=${saving}
                  style=${`width:100%;background:#0f2a1a;border:1px solid var(--c2);border-radius:var(--rs);padding:.65rem;color:var(--c2);font-size:.8rem;font-weight:600;margin-top:.5rem;min-height:44px;cursor:pointer;opacity:${saving ? .6 : 1}`}>
            ${saving ? 'Saving…' : 'Save Day'}
          </button>
        </div>
      `}

      <!-- Exercise picker sheet -->
      <${ExercisePicker}
        open=${picker}
        onClose=${() => setPicker(false)}
        onSelect=${addExercise}
        categories=${categories}
        initialExercises=${allExercises}
      />
    </div>
  `;
}

// ── WeekEditor ────────────────────────────────────────────────

export function WeekEditor({ planId, templateId, week, totalWeeks, exercises, categories, mode, onToast, onContentChange }) {
  const [days,    setDays]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [copyOpen,setCopyOpen]= useState(false);
  const [copyTargets,setCopyTargets] = useState({});
  const loadedWeeks = useRef({});

  useEffect(() => {
    if (loadedWeeks.current[week]) {
      setDays(loadedWeeks.current[week]);
      return;
    }
    setLoading(true);
    setDays(null);
    const loader = mode === 'builder'
      ? api.builderWeekDays(planId, week)
      : api.templateWeek(templateId, week);

    loader.then(data => {
      loadedWeeks.current[week] = data;
      setDays(data);
      setLoading(false);
    }).catch(e => {
      onToast('Error loading week: ' + e.message);
      setLoading(false);
    });
  }, [week, mode, planId, templateId]);

  function onDaySaved(dayIdx, isRest, exCount) {
    // Update cached data
    if (loadedWeeks.current[week]) {
      const day = loadedWeeks.current[week].find(d => d.day_of_week === dayIdx);
      if (day) { day.is_rest = isRest ? 1 : 0; }
    }
    const hasAny = !isRest && exCount > 0;
    onContentChange(week, hasAny);
  }

  async function doCopyWeek() {
    const toWeeks = Object.entries(copyTargets).filter(([,v])=>v).map(([k])=>+k);
    if (!toWeeks.length) { onToast('Select at least one week'); return; }

    if (mode === 'builder') {
      try {
        await api.copyWeek(planId, week, toWeeks);
        toWeeks.forEach(w => { delete loadedWeeks.current[w]; onContentChange(w, true); });
        onToast(`Copied to ${toWeeks.length} week${toWeeks.length !== 1 ? 's' : ''} ✓`);
        setCopyOpen(false);
      } catch (e) { onToast('Error: ' + e.message); }
    } else {
      // For template editor, save each source day to each target week
      for (const w of toWeeks) {
        for (const day of (days ?? [])) {
          const exs = (day.exercises ?? []).map(ex => ({
            id: ex.exercise_id ?? ex.id,
            sets: ex.planned_sets, reps: ex.planned_reps,
            weight_kg: ex.planned_weight_kg, note: ex.item_note,
          }));
          try {
            await api.saveTemplateDay(templateId, w, day.day_of_week, !!day.is_rest, exs);
          } catch (e) { /* continue */ }
        }
        delete loadedWeeks.current[w];
        onContentChange(w, true);
      }
      onToast(`Copied to ${toWeeks.length} week${toWeeks.length !== 1 ? 's' : ''} ✓`);
      setCopyOpen(false);
    }
  }

  if (loading) return html`
    <div style="display:flex;align-items:center;gap:.6rem;padding:1.5rem;color:var(--t3);font-size:.8rem">
      <span class="spin"></span> Loading week…
    </div>
  `;

  if (!days) return null;

  return html`
    <div>
      <!-- Copy week button -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:.75rem">
        <button class="btn btn-ghost" style="font-size:.72rem" onClick=${() => setCopyOpen(true)}>📋 Copy week</button>
      </div>

      <!-- Day cards -->
      ${days.map(d => html`
        <${DayEditor}
          key=${d.day_of_week}
          dayData=${d}
          dayIdx=${d.day_of_week}
          week=${week}
          categories=${categories}
          exercises=${exercises}
          mode=${mode}
          planId=${planId}
          templateId=${templateId}
          onToast=${onToast}
          onSaved=${onDaySaved}
        />
      `)}

      <!-- Copy modal -->
      ${copyOpen && html`
        <div class="overlay" style="display:flex" onClick=${(e) => e.target === e.currentTarget && setCopyOpen(false)}>
          <div style="background:var(--bg2);border:1px solid var(--bd2);border-radius:var(--r) var(--r) 0 0;width:100%;max-width:680px;padding:1rem;padding-bottom:calc(1rem + var(--sb))">
            <div style="font-size:.9rem;color:#f8fafc;margin-bottom:.65rem">Copy Week ${week} to…</div>
            <div style="display:flex;gap:.85rem;margin-bottom:.6rem">
              <button style="font-size:.68rem;color:var(--c2);background:none;border:none;cursor:pointer"
                      onClick=${() => { const next = {}; for(let w=1;w<=totalWeeks;w++) if(w!==week) next[w]=true; setCopyTargets(next); }}>
                Select all
              </button>
              <button style="font-size:.68rem;color:var(--c2);background:none;border:none;cursor:pointer"
                      onClick=${() => setCopyTargets({})}>Deselect all</button>
            </div>
            <div style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:.35rem;margin-bottom:.85rem">
              ${Array.from({length: totalWeeks},(_,i)=>i+1).filter(w=>w!==week).map(w => html`
                <label key=${w} style="display:flex;align-items:center;gap:.6rem;padding:.5rem .6rem;background:var(--bg3);border:1px solid var(--bd);border-radius:var(--rs);cursor:pointer;min-height:44px">
                  <input type="checkbox" checked=${!!copyTargets[w]}
                         onChange=${(e) => setCopyTargets(prev => ({ ...prev, [w]: e.target.checked }))}
                         style="width:18px;height:18px;accent-color:var(--c2)" />
                  <span style="font-size:.8rem;color:var(--tx)">Week ${w}</span>
                </label>
              `)}
            </div>
            <div style="display:flex;gap:.5rem">
              <button class="btn btn-ghost" onClick=${() => setCopyOpen(false)}>Cancel</button>
              <button class="btn btn-primary" style="flex:1" onClick=${doCopyWeek}>Copy Week →</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}

export default WeekEditor;
