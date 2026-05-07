import { generateDraftsForApproval } from '../services/post.service.js';
import { getAgentSettings } from '../services/settings.service.js';

export async function runDailyGenerator(
  topic?: string,
  count?: number
): Promise<void> {
  const settings = await getAgentSettings();
  await generateDraftsForApproval(
    topic ?? settings.topics.join(', '),
    count ?? settings.daily_post_count
  );
}
