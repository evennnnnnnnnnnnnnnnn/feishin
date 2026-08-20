import type { ReactNode } from 'react';

import { Group } from '@feishin/ui/components/group/group';

import styles from './titlebar.module.css';

import { WindowControls } from '/@/renderer/features/window-controls/components/window-controls';

interface TitlebarProps {
    children?: ReactNode;
}

export const Titlebar = ({ children }: TitlebarProps) => {
    return (
        <>
            <div className={styles.titlebarContainer}>
                <div className={styles.right}>
                    {children}
                    <Group gap="xs">
                        <WindowControls />
                    </Group>
                </div>
            </div>
        </>
    );
};
