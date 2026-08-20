import i18n from '@feishin/i18n/i18n';
import { Button } from '@feishin/ui/components/button/button';
import { NumberInput } from '@feishin/ui/components/number-input/number-input';
import { Table } from '@feishin/ui/components/table/table';
import { Text } from '@feishin/ui/components/text/text';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsOptions } from '/@/renderer/features/settings/components/settings-option';
import { useGeneralSettings, useSettingsStoreActions } from '/@/renderer/store';

const options = [
    {
        label: i18n.t('setting.imageResolution_optionTable'),
        value: 'table',
    },
    {
        label: i18n.t('setting.imageResolution_optionItemCard'),
        value: 'itemCard',
    },
    {
        label: i18n.t('setting.imageResolution_optionSidebar'),
        value: 'sidebar',
    },
    {
        label: i18n.t('setting.imageResolution_optionHeader'),
        value: 'header',
    },
    {
        label: i18n.t('setting.imageResolution_optionFullScreenPlayer'),
        value: 'fullScreenPlayer',
    },
];

export const ImageResolutionSettings = memo(() => {
    const { t } = useTranslation();
    const { setSettings } = useSettingsStoreActions();
    const settings = useGeneralSettings();

    const [open, setOpen] = useState(false);

    const descriptionText = t('setting.imageResolution', {
        context: 'description',
    });

    const titleText = t('setting.imageResolution');

    return (
        <>
            <SettingsOptions
                control={
                    <>
                        <Button
                            onClick={() => setOpen(!open)}
                            size="compact-md"
                            variant={open ? 'subtle' : 'filled'}
                        >
                            {t(open ? 'common.close' : 'common.edit')}
                        </Button>
                    </>
                }
                description={descriptionText}
                title={titleText}
            />
            {open && (
                <Table withRowBorders={false}>
                    <Table.Tbody>
                        {options.map((option) => (
                            <Table.Tr key={option.value}>
                                <Table.Th key={option.value}>
                                    <Text>{option.label}</Text>
                                </Table.Th>
                                <Table.Td align="right" key={option.value}>
                                    <NumberInput
                                        max={2000}
                                        min={0}
                                        onChange={(e) => {
                                            if (typeof e !== 'number') return;

                                            setSettings({
                                                general: {
                                                    ...settings,
                                                    imageRes: {
                                                        ...settings.imageRes,
                                                        [option.value]: e,
                                                    },
                                                },
                                            });
                                        }}
                                        rightSection={
                                            <Text isMuted isNoSelect pr="lg" size="sm">
                                                px
                                            </Text>
                                        }
                                        value={settings.imageRes[option.value]}
                                        width={90}
                                    />
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </>
    );
});
