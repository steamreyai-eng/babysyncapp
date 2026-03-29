import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class Walk extends Model {
  static table = 'walks'

  @field('duration_seconds') duration_seconds!: number
  @field('location') location!: string
  @field('weather') weather!: string
  @field('distance_m') distance_m?: number
  @field('notes') notes?: string
  @field('recorded_by') recorded_by!: string
  @date('created_at') created_at!: number
}
