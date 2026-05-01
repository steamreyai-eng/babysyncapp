import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class GrowthRecord extends Model {
  static table = 'growth_records'

  @field('weight_kg') weight_kg?: number
  @field('height_cm') height_cm?: number
  @field('head_cm') head_cm?: number
  @field('recorded_by') recorded_by!: string
  @field('baby_id') baby_id?: string
  @field('user_id') user_id?: string
  @date('created_at') created_at!: number
}
