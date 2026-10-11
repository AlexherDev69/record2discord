import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LATEST_RELEASE_API_URL } from '../../../core/config';
import { findNewerRelease } from './releaseChecker';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('findNewerRelease', () => {
  it('should return the version when a newer release is published', async () => {
    fetchMock.mockResolvedValue(Response.json({ tag_name: 'v1.3.0' }));
    expect(await findNewerRelease('1.2.9')).toBe('1.3.0');
    expect(fetchMock).toHaveBeenCalledWith(LATEST_RELEASE_API_URL, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('should return null when the running version is the latest', async () => {
    fetchMock.mockResolvedValue(Response.json({ tag_name: 'v1.2.9' }));
    expect(await findNewerRelease('1.2.9')).toBeNull();
  });

  it('should return null when no release is published yet', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    expect(await findNewerRelease('1.2.9')).toBeNull();
  });

  it('should throw when GitHub refuses the request', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    await expect(findNewerRelease('1.2.9')).rejects.toThrow('403');
  });

  it('should throw when the answer is not a release', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'unexpected' }));
    await expect(findNewerRelease('1.2.9')).rejects.toThrow();
  });
});
