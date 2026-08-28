import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './music-cards-route.module.css';

import { MusicCard, MusicCardSnippet } from '/@/renderer/features/music-cards/api/music-card-model';
import {
    CardKanjiReadings,
    FuriganaSnippet,
} from '/@/renderer/features/music-cards/components/music-card-display';
import { useGradeMusicCard } from '/@/renderer/features/music-cards/hooks/use-grade-music-card';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Paper } from '/@/shared/components/paper/paper';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { MusicCardReviewDto, MusicCardReviewGrade } from '/@/shared/types/domain-types';

type MusicCardReviewSessionProps = {
    initialQueue: MusicCard[];
    onExit: () => void;
    playingSnippetId: string | undefined;
    reviewsByCardId: Map<string, MusicCardReviewDto>;
    toggleReplay: (card: MusicCard, snippet: MusicCardSnippet) => void;
};

/**
 * One flip-to-reveal review pass over the due queue. The queue is fixed at
 * session start (grades refresh the review query, and the deck must not
 * reshuffle underneath the operator). A card answered "again" is not shown
 * again within the pass - the server schedules it for a 10-minute relearn
 * delay, and the due queue refetches it into a later session once that due
 * time arrives.
 */
export const MusicCardReviewSession = ({
    initialQueue,
    onExit,
    playingSnippetId,
    reviewsByCardId,
    toggleReplay,
}: MusicCardReviewSessionProps) => {
    const { t } = useTranslation();
    const gradeCard = useGradeMusicCard();
    const [position, setPosition] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [gradedCount, setGradedCount] = useState(0);

    const card = initialQueue[position];
    const snippet = card?.snippets[0];

    const handleGrade = useCallback(
        async (grade: MusicCardReviewGrade) => {
            if (!card || gradeCard.isPending) return;

            try {
                await gradeCard.mutateAsync({ cardId: card.id, grade });
            } catch {
                toast.error({ message: t('page.musicCards.gradeError') });
                return;
            }

            setGradedCount((count) => count + 1);
            setRevealed(false);
            setPosition((current) => current + 1);
        },
        [card, gradeCard, t],
    );

    if (!card) {
        return (
            <Center p="xl">
                <Stack align="center" gap="md">
                    <Text fw={600}>{t('page.musicCards.reviewComplete')}</Text>
                    <Text isMuted>
                        {t('page.musicCards.reviewedCount', { count: gradedCount })}
                    </Text>
                    <Button onClick={onExit} variant="filled">
                        {t('page.musicCards.exitReview')}
                    </Button>
                </Stack>
            </Center>
        );
    }

    const isNew = !reviewsByCardId.has(card.id);

    return (
        <Stack className={styles.reviewSession} gap="lg" p="md">
            <Group justify="space-between" wrap="nowrap">
                <Group gap="md" wrap="nowrap">
                    <Text isMuted>
                        {t('page.musicCards.reviewProgress', {
                            current: position + 1,
                            total: initialQueue.length,
                        })}
                    </Text>
                    {isNew && <Badge>{t('page.musicCards.newCard')}</Badge>}
                </Group>
                <Button onClick={onExit} variant="subtle">
                    {t('page.musicCards.exitReview')}
                </Button>
            </Group>
            <Paper className={styles.reviewCard} p="xl">
                <Stack align="center" gap="lg">
                    <Text className={styles.reviewKanji} fw={700}>
                        {card.kanjiText}
                    </Text>
                    {snippet && (
                        <Stack align="center" gap="sm">
                            {revealed ? (
                                <FuriganaSnippet snippet={snippet} />
                            ) : (
                                <Text className={styles.snippetText}>{snippet.snippetText}</Text>
                            )}
                            <Group gap="xs" wrap="nowrap">
                                <Stack gap={2}>
                                    <Text fw={600} size="sm" ta="center">
                                        {snippet.songTitle}
                                    </Text>
                                    <Text isMuted size="sm" ta="center">
                                        {snippet.songArtist}
                                    </Text>
                                </Stack>
                                <ActionIcon
                                    aria-label={
                                        playingSnippetId === snippet.id
                                            ? t('page.musicCards.stopReplay')
                                            : t('page.musicCards.replay')
                                    }
                                    icon={
                                        playingSnippetId === snippet.id ? 'mediaPause' : 'mediaPlay'
                                    }
                                    onClick={() => toggleReplay(card, snippet)}
                                    tooltip={{
                                        label:
                                            playingSnippetId === snippet.id
                                                ? t('page.musicCards.stopReplay')
                                                : t('page.musicCards.replay'),
                                    }}
                                    variant="filled"
                                />
                            </Group>
                        </Stack>
                    )}
                    {revealed && <CardKanjiReadings kanjiText={card.kanjiText} />}
                </Stack>
            </Paper>
            {revealed ? (
                <Group gap="sm" justify="center" wrap="nowrap">
                    <Button
                        color="red"
                        disabled={gradeCard.isPending}
                        onClick={() => handleGrade('again')}
                        variant="default"
                    >
                        {t('page.musicCards.gradeAgain')}
                    </Button>
                    <Button
                        color="yellow"
                        disabled={gradeCard.isPending}
                        onClick={() => handleGrade('hard')}
                        variant="default"
                    >
                        {t('page.musicCards.gradeHard')}
                    </Button>
                    <Button
                        disabled={gradeCard.isPending}
                        onClick={() => handleGrade('good')}
                        variant="filled"
                    >
                        {t('page.musicCards.gradeGood')}
                    </Button>
                    <Button
                        color="green"
                        disabled={gradeCard.isPending}
                        onClick={() => handleGrade('easy')}
                        variant="default"
                    >
                        {t('page.musicCards.gradeEasy')}
                    </Button>
                </Group>
            ) : (
                <Center>
                    <Button onClick={() => setRevealed(true)} variant="filled">
                        {t('page.musicCards.showAnswer')}
                    </Button>
                </Center>
            )}
        </Stack>
    );
};
