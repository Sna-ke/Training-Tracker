/**
 * pages/plan_editor/main.js — Plan editor entry point
 * Reuses WeekStrip and WeekEditor from the builder with mode="editor"
 */
import { html, createRoot, useState, useCallback } from '../../lib/react.js';
import { Toast }                 from '../../shared/Toast.js';
import { WeekStrip }             from '../builder/WeekStrip.js';
import { WeekEditor }            from '../builder/WeekEditor.js';

function PlanEditorApp({ boot }) {
  const [toast,      setToast]      = useState(null);
  const [curWeek,    setCurWeek]    = useState(1);
  const [hasContent, setHasContent] = useState({});

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Single root div wraps everything
  return html`
    <div>
      <${WeekStrip}
        totalWeeks=${boot.totalWeeks}
        curWeek=${curWeek}
        hasContent=${hasContent}
        onSelect=${setCurWeek}
      />

      <div class="wrap" style="margin-top:.85rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;gap:.5rem;flex-wrap:wrap">
          <div style="font-size:.95rem;color:#f8fafc">Week ${curWeek}</div>
        </div>

        <${WeekEditor}
          templateId=${boot.templateId}
          week=${curWeek}
          totalWeeks=${boot.totalWeeks}
          exercises=${boot.exercises}
          categories=${boot.cats}
          mode="editor"
          onToast=${showToast}
          onContentChange=${(w, has) => setHasContent(prev => ({ ...prev, [w]: has }))}
        />
      </div>

      <nav class="bot-nav">
        <button class="bn" onClick=${() => curWeek > 1 && setCurWeek(w => w - 1)} disabled=${curWeek <= 1}>← Prev</button>
        <div class="bn-label">Wk ${curWeek}<br/><span style="font-size:.52rem;color:var(--t4)">of ${boot.totalWeeks}</span></div>
        <button class="bn" onClick=${() => curWeek < boot.totalWeeks && setCurWeek(w => w + 1)} disabled=${curWeek >= boot.totalWeeks}>Next →</button>
        <a class="bn" style="background:#0f2a1a;border-color:var(--c2);color:var(--c2);text-decoration:none;font-size:.75rem"
           href="plans.php">Done ✓</a>
      </nav>

      <${Toast} message=${toast} />
    </div>
  `;
}

const root = document.getElementById('app');
if (root && window.EDITOR_BOOT) {
  createRoot(root).render(html`<${PlanEditorApp} boot=${window.EDITOR_BOOT} />`);
}
