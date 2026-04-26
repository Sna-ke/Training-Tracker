// ============================================================
//  profile/edit-profile.component.ts
// ============================================================
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EditProfileBoot, PrivacySettings, CoachRelation, CoachUser } from '../models';

declare const window: Window & typeof globalThis & { EDIT_PROFILE_BOOT: EditProfileBoot };

const AVATAR_OPTIONS = ['🏃','🚴','🏊','🧗','⛷️','🤸','🏋️','🧘','🤾','🚵','🏇','🤼','🥇','🔥','⚡','🌟','💪','🎯'];
const API = 'save.php';

@Component({
  standalone: true,
  selector: 'app-edit-profile',
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, InputTextareaModule, ToastModule],
  template: `
    <p-toast position="bottom-center" />

    <div class="page-header">
      <div>
        <p class="page-eyebrow">Account</p>
        <h1 class="page-title">Edit Profile</h1>
      </div>
      <div class="profile-avatar-preview">{{ displayAvatar() }}</div>
    </div>

    <div class="profile-wrap page-body">

      <!-- ── Avatar ── -->
      <div class="profile-section">
        <h2>Avatar</h2>
        <div class="avatar-grid">
          <button type="button"
                  class="avatar-opt avatar-opt-clear"
                  [class.selected]="!profileForm.avatar"
                  (click)="selectAvatar('')">A</button>
          @for (e of avatarOptions; track e) {
            <button type="button"
                    class="avatar-opt"
                    [class.selected]="profileForm.avatar === e"
                    (click)="selectAvatar(e)">{{ e }}</button>
          }
        </div>
      </div>

      <!-- ── Personal info ── -->
      <div class="profile-section">
        <h2>Personal Info</h2>
        <div class="form-field">
          <label>Name *</label>
          <input pInputText [(ngModel)]="profileForm.name" maxlength="200" style="width:100%" />
        </div>
        <div class="form-field">
          <label>Email *</label>
          <input pInputText type="email" [(ngModel)]="profileForm.email" maxlength="255" style="width:100%" />
        </div>
        <div class="form-field">
          <label>Bio</label>
          <textarea pInputTextarea [(ngModel)]="profileForm.bio" maxlength="500" rows="3"
                    placeholder="A short description about yourself…" style="width:100%"></textarea>
        </div>
        <div style="text-align:right;margin-top:.5rem">
          <p-button label="Save Profile" (onClick)="saveProfile()" [loading]="saving.profile" />
        </div>
      </div>

      <!-- ── Sharing ── -->
      <div class="profile-section">
        <h2>Sharing</h2>
        <p class="profile-section-hint">Control what other logged-in users can see on your public profile.</p>

        <div class="toggle-row">
          <div>
            <div class="toggle-label">Current Journeys</div>
            <div class="toggle-hint">Show your active training plans and progress</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" [(ngModel)]="privacy.share_journeys">
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="toggle-row">
          <div>
            <div class="toggle-label">Recent Exercise Logs</div>
            <div class="toggle-hint">Share your recent workout entries</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" [(ngModel)]="privacy.share_exercise_logs">
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="toggle-row">
          <div>
            <div class="toggle-label">Status Messages</div>
            <div class="toggle-hint">Show your latest status updates</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" [(ngModel)]="privacy.share_status">
            <span class="toggle-track"></span>
          </label>
        </div>

        <div style="text-align:right;margin-top:.75rem">
          <p-button label="Save Sharing Preferences" (onClick)="savePrivacy()" [loading]="saving.privacy" />
        </div>
      </div>

      <!-- ── Coaches ── -->
      <div class="profile-section">
        <h2>My Coaches</h2>
        <p class="profile-section-hint">Coaches can see your full activity regardless of sharing settings above.</p>

        @if (coaches.length) {
          <div class="coach-list">
            @for (c of coaches; track c.id) {
              <div class="coach-item">
                <div class="coach-avatar">{{ c.coach_avatar || c.coach_name.charAt(0).toUpperCase() }}</div>
                <div class="coach-info">
                  <div class="coach-name">{{ c.coach_name }}</div>
                  <span class="coach-status status-{{ c.status }}">{{ c.status }}</span>
                </div>
                <p-button icon="pi pi-times" severity="danger" [text]="true" size="small"
                          pTooltip="Remove coach"
                          (onClick)="removeCoach(c.coach_id)" />
              </div>
            }
          </div>
        } @else {
          <p class="profile-empty">No coaches yet.</p>
        }

        @if (availableCoaches.length) {
          <div class="invite-row" style="margin-top:.75rem">
            <select class="invite-select" [(ngModel)]="selectedCoachId">
              <option value="">— Select a coach to invite —</option>
              @for (c of availableCoaches; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
            <p-button label="Invite" (onClick)="inviteCoach()" [loading]="saving.coach"
                      [disabled]="!selectedCoachId" />
          </div>
        } @else if (!coaches.length) {
          <p class="profile-empty">No coaches available to invite.</p>
        }
      </div>

      <!-- ── Password ── -->
      <div class="profile-section">
        <h2>Change Password</h2>
        <div class="form-field">
          <label>Current Password</label>
          <input pInputText type="password" [(ngModel)]="passwordForm.current" autocomplete="current-password" style="width:100%" />
        </div>
        <div class="form-field">
          <label>New Password</label>
          <input pInputText type="password" [(ngModel)]="passwordForm.newPw" autocomplete="new-password" style="width:100%" />
        </div>
        <div class="form-field">
          <label>Confirm New Password</label>
          <input pInputText type="password" [(ngModel)]="passwordForm.confirm" autocomplete="new-password" style="width:100%" />
        </div>
        <div style="text-align:right;margin-top:.5rem">
          <p-button label="Change Password" (onClick)="changePassword()" [loading]="saving.password" />
        </div>
      </div>

    </div>
  `,
})
export class EditProfileComponent implements OnInit {
  avatarOptions = AVATAR_OPTIONS;

