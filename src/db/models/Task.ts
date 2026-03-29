import { Model } from '@nozbe/watermelondb'
import { field, date, readonly } from '@nozbe/watermelondb/decorators'

export class Task extends Model {
  static table = 'tasks'

  @field('title') title!: string
  @field('is_completed') is_completed!: boolean
  @field('due_time') due_time!: string | null
  @field('recorded_by') recorded_by!: string

  @readonly @date('created_at') createdAt!: Date
}
