import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './music-cards-route.module.css';

import { useKanjiInfo } from '/@/renderer/features/lyrics/hooks/use-kanji-info';
import { MusicCardSnippet } from '/@/renderer/features/music-cards/api/music-card-model';
import { useLyricsSettings } from '/@/renderer/store';
import { Badge } from '/@/shared/components/badge/badge';
import { Group } from '/@/shared/components/group/group';
import { Paper } from '/@/shared/components/paper/paper';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

export const FuriganaSnippet = ({ snippet }: { snippet: MusicCardSnippet }) => {
    const characters = Array.from(snippet.snippetText);
    const start = Math.min(snippet.charOffset, characters.length);
    const end = Math.min(start + snippet.spanLength, characters.length);

    return (
        <Text className={styles.snippetText}>
            {characters.slice(0, start).join('')}
            <ruby>
                {characters.slice(start, end).join('')}
                <rp>(</rp>
                <rt>{snippet.reading}</rt>
                <rp>)</rp>
            </ruby>
            {characters.slice(end).join('')}
        </Text>
    );
};

// Kun'yomi readings carry KANJIDIC2 okurigana markers ("た.べる", "-がた");
// shown verbatim, exactly as the KanjiPicker's readings section does.
export const CardKanjiReadings = ({ kanjiText }: { kanjiText: string }) => {
    const { t } = useTranslation();
    const kanjiChars = useMemo(() => Array.from(kanjiText), [kanjiText]);
    const { data: kanjiInfo } = useKanjiInfo(kanjiChars);
    const lyricsSettings = useLyricsSettings();
    const showMeanings = lyricsSettings.kanjiPickerShowMeanings ?? true;

    if (!kanjiInfo || kanjiChars.every((char) => kanjiInfo[char] == null)) {
        return null;
    }

    return (
        <Paper p="md">
            <Stack gap="sm">
                {kanjiChars.map((char) => {
                    const info = kanjiInfo[char];
                    if (info == null) {
                        return null;
                    }

                    return (
                        <Stack gap={4} key={char}>
                            {kanjiChars.length > 1 && <Text fw={700}>{char}</Text>}
                            {info.on.length > 0 && (
                                <>
                                    <Text
                                        fw={600}
                                        isMuted
                                        style={{ fontSize: '0.7em', letterSpacing: '0.06em' }}
                                        tt="uppercase"
                                    >
                                        {t('setting.furiganaOnyomi')}
                                    </Text>
                                    <Group gap={4}>
                                        {info.on.map((reading) => (
                                            <Badge key={reading} variant="default">
                                                {reading}
                                            </Badge>
                                        ))}
                                    </Group>
                                </>
                            )}
                            {info.kun.length > 0 && (
                                <>
                                    <Text
                                        fw={600}
                                        isMuted
                                        style={{ fontSize: '0.7em', letterSpacing: '0.06em' }}
                                        tt="uppercase"
                                    >
                                        {t('setting.furiganaKunyomi')}
                                    </Text>
                                    <Group gap={4}>
                                        {info.kun.map((reading) => (
                                            <Badge key={reading} variant="default">
                                                {reading}
                                            </Badge>
                                        ))}
                                    </Group>
                                </>
                            )}
                            {showMeanings && info.meanings.length > 0 && (
                                <Text isMuted style={{ fontSize: '0.8em' }}>
                                    {info.meanings.join(', ')}
                                </Text>
                            )}
                        </Stack>
                    );
                })}
            </Stack>
        </Paper>
    );
};
