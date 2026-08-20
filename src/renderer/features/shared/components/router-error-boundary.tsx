import { Box } from '@feishin/ui/components/box/box';
import { Button } from '@feishin/ui/components/button/button';
import { Center } from '@feishin/ui/components/center/center';
import { Code } from '@feishin/ui/components/code/code';
import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Stack } from '@feishin/ui/components/stack/stack';
import { TextTitle } from '@feishin/ui/components/text-title/text-title';
import { Text } from '@feishin/ui/components/text/text';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { ServerSelector } from '/@/renderer/features/sidebar/components/server-selector';

interface RouterErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

const RouterErrorFallback = ({ error, resetErrorBoundary }: RouterErrorFallbackProps) => {
    const { t } = useTranslation();

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <Box
            style={{
                backgroundColor: 'var(--theme-colors-background)',
                height: '100vh',
                width: '100vw',
            }}
        >
            <Box
                style={{
                    padding: 'var(--theme-spacing-md)',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    zIndex: 1000,
                }}
            >
                <ServerSelector />
            </Box>
            <Center h="100vh" p="md" w="100%">
                <Stack maw="800px">
                    <Group gap="xs">
                        <Icon fill="error" icon="error" size="lg" />
                        <TextTitle fw={700} order={3}>
                            {t('error.genericError')}
                        </TextTitle>
                    </Group>
                    <Text style={{ wordBreak: 'break-word' }}>
                        {error?.message || t('error.genericError')}
                    </Text>
                    {process.env.NODE_ENV === 'development' && error?.stack && (
                        <Code
                            p="md"
                            style={{
                                backgroundColor: 'var(--theme-colors-surface)',
                                fontFamily: 'monospace',
                                maxHeight: '300px',
                                overflow: 'auto',
                                wordBreak: 'break-word',
                            }}
                        >
                            {error.stack}
                        </Code>
                    )}
                    <Group grow>
                        <Button onClick={resetErrorBoundary} size="md" variant="default">
                            {t('common.reload')}
                        </Button>
                        <Button onClick={handleRefresh} size="md" variant="filled">
                            {t('common.refresh')}
                        </Button>
                    </Group>
                </Stack>
            </Center>
        </Box>
    );
};

interface RouterErrorBoundaryProps {
    children: React.ReactNode;
}

export const RouterErrorBoundary = ({ children }: RouterErrorBoundaryProps) => {
    return (
        <ErrorBoundary
            FallbackComponent={RouterErrorFallback}
            onError={(error, errorInfo) => {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Root error boundary caught an error:', error, errorInfo);
                }
            }}
            onReset={() => {}}
        >
            {children}
        </ErrorBoundary>
    );
};
