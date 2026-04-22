/**
 * shared/api.js — Typed API wrappers for save.php and builder_api.php
 *
 * All components import from here. Raw fetch() never appears in component files.
 * Every function returns the parsed `data` on success or throws an Error with
 * a human-readable message on failure.
 */

const BASE     = document.querySelector('base')?.href ?? window.location.origin + '/';
const SAVE_URL = 'save.php';
const BAPI_URL = 'builder_api.php';

// ── Core helpers ──────────────────────────────────────────────

async function get(url, params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Server error');
  return json.data;
}

async function post(url, body = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Server error');
  return json.data ?? null;
}

// ── Tracker ───────────────────────────────────────────────────

export const api = {
  // Load workout items + existing logs for one plan day
  getDay: (planDayId) =>
    get(SAVE_URL, { action: 'get_day', plan_day_id: planDayId }),

  // Exercise progression history across a plan
  exerciseHistory: (exerciseId, planId) =>
    get(SAVE_URL, { action: 'exercise_history', exercise_id: exerciseId, plan_id: planId }),

  // Media links for an exercise
  exerciseMedia: (exerciseId) =>
    get(SAVE_URL, { action: 'exercise_media', exercise_id: exerciseId }),

  // Mark a day complete / incomplete
  complete: (planDayId, completed, notes = '') =>
    post(SAVE_URL, { action: 'complete', plan_day_id: planDayId, completed, notes }),

  // Skip a day
  skip: (planDayId) =>
    post(SAVE_URL, { action: 'skip', plan_day_id: planDayId }),

  // Unskip a day
  unskip: (planDayId) =>
    post(SAVE_URL, { action: 'unskip', plan_day_id: planDayId }),

  // Log exercise performance
  log: (payload) =>
    post(SAVE_URL, { action: 'log', ...payload }),

  // ── Plan management ──────────────────────────────────────────

  createPlan: (templateId, name, startDate, athleteName = null) =>
    post(SAVE_URL, { action: 'create_plan', template_id: templateId, name, start_date: startDate, athlete_name: athleteName }),

  deletePlan: (planId) =>
    post(SAVE_URL, { action: 'delete_plan', plan_id: planId }),

  // ── Exercise catalog ─────────────────────────────────────────

  listExercises: (category = null, search = null) =>
    get(SAVE_URL, { action: 'exercises_list', ...(category ? { cat: category } : {}), ...(search ? { q: search } : {}) }),

  exerciseDetail: (exerciseId) =>
    get(SAVE_URL, { action: 'exercise_detail', exercise_id: exerciseId }),

  saveExercise: (name, category, unitType, description = null) =>
    post(SAVE_URL, { action: 'save_exercise', name, category, unit_type: unitType, description }),

  updateExercise: (id, fields) =>
    post(SAVE_URL, { action: 'update_exercise', id, ...fields }),

  addMedia: (exerciseId, url, label, type, source) =>
    post(SAVE_URL, { action: 'add_media', exercise_id: exerciseId, url, label, type, source }),

  deleteMedia: (mediaId) =>
    post(SAVE_URL, { action: 'delete_media', id: mediaId }),

  // ── Builder / editor ─────────────────────────────────────────

  builderExercises: (category = null, search = null) =>
    get(BAPI_URL, { action: 'exercises', ...(category ? { cat: category } : {}), ...(search ? { q: search } : {}) }),

  builderWeekDays: (planId, week) =>
    get(BAPI_URL, { action: 'week_days', plan_id: planId, week }),

  templateWeek: (templateId, week) =>
    get(SAVE_URL, { action: 'template_week', template_id: templateId, week }),

  createBuilderPlan: (name, startDate, totalWeeks, description = null, athleteName = null) =>
    post(BAPI_URL, { action: 'create_plan', name, start_date: startDate, total_weeks: totalWeeks, description, athlete_name: athleteName }),

  saveDay: (planId, week, dayOfWeek, isRest, exercises) =>
    post(BAPI_URL, { action: 'save_day', plan_id: planId, week, day_of_week: dayOfWeek, is_rest: isRest ? 1 : 0, exercises }),

  saveTemplateDay: (templateId, week, dayOfWeek, isRest, exercises) =>
    post(SAVE_URL, { action: 'save_template_day', template_id: templateId, week, day_of_week: dayOfWeek, is_rest: isRest ? 1 : 0, exercises }),

  copyWeek: (planId, fromWeek, toWeeks) =>
    post(BAPI_URL, { action: 'copy_week', plan_id: planId, from_week: fromWeek, to_weeks: toWeeks }),

  // ── Publishing ───────────────────────────────────────────────
  publishPlan: (templateId, isPublished) =>
    post(SAVE_URL, { action: 'publish_plan', template_id: templateId, is_published: isPublished }),
};

export default api;
