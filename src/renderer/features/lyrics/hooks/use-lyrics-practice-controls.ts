import { useCallback } from 'react';

import {
    deriveLineRegion,
    derivePracticeLoop,
} from '/@/renderer/features/lyrics/api/practice-region';
import { usePlayerActions, usePlayerSong, usePlayerStoreBase } from '/@/renderer/store';
import {
    useLyricsPracticeActions,
    useLyricsPracticeLoop,
    useLyricsPracticeLoopDraft,
} from '/@/renderer/store/lyrics-practice.store';
import { SynchronizedLyrics } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

// View-side handlers for the per-line practice context menu. Region times are
// raw lyric milliseconds, consistent with the existing line click-to-seek;
// enforcement happens in useLyricsPracticePlayback at the player level.
export const useLyricsPracticeControls = (
    lyrics: SynchronizedLyrics,
    handleSeek: (timeSec: number) => void,
) => {
    const currentSong = usePlayerSong();
    const { mediaPlay } = usePlayerActions();
    const loop = useLyricsPracticeLoop();
    const loopDraft = useLyricsPracticeLoopDraft();
    const { clearLoop, setLoop, setLoopDraft, setReplay } = useLyricsPracticeActions();

    // Song.duration is normalized to milliseconds (see navidrome-normalize)
    const songDurationMs = currentSong?.duration ?? undefined;

    const handleReplayLine = useCallback(
        (lineIndex: number) => {
            const region = deriveLineRegion(lyrics, lineIndex, songDurationMs);
            if (!region) {
                return;
            }

            const wasPaused = usePlayerStoreBase.getState().player.status !== PlayerStatus.PLAYING;
            setReplay({ ...region, pauseAtEnd: wasPaused });
            handleSeek(region.startMs / 1000);
            if (wasPaused) {
                mediaPlay();
            }
        },
        [handleSeek, lyrics, mediaPlay, setReplay, songDurationMs],
    );

    const handleSetLoopStart = useCallback(
        (lineIndex: number) => {
            // Re-picking the current A toggles the selection off
            if (loopDraft?.lineIndex === lineIndex || loop?.aIndex === lineIndex) {
                clearLoop();
                return;
            }

            setLoopDraft(lineIndex);
        },
        [clearLoop, loop, loopDraft, setLoopDraft],
    );

    const handleSetLoopEnd = useCallback(
        (lineIndex: number) => {
            // Close a drafted A, retarget an active loop's B, or make a
            // one-line loop when nothing is selected yet
            const anchorIndex = loopDraft?.lineIndex ?? loop?.aIndex ?? lineIndex;
            const nextLoop = derivePracticeLoop(lyrics, anchorIndex, lineIndex, songDurationMs);
            if (nextLoop) {
                setLoop(nextLoop);
            }
        },
        [loop, loopDraft, lyrics, setLoop, songDurationMs],
    );

    const isLineInLoop = useCallback(
        (lineIndex: number) => {
            if (loop) {
                return lineIndex >= loop.aIndex && lineIndex <= loop.bIndex;
            }

            return loopDraft?.lineIndex === lineIndex;
        },
        [loop, loopDraft],
    );

    return { handleReplayLine, handleSetLoopEnd, handleSetLoopStart, isLineInLoop };
};
