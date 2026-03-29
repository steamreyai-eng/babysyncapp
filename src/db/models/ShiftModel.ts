import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class ShiftModel extends Model {
  static table = 'shifts'

  @field('active_parent') active_parent!: string
  @date('started_at') started_at!: Date
  @field('shift_date') shift_date?: string
  @field('assigned_to') assigned_to?: string
}
