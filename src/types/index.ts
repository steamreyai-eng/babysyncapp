// ── All entity types matching web app (AppStateContext) ──

export interface BabyProfile {
  id: string;
  name: string;
  birthdate: string;
  mom_name: string;
  dad_name: string;
  gender?: 'boy' | 'girl';
  country?: string;
  city?: string;
}

export interface ShiftRecord {
  id: string;
  active_parent: 'mom' | 'dad';
  started_at: string;
}

export interface Feeding {
  id: string;
  type: 'breast' | 'formula' | 'solid';
  description?: string;
  breast_side?: string;
  duration_seconds?: number;
  left_duration?: number;
  right_duration?: number;
  formula_brand?: string;
  formula_volume_ml?: number;
  formula_temp_c?: number;
  solid_product?: string;
  solid_volume_g?: number;
  solid_reaction?: string;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface Sleep {
  id: string;
  duration_seconds: number;
  location: string;
  quality: number;
  start_time?: string;
  end_time?: string;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface Diaper {
  id: string;
  type: 'wet' | 'dirty' | 'both';
  color?: string;
  note?: string;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface GrowthRecord {
  id: string;
  weight_kg?: number;
  height_cm?: number;
  head_cm?: number;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  time_str: string;
  taken: boolean;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface Vaccination {
  id: string;
  vaccine_name: string;
  date_given: string;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface Walk {
  id: string;
  duration_seconds: number;
  location: string;
  weather: string;
  distance_m?: number;
  notes?: string;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface DoctorVisit {
  id: string;
  visit_date: string;
  doctor: string;
  visit_type: string;
  notes?: string;
  has_photo: boolean;
  recorded_by: 'mom' | 'dad';
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  recorded_by: 'mom' | 'dad';
  due_time?: string;
  created_at: string;
}
