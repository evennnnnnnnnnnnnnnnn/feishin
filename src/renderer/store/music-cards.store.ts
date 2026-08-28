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
    /** Merge one server's cards into the local deck - see reconcileMusicCards */
    reconcile: (serverId: string, serverCards: MusicCardWithSnippetsDto[]) => void;
    removeCard: (cardId: string) => void;
    removeSnippet: (cardId: string, snippetId: string) => void;
    /** Create or update a card locally and append/replace one of its snippets */
    saveSnippet: (args: {
        cardId: string;
        createdAt: string;
        kanjiText: string;
        serverId: string;
        snippet: MusicCardSnippet;
    }) => void;
}

interface MusicCardsState {
    cards: MusicCard[];
}

export const useMusicCardsStore = createWithEqualityFn<MusicCardsSlice>()(
    persist(
        immer((set) => ({
            actions: {
                reconcile: (serverId, serverCards) => {
                    set((state) => {
                        state.cards = reconcileMusicCards(state.cards, serverCards, serverId);
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
                saveSnippet: ({ cardId, createdAt, kanjiText, serverId, snippet }) => {
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
                                },
                            ]);
                            return;
                        }

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
            name: 'store_music_cards',
            partialize: (state) => ({ cards: state.cards }),
            version: 1,
        },
    ),
);

export const useMusicCardsStoreActions = () => useMusicCardsStore((state) => state.actions);

export const useLocalMusicCards = () => useMusicCardsStore((state) => state.cards);
