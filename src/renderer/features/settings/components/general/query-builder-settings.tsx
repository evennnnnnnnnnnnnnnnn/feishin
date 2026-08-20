import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { Button } from '@feishin/ui/components/button/button';
import { Group } from '@feishin/ui/components/group/group';
import { Select } from '@feishin/ui/components/select/select';
import { Stack } from '@feishin/ui/components/stack/stack';
import { TextInput } from '@feishin/ui/components/text-input/text-input';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { useQueryBuilderSettings, useSettingsStoreActions } from '/@/renderer/store/settings.store';

const QUERY_VALUE_INPUT_TYPES = [
    { label: 'Boolean', value: 'boolean' },
    { label: 'Date', value: 'date' },
    { label: 'Date Range', value: 'dateRange' },
    { label: 'Number', value: 'number' },
    { label: 'Playlist', value: 'playlist' },
    { label: 'String', value: 'string' },
] as const;

export const QueryBuilderSettings = memo(() => {
    const { t } = useTranslation();
    const queryBuilder = useQueryBuilderSettings();
    const { setSettings } = useSettingsStoreActions();

    const handleAddCustomField = () => {
        setSettings({
            queryBuilder: {
                tag: [
                    ...queryBuilder.tag,
                    {
                        label: '',
                        type: 'string',
                        value: '',
                    },
                ],
            },
        });
    };

    const handleRemoveCustomField = (index: number) => {
        setSettings({
            queryBuilder: {
                tag: queryBuilder.tag.filter((_, i) => i !== index),
            },
        });
    };

    const handleUpdateCustomField = (
        index: number,
        field: 'label' | 'type' | 'value',
        newValue: string,
    ) => {
        setSettings({
            queryBuilder: {
                tag: queryBuilder.tag.map((item, i) =>
                    i === index ? { ...item, [field]: newValue } : item,
                ),
            },
        });
    };

    const customFieldsOptions: SettingOption[] = [
        {
            control: (
                <Stack gap="md">
                    {queryBuilder.tag.length > 0 && (
                        <Stack gap="sm">
                            {queryBuilder.tag.map((field, index) => (
                                <Group gap="sm" key={index}>
                                    <TextInput
                                        onChange={(e) =>
                                            handleUpdateCustomField(
                                                index,
                                                'label',
                                                e.currentTarget.value,
                                            )
                                        }
                                        placeholder={t(
                                            'setting.queryBuilderCustomFields_inputLabel',
                                            {},
                                        )}
                                        value={field.label}
                                        width="30%"
                                    />
                                    <Select
                                        data={QUERY_VALUE_INPUT_TYPES}
                                        onChange={(e) =>
                                            handleUpdateCustomField(index, 'type', e || 'string')
                                        }
                                        value={field.type}
                                        width="25%"
                                    />
                                    <TextInput
                                        onChange={(e) =>
                                            handleUpdateCustomField(
                                                index,
                                                'value',
                                                e.currentTarget.value,
                                            )
                                        }
                                        placeholder={t(
                                            'setting.queryBuilderCustomFields_inputTag',
                                            {},
                                        )}
                                        value={field.value}
                                        width="30%"
                                    />
                                    <ActionIcon
                                        icon="remove"
                                        onClick={() => handleRemoveCustomField(index)}
                                        size="sm"
                                        variant="subtle"
                                    />
                                </Group>
                            ))}
                        </Stack>
                    )}
                    <Group grow>
                        <Button onClick={handleAddCustomField} variant="filled">
                            {t('common.add')}
                        </Button>
                    </Group>
                </Stack>
            ),
            description: t('setting.queryBuilderCustomFields', {
                context: 'description',
            }),
            title: t('setting.queryBuilderCustomFields'),
        },
    ];

    return <SettingsSection options={customFieldsOptions} title={t('page.setting.queryBuilder')} />;
});
