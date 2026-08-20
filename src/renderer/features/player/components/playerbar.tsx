import { Spinner } from '@feishin/ui/components/spinner/spinner';
import clsx from 'clsx';
import { lazy, MouseEvent, Suspense } from 'react';

import styles from './playerbar.module.css';

import { CenterControls } from '/@/renderer/features/player/components/center-controls';
import { LeftControls } from '/@/renderer/features/player/components/left-controls';
import { RightControls } from '/@/renderer/features/player/components/right-controls';
import { useIsMobile } from '/@/renderer/hooks/use-is-mobile';

const MobilePlayerbar = lazy(() =>
    import('./mobile-playerbar').then((module) => ({
        default: module.MobilePlayerbar,
    })),
);
import { PlaybackSelectors } from '@feishin/core/constants/playback-selectors';

import { useFullScreenPlayerStore, useSetFullScreenPlayerStore } from '/@/renderer/store';
import { usePlayerbarOpenDrawer } from '/@/renderer/store';

export const Playerbar = () => {
    const playerbarOpenDrawer = usePlayerbarOpenDrawer();
    const { expanded: isFullScreenPlayerExpanded } = useFullScreenPlayerStore();
    const setFullScreenPlayerStore = useSetFullScreenPlayerStore();
    const isMobile = useIsMobile();

    const handleToggleFullScreenPlayer = (e?: KeyboardEvent | MouseEvent<HTMLDivElement>) => {
        e?.stopPropagation();
        setFullScreenPlayerStore({ expanded: !isFullScreenPlayerExpanded });
    };

    if (isMobile) {
        return (
            <Suspense fallback={<Spinner />}>
                <MobilePlayerbar />
            </Suspense>
        );
    }

    return (
        <div
            className={clsx(styles.container, PlaybackSelectors.mediaPlayer)}
            onClick={playerbarOpenDrawer ? handleToggleFullScreenPlayer : undefined}
        >
            <div className={styles.controlsGrid}>
                <div className={styles.leftGridItem}>
                    <LeftControls />
                </div>
                <div className={styles.centerGridItem}>
                    <CenterControls />
                </div>
                <div className={styles.rightGridItem}>
                    <RightControls />
                </div>
            </div>
        </div>
    );
};
