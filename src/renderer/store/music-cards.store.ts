import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';

import {
    MusicCard,
    MusicCardSnippet,
    reconcileMusicCards,
    sortMusicCards,
} from '/@/renderer/features/music-cards/api/music-card-model';
import { MusicCardWithSnippetsDto } from '/@/shared/types/domain-types';

// The standalone half of the deck: card and snippet *text* lives here in
// localStorage, the audio clips live in IndexedDB
// (features/music-cards/storage/music-card-clip-storage.ts). Together they
// keep a card readable and playable after its song leaves the library.
export interface MusicCardsSlice extends MusicCardsState {
    actions: MusicCardsActions;
}

interface MusicCardsActions {
    /** Merge one account's cards on one server into the local deck - see reconcileMusicCards */
    reconcile: (
        serverId: string,
        userId: null | string,
        serverCards: MusicCardWithSnippetsDto[],
    ) => void;
    removeCard: (cardId: string) => void;
    removeSnippet: (cardId: string, snippetId: string) => void;
    /** Create or update a card locally and append/replace one of its snippets */
    saveSnippet: (args: {
        cardId: string;
        createdAt: string;
        kanjiText: string;
        serverId: string;
        snippet: MusicCardSnippet;
        userId: null | string;
    }) => void;
}

interface MusicCardsState {
    cards: MusicCard[];
}

export const useMusicCardsStore = createWithEqualityFn<MusicCardsSlice>()(
    persist(
        immer((set) => ({
            actions: {
                reconcile: (serverId, userId, serverCards) => {
                    set((state) => {
                        state.cards = reconcileMusicCards(
                            state.cards,
                            serverCards,
                            serverId,
                            userId,
                        );
                    });
                },
                removeCard: (cardId) => {
                    set((state) => {
                        state.cards = state.cards.filter((card) => card.id !== cardId);
                    });
                },
                removeSnippet: (cardId, snippetId) => {
                    set((state) => {
                        const card = state.cards.find((entry) => entry.id === cardId);

                        if (!card) return;

                        card.snippets = card.snippets.filter((snippet) => snippet.id !== snippetId);
                        card.songRemoved = card.snippets.some((snippet) => snippet.songRemoved);
                    });
                },
                saveSnippet: ({ cardId, createdAt, kanjiText, serverId, snippet, userId }) => {
                    set((state) => {
                        const existing = state.cards.find((card) => card.id === cardId);

                        if (!existing) {
                            state.cards = sortMusicCards([
                                ...state.cards,
                                {
                                    createdAt,
                                    id: cardId,
                                    kanjiText,
                                    serverId,
                                    snippets: [snippet],
                                    songRemoved: false,
                                    userId,
                                },
                            ]);
                            return;
                        }

                        // The id came back from the server for this account, so
                        // a legacy card at that id is this account's.
                        existing.userId = userId;

                        const index = existing.snippets.findIndex(
                            (entry) => entry.id === snippet.id,
                        );

                        if (index >= 0) {
                            existing.snippets[index] = snippet;
                        } else {
                            existing.snippets.push(snippet);
                        }

                        existing.songRemoved = existing.snippets.some((entry) => entry.songRemoved);
                    });
                },
            },
            cards: [],
        })),
        {
            // v1 decks predate user scoping: tag them null rather than guess an
            // owner, so they stay hidden until a reconcile claims them.
            migrate: (persisted, version) => {
                const state = persisted as { cards?: MusicCard[] };

                if (version >= 2) return state;

                return {
                    ...state,
                    cards: (state.cards ?? []).map((card) => ({ ...card, userId: null })),
                };
            },
            name: 'store_music_cards',
            partialize: (state) => ({ cards: state.cards }),
            version: 2,
        },
    ),
);

export const useMusicCardsStoreActions = () => useMusicCardsStore((state) => state.actions);

export const useLocalMusicCards = () => useMusicCardsStore((state) => state.cards);
