import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class Diaper extends Model {
  static table = 'diapers'

  @field('type') type!: string
  @field('color') color?: string
  @field('note') note?: string
  @field('recorded_by') recorded_by!: string
  @field('baby_id') baby_id?: string
  @field('user_id') user_id?: string
  @date('created_at') created_at!: number
}
