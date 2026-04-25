/**
 * TrackerApp.js — Root component for the journey week tracker
 */
import { html, useState, useCallback } from '../../lib/react.js';
import { Toast }                   from '../../shared/Toast.js';
import { ExerciseModal }           from '../../shared/ExerciseModal.js';
import { DayCard }                 from './DayCard.js';

export function TrackerApp({ boot }) {
  const { planId, , currentWeek, totalWeeks, phase, days } = boot;

  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const [modal, setModal] = useState({ open: false, exId: null, exName: '', tab: 'history' });
  const openHistory = useCallback((id, name) => setModal({ open: true, exId: id, exName: name, tab: 'history' }), []);
  const openMedia   = useCallback((id, name) => setModal({ open: true, exId: id, exName: name, tab: 'media'   }), []);
  const closeModal  = useCallback(() => setModal(m => ({ ...m, open: false })), []);

  function go(w) {
    if (w < 1 || w > totalWeeks) return;
    window.location.href = `index.php?plan_id=${planId}&week=${w}`;
  }

  // Single root div wraps everything — no multi-root fragment needed
  return html`
    <div>
      <div class="wrap" style="padding-top:.85rem">
        ${days.map(day => html`
          <${DayCard}
            key=${day.id}
            day=${day}
            planId=${planId}
            onToast=${showToast}
            onOpenHistory=${openHistory}
            onOpenMedia=${openMedia}
          />
        `)}
      </div>

      <nav class="bot-nav">
        <button class="bn" onClick=${() => go(selectedWeek - 1)} disabled=${selectedWeek <= 1}>← Prev</button>
        <div class="bn-label">
          Wk ${selectedWeek}<br/>
          <span style=${`color:${phase.col};font-size:.52rem`}>${phase.sh}</span>
        </div>
        <button class="bn today" onClick=${() => go(currentWeek)}>Today</button>
        <button class="bn" onClick=${() => go(selectedWeek + 1)} disabled=${selectedWeek >= totalWeeks}>Next →</button>
      </nav>

      <${Toast} message=${toast} />

      <${ExerciseModal}
        open=${modal.open}
        onClose=${closeModal}
        exerciseId=${modal.exId}
        exerciseName=${modal.exName}
        initialTab=${modal.tab}
        planId=${planId}
      />
    </div>
  `;
}

export default TrackerApp;
