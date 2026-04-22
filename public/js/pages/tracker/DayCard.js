/**
 * DayCard.js — Single expandable day card for the tracker
 *
 * Props:
 *   day            object   { id, day_name, scheduled_date, is_rest, skipped,
 *                             completed, wt_name, type_code, color, is_race }
 *   planId         number
 *   onToast        fn(msg)
 *   onOpenHistory  fn(exId, exName)
 *   onOpenMedia    fn(exId, exName)
 */
import { html, useState, useCallback } from '../../lib/react.js';
import { api }                     from '../../shared/api.js';

export function DayCard({ day, planId, onToast, onOpenHistory, onOpenMedia }) {
  const [open,      setOpen]      = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [items,     setItems]     = useState([]);
  const [dayNotes,  setDayNotes]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [isDone,    setIsDone]    = useState(!!day.completed);
  const [isSkipped, setIsSkipped] = useState(!!day.skipped);

  const canInteract = !day.is_rest && !isSkipped;

  async function toggle() {
    if (!canInteract) return;
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && !loaded) await loadItems();
  }

  async function loadItems() {
    try {
      const data = await api.getDay(day.id);

      // DEBUG — open browser console to see exactly what the server returns
      console.log('[DayCard] get_day response for plan_day_id=' + day.id, data);

      const mapped = (data.items ?? []).map(it => ({
        ...it,
        // Map DB column names → _-prefixed working fields for the inputs.
        // Using String() so React treats them as controlled string values.
        _sets:   it.sets_done      != null ? String(it.sets_done)      : null,
        _reps:   it.reps_done      != null ? String(it.reps_done)      : null,
        _weight: it.log_weight     != null ? String(it.log_weight)     : null,
        _dist:   it.distance_km    != null ? String(it.distance_km)    : null,
        _dur:    it.duration_min   != null ? String(it.duration_min)   : null,
        _pace:   it.pace_per_km    != null ? String(it.pace_per_km)    : null,
        _hr:     it.heart_rate_avg != null ? String(it.heart_rate_avg) : null,
        _note:   it.log_notes      != null ? String(it.log_notes)      : null,
      }));

      console.log('[DayCard] mapped items:', mapped.map(m => ({
        name: m.exercise_name, item_id: m.item_id,
        sets_done: m.sets_done, _sets: m._sets,
        distance_km: m.distance_km, _dist: m._dist,
        duration_min: m.duration_min, _dur: m._dur,
        heart_rate_avg: m.heart_rate_avg, _hr: m._hr,
        log_notes: m.log_notes, _note: m._note,
      })));

      setItems(mapped);
      setDayNotes(data.plan_day?.day_notes ?? '');
      setLoaded(true);
    } catch (e) {
      console.error('[DayCard] loadItems error:', e);
      onToast('Error loading workout');
    }
  }

  function buildLogPayloads() {
    return items
      .filter(it => it.exercise_id)
      .map(it => ({
        plan_day_id:     day.id,
        workout_item_id: it.item_id,
        exercise_id:     it.exercise_id,
        sets:     it._sets     ?? null,
        reps:     it._reps     ?? null,
        weight:   it._weight   ?? null,
        distance: it._dist     ?? null,
        duration: it._dur      ?? null,
        pace:     it._pace     ?? null,
        hr:       it._hr       ?? null,
        notes:    it._note     ?? null,
      }));
  }

  async function saveLog() {
    const payloads = buildLogPayloads();
    if (!payloads.length) { onToast('Nothing to log'); return; }
    setSaving(true);
    try {
      await Promise.all(payloads.map(p => api.log(p)));
      onToast('Log saved ✓');
    } catch (e) {
      onToast('Save failed ✗');
    } finally {
      setSaving(false);
    }
  }

  async function saveAndDone() {
    setSaving(true);
    try {
      await Promise.all(buildLogPayloads().map(p => api.log(p)));
      await api.complete(day.id, true, dayNotes);
      setIsDone(true);
      onToast('Day complete ✓');
    } catch (e) {
      onToast('Save failed ✗');
    } finally {
      setSaving(false);
    }
  }

  async function undoDone() {
    await api.complete(day.id, false, '');
    setIsDone(false);
    onToast('Marked incomplete');
  }

  async function skip() {
    if (!confirm('Skip this day? Remaining workout days shift forward by 1 day.')) return;
    try {
      await api.skip(day.id);
      onToast('Day skipped ✓');
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      onToast('Error: ' + e.message);
    }
  }

  async function unskip() {
    if (!confirm('Restore this day? Following workout days shift back by 1 day.')) return;
    try {
      await api.unskip(day.id);
      onToast('Day restored ✓');
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      onToast('Error: ' + e.message);
    }
  }

  // Mutable update on item fields (sets, reps, etc.)
  function setItemField(itemId, field, value) {
    setItems(prev => prev.map(it => it.item_id === itemId ? { ...it, [field]: value } : it));
  }

  const color = day.color ?? '#334155';

  return html`
    <div class="dc" style=${isDone ? `border-color:${color}55` : ''}>

      <!-- Row header -->
      <div class="dc-row" onClick=${toggle} style=${canInteract ? 'cursor:pointer' : ''}>
        <div style="display:flex;gap:.65rem;align-items:center;flex:1;min-width:0">
          <div style="text-align:center;width:34px;flex-shrink:0">
            <div style=${`font-size:.65rem;font-family:var(--mono);font-weight:bold;color:${(day.is_rest || isSkipped) ? 'var(--t4)' : color}`}>
              ${day.day_name}
            </div>
            <div style="font-size:.52rem;color:var(--t4)">${day.scheduled_date}</div>
          </div>
          <div style="min-width:0;flex:1">
            <div style="font-size:.54rem;letter-spacing:.1em;color:var(--t4);text-transform:uppercase;margin-bottom:.1rem">
              ${day.type_code ?? 'rest'}
            </div>
            <div style=${`font-size:.83rem;line-height:1.3;color:${day.is_race ? color : (day.is_rest || isSkipped) ? 'var(--t3)' : 'var(--tx)'}`}>
              ${day.wt_name ?? (day.is_rest ? 'Rest Day' : '—')}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0;margin-left:.4rem">
          ${isSkipped && html`<span style="font-size:.6rem;color:#f97316;font-weight:600">⟳ Skipped</span>`}
          ${isDone && !isSkipped && html`<span style="font-size:.7rem;color:var(--c2);font-weight:600">✓</span>`}
          ${canInteract && html`
            <span style=${`font-size:.65rem;color:var(--t4);transition:transform .2s;display:inline-block;transform:${open ? 'rotate(180deg)' : ''}`}>▾</span>
          `}
        </div>
      </div>

      <!-- Expanded body -->
      ${open && html`
        <div class="dc-body">

          ${!loaded && html`
            <div style="display:flex;align-items:center;gap:.5rem;padding:.85rem 0;color:var(--t3);font-size:.78rem">
              <span class="spin"></span> Loading workout…
            </div>
          `}

          ${loaded && html`
            <${WorkoutBody}
              day=${day}
              items=${items}
              dayNotes=${dayNotes}
              onDayNotesChange=${setDayNotes}
              onSetField=${setItemField}
              onSaveLog=${saveLog}
              onSaveAndDone=${saveAndDone}
              onUndoDone=${undoDone}
              onSkip=${skip}
              onUnskip=${unskip}
              isDone=${isDone}
              isSkipped=${isSkipped}
              saving=${saving}
              color=${color}
              onOpenHistory=${onOpenHistory}
              onOpenMedia=${onOpenMedia}
            />
          `}
        </div>
      `}
    </div>
  `;
}

