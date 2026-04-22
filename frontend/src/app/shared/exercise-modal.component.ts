import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ApiService } from '../services/api.service';
import { Exercise, HistoryRow, ExerciseMedia } from '../models';

@Component({
  standalone: true,
  selector: 'app-exercise-modal',
  imports: [CommonModule, ButtonModule, DialogModule, TabViewModule, TagModule, ProgressSpinnerModule],
  template: `
    <p-dialog [(visible)]="open" [header]="exerciseName" [modal]="true"
              [style]="{'width':'min(98vw, 640px)','max-height':'85vh'}"
              [draggable]="false" [resizable]="false"
              (onHide)="close.emit()">
      <ng-template pTemplate="header">
        <div>
          <div style="font-size:1rem;font-weight:700;color:var(--text-primary)">{{ exerciseName }}</div>
          <div style="font-size:.7rem;color:var(--text-muted);margin-top:.1rem">Exercise details</div>
        </div>
      </ng-template>

      <p-tabView [(activeIndex)]="tabIndex" (activeIndexChange)="onTabChange($event)">

        <!-- History tab -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span><i class="pi pi-chart-line" style="margin-right:.35rem"></i>History</span>
          </ng-template>
          @if (loading) {
            <div class="tt-loading"><p-progressSpinner [style]="{'width':'28px','height':'28px'}" strokeWidth="4" /> Loading…</div>
          }
          @if (!loading && !historyRows.length) {
            <div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:.85rem">
              <i class="pi pi-chart-bar" style="font-size:2rem;margin-bottom:.5rem;display:block;opacity:.3"></i>
              No logged sessions yet.<br>Complete workouts to see your progress here.
            </div>
          }
          @if (!loading && historyRows.length) {
            <div style="overflow-x:auto">
              <table class="tt-hist-tbl">
                <thead>
                  <tr>
                    <th>Wk</th><th>Date</th><th>Plan</th>
                    @if (exercise?.unit_type === 'reps' || exercise?.unit_type === 'seconds') {
                      <th>Sets</th><th>Reps</th><th>Weight</th>
                    } @else {
                      <th>Dist</th><th>Time</th><th>Pace</th>
                    }
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  @for (h of historyRows; track h.scheduled_date) {
                    <tr>
                      <td style="font-weight:600;color:var(--text-muted)">W{{ h.week_number }}</td>
                      <td style="color:var(--text-muted)">{{ fmtDate(h.scheduled_date) }}</td>
                      <td style="color:var(--text-muted)">{{ planStr(h) }}</td>
                      @if (exercise?.unit_type === 'reps' || exercise?.unit_type === 'seconds') {
                        <td class="tt-hist-val">{{ h.sets_done ?? '—' }}</td>
                        <td><span class="tt-hist-val">{{ h.reps_done ?? '—' }}</span>
                          @if (h.reps_done != null && h.planned_reps != null) {
                            <span [class]="h.reps_done >= h.planned_reps ? 'tt-delta-up' : 'tt-delta-dn'">
                              {{ h.reps_done >= h.planned_reps ? '+' : '' }}{{ h.reps_done - h.planned_reps }}
                            </span>
                          }
                        </td>
                        <td class="tt-hist-val">{{ h.weight_kg != null ? h.weight_kg + 'kg' : '—' }}</td>
                      } @else {
                        <td class="tt-hist-val">{{ h.distance_km != null ? h.distance_km + 'km' : '—' }}</td>
                        <td class="tt-hist-val">{{ h.duration_min != null ? h.duration_min + 'm' : '—' }}</td>
                        <td class="tt-hist-val">{{ h.pace_per_km ?? '—' }}</td>
                      }
                      <td style="color:var(--text-muted);font-size:.72rem;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        {{ h.notes ?? '' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </p-tabPanel>

        <!-- Media tab -->
        <p-tabPanel>
          <ng-template pTemplate="header">
            <span><i class="pi pi-video" style="margin-right:.35rem"></i>How To</span>
          </ng-template>
          @if (loading) {
            <div class="tt-loading"><p-progressSpinner [style]="{'width':'28px','height':'28px'}" strokeWidth="4" /> Loading…</div>
          }
          @if (!loading && !mediaRows.length) {
            <div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:.85rem">
              <i class="pi pi-video" style="font-size:2rem;margin-bottom:.5rem;display:block;opacity:.3"></i>
              No media links for this exercise.
            </div>
          }
          @if (!loading) {
            @for (m of mediaRows; track m.id) {
              <div class="tt-media-card">
                <div style="font-size:.62rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem"
                     [style.color]="m.source === 'youtube' ? '#DC2626' : m.source === 'nike_nrc' ? '#16A34A' : 'var(--text-muted)'">
                  {{ m.source === 'youtube' ? 'YouTube' : m.source === 'nike_nrc' ? 'Nike Run Club' : 'Web' }}
                </div>
                @if (m.source === 'nike_nrc' && m.url.startsWith('nrc://')) {
                  <button class="tt-media-btn nrc" (click)="openNRC(m)">
                    <i class="pi pi-external-link" style="font-size:.9rem"></i>
                    <div><div style="font-weight:600;font-size:.85rem">{{ m.label }}</div>
                    <div style="font-size:.65rem;opacity:.75">Opens NRC app</div></div>
                  </button>
                } @else {
                  <a class="tt-media-btn" [class.yt]="m.source === 'youtube'"
                     [href]="m.url" target="_blank" rel="noopener">
                    <i [class]="m.source === 'youtube' ? 'pi pi-youtube' : 'pi pi-external-link'"
                       style="font-size:.9rem"></i>
                    <div><div style="font-weight:600;font-size:.85rem">{{ m.label }}</div>
                    <div style="font-size:.65rem;opacity:.75">{{ m.source === 'youtube' ? 'Opens YouTube' : 'Opens in browser' }}</div></div>
                  </a>
                }
              </div>
            }
          }
        </p-tabPanel>

      </p-tabView>
    </p-dialog>
  `,
})
export class ExerciseModalComponent implements OnChanges {
  @Input() open = false;
  @Input() exerciseId: number | null = null;
  @Input() exerciseName = '';
  @Input() initialTab: 'history' | 'media' = 'history';
  @Input() planId: number | null = null;
  @Output() close = new EventEmitter<void>();

