// ============================================================
//  profile/view-profile.component.ts
// ============================================================
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewProfileBoot, JourneyActivity, ExerciseLogActivity } from '../models';

declare const window: Window & typeof globalThis & { VIEW_PROFILE_BOOT: ViewProfileBoot };

@Component({
  standalone: true,
  selector: 'app-view-profile',
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <p class="page-eyebrow">{{ isSelf ? 'Account' : 'Athlete' }}</p>
        <h1 class="page-title">{{ isSelf ? 'My Public Profile' : boot.target.name }}</h1>
      </div>
    </div>

    <div class="profile-wrap page-body">

      @if (isSelf) {
        <div class="preview-banner">
          <span>👁 <strong>Profile preview</strong> — this is how other users see your profile.</span>
          <a href="edit_profile.php">Edit Profile →</a>
        </div>
      }

      <!-- ── Identity card ── -->
      <div class="profile-card">
        <div class="profile-avatar-lg">{{ displayAvatar() }}</div>
        <div class="profile-meta">
          <h2 class="profile-name">
            {{ boot.target.name }}
            @if (boot.viewerIsCoach) {
              <span class="coach-badge">Your Athlete</span>
            }
          </h2>
          <div class="profile-role">{{ boot.target.role | titlecase }}</div>
          @if (boot.target.bio) {
            <div class="profile-bio">{{ boot.target.bio }}</div>
          }
          <div class="stat-row">
            <div class="stat-chip">
              <div class="stat-chip-value">{{ boot.consecutiveDays }}</div>
              <div class="stat-chip-label">Day Streak</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Current Journeys ── -->
      @if (showJourneys && boot.activity.journeys.length) {
        <div class="profile-section">
          <h2>Current Journeys</h2>
          @for (j of boot.activity.journeys; track j.id) {
            <div class="journey-row">
              <div class="journey-name">{{ j.plan_name }}</div>
              <div class="journey-sub">{{ j.template_name }} · {{ j.total_weeks }} weeks</div>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" [style.width]="pct(j) + '%'"></div>
              </div>
              <div class="journey-sub" style="margin-top:.2rem">
                {{ j.days_done }} / {{ j.days_total }} days · {{ pct(j) }}%
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Recent Activity ── -->
      @if (showLogs && boot.activity.exercise_logs.length) {
        <div class="profile-section">
          <h2>Recent Activity</h2>
          @for (log of boot.activity.exercise_logs; track $index) {
            <div class="activity-row">
              <div>
                <div class="activity-name">{{ log.exercise_name }}</div>
                <div class="activity-date">{{ log.scheduled_date }}</div>
              </div>
              <div class="activity-stats">{{ formatLog(log) }}</div>
            </div>
          }
        </div>
      }

      <!-- ── Empty state ── -->
      @if (!hasVisible) {
        <div class="private-notice">
          @if (isSelf) {
            Your activity is not visible to others yet.
            <a href="edit_profile.php">Update your sharing settings →</a>
          } @else {
            🔒 {{ boot.target.name }} hasn't shared any activity yet.
          }
        </div>
      }

    </div>
  `,
})
export class ViewProfileComponent implements OnInit {
  boot!: ViewProfileBoot;
  isSelf = false;
  showJourneys = false;
  showLogs = false;
  hasVisible = false;

  ngOnInit(): void {
    this.boot     = window.VIEW_PROFILE_BOOT;
    this.isSelf   = this.boot.isSelf;
    this.showJourneys = this.boot.viewerIsCoach || !!this.boot.privacy.share_journeys;
    this.showLogs     = this.boot.viewerIsCoach || !!this.boot.privacy.share_exercise_logs;
    this.hasVisible   =
      (this.showJourneys && this.boot.activity.journeys.length > 0) ||
      (this.showLogs     && this.boot.activity.exercise_logs.length > 0);
  }

  displayAvatar(): string {
    return this.boot.target.avatar || this.boot.target.name.charAt(0).toUpperCase();
  }

  pct(j: JourneyActivity): number {
    return j.days_total > 0 ? Math.round(j.days_done / j.days_total * 100) : 0;
  }

  formatLog(log: ExerciseLogActivity): string {
    const parts: string[] = [];
    if (log.sets_done && log.reps_done) parts.push(`${log.sets_done}×${log.reps_done}`);
    if (log.weight_kg)    parts.push(`${log.weight_kg}kg`);
    if (log.distance_km)  parts.push(`${log.distance_km}km`);
    if (log.duration_min) parts.push(`${log.duration_min}min`);
    return parts.join(' · ');
  }
}
