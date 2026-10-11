import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishClip, sendMessage } from './discordPublisher';

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1/token';
const REFUSED_STATUS = 413;
const RATE_LIMITED_STATUS = 429;

const fetchMock = vi.fn<typeof fetch>();

function sentForm(): FormData {
  const body = fetchMock.mock.calls[0]?.[1]?.body;
  if (!(body instanceof FormData)) {
    throw new Error('No form was sent');
  }
  return body;
}

function temporaryClip(): string {
  const clipPath = join(mkdtempSync(join(tmpdir(), 'record2discord-')), 'goal.discord.mp4');
  writeFileSync(clipPath, 'video');
  return clipPath;
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendMessage', () => {
  it('should post the message to the webhook when called', async () => {
    await sendMessage(WEBHOOK_URL, 'Bonjour');
    expect(fetchMock).toHaveBeenCalledWith(WEBHOOK_URL, expect.objectContaining({ method: 'POST' }));
    expect(sentForm().get('payload_json')).toBe(JSON.stringify({ content: 'Bonjour' }));
  });

  it('should retry once when Discord asks to slow down', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ retry_after: 0.001 }, { status: RATE_LIMITED_STATUS }));
    await sendMessage(WEBHOOK_URL, 'Bonjour');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should give up when Discord is still rate limiting after the retry', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(Response.json({ retry_after: 0.001 }, { status: RATE_LIMITED_STATUS })),
    );
    await expect(sendMessage(WEBHOOK_URL, 'Bonjour')).rejects.toThrow(String(RATE_LIMITED_STATUS));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should give the request a time limit', async () => {
    await sendMessage(WEBHOOK_URL, 'Bonjour');
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('should throw with the status code when Discord refuses the message', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: REFUSED_STATUS }));
    await expect(sendMessage(WEBHOOK_URL, 'Bonjour')).rejects.toThrow(String(REFUSED_STATUS));
  });
});

describe('publishClip', () => {
  it('should attach the clip next to the message when publishing', async () => {
    await publishClip(WEBHOOK_URL, temporaryClip(), 'But !');
    const file = sentForm().get('files[0]');
    expect(sentForm().get('payload_json')).toBe(JSON.stringify({ content: 'But !' }));
    expect(file instanceof File && [file.name, file.type, file.size]).toEqual(['goal.discord.mp4', 'video/mp4', 5]);
  });

  it('should throw when Discord refuses the clip', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: REFUSED_STATUS }));
    await expect(publishClip(WEBHOOK_URL, temporaryClip(), 'But !')).rejects.toThrow(String(REFUSED_STATUS));
  });
});
