import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { schema } from './schema'
import { migrations } from './migrations'
import { Feeding } from './models/Feeding'
import { Sleep } from './models/Sleep'
import { Diaper } from './models/Diaper'
import { Walk } from './models/Walk'
import { Task } from './models/Task'
import { GrowthRecord } from './models/GrowthRecord'
import { MedicationModel } from './models/MedicationModel'
import { VaccinationModel } from './models/VaccinationModel'
import { DoctorVisitModel } from './models/DoctorVisitModel'
import { ShiftModel } from './models/ShiftModel'
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId'

// Supabase requires standard UUIDs for primary keys. WatermelonDB locally generates IDs as
// 16-character alphanumeric strings, which Supabase rejects.
// Using setGenerator override to ensure that local creations match Supabase's UUID validation.
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
setGenerator(generateUUID);

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: process.env.NODE_ENV !== 'test',
  onSetUpError: error => {
    console.warn('WMDB setup error', error)
  }
})

export const database = new Database({
  adapter,
  modelClasses: [
    Feeding,
    Sleep,
    Diaper,
    Walk,
    Task,
    GrowthRecord,
    MedicationModel,
    VaccinationModel,
    DoctorVisitModel,
    ShiftModel,
  ],
})
