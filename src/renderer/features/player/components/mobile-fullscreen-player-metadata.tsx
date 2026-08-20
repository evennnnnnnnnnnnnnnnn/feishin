import { QueueSong } from '@feishin/core/types/domain-types';
import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { Group } from '@feishin/ui/components/group/group';
import { Rating } from '@feishin/ui/components/rating/rating';
import { memo, MouseEvent } from 'react';

import styles from './mobile-fullscreen-player.module.css';

import { SharedFullscreenPlayerMetadata } from '/@/renderer/features/player/components/shared-full-screen-player-metadata';

interface MobileFullscreenPlayerMetadataProps {
    currentSong?: QueueSong;
    onToggleFavorite: (e: MouseEvent<HTMLButtonElement>) => void;
    onUpdateRating: (rating: number) => void;
    radioStationName?: string;
    radioTitle?: string;
    showFavorite?: boolean;
    showRating?: boolean;
}

export const MobileFullscreenPlayerMetadata = memo(
    ({
        currentSong,
        onToggleFavorite,
        onUpdateRating,
        radioStationName,
        radioTitle,
        showFavorite,
        showRating,
    }: MobileFullscreenPlayerMetadataProps) => {
        const isRadio = radioTitle !== undefined || radioStationName !== undefined;

        const isFavorite = currentSong?.userFavorite;
        const rating = currentSong?.userRating;

        return (
            <div className={styles.metadataContainer}>
                <SharedFullscreenPlayerMetadata />

                {!isRadio && (
                    <Group align="center" className={styles.actionsRow} gap="xs">
                        {showFavorite && (
                            <ActionIcon
                                icon="favorite"
                                iconProps={{
                                    fill: isFavorite ? 'primary' : undefined,
                                    size: 'md',
                                }}
                                onClick={onToggleFavorite}
                                size="sm"
                                variant="subtle"
                            />
                        )}
                        {showRating && (
                            <Rating onChange={onUpdateRating} size="sm" value={rating || 0} />
                        )}
                    </Group>
                )}
            </div>
        );
    },
);

MobileFullscreenPlayerMetadata.displayName = 'MobileFullscreenPlayerMetadata';
