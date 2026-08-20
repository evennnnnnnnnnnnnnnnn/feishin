import { Group } from '@feishin/ui/components/group/group';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Text } from '@feishin/ui/components/text/text';
import { ReactNode } from 'react';

import styles from '/@/renderer/features/action-required/components/action-required-container.module.css';

interface ActionRequiredContainerProps {
    children: ReactNode;
    title: string;
}

export const ActionRequiredContainer = ({ children, title }: ActionRequiredContainerProps) => (
    <Stack className={styles.container}>
        <Group>
            <Text className={styles.title} size="xl">
                {title}
            </Text>
        </Group>
        <Stack>{children}</Stack>
    </Stack>
);
