import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class Sleep extends Model {
  static table = 'sleeps'

  @field('duration_seconds') duration_seconds!: number
  @field('location') location!: string
  @field('quality') quality!: number
  @field('start_time') start_time?: number
  @field('end_time') end_time?: number
  @field('recorded_by') recorded_by!: string
  @field('is_synthetic') is_synthetic?: boolean
  @field('group_id') group_id?: string
  @field('baby_id') baby_id?: string
  @field('user_id') user_id?: string
  @date('created_at') created_at!: number
}
