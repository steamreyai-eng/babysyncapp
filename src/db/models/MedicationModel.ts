import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class MedicationModel extends Model {
  static table = 'medications'

  @field('name') name!: string
  @field('dose') dose!: string
  @field('unit') unit?: string
  @field('frequency') frequency?: string
  @field('time_str') time_str!: string
  @field('start_date') start_date?: string
  @field('end_date') end_date?: string
  @field('prescribing_doctor') prescribing_doctor?: string
  @field('doctor_visit_id') doctor_visit_id?: string
  @field('taken') taken!: boolean
  @field('recorded_by') recorded_by!: string
  @field('baby_id') baby_id?: string
  @field('user_id') user_id?: string
  @date('created_at') created_at!: number
}
