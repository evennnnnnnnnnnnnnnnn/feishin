import type { FallbackProps } from 'react-error-boundary';

import { Button } from '@feishin/ui/components/button/button';
import { Center } from '@feishin/ui/components/center/center';
import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Text } from '@feishin/ui/components/text/text';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';

import styles from './error-fallback.module.css';

export const ErrorFallback = ({ resetErrorBoundary }: FallbackProps) => {
    const error = useRouteError() as any;
    const { t } = useTranslation();

    return (
        <div className={styles.container}>
            <Center style={{ height: '100vh' }}>
                <Stack style={{ maxWidth: '50%' }}>
                    <Group gap="xs">
                        <Icon fill="error" icon="error" size="lg" />
                        <Text size="lg">{t('error.genericError')}</Text>
                    </Group>
                    <Text>{error?.message}</Text>
                    <Button onClick={resetErrorBoundary} variant="filled">
                        {t('common.reload')}
                    </Button>
                </Stack>
            </Center>
        </div>
    );
};
