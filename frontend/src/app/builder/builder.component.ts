import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ExercisePickerComponent } from '../shared/exercise-picker.component';
import { ApiService } from '../services/api.service';
import { BuilderBoot, BuilderDay, Exercise, BuilderExerciseRow } from '../models';

declare const window: Window & typeof globalThis & { BUILDER_BOOT: BuilderBoot };

@Component({
  standalone: true,
  selector: 'app-builder',
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, InputNumberModule,
    ProgressSpinnerModule, DialogModule, ToastModule, TooltipModule,
    ExercisePickerComponent,
  ],
  template: `
    <p-toast position="bottom-center" />

    <!-- ── Page header ── -->
    <div class="page-header">
      <div>
        <p class="page-eyebrow">Training Tracker</p>
        <h1 class="page-title">{{ boot.planId ? 'Plan Builder' : 'New Training Plan' }}</h1>
      </div>
      @if (boot.planId) {
        <a [href]="'index.php?plan_id=' + boot.planId"
           style="display:inline-flex;align-items:center;gap:.4rem;background:#3b82f6;color:#fff;border-radius:8px;padding:.55rem 1rem;font-size:.82rem;font-weight:600;text-decoration:none">
          <i class="pi pi-eye"></i> View Plan
        </a>
      }
    </div>

    <!-- ── Create plan form ── -->
    @if (!boot.planId) {
      <div class="create-form">
        <p style="font-size:.88rem;color:#475569;margin-bottom:1.25rem;line-height:1.6">
          Set up the details for your new training plan.
        </p>

        @if (formError) {
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.65rem .9rem;font-size:.82rem;color:#dc2626;margin-bottom:.85rem">
            <i class="pi pi-exclamation-triangle" style="margin-right:.35rem"></i>{{ formError }}
          </div>
        }

        <div class="form-field">
          <label>Plan Name *</label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. My 12-Week Strength Plan"
                 maxlength="200" style="width:100%">
          @if (errors['name']) { <span style="font-size:.68rem;color:#ef4444">{{ errors['name'] }}</span> }
        </div>

        <div style="display:flex;gap:.6rem;flex-wrap:wrap">
          <div class="form-field" style="flex:1;min-width:130px">
            <label>Start Date *</label>
            <input pInputText type="date" [(ngModel)]="form.startDate" style="width:100%">
            @if (errors['start']) { <span style="font-size:.68rem;color:#ef4444">{{ errors['start'] }}</span> }
          </div>
          <div class="form-field" style="flex:1;min-width:100px">
            <label>Total Weeks *</label>
            <input pInputText type="number" [(ngModel)]="form.weeks" min="1" max="104"
                   inputmode="numeric" style="width:100%">
            @if (errors['weeks']) { <span style="font-size:.68rem;color:#ef4444">{{ errors['weeks'] }}</span> }
          </div>
        </div>

        <div class="form-field">
          <label>Athlete Name <span style="color:#94a3b8;font-weight:400">(optional)</span></label>
          <input pInputText [(ngModel)]="form.athlete" maxlength="100" style="width:100%">
        </div>

        <div class="form-field">
          <label>Description <span style="color:#94a3b8;font-weight:400">(optional)</span></label>
          <textarea pInputText [(ngModel)]="form.description" rows="2" maxlength="500"
                    placeholder="Goals, context…"
                    style="width:100%;resize:vertical;min-height:60px"></textarea>
        </div>

        <p-button label="Create Plan & Start Building" icon="pi pi-arrow-right" iconPos="right"
                  [loading]="busy" [disabled]="busy" (onClick)="createPlan()"
                  styleClass="w-full" />
      </div>
    }

    <!-- ── Week editor ── -->
    @if (boot.planId) {

      <!-- Week strip.
           Mobile: always horizontal scroll (flex-wrap:nowrap set in CSS).
           Desktop: wraps, but collapsed to one row until expanded. -->
      <div #weekStrip class="week-strip" [class.collapsed]="!weekStripExpanded">
        @for (w of weekNumbers; track w) {
          <button class="wk-btn" [class.active]="curWeek === w" (click)="loadWeek(w)">
            {{ w }}
            @if (hasContent[w]) { <span class="wk-pip wk-pip--done"></span> }
          </button>
        }
        <!-- Expand/collapse chevron — only visible on desktop via CSS -->
        <button class="wk-expand-btn"
                (click)="weekStripExpanded = !weekStripExpanded"
                [title]="weekStripExpanded ? 'Collapse weeks' : 'Expand all weeks'">
          <i class="pi" [class.pi-chevron-down]="!weekStripExpanded"
                        [class.pi-chevron-up]="weekStripExpanded"></i>
        </button>
      </div>

      <div class="page-content">
        <!-- Week header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <div>
            <div style="font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8">
              Week {{ curWeek }} of {{ boot.totalWeeks }}
            </div>
          </div>
          <p-button label="Copy week" icon="pi pi-copy" severity="secondary" size="small"
                    [outlined]="true" (onClick)="copyModalOpen = true" />
        </div>

        @if (weekLoading) {
          <div style="display:flex;align-items:center;justify-content:center;gap:.65rem;padding:2rem;color:#94a3b8;font-size:.85rem">
            <p-progressSpinner [style]="{'width':'28px','height':'28px'}" strokeWidth="4" />
            Loading week…
          </div>
        }

        @if (!weekLoading) {
          @for (day of currentDays; track day.day_of_week) {
            <div class="day-card">
              <!-- Header -->
              <div class="day-card-header" (click)="toggleDay(day.day_of_week)">
                <div style="display:flex;align-items:center;gap:.75rem">
                  <div class="day-dot"
                       [style.background]="day.is_rest ? '#cbd5e1' : '#22c55e'"></div>
                  <div>
                    <div class="day-name">{{ dayName(day.day_of_week) }}</div>
                    <div class="day-date">{{ day.scheduled_date ?? '' }}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:.6rem">
                  @if (!day.is_rest && dayExercises[day.day_of_week].length) {
                    <span style="font-size:.72rem;color:#94a3b8">
                      {{ dayExercises[day.day_of_week].length }}
                      exercise{{ dayExercises[day.day_of_week].length !== 1 ? 's' : '' }}
                    </span>
                  }
                  @if (day.is_rest) {
                    <span style="font-size:.68rem;font-weight:500;color:#94a3b8;background:#f1f5f9;padding:.2rem .55rem;border-radius:20px">Rest</span>
                  }
                  <i class="pi" style="font-size:.8rem;color:#94a3b8"
                     [class.pi-chevron-down]="!openDays.has(day.day_of_week)"
                     [class.pi-chevron-up]="openDays.has(day.day_of_week)"></i>
                </div>
              </div>

              <!-- Body -->
              @if (openDays.has(day.day_of_week)) {
                <div class="day-body">
                  <!-- Day type toggle -->
                  <div class="type-toggle">
                    <span style="font-size:.8rem;color:#475569;font-weight:500">Day type</span>
                    <div class="toggle-group">
                      <button class="toggle-btn" [class.active]="!day.is_rest"
                              (click)="setRest(day, false)">Active</button>
                      <button class="toggle-btn" [class.active]="day.is_rest"
                              (click)="setRest(day, true)">Rest</button>
                    </div>
                  </div>

                  @if (!day.is_rest) {
                    <!-- Exercise rows -->
                    @for (ex of dayExercises[day.day_of_week]; track ex.exercise_id; let i = $index) {
                      <div class="ex-row">
                        <div class="ex-row-top">
                          <div class="ex-row-name" [title]="ex.exercise_name">{{ ex.exercise_name }}</div>
                          <span class="cat-chip" [class]="'cat-' + ex.category">
                            {{ catIcon(ex.category) }} {{ catLabel(ex.category) }}
                          </span>
                          <p-button icon="pi pi-times" [text]="true" severity="danger" size="small"
                                    pTooltip="Remove" (onClick)="removeExercise(day.day_of_week, i)" />
                        </div>
                        <div class="ex-inputs">
                          @if (!isRunEx(ex)) {
                            <div class="ex-inp">
                              <label>Sets</label>
                              <input type="number" inputmode="numeric" placeholder="3"
                                     min="0" max="99" [(ngModel)]="ex.planned_sets">
                            </div>
                          }
                          <div class="ex-inp">
                            <label>{{ unitLabel(ex.unit_type) }}</label>
                            <input type="number" [attr.inputmode]="isRunEx(ex) ? 'decimal' : 'numeric'"
                                   placeholder="—" min="0" [(ngModel)]="ex.planned_reps">
                          </div>
                          @if (!isRunEx(ex) && !isTimedEx(ex)) {
                            <div class="ex-inp">
                              <label>Weight kg</label>
                              <input type="number" inputmode="decimal" placeholder="—"
                                     min="0" step="0.5" [(ngModel)]="ex.planned_weight_kg">
                            </div>
                          }
                          <div class="ex-inp ex-inp-note">
                            <label>Notes</label>
                            <input type="text" placeholder="Optional…" maxlength="200"
                                   [(ngModel)]="ex.item_note">
                          </div>
                        </div>
                      </div>
                    }

                    <button class="add-ex-btn" (click)="openPickerFor(day.day_of_week)">
                      <i class="pi pi-plus"></i> Add Exercise
                    </button>
                  }

                  <div style="margin-top:.75rem">
                    <p-button [label]="savingDay === day.day_of_week ? 'Saving…' : 'Save Day'"
                              icon="pi pi-check" [loading]="savingDay === day.day_of_week"
                              [disabled]="savingDay === day.day_of_week"
                              (onClick)="saveDay(day)" styleClass="w-full" />
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Bottom nav -->
      <nav class="bot-nav">
        <p-button icon="pi pi-angle-left" severity="secondary" [outlined]="true"
                  [disabled]="curWeek <= 1" (onClick)="loadWeek(curWeek - 1)" />
        <div style="flex:1;text-align:center;min-width:80px">
          <div style="font-size:.72rem;font-weight:700;color:#0f172a">Week {{ curWeek }}</div>
          <div style="font-size:.62rem;color:#94a3b8">of {{ boot.totalWeeks }}</div>
        </div>
        <p-button icon="pi pi-angle-right" severity="secondary" [outlined]="true"
                  [disabled]="curWeek >= boot.totalWeeks" (onClick)="loadWeek(curWeek + 1)" />
      </nav>

      <!-- Exercise picker -->
      <app-exercise-picker
        [open]="pickerOpen"
        [exercises]="boot.exercises"
        [cats]="boot.cats"
        (picked)="onExercisePicked($event)"
        (close)="pickerOpen = false"
      />

      <!-- Copy week dialog -->
      <p-dialog [(visible)]="copyModalOpen" [header]="'Copy Week ' + curWeek + ' to…'"
                [modal]="true" [style]="{'width':'min(96vw,420px)'}"
                [draggable]="false" [resizable]="false">
        <div style="display:flex;gap:.65rem;margin-bottom:.75rem">
          <p-button label="Select all" [text]="true" severity="secondary" size="small"
                    (onClick)="setCopyAll(true)" />
          <p-button label="Deselect all" [text]="true" severity="secondary" size="small"
                    (onClick)="setCopyAll(false)" />
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.35rem;max-height:240px;overflow-y:auto;margin-bottom:.75rem">
          @for (w of weekNumbers; track w) {
            @if (w !== curWeek) {
              <label style="display:flex;align-items:center;gap:.4rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:.4rem .7rem;cursor:pointer;font-size:.82rem;color:#334155">
                <input type="checkbox" [(ngModel)]="copyTargets[w]">
                Week {{ w }}
              </label>
            }
          }
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [outlined]="true"
                    (onClick)="copyModalOpen = false" />
          <p-button label="Copy Week" icon="pi pi-copy" (onClick)="doCopy()" />
        </ng-template>
      </p-dialog>
    }
  `,
})
export class BuilderComponent implements OnInit, AfterViewInit {
  @ViewChild('weekStrip') weekStripEl!: ElementRef<HTMLElement>;