  profileForm = { name: '', email: '', bio: '', avatar: '' };
  privacy: PrivacySettings = { share_journeys: false, share_exercise_logs: false, share_status: false };
  passwordForm = { current: '', newPw: '', confirm: '' };
  coaches: CoachRelation[] = [];
  availableCoaches: CoachUser[] = [];
  selectedCoachId: number | '' = '';
  saving = { profile: false, privacy: false, password: false, coach: false };

  private boot!: EditProfileBoot;

  constructor(private http: HttpClient, private msg: MessageService) {}

  ngOnInit(): void {
    this.boot = window.EDIT_PROFILE_BOOT;
    this.profileForm = {
      name:   this.boot.user.name,
      email:  this.boot.user.email,
      bio:    this.boot.user.bio ?? '',
      avatar: this.boot.user.avatar ?? '',
    };
    this.privacy = {
      share_journeys:      !!this.boot.privacy.share_journeys,
      share_exercise_logs: !!this.boot.privacy.share_exercise_logs,
      share_status:        !!this.boot.privacy.share_status,
    };
    this.coaches         = this.boot.coaches;
    this.availableCoaches = this.boot.availableCoaches;
  }

  displayAvatar(): string {
    return this.profileForm.avatar || this.profileForm.name.charAt(0).toUpperCase();
  }

  selectAvatar(emoji: string): void {
    this.profileForm.avatar = emoji;
  }

  saveProfile(): void {
    if (!this.profileForm.name.trim()) { this.error('Name is required.'); return; }
    if (!this.profileForm.email.trim()) { this.error('Email is required.'); return; }
    this.saving.profile = true;
    this.post({ action: 'update_profile', ...this.profileForm }).subscribe({
      next: () => { this.saving.profile = false; this.success('Profile updated.'); },
      error: e => { this.saving.profile = false; this.error(e.message); },
    });
  }

  savePrivacy(): void {
    this.saving.privacy = true;
    this.post({ action: 'save_privacy', ...this.privacy }).subscribe({
      next: () => { this.saving.privacy = false; this.success('Sharing preferences saved.'); },
      error: e => { this.saving.privacy = false; this.error(e.message); },
    });
  }

  inviteCoach(): void {
    if (!this.selectedCoachId) return;
    this.saving.coach = true;
    this.post({ action: 'invite_coach', coach_id: this.selectedCoachId }).subscribe({
      next: (data: any) => {
        this.saving.coach = false;
        this.coaches = data.coaches;
        this.availableCoaches = data.available_coaches;
        this.selectedCoachId = '';
        this.success('Coach invitation sent.');
      },
      error: e => { this.saving.coach = false; this.error(e.message); },
    });
  }

  removeCoach(coachId: number): void {
    this.post({ action: 'remove_coach', coach_id: coachId }).subscribe({
      next: (data: any) => {
        this.coaches = data.coaches;
        this.availableCoaches = data.available_coaches;
        this.success('Coach removed.');
      },
      error: e => this.error(e.message),
    });
  }

  changePassword(): void {
    if (!this.passwordForm.current) { this.error('Current password is required.'); return; }
    if (this.passwordForm.newPw.length < 8) { this.error('New password must be at least 8 characters.'); return; }
    if (this.passwordForm.newPw !== this.passwordForm.confirm) { this.error('Passwords do not match.'); return; }
    this.saving.password = true;
    this.post({ action: 'change_password', current_password: this.passwordForm.current,
                new_password: this.passwordForm.newPw }).subscribe({
      next: () => {
        this.saving.password = false;
        this.passwordForm = { current: '', newPw: '', confirm: '' };
        this.success('Password changed.');
      },
      error: e => { this.saving.password = false; this.error(e.message); },
    });
  }

  private post(body: object) {
    return this.http.post<any>(`user/save.php`, body);
  }

  private success(msg: string): void {
    this.msg.add({ severity: 'success', summary: 'Saved', detail: msg, life: 3000 });
  }
  private error(msg: string): void {
    this.msg.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 });
  }
}
