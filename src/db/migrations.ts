import { createTable, addColumns, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

export const migrations = schemaMigrations({
  migrations: [
    {
      // v2 → v3: Add growth_records, medications, vaccinations, doctor_visits, shifts
      toVersion: 3,
      steps: [
        createTable({
          name: 'growth_records',
          columns: [
            { name: 'weight_kg', type: 'number', isOptional: true },
            { name: 'height_cm', type: 'number', isOptional: true },
            { name: 'head_cm', type: 'number', isOptional: true },
            { name: 'recorded_by', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'medications',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'dose', type: 'string' },
            { name: 'time_str', type: 'string' },
            { name: 'taken', type: 'boolean' },
            { name: 'recorded_by', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'vaccinations',
          columns: [
            { name: 'vaccine_name', type: 'string' },
            { name: 'date_given', type: 'string' },
            { name: 'recorded_by', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'doctor_visits',
          columns: [
            { name: 'visit_date', type: 'string' },
            { name: 'doctor', type: 'string' },
            { name: 'visit_type', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'has_photo', type: 'boolean' },
            { name: 'recorded_by', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'shifts',
          columns: [
            { name: 'active_parent', type: 'string', isOptional: true },
            { name: 'started_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'shifts',
          columns: [
            { name: 'shift_date', type: 'string', isOptional: true },
            { name: 'assigned_to', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v4 → v5: Add updated_at + deleted_at for sync tracking
      toVersion: 5,
      steps: [
        ...['feedings', 'sleeps', 'diapers', 'walks', 'tasks',
            'growth_records', 'medications', 'vaccinations',
            'doctor_visits', 'shifts'].map(table =>
          addColumns({
            table,
            columns: [
              { name: 'updated_at', type: 'number' },
              { name: 'deleted_at', type: 'number', isOptional: true },
            ],
          })
        ),
      ],
    },
  ],
})
