import { generateDraftsForApproval } from '../services/post.service.js';

export async function runDailyGenerator(
  topic = 'evergreen systems, incentives, and technology',
  count = 10
): Promise<void> {
  await generateDraftsForApproval(topic, count);
}
