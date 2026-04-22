// ============================================================
//  services/api.service.ts
//  Single injectable that wraps every save.php and
//  builder_api.php endpoint. Components never call fetch()
//  directly — they inject ApiService.
// ============================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PlanDay, WorkoutItem, HistoryRow, ExerciseMedia,
  Exercise, LogPayload, BuilderDay, PlanWithProgress,
  Template, User,
} from '../models';

interface ApiResponse<T> {
  success: boolean;
  data:    T;
  error?:  string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private saveUrl    = 'save.php';
  private builderUrl = 'builder_api.php';

  constructor(private http: HttpClient) {}

  // ── helpers ────────────────────────────────────────────────

  private get<T>(url: string, params: Record<string, string | number>): Observable<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) p = p.set(k, String(v));
    return this.http.get<ApiResponse<T>>(url, { params: p }).pipe(
      map(r => { if (!r.success) throw new Error(r.error ?? 'Server error'); return r.data; }),
      catchError(e => throwError(() => e))
    );
  }

  private post<T>(url: string, body: object): Observable<T> {
    return this.http.post<ApiResponse<T>>(url, body).pipe(
      map(r => { if (!r.success) throw new Error(r.error ?? 'Server error'); return r.data; }),
      catchError(e => throwError(() => e))
    );
  }

  // ── Tracker ────────────────────────────────────────────────

  getDay(planDayId: number): Observable<{ plan_day: PlanDay; items: WorkoutItem[] }> {
    return this.get(this.saveUrl, { action: 'get_day', plan_day_id: planDayId });
  }

  exerciseHistory(exerciseId: number, planId: number): Observable<{ exercise: Exercise; history: HistoryRow[] }> {
    return this.get(this.saveUrl, { action: 'exercise_history', exercise_id: exerciseId, plan_id: planId });
  }

  exerciseMedia(exerciseId: number): Observable<{ exercise: Exercise; media: ExerciseMedia[] }> {
    return this.get(this.saveUrl, { action: 'exercise_media', exercise_id: exerciseId });
  }

  log(payload: LogPayload): Observable<null> {
    return this.post(this.saveUrl, { action: 'log', ...payload });
  }

  complete(planDayId: number, completed: boolean, notes: string = ''): Observable<null> {
    return this.post(this.saveUrl, { action: 'complete', plan_day_id: planDayId, completed, notes });
  }

  skip(planDayId: number): Observable<null> {
    return this.post(this.saveUrl, { action: 'skip', plan_day_id: planDayId });
  }

  unskip(planDayId: number): Observable<null> {
    return this.post(this.saveUrl, { action: 'unskip', plan_day_id: planDayId });
  }

  // ── Plans / Journeys ───────────────────────────────────────

  createPlan(templateId: number, name: string, startDate: string, athleteName?: string): Observable<{ plan_id: number }> {
    return this.post(this.saveUrl, {
      action: 'create_plan', template_id: templateId,
      name, start_date: startDate, athlete_name: athleteName ?? null,
    });
  }

  deletePlan(planId: number): Observable<null> {
    return this.post(this.saveUrl, { action: 'delete_plan', plan_id: planId });
  }

  // ── Exercise catalog ────────────────────────────────────────

  listExercises(category?: string, search?: string): Observable<Exercise[]> {
    const params: Record<string, string> = { action: 'exercises_list' };
    if (category) params['cat'] = category;
    if (search)   params['q']   = search;
    return this.get(this.saveUrl, params);
  }

  createExercise(name: string, category: string, unitType: string, description: string): Observable<Exercise> {
    return this.post(this.saveUrl, { action: 'create_exercise', name, category, unit_type: unitType, description });
  }

  updateExercise(id: number, name: string, category: string, unitType: string, description: string): Observable<Exercise> {
    return this.post(this.saveUrl, { action: 'update_exercise', id, name, category, unit_type: unitType, description });
  }

  addMedia(exerciseId: number, mediaType: string, source: string, url: string, label: string): Observable<{ id: number }> {
    return this.post(this.saveUrl, { action: 'add_media', exercise_id: exerciseId, media_type: mediaType, source, url, label });
  }

  updateMedia(id: number, url: string, label: string): Observable<null> {
    return this.post(this.saveUrl, { action: 'update_media', media_id: id, url, label });
  }

  deleteMedia(id: number): Observable<null> {
    return this.post(this.saveUrl, { action: 'delete_media', media_id: id });
  }

  // ── Builder ────────────────────────────────────────────────

  builderWeekDays(planId: number, week: number): Observable<BuilderDay[]> {
    return this.get(this.builderUrl, { action: 'week_days', plan_id: planId, week });
  }

  createCustomPlan(name: string, startDate: string, totalWeeks: number,
                   description?: string, athleteName?: string): Observable<{ plan_id: number; template_id: number }> {
    return this.post(this.builderUrl, {
      action: 'create_plan', name, start_date: startDate,
      total_weeks: totalWeeks, description: description ?? null, athlete_name: athleteName ?? null,
    });
  }

  saveBuilderExercise(name: string, category: string, unitType: string): Observable<Exercise> {
    return this.post(this.builderUrl, { action: 'save_exercise', name, category, unit_type: unitType });
  }

  saveBuilderDay(planId: number, week: number, dayOfWeek: number, isRest: boolean,
                 exercises: object[]): Observable<{ workout_type_id: number | null }> {
    return this.post(this.builderUrl, {
      action: 'save_day', plan_id: planId, week, day_of_week: dayOfWeek,
      is_rest: isRest ? 1 : 0, exercises,
    });
  }

  copyBuilderWeek(planId: number, fromWeek: number, toWeeks: number[]): Observable<{ copied_to: number }> {
    return this.post(this.builderUrl, { action: 'copy_week', plan_id: planId, from_week: fromWeek, to_weeks: toWeeks });
  }

  builderExercises(category?: string, search?: string): Observable<Exercise[]> {
    const params: Record<string, string> = { action: 'exercises' };
    if (category) params['cat'] = category;
    if (search)   params['q']   = search;
    return this.get(this.builderUrl, params);
  }

  // ── Template / Plan editor ─────────────────────────────────

  getTemplateWeek(templateId: number, week: number): Observable<BuilderDay[]> {
    return this.get(this.saveUrl, { action: 'template_week', template_id: templateId, week });
  }

  saveTemplateDay(templateId: number, week: number, dayOfWeek: number,
                  workoutTypeId: number | null, isRest: boolean): Observable<null> {
    return this.post(this.saveUrl, {
      action: 'save_template_day', template_id: templateId,
      week, day_of_week: dayOfWeek, workout_type_id: workoutTypeId, is_rest: isRest ? 1 : 0,
    });
  }

  // ── Admin ─────────────────────────────────────────────────

  adminListUsers(): Observable<User[]> {
    // Users come from ADMIN_BOOT — this method kept for interface compatibility
    return this.get('admin/save.php', { action: 'list_users' });
  }

  adminCreateUser(name: string, email: string, password: string, role: string): Observable<User> {
    return this.post('admin/save.php', { action: 'add_user', name, email, password, role });
  }

  adminUpdateUser(id: number, name: string, email: string, role: string, password?: string): Observable<null> {
    // Update role first, then password if provided
    return this.post('admin/save.php', { action: 'set_role', user_id: id, role });
  }

  adminSetPassword(id: number, password: string): Observable<null> {
    return this.post('admin/save.php', { action: 'reset_password', user_id: id, password });
  }

  adminDeleteUser(id: number): Observable<null> {
    return this.post('admin/save.php', { action: 'set_active', user_id: id, is_active: false });
  }
}
