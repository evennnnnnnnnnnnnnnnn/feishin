// mm:ss.xx (centisecond) LRC time formatting, ported from Museeks'
// lib/lyrics-utils.ts (formatLrcTime/parseLrcTime) but operating on
// milliseconds to match SynchronizedLyricLine.startMs.

const CENTISECOND_MS = 10;
const CENTISECONDS_PER_SECOND = 100;
const CENTISECONDS_PER_MINUTE = 6000;

export const formatLrcTime = (ms: number): string => {
    const totalCentiseconds = Math.round(Math.max(0, ms) / CENTISECOND_MS);
    const minutes = Math.floor(totalCentiseconds / CENTISECONDS_PER_MINUTE);
    const seconds = Math.floor(
        (totalCentiseconds % CENTISECONDS_PER_MINUTE) / CENTISECONDS_PER_SECOND,
    );
    const centiseconds = totalCentiseconds % CENTISECONDS_PER_SECOND;

    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const xx = String(centiseconds).padStart(2, '0');

    return `${mm}:${ss}.${xx}`;
};

const LRC_TIME_INPUT = /^(\d{1,3}):(\d{1,2})(?:[.,:](\d{1,3}))?$/;

export const parseLrcTime = (input: string): null | number => {
    const match = input.trim().match(LRC_TIME_INPUT);

    if (match === null) {
        return null;
    }

    const minutes = Number(match[1]);
    const seconds = Number(match[2]);

    if (seconds >= 60) {
        return null;
    }

    const fraction = match[3] != null ? Number(`0.${match[3].padEnd(3, '0')}`) : 0;

    return (minutes * 60 + seconds) * 1000 + Math.round(fraction * 1000);
};
