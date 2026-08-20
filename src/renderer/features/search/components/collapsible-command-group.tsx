import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Paper } from '@feishin/ui/components/paper/paper';
import { ReactNode, useCallback, useState } from 'react';

import styles from './collapsible-command-group.module.css';

interface CollapsibleCommandGroupProps {
    children: ReactNode;
    defaultExpanded?: boolean;
    expanded?: boolean;
    heading: string;
    onToggle?: () => void;
    subtitle?: ReactNode;
}

export function CollapsibleCommandGroup({
    children,
    defaultExpanded = true,
    expanded: controlledExpanded,
    heading,
    onToggle,
    subtitle,
}: CollapsibleCommandGroupProps) {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

    const isControlled = controlledExpanded !== undefined && onToggle !== undefined;
    const expanded = isControlled ? controlledExpanded : internalExpanded;

    const toggle = useCallback(() => {
        if (isControlled) {
            onToggle?.();
        } else {
            setInternalExpanded((prev) => !prev);
        }
    }, [isControlled, onToggle]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        },
        [toggle],
    );

    return (
        <div className={styles.root}>
            <Paper p="sm" radius="sm" withBorder>
                <div
                    className={styles.heading}
                    onClick={toggle}
                    onKeyDown={handleKeyDown}
                    role="button"
                    tabIndex={0}
                >
                    <Icon className={styles.chevron} icon={expanded ? 'dropdown' : 'arrowRightS'} />
                    <Group justify="space-between" w="100%">
                        <span>{heading}</span>
                        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
                    </Group>
                </div>
            </Paper>
            {expanded && <div className={styles.items}>{children}</div>}
        </div>
    );
}