// ── WorkoutBody — renders inside the expanded day card ────────

function WorkoutBody({ day, items, dayNotes, onDayNotesChange, onSetField,
                       onSaveLog, onSaveAndDone, onUndoDone, onSkip, onUnskip,
                       isDone, isSkipped, saving, color, onOpenHistory, onOpenMedia }) {

  const instructions = items.filter(i => i.item_role === 'instruction' || !i.exercise_id);
  const strength     = items.filter(i => i.exercise_id && i.category === 'strength');
  const runs         = items.filter(i => i.exercise_id && i.category !== 'strength' && i.item_role !== 'instruction');

  if (isSkipped) {
    return html`
      <div style="padding:.65rem 0">
        <button class="act-btn act-save" style="max-width:180px" onClick=${onUnskip}>↩ Restore Day</button>
      </div>
    `;
  }

  return html`
    <div>
      <!-- Instruction bullets -->
      ${instructions.length > 0 && html`
        <div class="bulls">
        ${instructions.map((it, i) => html`
          <div key=${i} class="bull" style=${`border-left-color:${color}44`}>
            <span class="bpip" style=${`background:${color}66`}></span>
            <span style="font-size:.78rem;color:var(--t2);line-height:1.5">${it.item_note ?? ''}</span>
          </div>
        `)}
      </div>
    `}

    <!-- Strength exercises -->
    ${strength.length > 0 && html`
      <div>
        <div style=${`font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.6rem;color:${color}99`}>Log Exercises</div>
        ${strength.map(it => html`
          <${StrengthCard} key=${it.item_id} it=${it} color=${color}
            onSetField=${onSetField}
            onOpenHistory=${onOpenHistory}
            onOpenMedia=${onOpenMedia} />
        `)}
      </div>
    `}

    <!-- Run segments -->
    ${runs.length > 0 && html`
      <div>
        <div style=${`font-size:.58rem;letter-spacing:.12em;text-transform:uppercase;margin:.2rem 0 .6rem;color:${color}99`}>Log Run Segments</div>
        ${runs.map(it => html`
          <${RunCard} key=${it.item_id} it=${it} color=${color}
            onSetField=${onSetField}
            onOpenHistory=${onOpenHistory}
            onOpenMedia=${onOpenMedia} />
        `)}
      </div>
    `}

    <!-- Day notes -->
    <div class="day-notes-wrap">
      <label>Day Notes</label>
      <textarea value=${dayNotes} rows="2" maxLength="500"
                placeholder="How did it feel?…"
                onChange=${(e) => onDayNotesChange(e.target.value)} />
    </div>

    <!-- Actions -->
      <div class="act-row">
      <button class="act-btn act-save" disabled=${saving} onClick=${onSaveLog}>Save Log</button>
      ${!isDone && html`<button class="act-btn act-skip" onClick=${onSkip}>Skip Day</button>`}
      ${!isDone && html`
        <button class="act-btn act-done" disabled=${saving}
                onClick=${onSaveAndDone}>Save & Done ✓</button>
      `}
      ${isDone && html`<button class="act-btn act-undo" onClick=${onUndoDone}>Undo Done</button>`}
    </div>
    </div>
  `;
}

