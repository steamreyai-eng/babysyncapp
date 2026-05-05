import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class HealthLogModel extends Model {
  static table = 'health_logs'

  @field('temperature') temperature?: number
  @field('symptoms') symptoms?: string
  @field('notes') notes?: string
  @field('recorded_by') recorded_by!: string
  @field('baby_id') baby_id?: string
  @field('user_id') user_id?: string
  @field('is_sick') isSick!: boolean
  @date('created_at') created_at!: number
  @date('updated_at') updated_at!: number
  @date('deleted_at') deleted_at?: number
}
