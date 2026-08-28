import isElectron from 'is-electron';
import { useEffect, useRef } from 'react';

import {
    interpolateAnchorMs,
    loopSettleMs,
    resolvePracticeTick,
} from '/@/renderer/features/lyrics/api/practice-region';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import {
    subscribePlayerSpeed,
    subscribePlayerStatus,
    usePlayerActions,
    usePlayerStoreBase,
    useSettingsStore,
} from '/@/renderer/store';
import {
    PracticeReplay,
    useLyricsPracticeStoreBase,
} from '/@/renderer/store/lyrics-practice.store';
import { subscribePlayerProgress, useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const utils = isElectron() ? window.api.utils : null;
const mpris = isElectron() && utils?.isLinux() ? window.api.mpris : null;

const PRACTICE_TICK_MS = 100;

// The single enforcement point for lyrics practice playback (A-B loop and
// one-shot line replay). Mounted once at the player level (AudioPlayers) so
// regions keep working while the lyrics view is closed; song change clears
// all practice state.
export const useLyricsPracticePlayback = () => {
    const { mediaPause, mediaSeekToTimestamp } = usePlayerActions();
    const statusRef = useRef(usePlayerStoreBase.getState().player.status);
    const speedRef = useRef(usePlayerStoreBase.getState().player.speed || 1);
    const anchorRef = useRef({
        // eslint-disable-next-line react-hooks/purity
        at: performance.now(),
        timeMs: useTimestampStoreBase.getState().timestamp * 1000,
    });
    const settleUntilRef = useRef(0);
    const lastReplayRef = useRef<null | PracticeReplay>(null);

    usePlayerEvents(
        {
            onCurrentSongChange: () => {
                useLyricsPracticeStoreBase.getState().clearAll();
            },
        },
        [],
    );

    useEffect(() => {
        const setAnchor = (timeMs: number) => {
            anchorRef.current = { at: performance.now(), timeMs };
        };

        const unsubscribeProgress = subscribePlayerProgress(({ timestamp }) => {
            // Inside the settle window the anchor was just set from a known
            // seek target; a progress event here may still carry the pre-seek
            // position (mpv polls the timestamp), so keep the seeked anchor.
            if (performance.now() < settleUntilRef.current) {
                return;
            }
            setAnchor(timestamp * 1000);
        });

        const unsubscribeStatus = subscribePlayerStatus(({ status }) => {
            statusRef.current = status;
            // Re-anchor on resume so wall-clock interpolation does not carry
            // the pause duration into the next tick.
            setAnchor(useTimestampStoreBase.getState().timestamp * 1000);
        });

        const unsubscribeSpeed = subscribePlayerSpeed(({ speed }) => {
            // Bank the elapsed time at the OLD rate before switching, so a
            // rate change is never applied retroactively to past wall time.
            setAnchor(interpolateAnchorMs(anchorRef.current, performance.now(), speedRef.current));
            speedRef.current = speed || 1;
        });

        const seekToSec = (time: number, playbackType: PlayerType) => {
            if (playbackType === PlayerType.LOCAL && mpvPlayer) {
                mpvPlayer.seekTo(time);
            } else {
                mpris?.updateSeek(time);
                mediaSeekToTimestamp(time);
            }
        };

        const interval = setInterval(() => {
            if (statusRef.current !== PlayerStatus.PLAYING) {
                return;
            }

            const { clearReplay, loop, replay } = useLyricsPracticeStoreBase.getState();
            if (replay !== lastReplayRef.current) {
                // A replay was just started (or replaced): trust its start
                // over any stale anchor. On the mpv path the seek does not
                // touch the timestamp store, so without this the previous
                // (later) position would end the replay instantly.
                lastReplayRef.current = replay;
                if (replay) {
                    const now = performance.now();
                    anchorRef.current = { at: now, timeMs: replay.startMs };
                    settleUntilRef.current = now + loopSettleMs(replay);
                }
                return;
            }

            if (!loop && !replay) {
                return;
            }

            const now = performance.now();
            if (now < settleUntilRef.current) {
                return;
            }

            const playbackType = useSettingsStore.getState().playback.type;
            // Jukebox playback ignores player.speed entirely; interpolate at
            // the real (1x) rate there.
            const speed = playbackType === PlayerType.JUKEBOX ? 1 : speedRef.current;
            const timeMs = interpolateAnchorMs(anchorRef.current, now, speed);
            const action = resolvePracticeTick(loop, replay, timeMs);

            if (!action) {
                return;
            }

            if (action.type === 'loop-seek' && loop) {
                settleUntilRef.current = now + loopSettleMs(loop);
                anchorRef.current = { at: now, timeMs: loop.startMs };
                seekToSec(loop.startMs / 1000, playbackType);
                return;
            }

            if (action.type === 'replay-end' && replay) {
                lastReplayRef.current = null;
                clearReplay();
                if (replay.pauseAtEnd) {
                    mediaPause();
                }
            }
        }, PRACTICE_TICK_MS);

        return () => {
            clearInterval(interval);
            unsubscribeProgress();
            unsubscribeStatus();
            unsubscribeSpeed();
        };
    }, [mediaPause, mediaSeekToTimestamp]);
};

export const LyricsPracticePlaybackHook = () => {
    useLyricsPracticePlayback();
    return null;
};
