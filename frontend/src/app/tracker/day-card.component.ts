import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../services/api.service';
import { DaySummary, WorkoutItem, LogPayload } from '../models';
import { forkJoin, of } from 'rxjs';

interface LogForm {
  sets: number | null; reps: number | null; weight: number | null;
  distance: number | null; duration: number | null; pace: number | null;
  hr: number | null; note: string;
}

@Component({
  standalone: true,
  selector: 'app-day-card',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputNumberModule, InputTextModule,
    TagModule, DividerModule, ProgressSpinnerModule, TooltipModule,
  ],
  template: `
    <div class="tt-day-card"
         [class.is-done]="isDone"
         [class.is-skipped]="isSkipped"
         [class.is-rest]="day.is_rest"
         [style.border-left-width]="(!day.is_rest && !isSkipped) ? '4px' : null"
         [style.border-left-color]="(!day.is_rest && !isSkipped) ? day.color : null">

      <!-- Header -->
      <div class="tt-day-header" (click)="toggle()">
        <div style="display:flex;align-items:center;gap:.85rem;flex:1;min-width:0">
          <div style="text-align:center;min-width:42px;flex-shrink:0">
            <div class="tt-day-name" [style.color]="(day.is_rest||isSkipped) ? 'var(--text-muted)' : day.color">
              {{ day.day_name }}
            </div>
            <div class="tt-day-date">{{ formattedDate }}</div>
          </div>
          <div style="width:1px;height:32px;background:var(--surface-border);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div class="tt-day-code">{{ day.type_code ?? (day.is_rest ? 'rest' : 'workout') }}</div>
            <div class="tt-day-wt"
                 [style.color]="day.is_race ? day.color : isSkipped ? '#D97706' : day.is_rest ? 'var(--text-muted)' : 'var(--text-primary)'">
              @if (isSkipped) { <i class="pi pi-forward" style="font-size:.75rem;margin-right:.25rem"></i> Skipped — }
              {{ day.wt_name ?? (day.is_rest ? 'Rest Day' : '—') }}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.4rem;flex-shrink:0">
          @if (isDone && !isSkipped) {
            <p-tag value="Done" severity="success" [rounded]="true" />
          }
          @if (isSkipped) {
            <p-button label="Restore" icon="pi pi-undo" severity="warning" size="small"
                      [text]="true" (onClick)="unskip(); $event.stopPropagation()" />
          }
          @if (canInteract) {
            <i class="pi" [class.pi-chevron-down]="!open" [class.pi-chevron-up]="open"
               style="color:var(--text-muted);font-size:.8rem"></i>
          }
        </div>
      </div>

      <!-- Expanded body -->
      @if (open) {
        <div class="tt-day-body">

          @if (!loaded) {
            <div class="tt-loading">
              <p-progressSpinner [style]="{'width':'28px','height':'28px'}" strokeWidth="4" />
              Loading workout…
            </div>
          }

          @if (loaded) {
            @if (instructions.length > 0) {
              <div style="margin:.85rem 0 .6rem">
                @for (it of instructions; track $index) {
                  <div class="tt-bull" [style.border-left-color]="day.color + '55'">
                    <i class="pi pi-info-circle" style="font-size:.75rem;margin-top:.1rem;flex-shrink:0"
                       [style.color]="day.color"></i>
                    <span class="tt-bull-txt">{{ it.item_note ?? '' }}</span>
                  </div>
                }
              </div>
            }

            @if (strengthItems.length > 0) {
              <div class="tt-section-lbl">💪 Log Exercises</div>
              @for (it of strengthItems; track it.item_id) {
                <div class="tt-ex-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.65rem">
                    <div style="flex:1;min-width:0">
                      <div class="tt-ex-name">{{ it.exercise_name }}</div>
                      @if (plannedStr(it)) { <div class="tt-ex-planned">Plan: {{ plannedStr(it) }}</div> }
                    </div>
                    <div style="display:flex;gap:.15rem">
                      <p-button icon="pi pi-chart-line" [text]="true" severity="secondary" size="small"
                                pTooltip="History" (onClick)="openHistory.emit({id:it.exercise_id!,name:it.exercise_name!})" />
                      <p-button icon="pi pi-video" [text]="true" severity="secondary" size="small"
                                pTooltip="How To" (onClick)="openMedia.emit({id:it.exercise_id!,name:it.exercise_name!})" />
                    </div>
                  </div>
                  <div class="tt-ex-inputs">
                    <div class="tt-ex-inp">
                      <label>Sets</label>
                      <p-inputNumber [(ngModel)]="forms[it.item_id].sets" [min]="0" [max]="20"
                                     [placeholder]="it.planned_sets != null ? ''+it.planned_sets : '—'"
                                     [showButtons]="false" inputStyleClass="w-full text-center" />
                    </div>
                    <div class="tt-ex-inp">
                      <label>{{ it.unit_type === 'seconds' ? 'Secs' : 'Reps' }}</label>
                      <p-inputNumber [(ngModel)]="forms[it.item_id].reps" [min]="0"
                                     [placeholder]="it.planned_reps != null ? ''+it.planned_reps : '—'"
                                     [showButtons]="false" inputStyleClass="w-full text-center" />
                    </div>
                    @if (it.unit_type !== 'seconds') {
                      <div class="tt-ex-inp">
                        <label>kg</label>
                        <p-inputNumber [(ngModel)]="forms[it.item_id].weight" [min]="0" [max]="500"
                                       [minFractionDigits]="0" [maxFractionDigits]="1"
                                       placeholder="—" [showButtons]="false" inputStyleClass="w-full text-center" />
                      </div>
                    }
                    <div class="tt-ex-inp tt-ex-inp-note">
                      <label>Notes</label>
                      <input pInputText [(ngModel)]="forms[it.item_id].note"
                             placeholder="Optional…" maxlength="200" style="width:100%" />
                    </div>
                  </div>
                </div>
              }
            }

            @if (runItems.length > 0) {
              <div class="tt-section-lbl">👟 Log Run Segments</div>
              @for (it of runItems; track it.item_id) {
                <div class="tt-ex-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.65rem">
                    <div style="flex:1;min-width:0">
                      <div class="tt-ex-name">{{ it.exercise_name }}</div>
                      @if (runPlanned(it)) { <div class="tt-ex-planned">{{ runPlanned(it) }}</div> }
                    </div>
                    <div style="display:flex;gap:.15rem">
                      <p-button icon="pi pi-chart-line" [text]="true" severity="secondary" size="small"
                                (onClick)="openHistory.emit({id:it.exercise_id!,name:it.exercise_name!})" />
                      <p-button icon="pi pi-video" [text]="true" severity="secondary" size="small"
                                (onClick)="openMedia.emit({id:it.exercise_id!,name:it.exercise_name!})" />
                    </div>
                  </div>
                  <div class="tt-ex-inputs">
                    <div class="tt-ex-inp">
                      <label>km</label>
                      <p-inputNumber [(ngModel)]="forms[it.item_id].distance"
                                     [placeholder]="it.planned_distance_km != null ? ''+it.planned_distance_km : '—'"
                                     [min]="0" [max]="50" [minFractionDigits]="0" [maxFractionDigits]="2"
                                     [showButtons]="false" inputStyleClass="w-full text-center" />
                    </div>
                    <div class="tt-ex-inp">
                      <label>Time (min)</label>
                      <p-inputNumber [(ngModel)]="forms[it.item_id].duration" placeholder="—"
                                     [min]="0" [max]="300" [minFractionDigits]="0" [maxFractionDigits]="1"
                                     [showButtons]="false" inputStyleClass="w-full text-center" />
                    </div>
                    <div class="tt-ex-inp">
                      <label>Pace /km</label>
                      <p-inputNumber [(ngModel)]="forms[it.item_id].pace" placeholder="—"
                                     [min]="0" [max]="20" [minFractionDigits]="0" [maxFractionDigits]="2"
                                     [showButtons]="false" inputStyleClass="w-full text-center" />
                    </div>
                    <div class="tt-ex-inp">
                      <label>HR bpm</label>
                      <p-inputNumber [(ngModel)]="forms[it.item_id].hr" placeholder="—"
                                     [min]="0" [max]="250" [showButtons]="false"
                                     inputStyleClass="w-full text-center" />
                    </div>
                    <div class="tt-ex-inp tt-ex-inp-note">
                      <label>Notes</label>
                      <input pInputText [(ngModel)]="forms[it.item_id].note"
                             placeholder="Conditions, feel…" maxlength="200" style="width:100%" />
                    </div>
                  </div>
                </div>
              }
            }

            <div class="tt-field" style="margin-top:.85rem">
              <label>Day Notes</label>
              <textarea pInputText [(ngModel)]="dayNotes" rows="2" maxlength="500"
                        placeholder="How did it feel?…" style="width:100%;resize:vertical;min-height:54px"></textarea>
            </div>

            <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:.5rem;margin-top:1rem;align-items:stretch">
              <p-button label="Save Log" icon="pi pi-save" severity="secondary"
                        [disabled]="saving" (onClick)="saveLog()"
                        styleClass="w-full justify-content-center" />
              @if (!isDone) {
                <p-button icon="pi pi-forward" severity="warning" pTooltip="Skip Day"
                          [outlined]="true" (onClick)="skip()" />
                <p-button label="Save & Done" icon="pi pi-check-circle" [disabled]="saving"
                          (onClick)="saveAndDone()"
                          styleClass="w-full justify-content-center"
                          [style]="{'background':day.color,'border-color':day.color,'color':'#fff'}" />
              }
              @if (isDone) {
                <span></span>
                <p-button label="Undo Done" icon="pi pi-undo" severity="secondary"
                          [outlined]="true" (onClick)="undoDone()"
                          styleClass="w-full justify-content-center" />
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DayCardComponent implements OnInit {
  @Input() day!: DaySummary;
  @Input() planId!: number;
  @Output() toast        = new EventEmitter<string>();
  @Output() openHistory  = new EventEmitter<{ id: number; name: string }>();
  @Output() openMedia    = new EventEmitter<{ id: number; name: string }>();
  @Output() stateChange  = new EventEmitter<{ dayOfWeek: number; state: 'logged' | 'done' | 'skipped' | 'pending' }>();

  open = false; loaded = false; saving = false;
  isDone = false; isSkipped = false; dayNotes = '';
  items: WorkoutItem[] = []; forms: Record<number, LogForm> = {};
  instructions: WorkoutItem[] = []; strengthItems: WorkoutItem[] = []; runItems: WorkoutItem[] = [];

  get canInteract(): boolean { return !this.day.is_rest && !this.isSkipped; }

  get formattedDate(): string {
    if (!this.day.scheduled_date) return '';
    return new Date(this.day.scheduled_date + 'T00:00:00')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.isDone    = !!this.day.completed;
    this.isSkipped = !!this.day.skipped;
  }

  toggle(): void {
    if (!this.canInteract) return;
    this.open = !this.open;
    if (this.open && !this.loaded) this.loadItems();
  }

  loadItems(): void {
    this.api.getDay(this.day.id).subscribe({
      next: data => {
        this.dayNotes      = data.plan_day?.day_notes ?? '';
        this.items         = data.items ?? [];
        this.instructions  = this.items.filter(i => i.item_role === 'instruction' || !i.exercise_id);
        this.strengthItems = this.items.filter(i => i.exercise_id && i.category === 'strength');
        this.runItems      = this.items.filter(i => i.exercise_id && i.category !== 'strength' && i.item_role !== 'instruction');
        this.forms = {};
        for (const it of [...this.strengthItems, ...this.runItems]) {
          this.forms[it.item_id] = {
            sets:     it.sets_done      ?? null,
            reps:     it.reps_done      ?? null,
            weight:   it.log_weight     ?? null,
            distance: it.distance_km    ?? null,
            duration: it.duration_min   ?? null,
            pace:     it.pace_per_km    ?? null,
            hr:       it.heart_rate_avg ?? null,
            note:     it.log_notes      ?? '',
          };
        }
        this.loaded = true;
        if (!this.isDone && this.day.has_log) {
          this.stateChange.emit({ dayOfWeek: this.day.day_of_week, state: 'logged' });
        }
      },
      error: () => this.toast.emit('Error loading workout'),
    });
  }

  buildPayloads(): LogPayload[] {
    return [...this.strengthItems, ...this.runItems].filter(it => it.exercise_id).map(it => {
      const f = this.forms[it.item_id];
      const pick = (logged: number | null, planned: number | null | undefined) =>
        logged !== null ? String(logged) : planned != null ? String(planned) : null;
      return {
        plan_day_id:     this.day.id,
        workout_item_id: it.item_id,
        exercise_id:     it.exercise_id!,
        sets:     pick(f.sets,     it.planned_sets),
        reps:     pick(f.reps,     it.planned_reps),
        weight:   pick(f.weight,   it.planned_weight_kg),
        distance: pick(f.distance, it.planned_distance_km),
        duration: pick(f.duration, it.planned_duration_min),
        pace:     f.pace !== null ? String(f.pace) : null,
        hr:       f.hr   !== null ? String(f.hr)   : null,
        notes:    f.note || null,
      };
    });
  }

  saveLog(): void {
    const p = this.buildPayloads();
    if (!p.length) { this.toast.emit('Nothing to log'); return; }
    this.saving = true;
    forkJoin(p.map(x => this.api.log(x))).subscribe({
      next: () => {
        this.saving = false;
        this.toast.emit('Log saved ✓');
        this.stateChange.emit({ dayOfWeek: this.day.day_of_week, state: 'logged' });
      },
      error: () => { this.saving = false; this.toast.emit('Save failed ✗'); },
    });
  }

  saveAndDone(): void {
    this.saving = true;
    const p = this.buildPayloads();
    (p.length ? forkJoin(p.map(x => this.api.log(x))) : of([])).subscribe({
      next: () => this.api.complete(this.day.id, true, this.dayNotes).subscribe({
        next: () => {
          this.isDone = true;
          this.saving = false;
          this.toast.emit('Day complete ✓');
          this.stateChange.emit({ dayOfWeek: this.day.day_of_week, state: 'done' });
        },
        error: () => { this.saving = false; this.toast.emit('Error'); },
      }),
      error: () => { this.saving = false; this.toast.emit('Save failed ✗'); },
    });
  }

  undoDone(): void {
    this.api.complete(this.day.id, false).subscribe({
      next: () => {
        this.isDone = false;
        this.toast.emit('Marked incomplete');
        this.stateChange.emit({
          dayOfWeek: this.day.day_of_week,
          state: this.day.has_log ? 'logged' : 'pending',
        });
      },
    });
  }

  skip(): void {
    if (!confirm('Skip this day? Following workout days shift forward by 1 day.')) return;
    this.api.skip(this.day.id).subscribe({
      next: () => {
        this.toast.emit('Day skipped ✓');
        this.stateChange.emit({ dayOfWeek: this.day.day_of_week, state: 'skipped' });
        setTimeout(() => location.reload(), 700);
      },
    });
  }

  unskip(): void {
    if (!confirm('Restore this day? Following workout days shift back by 1 day.')) return;
    this.api.unskip(this.day.id).subscribe({
      next: () => {
        this.toast.emit('Day restored ✓');
        this.stateChange.emit({ dayOfWeek: this.day.day_of_week, state: 'pending' });
        setTimeout(() => location.reload(), 700);
      },
    });
  }

  plannedStr(it: WorkoutItem): string {
    if (!it.planned_sets || !it.planned_reps) return '';
    return `${it.planned_sets}×${it.planned_reps}${it.unit_type === 'seconds' ? 's' : ''}${it.planned_weight_kg ? ' @ ' + it.planned_weight_kg + 'kg' : ''}`;
  }

  runPlanned(it: WorkoutItem): string {
    if (it.planned_distance_km) return it.planned_distance_km + 'km planned';
    if (it.planned_duration_min) return it.planned_duration_min + 'min planned';
    return '';
  }
}