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
          @if (w < boot.selectedWeek) { <span class="wk-pip"></span> }
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

  get weekDateRange(): string {
    const d = this.days.filter(x => !x.is_rest);
    if (!d.length) return '';
    const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(d[0].scheduled_date)} – ${fmt(d[d.length - 1].scheduled_date)}`;
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
