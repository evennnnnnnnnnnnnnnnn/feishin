import { Play } from '@feishin/core/types/types';
import { HoverCard } from '@feishin/ui/components/hover-card/hover-card';
import { ReactNode } from 'react';

import styles from './row-play-control-cell.module.css';

import { ItemRowPlayControls } from '/@/renderer/features/shared/components/item-row-play-controls';

export const ItemDetailRowPlayControlCell = ({
    indexContent,
    onPlay,
    showPlayControls,
}: {
    indexContent: ReactNode;
    onPlay: (playType: Play) => void;
    showPlayControls: boolean;
}) => {
    if (!showPlayControls) {
        return <>{indexContent}</>;
    }

    return (
        <div className={styles.cellWrapper}>
            <HoverCard
                offset={{ crossAxis: 32, mainAxis: 16 }}
                openDelay={300}
                position="top"
                withArrow
            >
                <HoverCard.Target>
                    <div className={styles.playTarget}>{indexContent}</div>
                </HoverCard.Target>
                <HoverCard.Dropdown onClick={(e) => e.stopPropagation()}>
                    <ItemRowPlayControls onPlay={onPlay} />
                </HoverCard.Dropdown>
            </HoverCard>
        </div>
    );
};
