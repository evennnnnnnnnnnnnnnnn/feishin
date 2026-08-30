import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import styles from './music-cards-route.module.css';

import { PageHeader } from '/@/renderer/components/page-header/page-header';
import {
    cardsForMediaFile,
    MusicCard,
    snippetHasAudio,
} from '/@/renderer/features/music-cards/api/music-card-model';
import {
    CardKanjiReadings,
    FuriganaSnippet,
} from '/@/renderer/features/music-cards/components/music-card-display';
import { MusicCardReviewSession } from '/@/renderer/features/music-cards/components/music-card-review-session';
import {
    useDeleteMusicCard,
    useDeleteMusicCardSnippet,
} from '/@/renderer/features/music-cards/hooks/use-delete-music-card';
import { useMusicCardReviews } from '/@/renderer/features/music-cards/hooks/use-music-card-reviews';
import { useMusicCards } from '/@/renderer/features/music-cards/hooks/use-music-cards';
import { useSnippetPlayback } from '/@/renderer/features/music-cards/hooks/use-snippet-playback';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useCurrentServer } from '/@/renderer/store';
import { Accordion } from '/@/shared/components/accordion/accordion';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { closeAllModals, ConfirmModal, openModal } from '/@/shared/components/modal/modal';
import { Paper } from '/@/shared/components/paper/paper';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { ServerType } from '/@/shared/types/domain-types';

