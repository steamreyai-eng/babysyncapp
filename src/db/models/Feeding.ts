import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export class Feeding extends Model {
  static table = 'feedings'

  @field('type') type!: string
  @field('description') description?: string
  @field('breast_side') breast_side?: string
  @field('duration_seconds') duration_seconds?: number
  @field('left_duration') left_duration?: number
  @field('right_duration') right_duration?: number
  @field('formula_brand') formula_brand?: string
  @field('formula_volume_ml') formula_volume_ml?: number
  @field('formula_temp_c') formula_temp_c?: number
  @field('solid_product') solid_product?: string
  @field('solid_volume_g') solid_volume_g?: number
  @field('solid_reaction') solid_reaction?: string
  @field('recorded_by') recorded_by!: string
  @field('baby_id') baby_id?: string
  @field('user_id') user_id?: string
  @date('created_at') created_at!: number
}