  boot!: BuilderBoot;
  weekNumbers: number[] = [];
  curWeek = 1;
  weekLoading = false;
  currentDays: BuilderDay[] = [];
  weekCache:   Record<number, BuilderDay[]> = {};
  hasContent:  Record<number, boolean> = {};
  openDays    = new Set<number>();
  dayExercises: Record<number, BuilderExerciseRow[]> = {};
  savingDay:  number | null = null;
  pickerOpen  = false;
  pickerTarget = 0;
  copyModalOpen = false;
  copyTargets:  Record<number, boolean> = {};
  weekStripExpanded = false;
  busy      = false;
  formError = '';
  errors:   Record<string, string> = {};

  form = {
    name: '', startDate: new Date().toISOString().slice(0, 10),
    weeks: 12, athlete: '', description: '',
  };

  constructor(private api: ApiService, private msg: MessageService) {}

  ngOnInit(): void {
    this.boot = window.BUILDER_BOOT;
    if (this.boot.planId) {
      this.weekNumbers = Array.from({ length: this.boot.totalWeeks }, (_, i) => i + 1);
      for (const w of this.weekNumbers) this.copyTargets[w] = false;
      this.loadWeek(1);
    }
  }

  createPlan(): void {
    this.errors = {};
    if (!this.form.name.trim())                        this.errors['name']  = 'Required';
    if (!this.form.startDate)                          this.errors['start'] = 'Required';
    if (this.form.weeks < 1 || this.form.weeks > 104) this.errors['weeks'] = '1–104';
    if (Object.keys(this.errors).length) return;
    this.busy = true;
    this.api.createCustomPlan(this.form.name.trim(), this.form.startDate, this.form.weeks,
                              this.form.description || undefined, this.form.athlete || undefined)
      .subscribe({
        next: r  => { window.location.href = `builder.php?plan_id=${r.plan_id}`; },
        error: (e: Error) => { this.formError = e.message; this.busy = false; },
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollActiveRowIntoView(), 0);
  }

  /** Scrolls the active week button into view:
   *  - Mobile: horizontal scroll, centres the active button.
   *  - Desktop collapsed: vertical scroll so the active row is visible. */
  private scrollActiveRowIntoView(): void {
    const strip = this.weekStripEl?.nativeElement;
    if (!strip) return;
    const active = strip.querySelector('.wk-btn.active') as HTMLElement | null;
    if (!active) return;

    if (window.innerWidth < 769) {
      // Mobile — centre the active button horizontally
      const centreLeft = active.offsetLeft - (strip.clientWidth / 2) + (active.offsetWidth / 2);
      strip.scrollTo({ left: centreLeft, behavior: 'smooth' });
    } else {
      // Desktop collapsed — scroll vertically to show active row
      strip.scrollTop = active.offsetTop - strip.offsetTop;
    }
  }

  loadWeek(w: number): void {
    if (w < 1 || w > this.boot.totalWeeks) return;
    this.curWeek = w;
    setTimeout(() => this.scrollActiveRowIntoView(), 0);
    if (this.weekCache[w]) { this.applyWeek(this.weekCache[w]); return; }
    this.weekLoading = true;
    this.api.builderWeekDays(this.boot.planId, w).subscribe({
      next: days => { this.weekCache[w] = days; this.weekLoading = false; this.applyWeek(days); },
      error: ()  => { this.weekLoading = false; this.toast('Error loading week'); },
    });
  }

  private applyWeek(days: BuilderDay[]): void {
    this.currentDays = days;
    for (const d of days) {
      if (!this.dayExercises[d.day_of_week]) {
        this.dayExercises[d.day_of_week] = (d.exercises ?? []).map(e => ({
          exercise_id:          e.exercise_id ?? 0,
          exercise_name:        e.exercise_name ?? '',
          category:             e.category ?? 'strength',
          unit_type:            e.unit_type ?? 'reps',
          planned_sets:         e.planned_sets        != null ? String(e.planned_sets)        : '',
          planned_reps:         e.planned_reps        != null ? String(e.planned_reps)        : '',
          planned_weight_kg:    e.planned_weight_kg   != null ? String(e.planned_weight_kg)   : '',
          planned_duration_min: e.planned_duration_min!= null ? String(e.planned_duration_min): '',
          item_note:            e.item_note ?? '',
        }));
      }
      if (!this.hasContent[this.curWeek]) {
        this.hasContent[this.curWeek] = days.some(d => !d.is_rest && (d.exercises ?? []).length > 0);
      }
    }
  }

  toggleDay(di: number): void {
    if (this.openDays.has(di)) this.openDays.delete(di);
    else this.openDays.add(di);
  }

  setRest(day: BuilderDay, isRest: boolean): void { day.is_rest = isRest; }

  openPickerFor(di: number): void { this.pickerTarget = di; this.pickerOpen = true; }

  onExercisePicked(ex: Exercise): void {
    if (!this.dayExercises[this.pickerTarget]) this.dayExercises[this.pickerTarget] = [];
    this.dayExercises[this.pickerTarget].push({
      exercise_id: ex.id, exercise_name: ex.name,
      category: ex.category, unit_type: ex.unit_type,
      planned_sets: '', planned_reps: '', planned_weight_kg: '',
      planned_duration_min: '', item_note: '',
    });
  }

  removeExercise(di: number, idx: number): void {
    this.dayExercises[di].splice(idx, 1);
  }

  saveDay(day: BuilderDay): void {
    this.savingDay = day.day_of_week;
    const exercises = (this.dayExercises[day.day_of_week] ?? []).map(ex => ({
      id:           ex.exercise_id,
      sets:         ex.planned_sets         || null,
      reps:         ex.planned_reps         || null,
      weight_kg:    ex.planned_weight_kg    || null,
      duration_min: ex.planned_duration_min || null,
      note:         ex.item_note            || null,
    }));
    this.api.saveBuilderDay(this.boot.planId, this.curWeek, day.day_of_week, day.is_rest, exercises)
      .subscribe({
        next: () => {
          this.savingDay = null;
          this.hasContent[this.curWeek] = !day.is_rest && exercises.length > 0;
          const n = exercises.length;
          this.toast(day.is_rest ? 'Rest day saved ✓' : `${n} exercise${n !== 1 ? 's' : ''} saved ✓`);
        },
        error: (e: Error) => { this.savingDay = null; this.toast('Error: ' + e.message); },
      });
  }

  setCopyAll(val: boolean): void {
    for (const w of this.weekNumbers) if (w !== this.curWeek) this.copyTargets[w] = val;
  }

  doCopy(): void {
    const toWeeks = this.weekNumbers.filter(w => w !== this.curWeek && this.copyTargets[w]);
    if (!toWeeks.length) { this.toast('Select at least one week'); return; }
    this.api.copyBuilderWeek(this.boot.planId, this.curWeek, toWeeks).subscribe({
      next: r => {
        this.copyModalOpen = false;
        for (const w of toWeeks) { delete this.weekCache[w]; this.hasContent[w] = true; }
        this.toast(`Copied to ${r.copied_to} week${r.copied_to !== 1 ? 's' : ''} ✓`);
      },
      error: (e: Error) => this.toast('Error: ' + e.message),
    });
  }

  dayName(di: number): string   { return this.boot.days[di] ?? `Day ${di}`; }
  catIcon(cat: string):  string { return this.boot.cats[cat]?.icon  ?? ''; }
  catLabel(cat: string): string { return this.boot.cats[cat]?.label ?? cat; }
  unitLabel(u: string):  string {
    const m: Record<string, string> = { reps: 'Reps', seconds: 'Seconds', distance: 'km', duration: 'Minutes' };
    return m[u] ?? u;
  }
  isRunEx(ex: BuilderExerciseRow):   boolean { return ex.unit_type === 'distance' || ex.unit_type === 'duration'; }
  isTimedEx(ex: BuilderExerciseRow): boolean { return ex.unit_type === 'seconds'; }

  toast(msg: string): void {
    this.msg.add({ severity: msg.includes('✓') ? 'success' : 'error', summary: msg, life: 2500 });
  }
}
