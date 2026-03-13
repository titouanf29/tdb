#!/usr/bin/env node

const targetUrl = process.env.HEALTHCHECK_URL || 'http://127.0.0.1:3000/api/health';
const intervalMs = Number(process.env.HEALTHCHECK_INTERVAL_MS || 60000);
const webhook = process.env.HEALTHCHECK_WEBHOOK_URL || '';
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 5000);

async function notify(payload) {
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[health-monitor] notify_failed', error);
  }
}

async function check() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, { signal: controller.signal });
    const ok = response.ok;
    const payload = {
      ts: new Date().toISOString(),
      url: targetUrl,
      status: response.status,
      ok,
    };

    if (ok) {
      console.info('[health-monitor] ok', payload);
    } else {
      console.error('[health-monitor] failed', payload);
      await notify({ level: 'error', ...payload });
    }
  } catch (error) {
    const payload = {
      ts: new Date().toISOString(),
      url: targetUrl,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown_error',
    };
    console.error('[health-monitor] exception', payload);
    await notify({ level: 'error', ...payload });
  } finally {
    clearTimeout(timeout);
  }
}

void check();
setInterval(() => {
  void check();
}, intervalMs);