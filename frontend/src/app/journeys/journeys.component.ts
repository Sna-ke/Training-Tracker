import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ApiService } from '../services/api.service';
import { JourneysBoot, PlanWithProgress, Template } from '../models';

declare const window: Window & typeof globalThis & { JOURNEYS_BOOT: JourneysBoot };

@Component({
  standalone: true,
  selector: 'app-journeys',
  imports: [CommonModule, FormsModule, ButtonModule, ProgressBarModule,
            DialogModule, InputTextModule, DropdownModule, CalendarModule,
            TagModule, ToastModule, DividerModule, TooltipModule],
  template: `
    <p-toast position="bottom-center" />

    <div class="page-header">
      <div>
        <p class="page-eyebrow">Training Tracker</p>
        <h1 class="page-title">My Journeys</h1>
      </div>
      @if (templates.length) {
        <p-button label="New Journey" icon="pi pi-plus" (onClick)="showCreate = true" />
      }
    </div>

    <div class="page-body">

      @if (plans.length === 0) {
        <div class="empty-state">
          <i class="pi pi-flag-fill" style="font-size:3rem;color:#cbd5e1;margin-bottom:1rem;display:block"></i>
          <div style="font-size:1.05rem;font-weight:700;color:#0f172a;margin-bottom:.4rem">No journeys yet</div>
          <div style="font-size:.85rem;color:#64748b;margin-bottom:1.25rem;max-width:320px;margin-left:auto;margin-right:auto">
            @if (templates.length) { Start a journey using one of your training plan templates. }
            @else { Upload a plan template on the Plans page to get started. }
          </div>
          @if (templates.length) {
            <p-button label="Start Your First Journey" icon="pi pi-play" (onClick)="showCreate = true" />
          }
        </div>
      }

      @for (p of plans; track p.id) {
        <div class="journey-card" (click)="openPlan(p.id)">
          <!-- Card top row -->
          <div style="display:flex;align-items:flex-start;gap:1rem;margin-bottom:.75rem">
            <div style="flex:1;min-width:0">
              <div class="journey-name">{{ p.name }}</div>
              <div class="journey-meta">
                {{ p.template_name }}
                <span style="margin:0 .3rem;opacity:.4">·</span>
                Started {{ fmtDate(p.start_date) }}
                @if (p.athlete_name) {
                  <span style="margin:0 .3rem;opacity:.4">·</span>{{ p.athlete_name }}
                }
              </div>
            </div>
            <div style="display:flex;gap:.3rem;flex-shrink:0">
              <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small"
                        pTooltip="Delete" tooltipPosition="left"
                        (onClick)="$event.stopPropagation(); del(p)" />
              <p-button icon="pi pi-chevron-right" [rounded]="true" [text]="true" severity="secondary" size="small" />
            </div>
          </div>

          <!-- Overall progress bar -->
          <p-progressBar [value]="p.pct"
                         [style]="{'height':'6px','border-radius':'4px'}"
                         [showValue]="false" />
          <div class="progress-label">
            <span>{{ p.days_done }} / {{ p.days_total }} days completed</span>
            <span style="font-weight:700;color:#3b82f6">{{ p.pct }}%</span>
          </div>

          <!-- Weekly snapshot grid -->
          @if (weekArray(p).length > 0) {
            <div style="margin-top:.85rem">
              <div style="font-size:.62rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:.4rem">
                Weekly progress
              </div>
              <div style="display:flex;gap:3px;flex-wrap:wrap">
                @for (w of weekArray(p); track w.week) {
                  <div [title]="'Week ' + w.week + ': ' + w.done + '/' + w.total + ' days'"
                       style="width:16px;height:16px;border-radius:3px;cursor:pointer;flex-shrink:0"
                       [style.background]="weekColor(w)">
                  </div>
                }
              </div>
              <div style="display:flex;gap:.9rem;margin-top:.4rem">
                <div style="display:flex;align-items:center;gap:.3rem;font-size:.65rem;color:#94a3b8">
                  <div style="width:10px;height:10px;border-radius:2px;background:#22c55e"></div> Complete
                </div>
                <div style="display:flex;align-items:center;gap:.3rem;font-size:.65rem;color:#94a3b8">
                  <div style="width:10px;height:10px;border-radius:2px;background:#93c5fd"></div> Partial
                </div>
                <div style="display:flex;align-items:center;gap:.3rem;font-size:.65rem;color:#94a3b8">
                  <div style="width:10px;height:10px;border-radius:2px;background:#e2e8f0"></div> Upcoming
                </div>
              </div>
            </div>
          }
        </div>
      }

    </div>

    <!-- Create journey dialog -->
    <p-dialog [(visible)]="showCreate" header="Start New Journey" [modal]="true"
              [style]="{'width':'min(96vw,500px)'}" [draggable]="false" [resizable]="false"
              [contentStyle]="{'overflow':'visible'}" (onHide)="resetForm()">

      <div style="padding:.25rem 0">
        <div class="form-field">
          <label>Plan Template *</label>
          <p-dropdown [options]="templateOptions" [(ngModel)]="selectedTemplate"
                      optionLabel="name" optionValue="id"
                      placeholder="Choose a template" [style]="{'width':'100%'}" />
        </div>

        <div class="form-field">
          <label>Journey Name *</label>
          <input pInputText [(ngModel)]="newName"
                 placeholder="e.g. Sub-20 5K Journey"
                 maxlength="200" style="width:100%" />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Start Date *</label>
            <p-calendar [(ngModel)]="newStartDate" dateFormat="yy-mm-dd"
                        [showIcon]="true" appendTo="body" [style]="{'width':'100%'}" />
          </div>
          <div class="form-field">
            <label>Athlete Name <span style="color:#94a3b8;font-weight:400">(optional)</span></label>
            <input pInputText [(ngModel)]="newAthlete"
                   placeholder="e.g. Brian" maxlength="100" style="width:100%" />
          </div>
        </div>

        @if (createError) {
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:.65rem .9rem;font-size:.82rem;color:#dc2626;margin-top:.25rem">
            <i class="pi pi-exclamation-triangle" style="margin-right:.35rem"></i>{{ createError }}
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [outlined]="true"
                  (onClick)="showCreate = false; resetForm()" />
        <p-button label="Create Journey" icon="pi pi-play"
                  [loading]="creating" [disabled]="creating"
                  (onClick)="create()" />
      </ng-template>
    </p-dialog>
  `,
})
export class JourneysComponent implements OnInit {
  plans: PlanWithProgress[] = [];
  templates: Template[] = [];
  templateOptions: { id: number; name: string }[] = [];
  showCreate = false;
  selectedTemplate = 0;
  newName = '';
  newStartDate: Date = new Date();
  newAthlete = '';
  creating = false;
  createError = '';

