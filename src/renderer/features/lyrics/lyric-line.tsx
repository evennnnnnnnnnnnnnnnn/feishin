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

export type WordSpanClickDetail = {
    basicForm: null | string;
    charOffset: number;
    lineIndex: number;
    pos: null | string;
    reading: null | string;
    spanLength: number;
    text: string;
    x: number;
    y: number;
};

interface LyricLineProps extends ComponentPropsWithoutRef<'div'> {
    alignment: 'center' | 'left' | 'right';
    fontSize: number;
    lineIndex?: number;
    onKanjiClick?: (detail: KanjiSpanClickDetail) => void;
    onWordClick?: (detail: WordSpanClickDetail) => void;
    romajiText?: null | string;
    text?: string;
    translatedText?: null | string;
}

const KANJI_SPAN_SELECTOR = '[data-kanji-offset]';
const WORD_SPAN_SELECTOR = '[data-word-offset]';

const readWordSpanDetail = (
    element: HTMLElement,
    lineIndex: number,
): null | Omit<WordSpanClickDetail, 'x' | 'y'> => {
    const offset = element.getAttribute('data-word-offset');
    const spanLength = element.getAttribute('data-word-length');
    if (offset === null || spanLength === null) {
        return null;
    }

    return {
        basicForm: element.getAttribute('data-word-base') || null,
        charOffset: Number(offset),
        lineIndex,
        pos: element.getAttribute('data-word-pos') || null,
        reading: element.getAttribute('data-word-reading') || null,
        spanLength: Number(spanLength),
        text: element.getAttribute('data-word-text') ?? element.textContent ?? '',
    };
};

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
        onWordClick,
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

        // Innermost target wins: kanji spans (nested inside word spans) go to
        // the KanjiPicker flow, the surrounding word span goes to the JMdict
        // word lookup, anything else falls through to the line's click-to-seek.
        // Alt/Ctrl-clicks on word spans are left unconsumed on purpose (word
        // click-to-seek claims them).
        const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
            if (lineIndex === undefined) return;

            const node = event.target as HTMLElement;

            if (onKanjiClick) {
                const kanjiTarget = node.closest<HTMLElement>(KANJI_SPAN_SELECTOR);
                if (kanjiTarget) {
                    // Do not trigger the line's click-to-seek
                    event.stopPropagation();

                    const detail = readKanjiSpanDetail(kanjiTarget, lineIndex);
                    if (!detail) return;

                    onKanjiClick({
                        ...detail,
                        shiftKey: event.shiftKey,
                        x: event.clientX,
                        y: event.clientY,
                    });
                    return;
                }
            }

            if (!onWordClick || event.altKey || event.ctrlKey) return;

            const wordTarget = node.closest<HTMLElement>(WORD_SPAN_SELECTOR);
            if (!wordTarget) return;

            event.stopPropagation();

            const detail = readWordSpanDetail(wordTarget, lineIndex);
            if (!detail) return;

            onWordClick({ ...detail, x: event.clientX, y: event.clientY });
        };

        const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
            if (lineIndex === undefined) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const node = event.target as HTMLElement;

            if (onKanjiClick) {
                const kanjiTarget = node.closest<HTMLElement>(KANJI_SPAN_SELECTOR);
                if (kanjiTarget) {
                    event.preventDefault();
                    event.stopPropagation();

                    const detail = readKanjiSpanDetail(kanjiTarget, lineIndex);
                    if (!detail) return;

                    const rect = kanjiTarget.getBoundingClientRect();
                    onKanjiClick({
                        ...detail,
                        shiftKey: event.shiftKey,
                        x: rect.left,
                        y: rect.bottom,
                    });
                    return;
                }
            }

            if (!onWordClick) return;

            const wordTarget = node.closest<HTMLElement>(WORD_SPAN_SELECTOR);
            if (!wordTarget) return;

            event.preventDefault();
            event.stopPropagation();

            const detail = readWordSpanDetail(wordTarget, lineIndex);
            if (!detail) return;

            const rect = wordTarget.getBoundingClientRect();
            onWordClick({ ...detail, x: rect.left, y: rect.bottom });
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
