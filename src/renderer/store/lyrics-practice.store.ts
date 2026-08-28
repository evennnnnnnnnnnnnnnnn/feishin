import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { PracticeLoop } from '/@/renderer/features/lyrics/api/practice-region';

export type PracticeReplay = {
    endMs: number;
    // Restore the pre-replay pause at the line end when the replay was
    // started from a paused player; a playing player just keeps going.
    pauseAtEnd: boolean;
    startMs: number;
};

interface LyricsPracticeState {
    clearAll: () => void;
    clearLoop: () => void;
    clearReplay: () => void;
    loop: null | PracticeLoop;
    // A selected but not yet closed loop start (waiting for a B line).
    loopDraft: null | { lineIndex: number };
    replay: null | PracticeReplay;
    setLoop: (loop: PracticeLoop) => void;
    setLoopDraft: (lineIndex: number) => void;
    setReplay: (replay: PracticeReplay) => void;
}

export const useLyricsPracticeStoreBase = createWithEqualityFn<LyricsPracticeState>()(
    subscribeWithSelector((set) => ({
        clearAll: () => set({ loop: null, loopDraft: null, replay: null }),
        clearLoop: () => set({ loop: null, loopDraft: null }),
        clearReplay: () => set({ replay: null }),
        loop: null,
        loopDraft: null,
        replay: null,
        setLoop: (loop) => set({ loop, loopDraft: null }),
        setLoopDraft: (lineIndex) => set({ loop: null, loopDraft: { lineIndex } }),
        setReplay: (replay) => set({ replay }),
    })),
);

export const useLyricsPracticeLoop = () => useLyricsPracticeStoreBase((state) => state.loop);

export const useLyricsPracticeLoopDraft = () =>
    useLyricsPracticeStoreBase((state) => state.loopDraft);

export const useLyricsPracticeActions = () =>
    useLyricsPracticeStoreBase(
        useShallow((state) => ({
            clearAll: state.clearAll,
            clearLoop: state.clearLoop,
            clearReplay: state.clearReplay,
            setLoop: state.setLoop,
            setLoopDraft: state.setLoopDraft,
            setReplay: state.setReplay,
        })),
    );