  constructor(private api: ApiService, private msg: MessageService) {}

  ngOnInit(): void {
    const boot = window.JOURNEYS_BOOT;
    this.plans     = boot.plans     ?? [];
    this.templates = boot.templates ?? [];
    this.templateOptions = this.templates.map(t => ({ id: t.id, name: t.name }));
    if (this.templates.length) this.selectedTemplate = this.templates[0].id;
  }

  openPlan(id: number): void { window.location.href = `index.php?plan_id=${id}`; }

  create(): void {
    if (!this.newName.trim()) { this.createError = 'Journey name is required'; return; }
    if (!this.selectedTemplate) { this.createError = 'Please select a template'; return; }
    this.createError = '';
    this.creating = true;
    const start = this.newStartDate instanceof Date
      ? this.newStartDate.toISOString().slice(0, 10) : String(this.newStartDate);
    this.api.createPlan(this.selectedTemplate, this.newName.trim(), start, this.newAthlete || undefined)
      .subscribe({
        next: r  => { window.location.href = `index.php?plan_id=${r.plan_id}`; },
        error: (e: Error) => { this.creating = false; this.createError = e.message; },
      });
  }

  del(p: PlanWithProgress): void {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    this.api.deletePlan(p.id).subscribe({
      next: () => {
        this.plans = this.plans.filter(x => x.id !== p.id);
        this.msg.add({ severity: 'success', summary: 'Journey deleted', life: 2000 });
      },
      error: (e: Error) => this.msg.add({ severity: 'error', summary: e.message, life: 3000 }),
    });
  }

  resetForm(): void {
    this.newName = ''; this.newAthlete = ''; this.createError = '';
    this.newStartDate = new Date(); this.creating = false;
    if (this.templates.length) this.selectedTemplate = this.templates[0].id;
  }

  fmtDate(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  weekArray(p: PlanWithProgress): Array<{ week: number; done: number; total: number }> {
    return Array.from({ length: p.total_weeks }, (_, i) => {
      const w = i + 1;
      const s = p.week_summaries?.[w] ?? { done: 0, total: 0 };
      return { week: w, done: s.done, total: s.total };
    });
  }

  weekColor(w: { done: number; total: number }): string {
    if (w.total === 0) return '#f1f5f9';          // rest-only week
    if (w.done === 0)  return '#e2e8f0';          // not started
    if (w.done >= w.total) return '#22c55e';       // fully complete
    return '#93c5fd';                             // partial
  }
}
