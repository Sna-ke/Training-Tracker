import { html, useEffect, useRef } from '../../lib/react.js';
/**
 * WeekStrip.js — Scrollable week selector with content pip dots
 *
 * Props:
 *   totalWeeks  number
 *   curWeek     number
 *   hasContent  object  { [week]: bool }
 *   onSelect    fn(week)
 */

export function WeekStrip({ totalWeeks, curWeek, hasContent, onSelect }) {
  const stripRef = useRef(null);

  // Scroll active button into view when curWeek changes
  useEffect(() => {
    const btn = stripRef.current?.querySelector(`[data-week="${curWeek}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [curWeek]);

  return html`
    <div style="position:sticky;top:0;z-index:100;background:var(--bg2);border-bottom:1px solid var(--bd)">
      <div ref=${stripRef}
           style="display:flex;overflow-x:auto;scrollbar-width:none;padding:.5rem .6rem;gap:.3rem;-webkit-overflow-scrolling:touch">
        ${Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => html`
          <button key=${w} data-week=${w}
                  onClick=${() => onSelect(w)}
                  style=${`
                    background:${w === curWeek ? 'var(--bd2)' : 'var(--bg3)'};
                    border:1px solid ${w === curWeek ? 'var(--c2)' : 'var(--bd)'};
                    color:${w === curWeek ? 'var(--c2)' : 'var(--t3)'};
                    font-weight:${w === curWeek ? 'bold' : 'normal'};
                    border-radius:5px;min-width:36px;height:36px;
                    display:flex;flex-direction:column;align-items:center;justify-content:center;
                    font-size:.62rem;font-family:var(--mono);flex-shrink:0;cursor:pointer;
                    position:relative;padding:0`}>
            <span>${w}</span>
            ${hasContent[w] && html`
              <span style="width:4px;height:4px;border-radius:50%;background:var(--c2);margin-top:1px"></span>
            `}
          </button>
        `)}
      </div>
    </div>
  `;
}

export default WeekStrip;
