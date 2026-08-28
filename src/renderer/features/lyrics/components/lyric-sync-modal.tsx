import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './lyric-sync-modal.module.css';

import {
    buildLyricsOverridePayload,
    useSaveLyricsOverrideMutation,
} from '/@/renderer/features/lyrics/api/lyrics-override-api';
import { formatLrcTime } from '/@/renderer/features/lyrics/api/lyrics-time-format';
import { useLyricsSeek } from '/@/renderer/features/lyrics/hooks/use-lyrics-seek';
import { usePlayerActions } from '/@/renderer/store';
import { usePlayerTimestamp, useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';

export type LyricSyncModalProps = {
    artist?: string;
    /** One entry per lyric line; null where the line has no time yet */
    initialTimesMs: (null | number)[];
    lines: string[];
    name?: string;
    onClose: () => void;
    serverId: string;
    songId: string;
};

const UNSET_TIME = '--:--.--';

/**
 * Tap-to-sync timing for a song whose lyrics carry none.
 *
 * The song plays underneath this modal and SPACE stamps the current playback
 * position onto the cursor line, then advances. Clicking a line moves the
 * cursor back to it and winds the audio to where that line starts, so a
 * mistimed line is re-tapped rather than typed. Saving writes a synced lyrics
 * override, which becomes the song's lyrics from then on.
 */
export const LyricSyncModal = ({
    artist,
    initialTimesMs,
    lines,
    name,
    onClose,
    serverId,
    songId,
}: LyricSyncModalProps) => {
    const { t } = useTranslation();
    const seek = useLyricsSeek();
    const { mediaPause, mediaPlay } = usePlayerActions();
    const saveLyricsOverride = useSaveLyricsOverrideMutation();
    const timestamp = usePlayerTimestamp();

    const [times, setTimes] = useState<(null | number)[]>(() =>
        lines.map((_line, index) => initialTimesMs[index] ?? null),
    );
    const [cursor, setCursor] = useState(() => {
        const firstUnset = initialTimesMs.findIndex((time) => time == null);
        return firstUnset === -1 ? 0 : firstUnset;
    });

    // The cursor row is what SPACE acts on, so it has to stay on screen while
    // the operator's eyes are on the song rather than the list
    const cursorRef = useRef<HTMLButtonElement | null>(null);
    useEffect(() => {
        cursorRef.current?.scrollIntoView({ block: 'nearest' });
    }, [cursor]);

    // Read the store at the moment of the tap rather than the polled render
    // value: usePlayerTimestamp refreshes on a 500ms interval, so stamping it
    // would land every line up to half a second early on top of the ~250ms
    // granularity the player already writes at. Fine adjustment stays available
    // through the per-line time editor once the timings are saved.
    const stampCursor = useCallback(() => {
        const nowMs = useTimestampStoreBase.getState().timestamp * 1000;

        setTimes((current) => {
            if (cursor >= lines.length) return current;

            const next = [...current];
            next[cursor] = Math.max(0, Math.round(nowMs));
            return next;
        });
        setCursor((current) => Math.min(current + 1, lines.length));
    }, [cursor, lines.length]);

    // SPACE is bound globally to play/pause (usePlaybackHotkeys), so this claims
    // it in the capture phase: stopPropagation here means the document-level
    // bubble listener Mantine installs never sees the key while syncing.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code !== 'Space') return;

            event.preventDefault();
            event.stopPropagation();
            stampCursor();
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [stampCursor]);

    /** Re-target a line: the cursor moves there and the audio winds back to it */
    const selectLine = useCallback(
        (index: number) => {
            setCursor(index);

            const previousTimes = times.slice(0, index + 1).filter((time) => time != null);
            const windBackMs = times[index] ?? previousTimes.at(-1) ?? 0;
            seek(windBackMs / 1000);
        },
        [seek, times],
    );

    const restart = useCallback(() => {
        setCursor(0);
        seek(0);
        mediaPlay();
    }, [mediaPlay, seek]);

    const timedCount = useMemo(() => times.filter((time) => time != null).length, [times]);
    const allTimed = timedCount === lines.length && lines.length > 0;

    // A saved override with non-monotonic starts renders wrongly (the synced
    // view picks the current line by walking starts in order), so it is called
    // out - but the operator's own rule is "save when every line has a time",
    // so this warns rather than blocks.
    const outOfOrderCount = useMemo(() => {
        let count = 0;
        let previous = -1;

        for (const time of times) {
            if (time == null) continue;
            if (time < previous) count += 1;
            else previous = time;
        }

        return count;
    }, [times]);

    const save = useCallback(() => {
        if (!allTimed) return;

        saveLyricsOverride.mutate(
            {
                payload: buildLyricsOverridePayload(
                    { artist, name },
                    lines.map((text, index) => ({ startMs: times[index] ?? 0, text })),
                ),
                serverId,
                songId,
            },
            {
                onSuccess: () => {
                    toast.success({ message: t('lyricsEditor.syncSaved') });
                    onClose();
                },
            },
        );
    }, [allTimed, artist, lines, name, onClose, saveLyricsOverride, serverId, songId, t, times]);

    return (
        <Stack className={styles.container} gap="md">
            <Group gap="xs" wrap="nowrap">
                <Button onClick={restart} size="sm" variant="default">
                    {t('lyricsEditor.syncRestart')}
                </Button>
                <Button onClick={() => mediaPlay()} size="sm" variant="default">
                    {t('player.play')}
                </Button>
                <Button onClick={() => mediaPause()} size="sm" variant="default">
                    {t('player.pause')}
                </Button>
                <Text className={styles.clock} isMuted>
                    {formatLrcTime(timestamp * 1000)}
                </Text>
            </Group>

            <Text isMuted size="sm">
                {t('lyricsEditor.syncHint')}
            </Text>

            <ScrollArea className={styles.lines}>
                <Stack gap={2}>
                    {lines.map((text, index) => (
                        <button
                            className={clsx(styles.line, index === cursor && styles.lineCursor)}
                            key={index}
                            onClick={() => selectLine(index)}
                            ref={index === cursor ? cursorRef : undefined}
                            type="button"
                        >
                            <span
                                className={clsx(
                                    styles.time,
                                    times[index] == null && styles.timeUnset,
                                )}
                            >
                                {times[index] == null ? UNSET_TIME : formatLrcTime(times[index])}
                            </span>
                            <span className={styles.text}>{text || ' '}</span>
                        </button>
                    ))}
                </Stack>
            </ScrollArea>

            <Group gap="sm" justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                    <Text isMuted size="sm">
                        {t('lyricsEditor.syncProgress', {
                            count: timedCount,
                            total: lines.length,
                        })}
                    </Text>
                    {outOfOrderCount > 0 && (
                        <Text className={styles.warning} size="sm">
                            {t('lyricsEditor.syncOutOfOrder', { count: outOfOrderCount })}
                        </Text>
                    )}
                </Stack>
                <Group gap="sm" wrap="nowrap">
                    <Button onClick={onClose} variant="default">
                        {t('common.cancel')}
                    </Button>
                    <Button
                        disabled={!allTimed}
                        loading={saveLyricsOverride.isPending}
                        onClick={save}
                    >
                        {t('common.save')}
                    </Button>
                </Group>
            </Group>
        </Stack>
    );
};
