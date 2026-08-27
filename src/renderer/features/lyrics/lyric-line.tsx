import clsx from 'clsx';
import { ComponentPropsWithoutRef, memo, useMemo } from 'react';

import styles from './lyric-line.module.css';

import { sanitize } from '/@/renderer/utils/sanitize';
import { Box } from '/@/shared/components/box/box';
import { Stack } from '/@/shared/components/stack/stack';

export type KanjiSpanClickDetail = {
    charOffset: number;
    lineIndex: number;
    shiftKey: boolean;
    spanLength: number;
    suggestedReading: null | string;
    text: string;
    x: number;
    y: number;
};

interface LyricLineProps extends ComponentPropsWithoutRef<'div'> {
    alignment: 'center' | 'left' | 'right';
    fontSize: number;
    lineIndex?: number;
    onKanjiClick?: (detail: KanjiSpanClickDetail) => void;
    romajiText?: null | string;
    text?: string;
    translatedText?: null | string;
}

const KANJI_SPAN_SELECTOR = '[data-kanji-offset]';

const readKanjiSpanDetail = (
    element: HTMLElement,
    lineIndex: number,
): null | Omit<KanjiSpanClickDetail, 'shiftKey' | 'x' | 'y'> => {
    const offset = element.getAttribute('data-kanji-offset');
    const spanLength = element.getAttribute('data-span-length');
    if (offset === null || spanLength === null) {
        return null;
    }

    const suggestedReading = element.getAttribute('data-suggested-reading');

    return {
        charOffset: Number(offset),
        lineIndex,
        spanLength: Number(spanLength),
        suggestedReading: suggestedReading ? suggestedReading : null,
        text: element.getAttribute('data-text') ?? element.textContent ?? '',
    };
};

export const LyricLine = memo(
    ({
        alignment,
        className,
        fontSize,
        lineIndex,
        onKanjiClick,
        romajiText,
        text,
        translatedText,
        ...props
    }: LyricLineProps) => {
        const lines = useMemo(() => (text ?? '').split('_BREAK_'), [text]);

        const style = useMemo(
            () => ({
                fontSize,
                textAlign: alignment,
            }),
            [fontSize, alignment],
        );

        const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
            if (!onKanjiClick || lineIndex === undefined) return;

            const target = (event.target as HTMLElement).closest<HTMLElement>(KANJI_SPAN_SELECTOR);
            if (!target) return;

            // Do not trigger the line's click-to-seek
            event.stopPropagation();

            const detail = readKanjiSpanDetail(target, lineIndex);
            if (!detail) return;

            onKanjiClick({
                ...detail,
                shiftKey: event.shiftKey,
                x: event.clientX,
                y: event.clientY,
            });
        };

        const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
            if (!onKanjiClick || lineIndex === undefined) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const target = (event.target as HTMLElement).closest<HTMLElement>(KANJI_SPAN_SELECTOR);
            if (!target) return;

            event.preventDefault();
            event.stopPropagation();

            const detail = readKanjiSpanDetail(target, lineIndex);
            if (!detail) return;

            const rect = target.getBoundingClientRect();
            onKanjiClick({ ...detail, shiftKey: event.shiftKey, x: rect.left, y: rect.bottom });
        };

        return (
            <Box className={clsx(styles.lyricLine, className)} style={style} {...props}>
                <Stack gap={0}>
                    {lines.map((line, index) => (
                        <span
                            dangerouslySetInnerHTML={{ __html: sanitize(line) }}
                            key={index}
                            onClick={handleClick}
                            onKeyDown={handleKeyDown}
                        />
                    ))}
                    {romajiText && (
                        <span
                            className={styles.romajiLine}
                            dangerouslySetInnerHTML={{ __html: sanitize(romajiText) }}
                        />
                    )}
                    {translatedText && translatedText !== text && (
                        <span dangerouslySetInnerHTML={{ __html: sanitize(translatedText) }} />
                    )}
                </Stack>
            </Box>
        );
    },
);

LyricLine.displayName = 'LyricLine';
