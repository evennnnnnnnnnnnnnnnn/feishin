import { ActionIcon, ActionIconProps } from '@feishin/ui/components/action-icon/action-icon';
import { forwardRef } from 'react';

import styles from './collapsed-sidebar-button.module.css';

interface CollapsedSidebarButtonProps extends ActionIconProps {}

export const CollapsedSidebarButton = forwardRef<HTMLButtonElement, CollapsedSidebarButtonProps>(
    ({ children, ...props }: CollapsedSidebarButtonProps, ref) => {
        return (
            <ActionIcon className={styles.button} ref={ref} variant="subtle" {...props}>
                {children}
            </ActionIcon>
        );
    },
);
