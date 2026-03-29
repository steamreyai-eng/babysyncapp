import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class GrowthRecord extends Model {
  static table = 'growth_records'

  @field('weight_kg') weight_kg?: number
  @field('height_cm') height_cm?: number
  @field('head_cm') head_cm?: number
  @field('recorded_by') recorded_by!: string
  @date('created_at') created_at!: number
}
