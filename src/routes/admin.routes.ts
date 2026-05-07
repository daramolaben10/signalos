import type { FastifyInstance, FastifyRequest } from 'fastify';
import cron from 'node-cron';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getAgentSettings, updateAgentSettings } from '../services/settings.service.js';

const updateSettingsSchema = z.object({
  persona_name: z.string().trim().min(1).max(120),
  persona_description: z.string().trim().min(1).max(2000),
  style_rules: z.string().trim().min(1).max(3000),
  topics: z.array(z.string().trim().min(1).max(100)).min(1).max(30),
  daily_post_count: z.number().int().min(1).max(25),
  schedule_cron: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(80),
  risk_threshold: z.number().min(0).max(1)
}).superRefine((value, ctx) => {
  if (!cron.validate(value.schedule_cron)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['schedule_cron'],
      message: 'Invalid cron expression'
    });
  }
});

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin', async (request, reply) => {
    if (!isAuthorized(request)) {
      return reply.code(401).type('text/html').send(renderUnauthorized());
    }

    return reply.type('text/html').send(renderAdminPage());
  });

  app.get('/admin/settings', async (request, reply) => {
    if (!isAuthorized(request)) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }

    return {
      ok: true,
      settings: await getAgentSettings()
    };
  });

  app.put('/admin/settings', async (request, reply) => {
    if (!isAuthorized(request)) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }

    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid settings',
        details: parsed.error.flatten()
      });
    }

    return {
      ok: true,
      settings: await updateAgentSettings(parsed.data)
    };
  });
}

function isAuthorized(request: FastifyRequest): boolean {
  if (!env.ADMIN_TOKEN) {
    return false;
  }

  const authHeader = request.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
  const query = request.query as { token?: string };

  return headerToken === env.ADMIN_TOKEN || query.token === env.ADMIN_TOKEN;
}

function renderUnauthorized(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SignalOS Admin</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; color: #111; }
    code { background: #f1f3f5; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>SignalOS Admin</h1>
  <p>Unauthorized. Open this page with your admin token:</p>
  <p><code>/admin?token=YOUR_ADMIN_TOKEN</code></p>
</body>
</html>`;
}

function renderAdminPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SignalOS Settings</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f8fa; color: #15171a; }
    main { max-width: 980px; margin: 0 auto; padding: 32px 20px 56px; }
    header { display: flex; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
    p { color: #5b626b; line-height: 1.5; }
    form { display: grid; gap: 18px; }
    section { background: #fff; border: 1px solid #dde1e6; border-radius: 8px; padding: 18px; display: grid; gap: 14px; }
    h2 { margin: 0; font-size: 16px; }
    label { display: grid; gap: 7px; font-size: 13px; font-weight: 650; color: #30363d; }
    input, textarea { width: 100%; box-sizing: border-box; border: 1px solid #c8cdd3; border-radius: 6px; padding: 10px 11px; font: inherit; background: #fff; color: #15171a; }
    textarea { min-height: 112px; resize: vertical; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; position: sticky; bottom: 0; background: linear-gradient(180deg, rgba(247,248,250,0), #f7f8fa 28%); padding-top: 24px; }
    button { border: 1px solid #111; background: #111; color: #fff; border-radius: 6px; padding: 10px 14px; font: inherit; font-weight: 700; cursor: pointer; }
    button.secondary { background: #fff; color: #111; }
    #status { min-height: 22px; font-size: 14px; color: #216e39; }
    .hint { margin: 0; font-size: 12px; color: #6b7280; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } header { display: block; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>SignalOS Settings</h1>
        <p>Shape the agent's voice, interests, daily volume, and schedule. Publishing still requires Telegram approval.</p>
      </div>
      <p id="status"></p>
    </header>

    <form id="settings-form">
      <section>
        <h2>Persona</h2>
        <label>Persona name
          <input name="persona_name" maxlength="120" required />
        </label>
        <label>Persona description
          <textarea name="persona_description" maxlength="2000" required></textarea>
        </label>
        <label>Style rules
          <textarea name="style_rules" maxlength="3000" required></textarea>
        </label>
      </section>

      <section>
        <h2>Interests</h2>
        <label>Topics, one per line
          <textarea name="topics" required></textarea>
        </label>
      </section>

      <section>
        <h2>Cadence</h2>
        <div class="grid">
          <label>Daily drafts
            <input name="daily_post_count" type="number" min="1" max="25" required />
          </label>
          <label>Cron schedule
            <input name="schedule_cron" required />
          </label>
          <label>Timezone
            <input name="timezone" required />
          </label>
        </div>
        <p class="hint">Example: <code>0 9 * * *</code> means every day at 09:00 in the selected timezone.</p>
      </section>

      <section>
        <h2>Safety</h2>
        <label>Risk threshold
          <input name="risk_threshold" type="number" min="0" max="1" step="0.05" required />
        </label>
      </section>

      <div class="actions">
        <button class="secondary" type="button" id="reload">Reload</button>
        <button type="submit">Save Settings</button>
      </div>
    </form>
  </main>

  <script>
    const token = new URLSearchParams(window.location.search).get('token') || window.localStorage.getItem('signalos_admin_token') || '';
    if (token) window.localStorage.setItem('signalos_admin_token', token);
    const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token };
    const form = document.querySelector('#settings-form');
    const statusEl = document.querySelector('#status');

    function setStatus(message, isError = false) {
      statusEl.textContent = message;
      statusEl.style.color = isError ? '#b42318' : '#216e39';
    }

    async function loadSettings() {
      setStatus('Loading...');
      const response = await fetch('/admin/settings', { headers });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not load settings');
      const settings = payload.settings;
      for (const [key, value] of Object.entries(settings)) {
        const field = form.elements.namedItem(key);
        if (!field) continue;
        field.value = Array.isArray(value) ? value.join('\\n') : value;
      }
      setStatus('Loaded');
    }

    function readSettings() {
      return {
        persona_name: form.persona_name.value.trim(),
        persona_description: form.persona_description.value.trim(),
        style_rules: form.style_rules.value.trim(),
        topics: form.topics.value.split('\\n').map((topic) => topic.trim()).filter(Boolean),
        daily_post_count: Number(form.daily_post_count.value),
        schedule_cron: form.schedule_cron.value.trim(),
        timezone: form.timezone.value.trim(),
        risk_threshold: Number(form.risk_threshold.value)
      };
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus('Saving...');
      try {
        const response = await fetch('/admin/settings', {
          method: 'PUT',
          headers,
          body: JSON.stringify(readSettings())
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not save settings');
        setStatus('Saved');
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    document.querySelector('#reload').addEventListener('click', () => {
      loadSettings().catch((error) => setStatus(error.message, true));
    });

    loadSettings().catch((error) => setStatus(error.message, true));
  </script>
</body>
</html>`;
}
