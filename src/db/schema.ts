import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 10,
  tables: [
    tableSchema({
      name: 'feedings',
      columns: [
        { name: 'type', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'breast_side', type: 'string', isOptional: true },
        { name: 'duration_seconds', type: 'number', isOptional: true },
        { name: 'left_duration', type: 'number', isOptional: true },
        { name: 'right_duration', type: 'number', isOptional: true },
        { name: 'formula_brand', type: 'string', isOptional: true },
        { name: 'formula_volume_ml', type: 'number', isOptional: true },
        { name: 'formula_temp_c', type: 'number', isOptional: true },
        { name: 'solid_product', type: 'string', isOptional: true },
        { name: 'solid_volume_g', type: 'number', isOptional: true },
        { name: 'solid_reaction', type: 'string', isOptional: true },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'sleeps',
      columns: [
        { name: 'duration_seconds', type: 'number' },
        { name: 'location', type: 'string' },
        { name: 'quality', type: 'number' },
        { name: 'start_time', type: 'string', isOptional: true },
        { name: 'end_time', type: 'string', isOptional: true },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'is_synthetic', type: 'boolean', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'diapers',
      columns: [
        { name: 'type', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'walks',
      columns: [
        { name: 'duration_seconds', type: 'number' },
        { name: 'location', type: 'string' },
        { name: 'weather', type: 'string' },
        { name: 'distance_m', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'is_completed', type: 'boolean' },
        { name: 'due_time', type: 'string', isOptional: true },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'growth_records',
      columns: [
        { name: 'weight_kg', type: 'number', isOptional: true },
        { name: 'height_cm', type: 'number', isOptional: true },
        { name: 'head_cm', type: 'number', isOptional: true },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'medications',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'dose', type: 'string' },
        { name: 'unit', type: 'string', isOptional: true },
        { name: 'frequency', type: 'string', isOptional: true },
        { name: 'time_str', type: 'string' },
        { name: 'start_date', type: 'string', isOptional: true },
        { name: 'end_date', type: 'string', isOptional: true },
        { name: 'prescribing_doctor', type: 'string', isOptional: true },
        { name: 'doctor_visit_id', type: 'string', isOptional: true },
        { name: 'taken', type: 'boolean' },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'vaccinations',
      columns: [
        { name: 'vaccine_name', type: 'string' },
        { name: 'date_given', type: 'string' },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'doctor_visits',
      columns: [
        { name: 'visit_date', type: 'string' },
        { name: 'doctor', type: 'string' },
        { name: 'visit_type', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'has_photo', type: 'boolean' },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'shifts',
      columns: [
        { name: 'active_parent', type: 'string', isOptional: true },
        { name: 'started_at', type: 'number', isOptional: true },
        { name: 'shift_date', type: 'string', isOptional: true },
        { name: 'assigned_to', type: 'string', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'insight_cards',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'insight_title', type: 'string' },
        { name: 'short_text', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'health_logs',
      columns: [
        { name: 'temperature', type: 'number', isOptional: true },
        { name: 'symptoms', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'recorded_by', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'baby_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string', isOptional: true },
        { name: 'is_sick', type: 'boolean', isOptional: true },
      ]
    }),
  ]
})
