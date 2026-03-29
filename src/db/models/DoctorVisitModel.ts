import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class DoctorVisitModel extends Model {
  static table = 'doctor_visits'

  @field('visit_date') visit_date!: string
  @field('doctor') doctor!: string
  @field('visit_type') visit_type!: string
  @field('notes') notes?: string
  @field('has_photo') has_photo!: boolean
  @field('recorded_by') recorded_by!: string
  @date('created_at') created_at!: number
}
