import { describe, expect, it } from 'vitest';
import { parseFlightLog } from './flight-log';

describe('flight log parser', () => {
  it('normalizes a PX4-style CSV export', () => {
    const parsed = parseFlightLog([
      'timestamp,latitude,longitude,altitude,ground_speed,battery_remaining,satellites',
      '1788537600000,37.7749,-122.4194,12,8.5,94,12',
      '1788537601000,37.7750,-122.4190,18,9.1,93,11',
    ].join('\n'), 'flight.csv', 'PX4_CSV');

    expect(parsed.format).toBe('PX4_CSV');
    expect(parsed.points).toHaveLength(2);
    expect(parsed.points[0]).toMatchObject({ lat: 37.7749, lon: -122.4194, battery: 94 });
    expect(parsed.points[1].metrics).toMatchObject({ altitude: 18, ground_speed_mps: 9.1, gps_satellites: 11 });
  });

  it('handles scaled ArduPilot coordinates and relative microseconds', () => {
    const parsed = parseFlightLog([
      'TimeUS,Lat,Lng,Alt,Volt',
      '0,377749000,-1224194000,10,16.4',
      '1000000,377750000,-1224190000,13,16.2',
    ].join('\n'), 'ardupilot.csv', 'ARDUPILOT_CSV');

    expect(parsed.points[0].lat).toBeCloseTo(37.7749);
    expect(parsed.points[1].lon).toBeCloseTo(-122.419);
    expect(parsed.points[1].ts.getTime() - parsed.points[0].ts.getTime()).toBe(1000);
    expect(parsed.points[0].metrics).toMatchObject({ altitude: 10, voltage: 16.4 });
  });

  it('keeps long-running flight-controller clocks relative after one billion microseconds', () => {
    const parsed = parseFlightLog([
      'TimeUS,Lat,Lng,Alt',
      '1000000000,377749000,-1224194000,10',
      '1001000000,377750000,-1224190000,13',
    ].join('\n'), 'long-flight.csv', 'ARDUPILOT_CSV');

    expect(parsed.points[1].ts.getTime() - parsed.points[0].ts.getTime()).toBe(1000);
    expect(Math.abs(Date.now() - parsed.points[1].ts.getTime())).toBeLessThan(5000);
  });

  it('imports a GPX flight track', () => {
    const parsed = parseFlightLog(`<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="37.1" lon="-122.1"><ele>42</ele><time>2026-09-04T10:00:00Z</time></trkpt>
      <trkpt lat="37.2" lon="-122.2"><ele>57</ele><time>2026-09-04T10:00:10Z</time></trkpt>
    </trkseg></trk></gpx>`, 'flight.gpx');

    expect(parsed.format).toBe('GPX');
    expect(parsed.points).toHaveLength(2);
    expect(parsed.points[1].metrics).toMatchObject({ altitude: 57 });
  });
});
