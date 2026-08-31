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

type SongCardsPanelProps = {
    mediaFileId: string;
    onClose: () => void;
};

/**
 * The panel's contents, split out so that they mount only while the panel is
 * open. Everything expensive lives here rather than in the trigger: the deck
 * query and its orphan-clip sweep (useMusicCards) and the replay engine
 * (useSnippetPlayback). The lyrics view therefore costs nothing extra until the
 * user opens the panel, and closing it - or a track change closing it - tears
 * the audio element down through the hook's own unmount cleanup.
 */
const SongCardsPanel = ({ mediaFileId, onClose }: SongCardsPanelProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { cards, isLoading } = useMusicCards();
    const { playingSnippetId, toggleReplay } = useSnippetPlayback();

    const songCards = useMemo(() => cardsForMediaFile(cards, mediaFileId), [cards, mediaFileId]);

    return (
        <Stack gap="sm">
            <Group align="center" gap="sm" justify="space-between" wrap="nowrap">
                <Text fw={700}>{t('page.musicCards.cardsFromSong')}</Text>
                <ActionIcon icon="x" onClick={onClose} size="sm" variant="subtle" />
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
                                            <div className={styles.snippetRow} key={snippet.id}>
                                                <div className={styles.snippetText}>
                                                    <FuriganaSnippet snippet={snippet} />
                                                </div>
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
                                                        onClick={() => toggleReplay(card, snippet)}
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
                    onClose();
                    // The deck filtered to this same song, which is where
                    // delete-card, delete-context, full lyrics and review live.
                    // The deck's own "All music cards" button widens it from there.
                    navigate(
                        `${AppRoute.MUSIC_CARDS}?mediaFileId=${encodeURIComponent(mediaFileId)}`,
                    );
                }}
                size="compact-sm"
                variant="subtle"
            >
                {t('page.musicCards.manageInDeck')}
            </Button>
        </Stack>
    );
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
    const [opened, setOpened] = useState(false);

    const close = useCallback(() => setOpened(false), []);

    // A track change makes the open panel's contents stale, and a snippet from
    // the previous song would otherwise keep sounding over the new one -
    // closing unmounts the panel, which stops it.
    useEffect(() => {
        close();
    }, [close, mediaFileId]);

    return (
        <Popover
            // Load-bearing rather than decorative: SongCardsPanel must not be
            // mounted while the panel is closed, or the lyrics view pays for the
            // deck query and the orphan-clip sweep on every mount.
            keepMounted={false}
            onDismiss={close}
            opened={opened}
            position="bottom-end"
            returnFocus
            // Escape is handled by a keydown listener on the dropdown, so it
            // only fires while focus is inside it. Same reason the sibling
            // lyrics popovers trap focus.
            trapFocus
            width={PANEL_WIDTH}
            withinPortal
        >
            <Popover.Target>
                <ActionIcon
                    aria-label={t('page.musicCards.cardsFromSong')}
                    className={className}
                    // The trigger is hover-revealed by the lyrics view, and the
                    // portalled dropdown sits outside the hovered container.
                    data-pinned={opened}
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
                <SongCardsPanel mediaFileId={mediaFileId} onClose={close} />
            </Popover.Dropdown>
        </Popover>
    );
};
