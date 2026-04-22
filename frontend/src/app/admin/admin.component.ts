import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiService } from '../services/api.service';
import { User } from '../models';

interface AdminBoot { users: User[]; currentId: number; adminCount: number; }
declare const window: Window & typeof globalThis & { ADMIN_BOOT: AdminBoot };

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule,
            DropdownModule, TagModule, DialogModule, ToastModule],
  template: `
    <p-toast position="bottom-center" />

    <div class="page-header">
      <div>
        <p class="page-eyebrow">Administration</p>
        <h1 class="page-title">
          Users
          <span style="font-size:.85rem;font-weight:400;color:#94a3b8;margin-left:.5rem">{{ users.length }}</span>
        </h1>
      </div>
      <p-button label="New User" icon="pi pi-user-plus" (onClick)="openCreate()" />
    </div>

    <div class="page-body">
      @for (u of users; track u.id) {
        <div class="user-row">
          <div class="user-avatar">{{ initial(u.name) }}</div>
          <div style="flex:1;min-width:0">
            <div class="user-name">{{ u.name }}</div>
            <div class="user-email">{{ u.email }}</div>
          </div>
          <p-tag [value]="u.role" [severity]="u.role === 'admin' ? 'warning' : 'info'" [rounded]="true" />
          <p-button icon="pi pi-pencil" [text]="true" severity="secondary" size="small"
                    (onClick)="openEdit(u)" />
          <p-button icon="pi pi-trash" [text]="true" severity="danger" size="small"
                    (onClick)="del(u)" />
        </div>
      }

      @if (!users.length) {
        <div style="padding:3rem;text-align:center;color:#94a3b8;font-size:.9rem">No users found.</div>
      }
    </div>

    <p-dialog [(visible)]="dialogOpen"
              [header]="editingId ? 'Edit User' : 'New User'"
              [modal]="true" [style]="{'width':'min(96vw,440px)'}"
              [draggable]="false" [resizable]="false"
              (onHide)="closeDialog()">
      <div style="padding:.25rem 0">
        <div class="form-field">
          <label>Name *</label>
          <input pInputText [(ngModel)]="form.name" maxlength="100" style="width:100%" />
        </div>
        <div class="form-field">
          <label>Email *</label>
          <input pInputText type="email" [(ngModel)]="form.email" maxlength="200" style="width:100%" />
        </div>
        <div class="form-field">
          <label>Password {{ editingId ? '(leave blank to keep current)' : '*' }}</label>
          <input pInputText type="password" [(ngModel)]="form.password" style="width:100%" />
        </div>
        <div class="form-field" style="margin-bottom:0">
          <label>Role</label>
          <p-dropdown [options]="roleOptions" [(ngModel)]="form.role"
                      optionLabel="label" optionValue="value" [style]="{'width':'100%'}" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
        <p-button [label]="editingId ? 'Save' : 'Create User'" icon="pi pi-check"
                  [loading]="saving" [disabled]="saving" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
})
export class AdminComponent implements OnInit {
  users:     User[] = [];
  dialogOpen = false;
  editingId: number | null = null;
  saving = false;
  form = { name: '', email: '', password: '', role: 'athlete' };
  roleOptions = [{ label: 'Athlete', value: 'athlete' }, { label: 'Admin', value: 'admin' }];

  constructor(private readonly api: ApiService, private msg: MessageService) {}

  ngOnInit(): void {
    // Users are in the boot data — no API call needed
    const boot = window.ADMIN_BOOT;
    this.users = boot?.users ?? [];
  }

  initial(name: string): string { return name.trim().charAt(0).toUpperCase(); }

  openCreate(): void {
    this.editingId = null;
    this.form = { name: '', email: '', password: '', role: 'athlete' };
    this.dialogOpen = true;
  }

  openEdit(u: User): void {
    this.editingId = u.id;
    this.form = { name: u.name, email: u.email, password: '', role: u.role };
    this.dialogOpen = true;
  }

  closeDialog(): void { this.dialogOpen = false; }

  save(): void {
    if (!this.form.name || !this.form.email) {
      this.msg.add({ severity: 'warn', summary: 'Name and email are required', life: 2500 }); return;
    }
    if (!this.editingId && !this.form.password) {
      this.msg.add({ severity: 'warn', summary: 'Password is required for new users', life: 2500 }); return;
    }
    this.saving = true;

    if (this.editingId) {
      // Update role via set_role, then password if provided via reset_password
      this.api.adminUpdateUser(this.editingId, this.form.name, this.form.email, this.form.role).subscribe({
        next: () => {
          const afterRole = () => {
            this.users = this.users.map(u => u.id === this.editingId
              ? { ...u, name: this.form.name, email: this.form.email, role: this.form.role } : u);
            this.saving = false; this.closeDialog();
            this.msg.add({ severity: 'success', summary: 'User updated', life: 2000 });
          };
          if (this.form.password) {
            this.api.adminSetPassword(this.editingId!, this.form.password).subscribe({
              next: afterRole,
              error: (e: Error) => { this.saving = false; this.msg.add({ severity: 'error', summary: e.message }); },
            });
          } else {
            afterRole();
          }
        },
        error: (e: Error) => { this.saving = false; this.msg.add({ severity: 'error', summary: e.message }); },
      });
    } else {
      this.api.adminCreateUser(this.form.name, this.form.email, this.form.password, this.form.role)
        .subscribe({
          next: (u: User) => {
            this.users = [...this.users, u];
            this.saving = false; this.closeDialog();
            this.msg.add({ severity: 'success', summary: 'User created', life: 2000 });
          },
          error: (e: Error) => { this.saving = false; this.msg.add({ severity: 'error', summary: e.message }); },
        });
    }
  }

  del(u: User): void {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    this.api.adminDeleteUser(u.id).subscribe({
      next: () => {
        this.users = this.users.filter(x => x.id !== u.id);
        this.msg.add({ severity: 'success', summary: 'User deleted', life: 2000 });
      },
      error: (e: Error) => this.msg.add({ severity: 'error', summary: e.message }),
    });
  }
}
