#!/usr/bin/env node

const targetUrl = process.env.HEALTHCHECK_URL || 'http://127.0.0.1:3000/api/health';
const intervalMs = Number(process.env.HEALTHCHECK_INTERVAL_MS || 60000);
const webhookRaw = process.env.HEALTHCHECK_WEBHOOK_URL || '';
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 5000);

/** Validate that a webhook URL is an external HTTPS endpoint (prevents SSRF). */
function isSafeWebhookUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host) ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) return false;
    return true;
  } catch {
    return false;
  }
}

const webhook = webhookRaw && isSafeWebhookUrl(webhookRaw) ? webhookRaw : '';
if (webhookRaw && !webhook) {
  console.warn('[health-monitor] HEALTHCHECK_WEBHOOK_URL rejected (failed SSRF safety check)');
}

async function notify(payload) {
  if (!webhook) return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
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