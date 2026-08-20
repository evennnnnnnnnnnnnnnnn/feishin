import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { Center } from '@feishin/ui/components/center/center';
import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Text } from '@feishin/ui/components/text/text';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';

const InvalidRoute = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <AnimatedPage>
            <Center style={{ height: '100%', width: '100%' }}>
                <Stack>
                    <Group justify="center" wrap="nowrap">
                        <Icon color="warn" icon="error" />
                        <Text size="xl">{t('error.apiRouteError')}</Text>
                    </Group>
                    <Text>{location.pathname}</Text>
                    <ActionIcon icon="arrowLeftS" onClick={() => navigate(-1)} variant="filled" />
                </Stack>
            </Center>
        </AnimatedPage>
    );
};

const InvalidRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <InvalidRoute />
        </PageErrorBoundary>
    );
};

export default InvalidRouteWithBoundary;
