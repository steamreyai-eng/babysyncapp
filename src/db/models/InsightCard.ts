import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class InsightCard extends Model {
  static table = 'insight_cards';

  @field('user_id') userId!: string;
  @field('insight_title') insightTitle!: string;
  @field('short_text') shortText!: string;
  @field('type') type!: string; // 'warning' | 'success' | 'info'

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
