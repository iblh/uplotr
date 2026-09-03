import { describe, expect, it } from 'vitest';
import {
  RequestValidationError,
  optionalFiniteNumber,
  parseEventTime,
  readJsonBody,
  validateCoordinates,
  validateBattery,
  validateDeviceId,
} from './request-validation';

describe('ingest request validation', () => {
  it('accepts boundary coordinates and Unix seconds', () => {
    expect(validateCoordinates(-90, 180)).toEqual({ lat: -90, lon: 180 });
    expect(parseEventTime(1_700_000_000).toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });

  it.each([
    [91, 0],
    [-91, 0],
    [0, 181],
    [0, -181],
    ['NaN', 0],
  ])('rejects invalid coordinates (%s, %s)', (lat, lon) => {
    expect(() => validateCoordinates(lat, lon)).toThrow(RequestValidationError);
  });

  it('rejects invalid device identifiers and numeric values', () => {
    expect(() => validateDeviceId('')).toThrow(/device_id/);
    expect(() => validateDeviceId('x'.repeat(129))).toThrow(/device_id/);
    expect(() => optionalFiniteNumber(Infinity, 'battery')).toThrow(/finite/);
    expect(() => validateBattery(101)).toThrow(/between 0 and 100/);
    expect(() => parseEventTime('2099-01-01T00:00:00Z')).toThrow(/supported range/);
  });

  it('rejects oversized and malformed JSON bodies with stable status codes', async () => {
    const oversized = new Request('https://uplotr.test/api/v1/ingest', {
      method: 'POST',
      body: JSON.stringify({ data: 'x'.repeat(64) }),
    });
    await expect(readJsonBody(oversized, 32)).rejects.toMatchObject({ status: 413 });

    const malformed = new Request('https://uplotr.test/api/v1/ingest', {
      method: 'POST',
      body: '{broken',
    });
    await expect(readJsonBody(malformed)).rejects.toMatchObject({ status: 400 });
  });
});
