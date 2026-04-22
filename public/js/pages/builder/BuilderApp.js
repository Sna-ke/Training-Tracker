/**
 * BuilderApp.js — Plan Builder root component
 *
 * When boot.planId === 0: shows the create-plan form.
 * When boot.planId > 0:  shows the week-by-week day editor.
 */
import { html, useState, useCallback } from '../../lib/react.js';
import { api }                    from '../../shared/api.js';
import { Toast }                  from '../../shared/Toast.js';
import { WeekStrip }              from './WeekStrip.js';
import { WeekEditor }             from './WeekEditor.js';

// ── CreatePlanForm ────────────────────────────────────────────

function CreatePlanForm({ onCreated }) {
  const [name,   setName]   = useState('');
  const [start,  setStart]  = useState(new Date().toISOString().slice(0, 10));
  const [weeks,  setWeeks]  = useState(12);
  const [athlete,setAthlete]= useState('');
  const [desc,   setDesc]   = useState('');
  const [busy,   setBusy]   = useState(false);
  const [errors, setErrors] = useState({});

  async function submit() {
    const errs = {};
    if (!name.trim())          errs.name  = 'Required';
    if (!start)                errs.start = 'Required';
    if (weeks < 1 || weeks > 104) errs.weeks = '1–104';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setBusy(true);
    try {
      const data = await api.createBuilderPlan(name.trim(), start, weeks, desc || null, athlete || null);
      window.location.href = `builder.php?plan_id=${data.plan_id}`;
    } catch (e) {
      setErrors({ form: e.message });
      setBusy(false);
    }
  }

  return html`
    <div style="max-width:480px;margin:1.5rem auto 0;padding:0 .9rem">
      <div style="font-size:1rem;color:#f8fafc;margin-bottom:1.25rem">Create Your Plan</div>

      ${errors.form && html`<div class="dberr" style="margin-bottom:.85rem">${errors.form}</div>`}

      <div class="field" style="margin-bottom:.85rem">
        <label>Plan Name *</label>
        <input type="text" value=${name} onChange=${(e) => setName(e.target.value)}
               placeholder="e.g. My 12-Week Strength Plan" maxLength="200" />
        ${errors.name && html`<span style="font-size:.65rem;color:#fb7185">${errors.name}</span>`}
      </div>

      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.85rem">
        <div class="field" style="flex:1;min-width:130px">
          <label>Start Date *</label>
          <input type="date" value=${start} onChange=${(e) => setStart(e.target.value)} />
          ${errors.start && html`<span style="font-size:.65rem;color:#fb7185">${errors.start}</span>`}
        </div>
        <div class="field" style="flex:1;min-width:100px">
          <label>Total Weeks *</label>
          <input type="number" value=${weeks} onChange=${(e) => setWeeks(+e.target.value)} min="1" max="104" inputMode="numeric" />
          ${errors.weeks && html`<span style="font-size:.65rem;color:#fb7185">${errors.weeks}</span>`}
        </div>
      </div>

      <div class="field" style="margin-bottom:.85rem">
        <label>Athlete Name <span style="color:var(--t4)">(optional)</span></label>
        <input type="text" value=${athlete} onChange=${(e) => setAthlete(e.target.value)} maxLength="100" />
      </div>

      <div class="field" style="margin-bottom:1rem">
        <label>Description <span style="color:var(--t4)">(optional)</span></label>
        <textarea value=${desc} rows="2" maxLength="500" placeholder="Goals, context…"
                  style="min-height:60px;resize:vertical;width:100%;background:var(--bg);border:1px solid var(--bd2);border-radius:var(--rs);padding:.6rem .75rem;color:var(--tx);font-size:15px"
                  onChange=${(e) => setDesc(e.target.value)} />
      </div>

      <button class="btn btn-primary" style="width:100%" disabled=${busy} onClick=${submit}>
        ${busy ? 'Creating…' : 'Create Plan & Start Building →'}
      </button>
    </div>
  `;
}

// ── BuilderApp ────────────────────────────────────────────────

export function BuilderApp({ boot }) {
  const isNew = boot.planId === 0;

  const [toast,    setToast]    = useState(null);
  const [curWeek,  setCurWeek]  = useState(1);
  const [hasContent, setHasContent] = useState({});

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  function go(w) {
    if (w < 1 || w > boot.totalWeeks) return;
    setCurWeek(w);
  }

  if (isNew) {
    return html`
      <div>
        <${CreatePlanForm} />
        <${Toast} message=${toast} />
      </div>
    `;
  }

  return html`
    <div>
    <!-- Week strip -->
    <${WeekStrip}
      totalWeeks=${boot.totalWeeks}
      curWeek=${curWeek}
      hasContent=${hasContent}
      onSelect=${go}
    />

    <div class="wrap" style="margin-top:.85rem">
      <!-- Week header bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;gap:.5rem;flex-wrap:wrap">
        <div style="font-size:.95rem;color:#f8fafc">Week ${curWeek}</div>
      </div>

      <!-- Day editor for the selected week -->
      <${WeekEditor}
        planId=${boot.planId}
        week=${curWeek}
        totalWeeks=${boot.totalWeeks}
        exercises=${boot.exercises}
        categories=${boot.cats}
        mode="builder"
        onToast=${showToast}
        onContentChange=${(w, has) => setHasContent(prev => ({ ...prev, [w]: has }))}
      />
    </div>

    <!-- Bottom nav -->
    <nav class="bot-nav">
      <button class="bn" onClick=${() => go(curWeek - 1)} disabled=${curWeek <= 1}>← Prev</button>
      <div class="bn-label">Wk ${curWeek}<br/><span style="font-size:.52rem;color:var(--t4)">of ${boot.totalWeeks}</span></div>
      <button class="bn" onClick=${() => go(curWeek + 1)} disabled=${curWeek >= boot.totalWeeks}>Next →</button>
      <a class="bn" style="background:#0f2a1a;border-color:var(--c2);color:var(--c2);text-decoration:none;font-size:.75rem"
         href=${'index.php?plan_id=' + boot.planId}>View Plan →</a>
    </nav>

    <${Toast} message=${toast} />
    </div>
  `;
}

export default BuilderApp;
