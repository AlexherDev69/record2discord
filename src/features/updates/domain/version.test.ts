import { describe, expect, it } from 'vitest';
import { isNewerVersion } from './version';

describe('isNewerVersion', () => {
  it('should be true when the patch, minor or major number is higher', () => {
    expect(isNewerVersion('1.2.10', '1.2.9')).toBe(true);
    expect(isNewerVersion('1.3.0', '1.2.9')).toBe(true);
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
  });

  it('should be false when the version is the same or older', () => {
    expect(isNewerVersion('1.2.9', '1.2.9')).toBe(false);
    expect(isNewerVersion('1.2.8', '1.2.9')).toBe(false);
    expect(isNewerVersion('1.9.9', '2.0.0')).toBe(false);
  });

  it('should accept a release tag when it starts with a v', () => {
    expect(isNewerVersion('v1.3.0', '1.2.9')).toBe(true);
  });

  it('should be false when a version cannot be read', () => {
    expect(isNewerVersion('latest', '1.2.9')).toBe(false);
    expect(isNewerVersion('1.3', '1.2.9')).toBe(false);
  });
});
