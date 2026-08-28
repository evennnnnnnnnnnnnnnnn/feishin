import isElectron from 'is-electron';
import { useCallback } from 'react';

import { usePlaybackType, usePlayerActions } from '/@/renderer/store';
import { PlayerType } from '/@/shared/types/types';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const utils = isElectron() ? window.api.utils : null;
const mpris = isElectron() && utils?.isLinux() ? window.api.mpris : null;

/**
 * Seek the player to `time` seconds.
 *
 * The local (mpv) backend seeks through its own bridge; every other backend
 * goes through the player store, with mpris told separately so the desktop
 * position indicator does not drift. Shared by the synchronized lyrics view's
 * click-to-seek and the lyric sync modal's wind-back.
 */
export const useLyricsSeek = () => {
    const playbackType = usePlaybackType();
    const { mediaSeekToTimestamp } = usePlayerActions();

    return useCallback(
        (time: number) => {
            if (playbackType === PlayerType.LOCAL && mpvPlayer) {
                mpvPlayer.seekTo(time);
            } else {
                mpris?.updateSeek(time);
                mediaSeekToTimestamp(time);
            }
        },
        [mediaSeekToTimestamp, playbackType],
    );
};
