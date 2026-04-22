import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../services/api.service';
import { Exercise, CategoryConfig } from '../models';

@Component({
  standalone: true,
  selector: 'app-exercise-picker',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, DialogModule, DropdownModule, TagModule],
  template: `
    <p-dialog [(visible)]="open" header="Add Exercise" [modal]="true"
              [style]="{'width':'min(98vw,520px)','max-height':'85vh'}"
              [draggable]="false" [resizable]="false" (onHide)="close.emit()">

      <!-- Search + category filter -->
      <div style="display:flex;flex-direction:column;gap:.6rem;margin-bottom:.75rem">
        <span class="p-input-icon-left" style="width:100%">
          <i class="pi pi-search"></i>
          <input pInputText [(ngModel)]="query" (ngModelChange)="filter()"
                 placeholder="Search exercises…" style="width:100%" />
        </span>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap">
          <p-button label="All" [outlined]="selectedCat !== 'all'" size="small"
                    [severity]="selectedCat === 'all' ? 'primary' : 'secondary'"
                    (onClick)="setCat('all')" />
          @for (entry of catEntries; track entry.slug) {
            <p-button [label]="entry.icon + ' ' + entry.label" size="small"
                      [outlined]="selectedCat !== entry.slug"
                      [severity]="selectedCat === entry.slug ? 'primary' : 'secondary'"
                      (onClick)="setCat(entry.slug)" />
          }
        </div>
      </div>

      <!-- Exercise list -->
      <div style="max-height:320px;overflow-y:auto;border:1px solid var(--surface-border);border-radius:var(--radius-md)">
        @if (!filtered.length) {
          <div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:.85rem">No exercises found</div>
        }
        @for (ex of filtered; track ex.id) {
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.7rem 1rem;border-bottom:1px solid var(--surface-border);cursor:pointer;transition:background .1s"
               (click)="pick(ex)" (mouseenter)="hovered=ex.id" (mouseleave)="hovered=0"
               [style.background]="hovered === ex.id ? 'var(--surface-ground)' : '#fff'">
            <div>
              <div style="font-size:.88rem;font-weight:500;color:var(--text-primary)">{{ ex.name }}</div>
              <div style="font-size:.65rem;color:var(--text-muted)">{{ unitLabel(ex.unit_type) }}</div>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem">
              <span class="cat-chip" [class]="'cat-' + ex.category">{{ catIcon(ex.category) }} {{ catLabel(ex.category) }}</span>
              <i class="pi pi-plus-circle" style="color:var(--tt-primary);font-size:1.1rem"></i>
            </div>
          </div>
        }
      </div>

      <!-- Create new exercise -->
      <div style="margin-top:.85rem">
        <p-button [label]="showNew ? 'Cancel' : '+ Create New Exercise'" [text]="true"
                  severity="secondary" (onClick)="showNew = !showNew" size="small" />
        @if (showNew) {
          <div style="background:var(--surface-ground);border:1px solid var(--surface-border);border-radius:var(--radius-md);padding:.85rem;margin-top:.5rem;display:flex;flex-direction:column;gap:.6rem">
            <div class="tt-field">
              <label>Exercise Name *</label>
              <input pInputText [(ngModel)]="newName" maxlength="200" placeholder="e.g. Cable Row" class="w-full" />
            </div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
              <div class="tt-field" style="flex:1;min-width:130px">
                <label>Category</label>
                <p-dropdown [options]="catOptions" [(ngModel)]="newCat" optionLabel="label" optionValue="value" styleClass="w-full" />
              </div>
              <div class="tt-field" style="flex:1;min-width:130px">
                <label>Measure in</label>
                <p-dropdown [options]="unitOptions" [(ngModel)]="newUnit" optionLabel="label" optionValue="value" styleClass="w-full" />
              </div>
            </div>
            <p-button label="Save & Add" icon="pi pi-check" [loading]="saving"
                      [disabled]="saving" (onClick)="saveNew()" size="small" />
          </div>
        }
      </div>
    </p-dialog>
  `,
})
export class ExercisePickerComponent implements OnInit, OnChanges {
  @Input() open = false;
  @Input() exercises: Exercise[] = [];
  @Input() cats: Record<string, CategoryConfig> = {};
  @Output() picked = new EventEmitter<Exercise>();
  @Output() close  = new EventEmitter<void>();

  query = ''; selectedCat = 'all'; showNew = false;
  newName = ''; newCat = 'strength'; newUnit = 'reps'; saving = false;
  filtered: Exercise[] = []; hovered = 0;

  catOptions: { label: string; value: string }[] = [];
  unitOptions = [
    { label: 'Reps', value: 'reps' }, { label: 'Seconds', value: 'seconds' },
    { label: 'km', value: 'distance' }, { label: 'Minutes', value: 'duration' },
  ];

  get catEntries() { return Object.entries(this.cats).map(([slug, c]) => ({ slug, ...c })); }
  constructor(private api: ApiService) {}
  ngOnInit(): void { this.filter(); this.buildCatOptions(); }
  ngOnChanges(): void { this.filter(); this.buildCatOptions(); }

  buildCatOptions(): void {
    this.catOptions = Object.entries(this.cats).map(([v, c]) => ({ label: c.icon + ' ' + c.label, value: v }));
  }
  setCat(cat: string): void { this.selectedCat = cat; this.filter(); }
  filter(): void {
    const q = this.query.toLowerCase().trim();
    this.filtered = this.exercises.filter(ex =>
      (this.selectedCat === 'all' || ex.category === this.selectedCat) &&
      (!q || ex.name.toLowerCase().includes(q))
    );
  }
  pick(ex: Exercise): void { this.picked.emit(ex); this.close.emit(); }
  saveNew(): void {
    if (!this.newName.trim()) return;
    this.saving = true;
    this.api.saveBuilderExercise(this.newName.trim(), this.newCat, this.newUnit).subscribe({
      next: ex => {
        this.exercises = [...this.exercises, ex];
        this.saving = false; this.showNew = false; this.newName = '';
        this.filter(); this.pick(ex);
      },
      error: () => { this.saving = false; },
    });
  }
  catIcon(cat: string):  string { return this.cats[cat]?.icon  ?? ''; }
  catLabel(cat: string): string { return this.cats[cat]?.label ?? cat; }
  unitLabel(u: string):  string { const m: Record<string,string> = {reps:'Reps',seconds:'Seconds',distance:'km',duration:'Minutes'}; return m[u] ?? u; }
}