// ── StrengthCard ──────────────────────────────────────────────

function StrengthCard({ it, onSetField, onOpenHistory, onOpenMedia }) {
  const planned = it.planned_sets && it.planned_reps
    ? `${it.planned_sets}×${it.planned_reps}${it.unit_type === 'seconds' ? 's' : ''}${it.planned_weight_kg ? ` @${it.planned_weight_kg}kg` : ''}`
    : '';

  return html`
    <div class="ex-card">
      <div class="ex-card-top">
        <div style="font-size:.8rem;color:var(--tx);flex:1;line-height:1.35">${it.exercise_name}</div>
        <span style="font-size:.6rem;color:var(--t4)">${planned}</span>
        <div class="ex-btns">
          <button class="ex-btn" title="History" onClick=${() => onOpenHistory(it.exercise_id, it.exercise_name)}>📈</button>
          <button class="ex-btn" title="How To"  onClick=${() => onOpenMedia(it.exercise_id, it.exercise_name)}>🎬</button>
        </div>
      </div>
      <div class="ex-inputs">
        <div class="ex-inp"><label>Sets</label>
          <input type="number" inputMode="numeric" placeholder=${it.planned_sets ?? '—'}
                 defaultValue=${it._sets ?? ''} min="0" max="20"
                 onChange=${(e) => onSetField(it.item_id, '_sets', e.target.value || null)} />
        </div>
        <div class="ex-inp">
          <label>${it.unit_type === 'seconds' ? 'Seconds' : 'Reps'}</label>
          <input type="number" inputMode="numeric" placeholder=${it.planned_reps ?? '—'}
                 defaultValue=${it._reps ?? ''} min="0"
                 onChange=${(e) => onSetField(it.item_id, '_reps', e.target.value || null)} />
        </div>
        ${it.unit_type !== 'seconds' && html`
          <div class="ex-inp"><label>kg</label>
            <input type="number" inputMode="decimal" placeholder=${it.planned_weight_kg ?? '—'}
                   defaultValue=${it._weight ?? ''} min="0" max="500" step="0.5"
                   onChange=${(e) => onSetField(it.item_id, '_weight', e.target.value || null)} />
          </div>
        `}
        <div class="ex-inp wide"><label>Notes</label>
          <input type="text" placeholder="Optional…" defaultValue=${it._note ?? ''} maxLength="200"
                 onChange=${(e) => onSetField(it.item_id, '_note', e.target.value || null)} />
        </div>
      </div>
    </div>
  `;
}

