import { Button } from '@feishin/ui/components/button/button';
import { Center } from '@feishin/ui/components/center/center';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Text } from '@feishin/ui/components/text/text';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';

const NoNetworkRoute = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleRetry = () => {
        // Navigate to home which will trigger authentication again
        navigate(AppRoute.HOME);
    };

    return (
        <AnimatedPage>
            <PageHeader />
            <Center style={{ height: '100%' }}>
                <Stack align="center" gap="xl" style={{ maxWidth: '50%', textAlign: 'center' }}>
                    <Icon icon="wifiOff" size="4rem" />
                    <Stack gap="md">
                        <Text size="xl" weight={600}>
                            {t('error.noNetwork')}
                        </Text>
                        <Text c="dimmed" size="sm">
                            {t('error.noNetworkDescription')}
                        </Text>
                    </Stack>
                    <Button
                        leftSection={<Icon icon="refresh" />}
                        onClick={handleRetry}
                        variant="filled"
                    >
                        {t('common.retry')}
                    </Button>
                </Stack>
            </Center>
        </AnimatedPage>
    );
};

const NoNetworkRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <NoNetworkRoute />
        </PageErrorBoundary>
    );
};

export default NoNetworkRouteWithBoundary;
