import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '/@/renderer/api';
import {
    MusicCard,
    MusicCardSnippet,
    snippetHasAudio,
} from '/@/renderer/features/music-cards/api/music-card-model';
import { useSnippetClipUrl } from '/@/renderer/features/music-cards/hooks/use-snippet-clip-url';
import { convertToLogVolume } from '/@/renderer/features/player/audio-player/utils/player-utils';
import { usePlayerMuted, usePlayerVolume } from '/@/renderer/store';
import { toast } from '/@/shared/components/toast/toast';

export type SnippetPlayback = {
    /** Snippet currently sounding, or undefined when nothing is playing. */
    playingSnippetId: string | undefined;
    stopReplay: () => void;
    /** Play the snippet, or stop it when it is the one already sounding. */
    toggleReplay: (card: MusicCard, snippet: MusicCardSnippet) => void;
};

/** Delay before falling back to stream playback, giving the local clip a chance to load. */
const CLIP_WAIT_MS = 400;
const FADE_S = 0.25;

/**
 * Replay of a music card's audio snippet, preferring the locally stored clip
 * and falling back to a seek-and-stop window on the song stream.
 *
 * Shared by the music cards deck and the lyrics view's song-cards overlay, so
 * both surfaces replay identically and a fix here reaches each of them.
 */
export const useSnippetPlayback = (): SnippetPlayback => {
    const { t } = useTranslation();
    const [playingSnippetId, setPlayingSnippetId] = useState<string>();
    const clipUrl = useSnippetClipUrl(playingSnippetId);
    const audioRef = useRef<HTMLAudioElement | undefined>(undefined);
    const fadeRafRef = useRef<number | undefined>(undefined);
    const fallbackStartedRef = useRef(false);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const lastClipUrlRef = useRef<null | string>(null);
    const replayRequestRef = useRef<null | string>(null);
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const playerVolume = usePlayerVolume();
    const playerMuted = usePlayerMuted();
    const targetVolumeRef = useRef(0);
    targetVolumeRef.current = playerMuted ? 0 : convertToLogVolume(playerVolume / 100 || 0);

    // Fade the snippet in/out inside its [startS, endS] window, tracking the app
    // volume live. rAF-driven because timeupdate is too coarse for a 250ms ramp.
    const startFadeEnvelope = useCallback(
        (audio: HTMLAudioElement, startS: number, endSOverride?: number) => {
            cancelAnimationFrame(fadeRafRef.current ?? 0);

            const tick = () => {
                if (audioRef.current !== audio || audio.paused) return;

                const endS =
                    endSOverride ?? (Number.isFinite(audio.duration) ? audio.duration : Infinity);
                const fadeIn = (audio.currentTime - startS) / FADE_S;
                const fadeOut = (endS - audio.currentTime) / FADE_S;
                audio.volume = targetVolumeRef.current * Math.max(0, Math.min(1, fadeIn, fadeOut));
                fadeRafRef.current = requestAnimationFrame(tick);
            };

            audio.volume = 0;
            fadeRafRef.current = requestAnimationFrame(tick);
        },
        [],
    );

    const stopReplay = useCallback(() => {
        clearTimeout(fallbackTimerRef.current);
        clearTimeout(stopTimerRef.current);
        cancelAnimationFrame(fadeRafRef.current ?? 0);
        audioRef.current?.pause();
        replayRequestRef.current = null;
        setPlayingSnippetId(undefined);
    }, []);

    useEffect(() => {
        const audio = new Audio();

        audio.addEventListener('ended', stopReplay);
        audioRef.current = audio;

        return () => {
            clearTimeout(fallbackTimerRef.current);
            clearTimeout(stopTimerRef.current);
            cancelAnimationFrame(fadeRafRef.current ?? 0);
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            audio.removeEventListener('ended', stopReplay);
            audioRef.current = undefined;
        };
    }, [stopReplay]);

    useEffect(() => {
        const audio = audioRef.current;
        if (
            !audio ||
            !playingSnippetId ||
            !clipUrl ||
            fallbackStartedRef.current ||
            clipUrl === lastClipUrlRef.current
        ) {
            return;
        }

        clearTimeout(fallbackTimerRef.current);
        lastClipUrlRef.current = clipUrl;
        audio.src = clipUrl;
        audio.currentTime = 0;
        startFadeEnvelope(audio, 0);
        audio.play().catch(stopReplay);
    }, [clipUrl, playingSnippetId, startFadeEnvelope, stopReplay]);

    const toggleReplay = useCallback(
        (card: MusicCard, snippet: MusicCardSnippet) => {
            // Saved from untimed lyrics: no window, so nothing to replay. The
            // controls are already hidden for such a snippet; this is the guard
            // that keeps a stray call from seeking to 0 and stopping instantly.
            if (!snippetHasAudio(snippet)) return;

            if (snippet.id === playingSnippetId) {
                stopReplay();
                return;
            }

            stopReplay();
            fallbackStartedRef.current = false;
            replayRequestRef.current = snippet.id;
            setPlayingSnippetId(snippet.id);

            fallbackTimerRef.current = setTimeout(async () => {
                if (replayRequestRef.current !== snippet.id) return;

                if (snippet.songRemoved) {
                    toast.error({ message: t('page.musicCards.clipUnavailable') });
                    stopReplay();
                    return;
                }

                fallbackStartedRef.current = true;

                try {
                    const streamUrl = await api.controller.getStreamUrl({
                        apiClientProps: { serverId: card.serverId },
                        query: {
                            id: snippet.mediaFileId,
                            transcode: false,
                        },
                    });
                    const audio = audioRef.current;

                    if (!audio || replayRequestRef.current !== snippet.id) return;

                    const play = () => {
                        if (replayRequestRef.current !== snippet.id) return;

                        audio.currentTime = snippet.startMs / 1000;
                        startFadeEnvelope(audio, snippet.startMs / 1000, snippet.endMs / 1000);
                        audio.play().catch(stopReplay);
                        stopTimerRef.current = setTimeout(
                            stopReplay,
                            snippet.endMs - snippet.startMs,
                        );
                    };

                    audio.addEventListener('loadedmetadata', play, { once: true });
                    audio.src = streamUrl;
                    audio.load();
                } catch {
                    toast.error({ message: t('page.musicCards.clipUnavailable') });
                    stopReplay();
                }
            }, CLIP_WAIT_MS);
        },
        [playingSnippetId, startFadeEnvelope, stopReplay, t],
    );

    return { playingSnippetId, stopReplay, toggleReplay };
};
