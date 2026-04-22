// ============================================================
//  models/index.ts — TypeScript interfaces matching PHP models
//  and API response shapes. Single source of truth for all
//  data structures used across Angular components.
// ============================================================

// ── Boot data injected by PHP into window ──────────────────────
export interface TrackerBoot {
  planId:       number;
  selectedWeek: number;
  currentWeek:  number;
  totalWeeks:   number;
  phase:        Phase;
  catColors:    Record<string, string>;
  days:         DaySummary[];
}

export interface BuilderBoot {
  planId:     number;
  totalWeeks: number;
  exercises:  Exercise[];
  cats:       Record<string, CategoryConfig>;
  days:       string[];
  units:      Record<string, string>;
}

export interface JourneysBoot {
  templates: Template[];
  plans:     PlanWithProgress[];
}

export interface ExercisesBoot {
  exercises: Exercise[];
  cats:      Record<string, CategoryConfig>;
  isAdmin:   boolean;
}

export interface PlanEditorBoot {
  planId:     number;
  templateId: number;
  totalWeeks: number;
  exercises:  Exercise[];
  cats:       Record<string, CategoryConfig>;
}

export interface AdminBoot {
  currentUserId: number;
  isAdmin:       boolean;
}

// ── Domain models ──────────────────────────────────────────────
export interface Phase {
  f:   number;
  t:   number;
  name:string;
  col: string;
  sh:  string;
}

export interface CategoryConfig {
  label: string;
  color: string;
  icon:  string;
}

export interface DaySummary {
  id:              number;
  day_of_week:     number;
  day_name:        string;
  is_rest:         boolean;
  skipped:         boolean;
  completed:       boolean;
  scheduled_date:  string;
  workout_type_id: number | null;
  wt_name:         string | null;
  type_code:       string | null;
  color:           string;
  is_race:         boolean;
}

export interface PlanDay {
  id:              number;
  plan_id:         number;
  week_number:     number;
  day_of_week:     number;
  day_name:        string;
  workout_type_id: number | null;
  is_rest:         boolean;
  scheduled_date:  string;
  original_date:   string;
  completed:       boolean;
  skipped:         boolean;
  day_notes:       string | null;
  wt_name:         string | null;
  type_code:       string | null;
  color:           string;
}

export interface WorkoutItem {
  item_id:              number;
  item_role:            string;
  planned_sets:         number | null;
  planned_reps:         number | null;
  planned_weight_kg:    number | null;
  planned_distance_km:  number | null;
  planned_duration_min: number | null;
  item_note:            string | null;
  sort_order:           number;
  exercise_id:          number | null;
  exercise_slug:        string | null;
  exercise_name:        string | null;
  category:             string | null;
  unit_type:            string | null;
  // Merged log fields (populated by get_day)
  sets_done:            number | null;
  reps_done:            number | null;
  log_weight:           number | null;
  distance_km:          number | null;
  duration_min:         number | null;
  pace_per_km:          number | null;
  heart_rate_avg:       number | null;
  log_notes:            string | null;
}

export interface Exercise {
  id:        number;
  slug:      string;
  name:      string;
  category:  string;
  unit_type: string;
}

export interface ExerciseMedia {
  id:         number;
  media_type: string;
  source:     string;
  url:        string;
  label:      string;
  sort_order: number;
}

export interface HistoryRow {
  week_number:      number;
  scheduled_date:   string;
  day_of_week:      number;
  eff_sets:         number | null;
  eff_distance:     number | null;
  eff_duration:     number | null;
  planned_sets:     number | null;
  planned_reps:     number | null;
  planned_weight_kg:number | null;
  sets_done:        number | null;
  reps_done:        number | null;
  weight_kg:        number | null;
  distance_km:      number | null;
  duration_min:     number | null;
  pace_per_km:      number | null;
  heart_rate_avg:   number | null;
  notes:            string | null;
}

export interface Template {
  id:          number;
  name:        string;
  description: string | null;
  total_weeks: number;
  day_count:   number;
  wt_count:    number;
  created_at:  string;
}

export interface PlanWithProgress {
  id:              number;
  name:            string;
  start_date:      string;
  athlete_name:    string | null;
  template_name:   string | null;
  total_weeks:     number;
  days_done:       number;
  days_total:      number;
  pct:             number;
  week_summaries:  Record<number, { done: number; total: number }>;
}

export interface BuilderDay {
  plan_day_id:     number;
  day_of_week:     number;
  is_rest:         boolean;
  scheduled_date:  string | null;
  wt_name:         string | null;
  wt_color:        string | null;
  workout_type_id: number | null;
  exercises:       WorkoutItem[];
}

// ── Log payload (sent to save.php) ────────────────────────────
export interface LogPayload {
  plan_day_id:     number;
  workout_item_id: number;
  exercise_id:     number;
  sets?:           string | null;
  reps?:           string | null;
  weight?:         string | null;
  distance?:       string | null;
  duration?:       string | null;
  pace?:           string | null;
  hr?:             string | null;
  notes?:          string | null;
}

// ── Builder exercise row (in memory only) ────────────────────
export interface BuilderExerciseRow {
  exercise_id:          number;
  exercise_name:        string;
  category:             string;
  unit_type:            string;
  planned_sets:         string;
  planned_reps:         string;
  planned_weight_kg:    string;
  planned_duration_min: string;
  item_note:            string;
}

// ── Admin ─────────────────────────────────────────────────────
export interface User {
  id:         number;
  name:       string;
  email:      string;
  role:       string;
  created_at: string;
}
