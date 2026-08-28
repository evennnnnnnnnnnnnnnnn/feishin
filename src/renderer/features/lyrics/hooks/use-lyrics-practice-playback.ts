import isElectron from 'is-electron';
import { useEffect, useRef } from 'react';

import { resolvePracticeTick } from '/@/renderer/features/lyrics/api/practice-region';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import {
    subscribePlayerStatus,
    usePlayerActions,
    usePlayerStoreBase,
    useSettingsStore,
} from '/@/renderer/store';
import { useLyricsPracticeStoreBase } from '/@/renderer/store/lyrics-practice.store';
import { subscribePlayerProgress, useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const utils = isElectron() ? window.api.utils : null;
const mpris = isElectron() && utils?.isLinux() ? window.api.mpris : null;

const PRACTICE_TICK_MS = 100;
// Progress events lag a just-issued seek; ignore boundary hits inside this
// window so a single B crossing cannot fire a seek storm.
const SEEK_SETTLE_MS = 500;

// The single enforcement point for lyrics practice playback (A-B loop and
// one-shot line replay). Mounted once at the player level (AudioPlayers) so
// regions keep working while the lyrics view is closed; song change clears
// all practice state.
export const useLyricsPracticePlayback = () => {
    const { mediaPause, mediaSeekToTimestamp } = usePlayerActions();
    const statusRef = useRef(usePlayerStoreBase.getState().player.status);
    const anchorRef = useRef({
        // eslint-disable-next-line react-hooks/purity
        at: performance.now(),
        timeMs: useTimestampStoreBase.getState().timestamp * 1000,
    });
    const settleUntilRef = useRef(0);

    usePlayerEvents(
        {
            onCurrentSongChange: () => {
                useLyricsPracticeStoreBase.getState().clearAll();
            },
        },
        [],
    );

    useEffect(() => {
        const setAnchor = (timestampSec: number) => {
            anchorRef.current = { at: performance.now(), timeMs: timestampSec * 1000 };
        };

        const unsubscribeProgress = subscribePlayerProgress(({ timestamp }) => {
            setAnchor(timestamp);
        });

        const unsubscribeStatus = subscribePlayerStatus(({ status }) => {
            statusRef.current = status;
            // Re-anchor on resume so wall-clock interpolation does not carry
            // the pause duration into the next tick.
            setAnchor(useTimestampStoreBase.getState().timestamp);
        });

        const seekToSec = (time: number) => {
            const playbackType = useSettingsStore.getState().playback.type;
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
            if (!loop && !replay) {
                return;
            }

            const now = performance.now();
            if (now < settleUntilRef.current) {
                return;
            }

            const speed = usePlayerStoreBase.getState().player.speed || 1;
            const anchor = anchorRef.current;
            const timeMs = anchor.timeMs + (now - anchor.at) * speed;
            const action = resolvePracticeTick(loop, replay, timeMs);

            if (!action) {
                return;
            }

            settleUntilRef.current = now + SEEK_SETTLE_MS;

            if (action.type === 'loop-seek' && loop) {
                anchorRef.current = { at: now, timeMs: loop.startMs };
                seekToSec(loop.startMs / 1000);
                return;
            }

            if (action.type === 'replay-end' && replay) {
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
        };
    }, [mediaPause, mediaSeekToTimestamp]);
};

export const LyricsPracticePlaybackHook = () => {
    useLyricsPracticePlayback();
    return null;
};
