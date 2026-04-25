import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DayCardComponent } from './day-card.component';
import { ExerciseModalComponent } from '../shared/exercise-modal.component';
import { TrackerBoot, DaySummary } from '../models';

declare const window: Window & typeof globalThis & { TRACKER_BOOT: TrackerBoot };

@Component({
  standalone: true,
  selector: 'app-tracker',
  imports: [CommonModule, ButtonModule, ProgressBarModule, ToastModule,
            DayCardComponent, ExerciseModalComponent],
  template: `
    <p-toast position="bottom-center" />

    <!-- Week strip — full width, sticky -->
    <div class="week-strip">
      @for (w of weekNumbers; track w) {
        <button class="wk-btn" [class.active]="w === boot.selectedWeek" (click)="go(w)">
          {{ w }}
          <!-- Per-day pip dots -->
          <span class="wk-pips">
            @for (pip of getPips(w); track $index) {
              <span class="wk-pip" [class]="'wk-pip--' + pip"></span>
            }
          </span>
        </button>
      }
    </div>

    <!-- Page header -->
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
        <div>
          <p class="page-eyebrow">
            Week {{ boot.selectedWeek }} of {{ boot.totalWeeks }}
            @if (weekDateRange) { &nbsp;·&nbsp; {{ weekDateRange }} }
          </p>
          <h1 class="page-title" [style.color]="boot.phase.col">{{ boot.phase.name }}</h1>
        </div>
        <div style="text-align:right">
          <div style="font-size:.78rem;color:#64748b">{{ weekDone }} / {{ weekTotal }} days</div>
          <p-progressBar [value]="weekPct" [style]="{'height':'5px','width':'140px','border-radius':'4px'}" [showValue]="false" />
        </div>
      </div>
    </div>

    <!-- Day cards -->
    <div class="page-body">
      @for (day of days; track day.id) {
        <app-day-card
          [day]="day"
          [planId]="boot.planId"
          (toast)="showToast($event)"
          (stateChange)="onDayStateChange($event)"
          (openHistory)="openModal($event.id, $event.name, 'history')"
          (openMedia)="openModal($event.id, $event.name, 'media')"
        />
      }
    </div>

    <!-- Bottom nav -->
    <nav class="bot-nav">
      <p-button icon="pi pi-angle-left" severity="secondary" [outlined]="true"
                [disabled]="boot.selectedWeek <= 1"
                (onClick)="go(boot.selectedWeek - 1)" />
      <div style="flex:1;text-align:center;min-width:80px">
        <div style="font-size:.72rem;font-weight:700;color:#0f172a">Week {{ boot.selectedWeek }}</div>
        <div style="font-size:.62rem" [style.color]="boot.phase.col">{{ boot.phase.sh }}</div>
      </div>
      <p-button label="Today" severity="success" size="small"
                (onClick)="go(boot.currentWeek)" />
      <p-button icon="pi pi-angle-right" severity="secondary" [outlined]="true"
                [disabled]="boot.selectedWeek >= boot.totalWeeks"
                (onClick)="go(boot.selectedWeek + 1)" />
    </nav>

    <app-exercise-modal
      [open]="modal.open" [exerciseId]="modal.exerciseId"
      [exerciseName]="modal.exerciseName" [initialTab]="modal.tab"
      [planId]="boot.planId" (close)="closeModal()" />
  `,
})
export class TrackerComponent implements OnInit {
  boot!: TrackerBoot;
  days: DaySummary[] = [];
  weekNumbers: number[] = [];
  weekDone = 0; weekTotal = 0; weekPct = 0;
  modal = { open: false, exerciseId: null as number | null, exerciseName: '', tab: 'history' as 'history' | 'media' };

  // Mutable pip state for the selected week — updated reactively as user interacts
  // Shape: dayOfWeek (0-6) => pip state string
  private currentWeekPips: Record<number, string> = {};

  get weekDateRange(): string {
    const d = this.days.filter(x => !x.is_rest);
    if (!d.length) return '';
    const parse = (s: string) => new Date(s + 'T00:00:00');
    const first = parse(d[0].scheduled_date);
    const last  = parse(d[d.length - 1].scheduled_date);
    const sameYear = first.getFullYear() === last.getFullYear();
    const fmtFirst = first.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
    const fmtLast = last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmtFirst} – ${fmtLast}`;
  }

  constructor(private msg: MessageService) {}

  ngOnInit(): void {
    this.boot = window.TRACKER_BOOT;
    this.days = this.boot.days;
    this.weekNumbers = Array.from({ length: this.boot.totalWeeks }, (_, i) => i + 1);
    const active = this.days.filter(d => !d.is_rest);
    this.weekTotal = active.length;
    this.weekDone  = active.filter(d => d.completed).length;
    this.weekPct   = this.weekTotal > 0 ? Math.round(this.weekDone / this.weekTotal * 100) : 0;

    // Seed current week's mutable pips from boot data
    this.currentWeekPips = { ...(this.boot.weekPips[this.boot.selectedWeek] ?? {}) };
  }

  /**
   * Returns the ordered array of pip states for a given week button.
   * For the selected week, uses mutable currentWeekPips so changes are
   * reflected immediately without a page reload. Other weeks use boot data.
   */
  getPips(week: number): string[] {
    const pipMap = week === this.boot.selectedWeek
      ? this.currentWeekPips
      : (this.boot.weekPips[week] ?? {});

    // Always render exactly 7 dots (day_of_week 0–6)
    return Array.from({ length: 7 }, (_, i) => pipMap[i] ?? 'pending');
  }

  /**
   * Called by day cards when their state changes (logged, done, skipped, restored).
   * Updates the pip for that day in the current week immediately.
   */
  onDayStateChange(event: { dayOfWeek: number; state: 'logged' | 'done' | 'skipped' | 'pending' }): void {
    this.currentWeekPips = { ...this.currentWeekPips, [event.dayOfWeek]: event.state };

    // Recalculate weekDone/weekPct if done state changed
    const active = this.days.filter(d => !d.is_rest);
    this.weekDone = Object.values(this.currentWeekPips).filter(s => s === 'done').length;
    this.weekPct  = active.length > 0 ? Math.round(this.weekDone / active.length * 100) : 0;
  }

  go(w: number): void {
    window.location.href = `index.php?plan_id=${this.boot.planId}&week=${w}`;
  }

  showToast(msg: string): void {
    this.msg.add({ severity: msg.includes('✓') ? 'success' : 'error', summary: msg, life: 2500 });
  }

  openModal(id: number, name: string, tab: 'history' | 'media'): void {
    this.modal = { open: true, exerciseId: id, exerciseName: name, tab };
  }
  closeModal(): void { this.modal = { ...this.modal, open: false }; }
}
