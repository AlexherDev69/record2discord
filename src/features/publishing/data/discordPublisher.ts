import { openAsBlob } from 'node:fs';
import { basename } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { DISCORD_MAX_RETRY_DELAY_MS, DISCORD_UPLOAD_TIMEOUT_MS } from '../../../core/config';

const RATE_LIMITED_STATUS = 429;
const DEFAULT_RETRY_DELAY_MS = 1000;
const MS_PER_SECOND = 1000;

/** Delay asked by Discord before retrying a rate-limited request. */
async function retryDelayMs(response: Response): Promise<number> {
  const body: unknown = await response.json().catch(() => null);
  const hasDelay = typeof body === 'object' && body !== null && 'retry_after' in body;
  const delayMs = hasDelay && typeof body.retry_after === 'number' ? body.retry_after * MS_PER_SECOND : DEFAULT_RETRY_DELAY_MS;
  return Math.min(delayMs, DISCORD_MAX_RETRY_DELAY_MS);
}

/** Posts the form, retrying once when Discord asks to slow down. */
async function postToWebhook(webhookUrl: string, form: FormData, canRetry = true): Promise<void> {
  const signal = AbortSignal.timeout(DISCORD_UPLOAD_TIMEOUT_MS);
  const response = await fetch(webhookUrl, { method: 'POST', body: form, signal });
  if (response.status === RATE_LIMITED_STATUS && canRetry) {
    await sleep(await retryDelayMs(response));
    return postToWebhook(webhookUrl, form, false);
  }
  if (!response.ok) {
    throw new Error(`Discord a refusé l'envoi (code ${response.status})`);
  }
}

export async function sendMessage(webhookUrl: string, message: string): Promise<void> {
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content: message }));
  await postToWebhook(webhookUrl, form);
}

export async function publishClip(webhookUrl: string, clipPath: string, message: string): Promise<void> {
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ content: message }));
  form.append('files[0]', await openAsBlob(clipPath, { type: 'video/mp4' }), basename(clipPath));
  await postToWebhook(webhookUrl, form);
}
