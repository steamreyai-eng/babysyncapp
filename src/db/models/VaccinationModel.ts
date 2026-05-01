import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class VaccinationModel extends Model {
  static table = 'vaccinations'

  @field('vaccine_name') vaccine_name!: string
  @field('date_given') date_given!: string
  @field('recorded_by') recorded_by!: string
  @field('baby_id') baby_id?: string
  @field('user_id') user_id?: string
  @date('created_at') created_at!: number
}
