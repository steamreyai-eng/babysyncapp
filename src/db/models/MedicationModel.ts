import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class MedicationModel extends Model {
  static table = 'medications'

  @field('name') name!: string
  @field('dose') dose!: string
  @field('time_str') time_str!: string
  @field('taken') taken!: boolean
  @field('recorded_by') recorded_by!: string
  @date('created_at') created_at!: number
}
