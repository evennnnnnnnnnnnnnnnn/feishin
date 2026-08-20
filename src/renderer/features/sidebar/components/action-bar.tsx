import { Button } from '@feishin/ui/components/button/button';
import { DropdownMenu } from '@feishin/ui/components/dropdown-menu/dropdown-menu';
import { Grid } from '@feishin/ui/components/grid/grid';
import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { TextInput } from '@feishin/ui/components/text-input/text-input';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import styles from './action-bar.module.css';

import { useScanStatus } from '/@/renderer/features/shared/hooks/use-scan-status';
import { AppMenu } from '/@/renderer/features/titlebar/components/app-menu';
import { useCommandPalette } from '/@/renderer/store';

export const ActionBar = () => {
    const { t } = useTranslation();
    const { open } = useCommandPalette();
    const { isScanning } = useScanStatus();

    return (
        <div className={styles.container}>
            <Grid
                display="flex"
                gap="sm"
                styles={{
                    inner: {
                        width: '100%',
                    },
                    root: {
                        padding: '0 var(--theme-spacing-md',
                        width: '100%',
                    },
                }}
            >
                <Grid.Col span={7}>
                    <TextInput
                        leftSection={<Icon icon="search" />}
                        onClick={open}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                open();
                            }
                        }}
                        placeholder={t('common.search')}
                        readOnly
                    />
                </Grid.Col>
                <Grid.Col span={5}>
                    <Group gap="sm" grow wrap="nowrap">
                        <DropdownMenu position="bottom-start">
                            <DropdownMenu.Target>
                                <Button p="0">
                                    <Icon
                                        animate={isScanning ? 'spin' : undefined}
                                        icon={isScanning ? 'spinner' : 'menu'}
                                        size="lg"
                                    />
                                </Button>
                            </DropdownMenu.Target>
                            <DropdownMenu.Dropdown>
                                <AppMenu />
                            </DropdownMenu.Dropdown>
                        </DropdownMenu>
                        <NavigateButtons />
                    </Group>
                </Grid.Col>
            </Grid>
        </div>
    );
};

const NavigateButtons = () => {
    const navigate = useNavigate();

    return (
        <>
            <Button onClick={() => navigate(-1)} p="0">
                <Icon icon="arrowLeftS" size="lg" />
            </Button>
            <Button onClick={() => navigate(1)} p="0">
                <Icon icon="arrowRightS" size="lg" />
            </Button>
        </>
    );
};
