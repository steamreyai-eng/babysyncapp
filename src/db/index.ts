import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { Platform } from 'react-native'

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
import { InsightCard } from './models/InsightCard'
import { HealthLogModel } from './models/HealthLogModel'
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId'
import * as Crypto from 'expo-crypto';

// Supabase requires standard UUIDs for primary keys. WatermelonDB locally generates IDs as
// 16-character alphanumeric strings, which Supabase rejects.
// Using cryptographically secure randomness via expo-crypto for UUID v4 generation.
export function generateUUID() {
  const bytes = Crypto.getRandomBytes(16);
  // Set version (4) and variant (10xx) bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
setGenerator(generateUUID);

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: Platform.OS === 'ios' && process.env.NODE_ENV !== 'test',
  onSetUpError: error => {
    if (__DEV__) console.warn('WMDB setup error', error)
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
    InsightCard,
    HealthLogModel,
  ],
})
