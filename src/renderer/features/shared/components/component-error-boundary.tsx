import { Box } from '@feishin/ui/components/box/box';
import { Button } from '@feishin/ui/components/button/button';
import { Center } from '@feishin/ui/components/center/center';
import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Stack } from '@feishin/ui/components/stack/stack';
import { TextTitle } from '@feishin/ui/components/text-title/text-title';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

interface ComponentErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

const ComponentErrorFallback = ({ resetErrorBoundary }: ComponentErrorFallbackProps) => {
    const { t } = useTranslation();

    return (
        <Box h="100%" pos="relative" w="100%">
            <Center h="100%" p="md" w="100%">
                <Stack maw="800px">
                    <Group gap="xs">
                        <Icon fill="error" icon="error" size="lg" />
                        <TextTitle fw={600} order={4}>
                            {t('error.genericError')}
                        </TextTitle>
                    </Group>
                    <Group grow>
                        <Button onClick={resetErrorBoundary} size="xs" variant="default">
                            {t('common.reload')}
                        </Button>
                    </Group>
                </Stack>
            </Center>
        </Box>
    );
};

interface ComponentErrorBoundaryProps {
    children: React.ReactNode;
}

export const ComponentErrorBoundary = ({ children }: ComponentErrorBoundaryProps) => {
    return <ErrorBoundary FallbackComponent={ComponentErrorFallback}>{children}</ErrorBoundary>;
};