  tabIndex = 0;
  loading = false;
  exercise: Exercise | null = null;
  historyRows: HistoryRow[] = [];
  mediaRows: ExerciseMedia[] = [];
  private histCache = new Map<number, HistoryRow[]>();
  private mediaCache = new Map<number, ExerciseMedia[]>();

  constructor(private api: ApiService) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['open']?.currentValue === true) {
      this.tabIndex = this.initialTab === 'media' ? 1 : 0;
      this.load(this.tabIndex);
    }
  }

  onTabChange(idx: number): void { this.load(idx); }

  private load(idx: number): void {
    if (!this.exerciseId) return;
    idx === 0 ? this.loadHistory() : this.loadMedia();
  }

  private loadHistory(): void {
    if (!this.exerciseId || !this.planId) return;
    if (this.histCache.has(this.exerciseId)) { this.historyRows = this.histCache.get(this.exerciseId)!; return; }
    this.loading = true;
    this.api.exerciseHistory(this.exerciseId, this.planId).subscribe({
      next: r => { this.exercise = r.exercise; this.historyRows = r.history; this.histCache.set(this.exerciseId!, r.history); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private loadMedia(): void {
    if (!this.exerciseId) return;
    if (this.mediaCache.has(this.exerciseId)) { this.mediaRows = this.mediaCache.get(this.exerciseId)!; return; }
    this.loading = true;
    this.api.exerciseMedia(this.exerciseId).subscribe({
      next: r => { this.exercise = r.exercise; this.mediaRows = r.media; this.mediaCache.set(this.exerciseId!, r.media); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openNRC(m: ExerciseMedia): void { window.location.href = m.url; setTimeout(() => { window.location.href = 'https://www.nike.com/nrc-app'; }, 800); }
  fmtDate(d: string): string { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  planStr(h: HistoryRow): string { if (h.planned_sets && h.planned_reps) return `${h.planned_sets}×${h.planned_reps}`; if (h.eff_distance) return `${h.eff_distance}km`; return '—'; }
}
