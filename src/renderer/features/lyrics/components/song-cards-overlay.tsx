import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import styles from './song-cards-overlay.module.css';

import {
    cardsForMediaFile,
    snippetHasAudio,
} from '/@/renderer/features/music-cards/api/music-card-model';
import { FuriganaSnippet } from '/@/renderer/features/music-cards/components/music-card-display';
import { useMusicCards } from '/@/renderer/features/music-cards/hooks/use-music-cards';
import { useSnippetPlayback } from '/@/renderer/features/music-cards/hooks/use-snippet-playback';
import { AppRoute } from '/@/renderer/router/routes';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Popover } from '/@/shared/components/popover/popover';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

const PANEL_WIDTH = 360;

type SongCardsOverlayProps = {
    /** Applied to the trigger icon; the lyrics view uses it to raise the icon above the scroll container. */
    className?: string;
    mediaFileId: string;
};

/**
 * The lyrics view's "cards from this song" control: a book icon that opens a
 * panel of the music cards saved from the playing song, each snippet
 * replayable in place.
 *
 * The panel deliberately does not delete or review - those stay on the deck
 * page, reachable from the footer link, so this stays a reading surface rather
 * than a second copy of the route.
 */
export const SongCardsOverlay = ({ className, mediaFileId }: SongCardsOverlayProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [opened, setOpened] = useState(false);
    const { cards, isLoading } = useMusicCards();
    const { playingSnippetId, stopReplay, toggleReplay } = useSnippetPlayback();

    const songCards = useMemo(() => cardsForMediaFile(cards, mediaFileId), [cards, mediaFileId]);

    const close = useCallback(() => {
        stopReplay();
        setOpened(false);
    }, [stopReplay]);

    // A track change makes the open panel's contents stale, and a snippet from
    // the previous song would otherwise keep sounding over the new one.
    useEffect(() => {
        close();
    }, [close, mediaFileId]);

    return (
        <Popover
            onDismiss={close}
            opened={opened}
            position="bottom-end"
            returnFocus
            width={PANEL_WIDTH}
            withinPortal
        >
            <Popover.Target>
                <ActionIcon
                    aria-label={t('page.musicCards.cardsFromSong')}
                    className={className}
                    icon="library"
                    iconProps={{ size: 'lg' }}
                    onClick={() => (opened ? close() : setOpened(true))}
                    pos="absolute"
                    right={40}
                    tooltip={{ label: t('page.musicCards.cardsFromSong') }}
                    top={0}
                    variant="subtle"
                />
            </Popover.Target>
            <Popover.Dropdown className={styles.dropdown}>
                <Stack gap="sm">
                    <Group align="center" gap="sm" justify="space-between" wrap="nowrap">
                        <Text fw={700}>{t('page.musicCards.cardsFromSong')}</Text>
                        <ActionIcon icon="x" onClick={close} size="sm" variant="subtle" />
                    </Group>

                    {isLoading ? (
                        <Center p="md">
                            <Spinner />
                        </Center>
                    ) : songCards.length === 0 ? (
                        <Center p="md">
                            <Text isMuted size="sm">
                                {t('page.musicCards.emptyForSong')}
                            </Text>
                        </Center>
                    ) : (
                        <div className={styles.cardList}>
                            {songCards.map((card) => {
                                // Only the contexts saved from THIS song; a card
                                // spanning several songs keeps the rest for the deck.
                                const songSnippets = card.snippets.filter(
                                    (snippet) => snippet.mediaFileId === mediaFileId,
                                );

                                return (
                                    <div className={styles.cardRow} key={card.id}>
                                        <Text className={styles.kanji}>{card.kanjiText}</Text>
                                        <Stack className={styles.cardMeta} gap={4}>
                                            <Text fw={600} size="sm">
                                                {t('page.musicCards.contextCount', {
                                                    count: songSnippets.length,
                                                })}
                                            </Text>
                                            <div className={styles.snippetList}>
                                                {songSnippets.map((snippet) => (
                                                    <div
                                                        className={styles.snippetRow}
                                                        key={snippet.id}
                                                    >
                                                        <div className={styles.snippetText}>
                                                            <FuriganaSnippet snippet={snippet} />
                                                        </div>
                                                        {snippetHasAudio(snippet) && (
                                                            <ActionIcon
                                                                aria-label={
                                                                    playingSnippetId === snippet.id
                                                                        ? t(
                                                                              'page.musicCards.stopReplay',
                                                                          )
                                                                        : t(
                                                                              'page.musicCards.replay',
                                                                          )
                                                                }
                                                                icon={
                                                                    playingSnippetId === snippet.id
                                                                        ? 'mediaPause'
                                                                        : 'mediaPlay'
                                                                }
                                                                onClick={() =>
                                                                    toggleReplay(card, snippet)
                                                                }
                                                                size="compact-sm"
                                                                variant="subtle"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </Stack>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <Button
                        onClick={() => {
                            close();
                            navigate(AppRoute.MUSIC_CARDS);
                        }}
                        size="compact-sm"
                        variant="subtle"
                    >
                        {t('page.musicCards.allCards')}
                    </Button>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
};
