import { QueueSong, Song } from '@feishin/core/types/domain-types';
import { useMemo } from 'react';

import { usePlayerSong } from '/@/renderer/store';

export const useIsCurrentSong = (song: QueueSong | Song) => {
    const currentSong = usePlayerSong();

    const isActive = useMemo(() => {
        const queueSong = song as QueueSong;

        if (queueSong._uniqueId != null && queueSong._uniqueId !== '') {
            return queueSong._uniqueId === currentSong?._uniqueId;
        }

        return song.id === currentSong?.id;
    }, [song, currentSong?.id, currentSong?._uniqueId]);

    return { isActive };
};
