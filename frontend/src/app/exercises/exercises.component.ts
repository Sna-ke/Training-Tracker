import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ApiService } from '../services/api.service';
import { ExercisesBoot, Exercise, CategoryConfig, ExerciseMedia } from '../models';

declare const window: Window & typeof globalThis & { EXERCISES_BOOT: ExercisesBoot };

@Component({
  standalone: true,
  selector: 'app-exercises',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule,
            DialogModule, DropdownModule, TagModule, ToastModule, TooltipModule],
  template: `
    <p-toast position="bottom-center" />

    <div class="page-header">
      <div>
        <p class="page-eyebrow">Training Tracker</p>
        <h1 class="page-title">
          Exercises
          <span style="font-size:.85rem;font-weight:400;color:#94a3b8;margin-left:.5rem">
            {{ filtered.length }} of {{ allExercises.length }}
          </span>
        </h1>
      </div>
      <p-button label="New Exercise" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <div class="toolbar">
      <span class="p-input-icon-left" style="flex:1;min-width:200px">
        <i class="pi pi-search"></i>
        <input pInputText [(ngModel)]="search" (ngModelChange)="filter()"
               placeholder="Search exercises…" style="width:100%" />
      </span>
      <div class="cat-filter">
        <button class="cat-btn" [class.active]="catFilter === 'all'"
                (click)="setCat('all')">All</button>
        @for (e of catEntries; track e.slug) {
          <button class="cat-btn" [class.active]="catFilter === e.slug"
                  (click)="setCat(e.slug)">{{ e.icon }} {{ e.label }}</button>
        }
      </div>
    </div>

    <div class="ex-list">
      @if (filtered.length === 0) {
        <div class="empty">
          <i class="pi pi-search" style="font-size:2rem;margin-bottom:.65rem;display:block;opacity:.4"></i>
          No exercises found.
        </div>
      }

      @for (ex of filtered; track ex.id) {
        <div class="ex-list-row">
          <div style="flex:1;min-width:0">
            <div class="ex-list-name">{{ ex.name }}</div>
            <div class="ex-list-unit">{{ unitLabel(ex.unit_type) }}</div>
          </div>
          <span class="cat-chip" [class]="'cat-' + ex.category">
            {{ catIcon(ex.category) }} {{ catLabel(ex.category) }}
          </span>
          <p-button icon="pi pi-pencil" [text]="true" severity="secondary" size="small"
                    pTooltip="Edit" (onClick)="openEdit(ex)" />
        </div>
      }
    </div>

    <!-- Edit / Create dialog -->
    <p-dialog [(visible)]="dialogOpen"
              [header]="editingId ? 'Edit Exercise' : 'New Exercise'"
              [modal]="true" [style]="{'width':'min(96vw,480px)'}"
              [draggable]="false" [resizable]="false"
              (onHide)="closeDialog()">
      <div style="padding:.25rem 0">
        <div class="form-field">
          <label>Name *</label>
          <input pInputText [(ngModel)]="form.name" maxlength="200"
                 placeholder="e.g. Cable Row" style="width:100%" />
        </div>
        <div class="form-field">
          <label>Category</label>
          <p-dropdown [options]="catOptions" [(ngModel)]="form.category"
                      optionLabel="label" optionValue="value"
                      [style]="{'width':'100%'}" />
        </div>
        <div class="form-field">
          <label>Measure in</label>
          <p-dropdown [options]="unitOptions" [(ngModel)]="form.unit_type"
                      optionLabel="label" optionValue="value"
                      [style]="{'width':'100%'}" />
        </div>
        <div class="form-field" style="margin-bottom:0">
          <label>Description <span style="color:#94a3b8;font-weight:400">(optional)</span></label>
          <textarea pInputText [(ngModel)]="form.description" rows="3" maxlength="500"
                    placeholder="Notes about form, cues, etc."
                    style="width:100%;resize:vertical;min-height:70px"></textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [outlined]="true"
                  (onClick)="closeDialog()" />
        <p-button [label]="editingId ? 'Save Changes' : 'Create Exercise'"
                  icon="pi pi-check" [loading]="saving" [disabled]="saving"
                  (onClick)="saveExercise()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ExercisesComponent implements OnInit {
  private boot!: ExercisesBoot;
  allExercises: Exercise[] = [];
  filtered: Exercise[] = [];
  search = '';
  catFilter = 'all';

  dialogOpen = false;
  editingId: number | null = null;
  saving = false;
  form = { name: '', category: 'strength', unit_type: 'reps', description: '' };

  get catEntries(): Array<{ slug: string } & CategoryConfig> {
    return Object.entries(this.boot?.cats ?? {})
      .map(([slug, c]) => ({ slug, label: c.label, color: c.color, icon: c.icon }));
  }

  catOptions: { label: string; value: string }[] = [];
  unitOptions = [
    { label: 'Reps',    value: 'reps'     },
    { label: 'Seconds', value: 'seconds'  },
    { label: 'km',      value: 'distance' },
    { label: 'Minutes', value: 'duration' },
  ];

  constructor(private api: ApiService, private msg: MessageService) {}

  ngOnInit(): void {
    this.boot         = window.EXERCISES_BOOT;
    this.allExercises = this.boot.exercises ?? [];
    this.filtered     = this.allExercises;
    this.catOptions   = Object.entries(this.boot.cats ?? {})
      .map(([v, c]) => ({ label: c.icon + ' ' + c.label, value: v }));
  }

  setCat(cat: string): void { this.catFilter = cat; this.filter(); }

  filter(): void {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.allExercises.filter(ex =>
      (this.catFilter === 'all' || ex.category === this.catFilter) &&
      (!q || ex.name.toLowerCase().includes(q))
    );
  }

  openCreate(): void {
    this.editingId = null;
    this.form = { name: '', category: 'strength', unit_type: 'reps', description: '' };
    this.dialogOpen = true;
  }

  openEdit(ex: Exercise): void {
    this.editingId = ex.id;
    this.form = { name: ex.name, category: ex.category, unit_type: ex.unit_type, description: '' };
    this.dialogOpen = true;
  }

  closeDialog(): void { this.dialogOpen = false; }

  saveExercise(): void {
    if (!this.form.name.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Name is required', life: 2500 });
      return;
    }
    this.saving = true;

    const obs = this.editingId
      ? this.api.updateExercise(this.editingId, this.form.name.trim(), this.form.category,
                                this.form.unit_type, this.form.description)
      : this.api.createExercise(this.form.name.trim(), this.form.category,
                                this.form.unit_type, this.form.description);

    obs.subscribe({
      next: (ex: Exercise) => {
        if (this.editingId) {
          this.allExercises = this.allExercises.map(e => e.id === this.editingId ? ex : e);
          this.msg.add({ severity: 'success', summary: 'Exercise updated', life: 2000 });
        } else {
          this.allExercises = [...this.allExercises, ex];
          this.msg.add({ severity: 'success', summary: 'Exercise created', life: 2000 });
        }
        this.saving = false;
        this.closeDialog();
        this.filter();
      },
      error: (e: Error) => {
        this.saving = false;
        this.msg.add({ severity: 'error', summary: e.message, life: 3000 });
      },
    });
  }

  catIcon(cat: string):  string { return this.boot?.cats?.[cat]?.icon  ?? ''; }
  catLabel(cat: string): string { return this.boot?.cats?.[cat]?.label ?? cat; }
  unitLabel(u: string):  string {
    const m: Record<string, string> = { reps: 'Reps', seconds: 'Seconds', distance: 'km', duration: 'Minutes' };
    return m[u] ?? u;
  }
}
