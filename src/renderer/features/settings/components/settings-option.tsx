import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Text } from '@feishin/ui/components/text/text';
import { Tooltip } from '@feishin/ui/components/tooltip/tooltip';
import React, { memo } from 'react';

import styles from './settings-option.module.css';

interface SettingsOptionProps {
    control: React.ReactNode;
    description?: React.ReactNode | string;
    indent?: boolean;
    note?: string;
    showDescription?: boolean;
    title: React.ReactNode | string;
}

export const SettingsOptions = memo(
    ({
        control,
        description,
        indent,
        note,
        showDescription = true,
        title,
    }: SettingsOptionProps) => {
        return (
            <>
                <Group
                    className={indent ? styles.rowIndented : styles.row}
                    justify="space-between"
                    wrap="nowrap"
                >
                    <Stack
                        gap="xs"
                        style={{
                            display: 'flex',
                            maxWidth: '50%',
                        }}
                    >
                        <Group>
                            <Text isNoSelect size="md">
                                {title}
                            </Text>
                            {note && (
                                <Tooltip label={note} openDelay={0}>
                                    <Icon icon="info" />
                                </Tooltip>
                            )}
                        </Group>
                        {showDescription &&
                            (React.isValidElement(description) ? (
                                description
                            ) : (
                                <Text isMuted isNoSelect size="sm">
                                    {description}
                                </Text>
                            ))}
                    </Stack>
                    <Group justify="flex-end">{control}</Group>
                </Group>
            </>
        );
    },
);
