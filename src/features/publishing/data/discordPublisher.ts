import { openAsBlob } from 'node:fs';
import { basename } from 'node:path';

async function postToWebhook(webhookUrl: string, body: FormData): Promise<void> {
  const response = await fetch(webhookUrl, { method: 'POST', body });
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
