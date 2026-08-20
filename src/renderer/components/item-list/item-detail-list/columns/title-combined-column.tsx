import { ExplicitIndicator } from '@feishin/ui/components/explicit-indicator/explicit-indicator';
import clsx from 'clsx';

import styles from './title-column.module.css';

import { ItemDetailListCellProps } from '/@/renderer/components/item-list/item-detail-list/columns/types';
import { useIsCurrentSong } from '/@/renderer/features/player/hooks/use-is-current-song';

export const TitleCombinedColumn = ({ song }: ItemDetailListCellProps) => {
    const { isActive } = useIsCurrentSong(song);

    return (
        <span className={clsx({ [styles.active]: isActive })}>
            <ExplicitIndicator explicitStatus={song.explicitStatus} />
            {[song.name, song.artistName].filter(Boolean).join(' — ') ?? <>&nbsp;</>}
        </span>
    );
};