const MusicCardsRoute = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const mediaFileId = searchParams.get('mediaFileId');
    const { cards, error, isError, isLoading } = useMusicCards();
    const server = useCurrentServer();
    const serverId = server?.id;
    const reviewsEnabled = !!serverId && server?.type === ServerType.NAVIDROME;
    const { fetchedAt, isError: reviewsUnavailable, reviewsByCardId } = useMusicCardReviews();
    const deleteCard = useDeleteMusicCard();
    const deleteSnippet = useDeleteMusicCardSnippet();
    const [selectedCardId, setSelectedCardId] = useState<null | string>(null);
    const [reviewQueue, setReviewQueue] = useState<MusicCard[] | null>(null);
    const { playingSnippetId, stopReplay, toggleReplay } = useSnippetPlayback();

    const filteredCards = useMemo(
        () => (mediaFileId ? cardsForMediaFile(cards, mediaFileId) : cards),
        [cards, mediaFileId],
    );
    const selectedCard = filteredCards.find((card) => card.id === selectedCardId) ?? null;

    // Due cards first (most overdue leading), then never-graded cards as new,
    // oldest saved first. Review state is server-side, so only cards belonging
    // to the current server can be reviewed; when the reviews query is
    // unavailable (offline, serverless) the queue is empty and the deck simply
    // has no review affordance. Due-ness is judged against the clock reading
    // taken when the review data was fetched, keeping this computation pure.
    const dueQueue = useMemo(() => {
        if (!reviewsEnabled || reviewsUnavailable || fetchedAt === null) {
            return [];
        }

        const due: { card: MusicCard; dueTime: number }[] = [];
        const fresh: MusicCard[] = [];

        for (const card of cards) {
            if (card.serverId !== serverId) continue;

            const review = reviewsByCardId.get(card.id);

            if (!review) {
                fresh.push(card);
            } else {
                const dueTime = new Date(review.due_at).getTime();

                if (dueTime <= fetchedAt) {
                    due.push({ card, dueTime });
                }
            }
        }

        due.sort((a, b) => a.dueTime - b.dueTime);
        fresh.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        return [...due.map((entry) => entry.card), ...fresh];
    }, [cards, fetchedAt, reviewsByCardId, reviewsEnabled, reviewsUnavailable, serverId]);

    const confirmDeleteCard = useCallback(
        (card: MusicCard) => {
            openModal({
                children: (
                    <ConfirmModal
                        labels={{ cancel: t('common.cancel'), confirm: t('common.delete') }}
                        loading={deleteCard.isPending}
                        onConfirm={async () => {
                            try {
                                if (card.snippets.some(({ id }) => id === playingSnippetId)) {
                                    stopReplay();
                                }
                                await deleteCard.mutateAsync({ cardId: card.id });
                                setSelectedCardId(null);
                            } catch {
                                toast.error({ message: t('error.genericError') });
                            } finally {
                                closeAllModals();
                            }
                        }}
                    >
                        <Text>{t('page.musicCards.deleteCardConfirm')}</Text>
                    </ConfirmModal>
                ),
                title: t('page.musicCards.deleteCard'),
            });
        },
        [deleteCard, playingSnippetId, stopReplay, t],
    );

    const confirmDeleteSnippet = useCallback(
        (cardId: string, snippetId: string) => {
            openModal({
                children: (
                    <ConfirmModal
                        labels={{ cancel: t('common.cancel'), confirm: t('common.delete') }}
                        loading={deleteSnippet.isPending}
                        onConfirm={async () => {
                            try {
                                if (snippetId === playingSnippetId) stopReplay();
                                await deleteSnippet.mutateAsync({ cardId, snippetId });
                            } catch {
                                toast.error({ message: t('error.genericError') });
                            } finally {
                                closeAllModals();
                            }
                        }}
                    >
                        <Text>{t('page.musicCards.deleteSnippetConfirm')}</Text>
                    </ConfirmModal>
                ),
                title: t('page.musicCards.deleteSnippet'),
            });
        },
        [deleteSnippet, playingSnippetId, stopReplay, t],
    );

    if (isError) {
        throw error instanceof Error ? error : new Error(t('error.genericError'));
    }

    return (
        <AnimatedPage>
            <div className={styles.page}>
                <PageHeader>
                    <LibraryHeaderBar ignoreMaxWidth>
                        <LibraryHeaderBar.Title>
                            {t('page.musicCards.title')}
                        </LibraryHeaderBar.Title>
                        <LibraryHeaderBar.Badge isLoading={isLoading}>
                            {filteredCards.length}
                        </LibraryHeaderBar.Badge>
                    </LibraryHeaderBar>
                    <Group style={{ flexShrink: 0 }} wrap="nowrap">
                        {mediaFileId && (
                            <Button onClick={() => setSearchParams({})} variant="subtle">
                                {t('page.musicCards.allCards')}
                            </Button>
                        )}
                        {!reviewQueue && dueQueue.length > 0 && (
                            <Button
                                onClick={() => {
                                    stopReplay();
                                    setSelectedCardId(null);
                                    setReviewQueue(dueQueue);
                                }}
                                variant="filled"
                            >
                                {t('page.musicCards.startReview', { count: dueQueue.length })}
                            </Button>
                        )}
                    </Group>
                </PageHeader>
                <ScrollArea className={styles.content}>
                    {isLoading ? (
                        <Spinner container />
                    ) : reviewQueue ? (
                        <MusicCardReviewSession
                            initialQueue={reviewQueue}
                            onExit={() => {
                                stopReplay();
                                setReviewQueue(null);
                            }}
                            playingSnippetId={playingSnippetId}
                            reviewsByCardId={reviewsByCardId}
                            toggleReplay={toggleReplay}
                        />
                    ) : selectedCard ? (
                        <Stack gap="lg" p="md">
                            <Group justify="space-between" wrap="nowrap">
                                <Group className={styles.detailHeading} gap="md" wrap="nowrap">
                                    <ActionIcon
                                        aria-label={t('common.back')}
                                        icon="arrowLeftS"
                                        onClick={() => setSelectedCardId(null)}
                                        tooltip={{ label: t('common.back') }}
                                        variant="subtle"
                                    />
                                    <Text className={styles.detailKanji} fw={700}>
                                        {selectedCard.kanjiText}
                                    </Text>
                                    <Badge>
                                        {t('page.musicCards.contextCount', {
                                            count: selectedCard.snippets.length,
                                        })}
                                    </Badge>
                                </Group>
                                <Button
                                    color="red"
                                    onClick={() => confirmDeleteCard(selectedCard)}
                                    variant="default"
                                >
                                    {t('page.musicCards.deleteCard')}
                                </Button>
                            </Group>
                            <CardKanjiReadings kanjiText={selectedCard.kanjiText} />
                            {selectedCard.snippets.map((snippet) => (
                                <Paper className={styles.snippet} key={snippet.id} p="md">
                                    <Stack gap="md">
                                        <Group justify="space-between" wrap="nowrap">
                                            <Stack gap={2}>
                                                <Text fw={600}>{snippet.songTitle}</Text>
                                                <Text isMuted size="sm">
                                                    {snippet.songArtist}
                                                </Text>
                                            </Stack>
                                            <Group gap="xs" wrap="nowrap">
                                                {snippet.songRemoved && (
                                                    <Badge color="gray">
                                                        {t('page.musicCards.songRemoved')}
                                                    </Badge>
                                                )}
                                                {snippetHasAudio(snippet) && (
                                                    <ActionIcon
                                                        aria-label={
                                                            playingSnippetId === snippet.id
                                                                ? t('page.musicCards.stopReplay')
                                                                : t('page.musicCards.replay')
                                                        }
                                                        icon={
                                                            playingSnippetId === snippet.id
                                                                ? 'mediaPause'
                                                                : 'mediaPlay'
                                                        }
                                                        onClick={() =>
                                                            toggleReplay(selectedCard, snippet)
                                                        }
                                                        tooltip={{
                                                            label:
                                                                playingSnippetId === snippet.id
                                                                    ? t(
                                                                          'page.musicCards.stopReplay',
                                                                      )
                                                                    : t('page.musicCards.replay'),
                                                        }}
                                                        variant="filled"
                                                    />
                                                )}
                                                <ActionIcon
                                                    aria-label={t('page.musicCards.deleteSnippet')}
                                                    icon="delete"
                                                    iconProps={{ color: 'error' }}
                                                    onClick={() =>
                                                        confirmDeleteSnippet(
                                                            selectedCard.id,
                                                            snippet.id,
                                                        )
                                                    }
                                                    tooltip={{
                                                        label: t('page.musicCards.deleteSnippet'),
                                                    }}
                                                    variant="subtle"
                                                />
                                            </Group>
                                        </Group>
                                        <FuriganaSnippet snippet={snippet} />
                                        <Accordion>
                                            <Accordion.Item value={`lyrics-${snippet.id}`}>
                                                <Accordion.Control>
                                                    {t('page.musicCards.fullLyrics')}
                                                </Accordion.Control>
                                                <Accordion.Panel>
                                                    <Text className={styles.fullLyrics}>
                                                        {snippet.fullLyrics}
                                                    </Text>
                                                </Accordion.Panel>
                                            </Accordion.Item>
                                        </Accordion>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    ) : filteredCards.length === 0 ? (
                        <Center p="xl">
                            <Text isMuted>
                                {t(
                                    mediaFileId
                                        ? 'page.musicCards.emptyForSong'
                                        : 'page.musicCards.empty',
                                )}
                            </Text>
                        </Center>
                    ) : (
                        <div className={styles.cardList}>
                            {filteredCards.map((card) => {
                                const songNames = [
                                    ...new Set(card.snippets.map((snippet) => snippet.songTitle)),
                                ].join(', ');

                                return (
                                    <Paper className={styles.card} key={card.id}>
                                        <button
                                            className={styles.cardButton}
                                            onClick={() => setSelectedCardId(card.id)}
                                            type="button"
                                        >
                                            <Text className={styles.kanji}>{card.kanjiText}</Text>
                                            <Stack className={styles.cardMeta} gap={4}>
                                                <Text fw={600}>
                                                    {t('page.musicCards.contextCount', {
                                                        count: card.snippets.length,
                                                    })}
                                                </Text>
                                                <Text
                                                    className={styles.songNames}
                                                    isMuted
                                                    size="sm"
                                                >
                                                    {songNames}
                                                </Text>
                                            </Stack>
                                        </button>
                                        <div className={styles.cardActions}>
                                            <ActionIcon
                                                aria-label={t('page.musicCards.deleteCard')}
                                                icon="delete"
                                                iconProps={{ color: 'error' }}
                                                onClick={() => confirmDeleteCard(card)}
                                                tooltip={{ label: t('page.musicCards.deleteCard') }}
                                                variant="subtle"
                                            />
                                        </div>
                                    </Paper>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </AnimatedPage>
    );
};

const MusicCardsRouteWithBoundary = () => (
    <PageErrorBoundary>
        <MusicCardsRoute />
    </PageErrorBoundary>
);

export default MusicCardsRouteWithBoundary;
