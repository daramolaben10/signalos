import { env } from '../config/env.js';
import { supabase } from '../db/supabase.js';

export type AgentSettings = {
  user_id: string;
  persona_name: string;
  persona_description: string;
  style_rules: string;
  topics: string[];
  daily_post_count: number;
  schedule_cron: string;
  timezone: string;
  risk_threshold: number;
  updated_at: string;
};

export type UpdateAgentSettingsInput = Partial<
  Pick<
    AgentSettings,
    | 'persona_name'
    | 'persona_description'
    | 'style_rules'
    | 'topics'
    | 'daily_post_count'
    | 'schedule_cron'
    | 'timezone'
    | 'risk_threshold'
  >
>;

const defaultSettings = {
  persona_name: 'Sharp Systems Thinker',
  persona_description:
    'Compressed, high-signal, philosophical, direct. Inspired by Naval Ravikant and Marc Andreessen, but do not imitate them directly.',
  style_rules:
    'No emojis. No hashtags. No fluff. No generic motivation. No marketing-only posts. Each post must be under 280 characters. Each post must contain a non-obvious insight.',
  topics: [
    'leverage',
    'incentives',
    'wealth',
    'power',
    'technology',
    'systems',
    'decision-making',
    'capital',
    'human behaviour'
  ],
  daily_post_count: 10,
  schedule_cron: '0 9 * * *',
  timezone: 'Europe/London',
  risk_threshold: 0.7
};

export async function getAgentSettings(): Promise<AgentSettings> {
  const { data, error } = await supabase
    .from('agent_settings')
    .select()
    .eq('user_id', env.DEFAULT_USER_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load agent settings: ${error.message}`);
  }

  if (data) {
    return normalizeSettings(data);
  }

  return createDefaultSettings();
}

export async function updateAgentSettings(input: UpdateAgentSettingsInput): Promise<AgentSettings> {
  const { data, error } = await supabase
    .from('agent_settings')
    .upsert({
      user_id: env.DEFAULT_USER_ID,
      ...input,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Could not update agent settings: ${error.message}`);
  }

  return normalizeSettings(data);
}

async function createDefaultSettings(): Promise<AgentSettings> {
  const { data, error } = await supabase
    .from('agent_settings')
    .insert({
      user_id: env.DEFAULT_USER_ID,
      ...defaultSettings
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Could not create default agent settings: ${error.message}`);
  }

  return normalizeSettings(data);
}

function normalizeSettings(data: Record<string, unknown>): AgentSettings {
  return {
    user_id: String(data.user_id),
    persona_name: String(data.persona_name),
    persona_description: String(data.persona_description),
    style_rules: String(data.style_rules),
    topics: Array.isArray(data.topics) ? data.topics.map(String) : defaultSettings.topics,
    daily_post_count: Number(data.daily_post_count),
    schedule_cron: String(data.schedule_cron),
    timezone: String(data.timezone),
    risk_threshold: Number(data.risk_threshold),
    updated_at: String(data.updated_at)
  };
}
