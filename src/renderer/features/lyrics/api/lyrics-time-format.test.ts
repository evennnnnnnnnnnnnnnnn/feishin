import { describe, expect, it } from 'vitest';

import { formatLrcTime, parseLrcTime } from './lyrics-time-format';

describe('formatLrcTime', () => {
    it('formats whole seconds', () => {
        expect(formatLrcTime(0)).toBe('00:00.00');
        expect(formatLrcTime(1000)).toBe('00:01.00');
    });

    it('formats minutes and centiseconds', () => {
        expect(formatLrcTime(61234)).toBe('01:01.23');
    });

    it('rounds to the nearest centisecond', () => {
        expect(formatLrcTime(1236)).toBe('00:01.24');
    });

    it('clamps negative values to zero', () => {
        expect(formatLrcTime(-500)).toBe('00:00.00');
    });

    it('pads minutes over an hour without wrapping', () => {
        expect(formatLrcTime(3661000)).toBe('61:01.00');
    });
});

describe('parseLrcTime', () => {
    it('parses mm:ss.xx', () => {
        expect(parseLrcTime('01:01.23')).toBe(61230);
    });

    it('parses without a fraction', () => {
        expect(parseLrcTime('00:05')).toBe(5000);
    });

    it('accepts a comma decimal separator', () => {
        expect(parseLrcTime('00:05,50')).toBe(5500);
    });

    it('pads a single fractional digit as tenths', () => {
        expect(parseLrcTime('00:05.5')).toBe(5500);
    });

    it('rejects seconds >= 60', () => {
        expect(parseLrcTime('00:60')).toBeNull();
    });

    it('rejects malformed input', () => {
        expect(parseLrcTime('not a time')).toBeNull();
        expect(parseLrcTime('')).toBeNull();
    });

    it('round-trips with formatLrcTime', () => {
        const ms = 125340;
        expect(parseLrcTime(formatLrcTime(ms))).toBe(ms);
    });
});
