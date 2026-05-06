import cron from 'node-cron';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../config/env.js';
import { runDailyGenerator } from './daily-generator.job.js';

export function startDailyGeneratorScheduler(logger: FastifyBaseLogger): void {
  if (!env.DAILY_GENERATOR_ENABLED) {
    logger.info('Daily generator scheduler disabled.');
    return;
  }

  if (!cron.validate(env.DAILY_GENERATOR_CRON)) {
    throw new Error(`Invalid DAILY_GENERATOR_CRON: ${env.DAILY_GENERATOR_CRON}`);
  }

  cron.schedule(
    env.DAILY_GENERATOR_CRON,
    async () => {
      logger.info(
        {
          topic: env.DAILY_GENERATOR_TOPIC,
          count: env.DAILY_GENERATOR_POST_COUNT
        },
        'Running daily generator.'
      );

      try {
        await runDailyGenerator(env.DAILY_GENERATOR_TOPIC, env.DAILY_GENERATOR_POST_COUNT);
        logger.info('Daily generator completed.');
      } catch (error) {
        logger.error(error, 'Daily generator failed.');
      }
    },
    {
      timezone: env.DAILY_GENERATOR_TIMEZONE
    }
  );

  logger.info(
    {
      cron: env.DAILY_GENERATOR_CRON,
      timezone: env.DAILY_GENERATOR_TIMEZONE,
      count: env.DAILY_GENERATOR_POST_COUNT
    },
    'Daily generator scheduler enabled.'
  );
}
