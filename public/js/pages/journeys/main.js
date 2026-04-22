/**
 * pages/journeys/main.js + JourneysApp — Journey list page
 */
import { html, createRoot, useState, useCallback } from '../../lib/react.js';
import { api }                       from '../../shared/api.js';
import { Toast }                     from '../../shared/Toast.js';
import { ErrorBoundary } from '../../shared/ErrorBoundary.js';

// ── JourneysApp ───────────────────────────────────────────────

function JourneysApp({ boot }) {
  const { journeys, templates } = boot;

  const [toast,      setToast]      = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selTpl,     setSelTpl]     = useState(templates[0]?.id ?? 0);
  const [newName,    setNewName]    = useState('');
  const [newStart,   setNewStart]   = useState(new Date().toISOString().slice(0, 10));
  const [newAthlete, setNewAthlete] = useState('');
  const [creating,   setCreating]   = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  async function createJourney() {
    if (!newName.trim()) { showToast('Name required'); return; }
    if (!newStart)        { showToast('Start date required'); return; }
    if (!selTpl)          { showToast('Select a plan'); return; }
    setCreating(true);
    try {
      const data = await api.createPlan(selTpl, newName.trim(), newStart, newAthlete.trim() || null);
      window.location.href = `index.php?plan_id=${data.plan_id}`;
    } catch (e) {
      showToast('Error: ' + e.message);
      setCreating(false);
    }
  }

  async function deleteJourney(id, name) {
    if (!confirm(`Delete journey "${name}"? This cannot be undone.`)) return;
    try {
      await api.deletePlan(id);
      location.reload();
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  }

  return html`
    <div>
      <!-- Section header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
        <div style="font-size:.6rem;color:var(--t4);letter-spacing:.18em;text-transform:uppercase">My Journeys</div>
        ${templates.length > 0 && html`
          <button class="btn btn-primary" style="font-size:.78rem;padding:.5rem .85rem;min-height:38px"
                  onClick=${() => setShowCreate(!showCreate)}>
            ${showCreate ? 'Cancel' : '+ New Journey'}
          </button>
        `}
      </div>

      <!-- Create panel -->
      ${showCreate && html`
        <div style="background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:1rem;margin-bottom:.85rem">
          <div style="font-size:.9rem;color:#f8fafc;margin-bottom:.85rem">Start from a Plan</div>

          ${templates.map(t => html`
            <div key=${t.id}
                 onClick=${() => setSelTpl(t.id)}
                 style=${`display:flex;justify-content:space-between;align-items:center;padding:.5rem .6rem;background:var(--bg3);border:1px solid ${selTpl === t.id ? 'var(--c2)' : 'var(--bd)'};border-radius:var(--rs);margin-bottom:.4rem;cursor:pointer;min-height:44px`}>
              <div>
                <div style="font-size:.8rem;color:var(--tx)">${t.name}</div>
                <div style="font-size:.62rem;color:var(--t4)">${t.total_weeks} weeks · ${t.day_count} days</div>
              </div>
              ${selTpl === t.id && html`<span style="color:var(--c2)">✓</span>`}
            </div>
          `)}

          <div class="field" style="margin:.75rem 0 .6rem">
            <label>Journey Name *</label>
            <input type="text" value=${newName} onChange=${(e) => setNewName(e.target.value)}
                   placeholder="e.g. My Sub-20 5K Journey" maxLength="200" />
          </div>
          <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.75rem">
            <div class="field" style="flex:1;min-width:130px">
              <label>Start Date *</label>
              <input type="date" value=${newStart} onChange=${(e) => setNewStart(e.target.value)} />
            </div>
            <div class="field" style="flex:1;min-width:130px">
              <label>Athlete Name</label>
              <input type="text" value=${newAthlete} onChange=${(e) => setNewAthlete(e.target.value)} placeholder="Optional" maxLength="100" />
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%" disabled=${creating} onClick=${createJourney}>
            ${creating ? html`<span class="spin" style="width:14px;height:14px;margin-right:.4rem"></span>` : ''}
            ${creating ? 'Creating…' : 'Start Journey'}
          </button>
        </div>
      `}

      <!-- Journey list -->
      ${journeys.length === 0 && html`
        <div style="text-align:center;padding:2.5rem 1rem;background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);color:var(--t3);font-size:.82rem;line-height:1.7">
          No journeys yet.<br/>
          ${templates.length > 0
            ? html`<span>Tap <strong style="color:var(--t2)">+ New Journey</strong> to get started.</span>`
            : html`<span><a href="plans.php" style="color:var(--c2)">Add a plan first</a>.</span>`
          }
        </div>
      `}

      ${journeys.map(j => html`
        <div key=${j.id} class="card" style="margin-bottom:.5rem;cursor:pointer"
             onClick=${() => window.location.href = 'index.php?plan_id=' + j.id}>
          <div class="card-row">
            <div style="flex:1;min-width:0">
              <div style="font-size:.9rem;color:#f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.name}</div>
              <div style="font-size:.65rem;color:var(--t3);margin:.25rem 0 .5rem">
                ${j.template_name} · Started ${new Date(j.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div class="prog-track">
                <div class="prog-fill" style=${`width:${j.pct}%;background:var(--c2)`}></div>
              </div>
              <div style="font-size:.58rem;color:var(--t4);margin-top:.2rem">${j.days_done} / ${j.days_total} days (${j.pct}%)</div>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem;margin-left:.75rem;flex-shrink:0">
              <button class="btn btn-danger" style="min-height:36px;padding:.3rem .65rem;font-size:.7rem"
                      onClick=${(e) => { e.stopPropagation(); deleteJourney(j.id, j.name); }}>✕</button>
              <span style="color:var(--t4);font-size:.9rem">›</span>
            </div>
          </div>
        </div>
      `)}

      <${Toast} message=${toast} />
    </div>
  `;
}

// ── Mount ─────────────────────────────────────────────────────
const root = document.getElementById('app');
if (root && window.JOURNEYS_BOOT) {
  createRoot(root).render(html`<${ErrorBoundary}><${JourneysApp} boot=${window.JOURNEYS_BOOT} /></${ErrorBoundary}>`);
}
