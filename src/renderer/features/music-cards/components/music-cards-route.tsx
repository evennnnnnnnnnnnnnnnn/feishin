import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import styles from './music-cards-route.module.css';

import { api } from '/@/renderer/api';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { MusicCard, MusicCardSnippet } from '/@/renderer/features/music-cards/api/music-card-model';
import {
    useDeleteMusicCard,
    useDeleteMusicCardSnippet,
} from '/@/renderer/features/music-cards/hooks/use-delete-music-card';
import { useMusicCards } from '/@/renderer/features/music-cards/hooks/use-music-cards';
import { useSnippetClipUrl } from '/@/renderer/features/music-cards/hooks/use-snippet-clip-url';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
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

const FuriganaSnippet = ({ snippet }: { snippet: MusicCardSnippet }) => {
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

const MusicCardsRoute = () => {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const mediaFileId = searchParams.get('mediaFileId');
    const { cards, error, isError, isLoading } = useMusicCards();
    const deleteCard = useDeleteMusicCard();
    const deleteSnippet = useDeleteMusicCardSnippet();
    const [selectedCardId, setSelectedCardId] = useState<null | string>(null);
    const [playingSnippetId, setPlayingSnippetId] = useState<string>();
    const clipUrl = useSnippetClipUrl(playingSnippetId);
    const audioRef = useRef<HTMLAudioElement | undefined>(undefined);
    const fallbackStartedRef = useRef(false);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const lastClipUrlRef = useRef<null | string>(null);
    const replayRequestRef = useRef<null | string>(null);
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const filteredCards = useMemo(
        () =>
            mediaFileId
                ? cards.filter((card) =>
                      card.snippets.some((snippet) => snippet.mediaFileId === mediaFileId),
                  )
                : cards,
        [cards, mediaFileId],
    );
    const selectedCard = filteredCards.find((card) => card.id === selectedCardId) ?? null;

    const stopReplay = useCallback(() => {
        clearTimeout(fallbackTimerRef.current);
        clearTimeout(stopTimerRef.current);
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
        audio.play().catch(stopReplay);
    }, [clipUrl, playingSnippetId, stopReplay]);

    const toggleReplay = useCallback(
        (card: MusicCard, snippet: MusicCardSnippet) => {
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
            }, 400);
        },
        [playingSnippetId, stopReplay, t],
    );

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
                    {mediaFileId && (
                        <Button onClick={() => setSearchParams({})} variant="subtle">
                            {t('page.musicCards.allCards')}
                        </Button>
                    )}
                </PageHeader>
                <ScrollArea className={styles.content}>
                    {isLoading ? (
                        <Spinner container />
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
                                                                ? t('page.musicCards.stopReplay')
                                                                : t('page.musicCards.replay'),
                                                    }}
                                                    variant="filled"
                                                />
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