// ── RunCard ───────────────────────────────────────────────────

function RunCard({ it, onSetField, onOpenHistory, onOpenMedia }) {
  const planned = it.planned_distance_km
    ? ` · ${it.planned_distance_km}km planned`
    : it.planned_duration_min ? ` · ${it.planned_duration_min}min planned` : '';

  return html`
    <div class="ex-card">
      <div class="ex-card-top" style="margin-bottom:.55rem">
        <div style="font-size:.8rem;color:var(--tx);flex:1">
          ${it.exercise_name}
          <span style="color:var(--t4);font-size:.68rem">${planned}</span>
        </div>
        <div class="ex-btns">
          <button class="ex-btn" onClick=${() => onOpenHistory(it.exercise_id, it.exercise_name)}>📈</button>
          <button class="ex-btn" onClick=${() => onOpenMedia(it.exercise_id, it.exercise_name)}>🎬</button>
        </div>
      </div>
      <div class="ex-inputs">
        <div class="ex-inp"><label>km run</label>
          <input type="number" inputMode="decimal" placeholder=${it.planned_distance_km ?? '—'}
                 defaultValue=${it._dist ?? ''} min="0" max="50" step="0.01"
                 onChange=${(e) => onSetField(it.item_id, '_dist', e.target.value || null)} />
        </div>
        <div class="ex-inp"><label>time (min)</label>
          <input type="number" inputMode="decimal" placeholder="—"
                 defaultValue=${it._dur ?? ''} min="0" max="300" step="0.1"
                 onChange=${(e) => onSetField(it.item_id, '_dur', e.target.value || null)} />
        </div>
        <div class="ex-inp"><label>pace /km</label>
          <input type="number" inputMode="decimal" placeholder="—"
                 defaultValue=${it._pace ?? ''} min="0" max="20" step="0.01"
                 onChange=${(e) => onSetField(it.item_id, '_pace', e.target.value || null)} />
        </div>
        <div class="ex-inp"><label>HR</label>
          <input type="number" inputMode="numeric" placeholder="—"
                 defaultValue=${it._hr ?? ''} min="0" max="250"
                 onChange=${(e) => onSetField(it.item_id, '_hr', e.target.value || null)} />
        </div>
        <div class="ex-inp wide"><label>Notes</label>
          <input type="text" placeholder="Conditions, feel…" defaultValue=${it._note ?? ''} maxLength="200"
                 onChange=${(e) => onSetField(it.item_id, '_note', e.target.value || null)} />
        </div>
      </div>
    </div>
  `;
}

export default DayCard;
