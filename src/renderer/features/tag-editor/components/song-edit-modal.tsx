import { closeAllModals } from '@mantine/modals';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useMetadataEditor } from '../hooks/use-metadata-editor';
import { ArtworkPanel } from './artwork-panel';
import styles from './song-edit-modal.module.css';
import { TagFieldRow } from './tag-field-row';

import { Button } from '/@/shared/components/button/button';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Group } from '/@/shared/components/group/group';
import { Select } from '/@/shared/components/select/select';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Table } from '/@/shared/components/table/table';
import { Tabs } from '/@/shared/components/tabs/tabs';
import { Text } from '/@/shared/components/text/text';
import { Song } from '/@/shared/types/domain-types';

export const SongEditModal = ({ songs }: { songs: Song[] }) => {
    const { t } = useTranslation();
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Opens the metadata editor modal that displays a table of editable fields for the songs, as well as an artwork panel for changing the songs' artwork
    const editor = useMetadataEditor({
        browser: window.api.browser,
        songs,
        utils: window.api.utils,
    });

    // After adding the field, scrolls to and focuses the new field's row in the table.
    const handleAddField = (key: null | string) => {
        editor.handleAddField(key);
        if (!key) return;

        // Scroll to focus on the newly added field
        requestAnimationFrame(() => {
            const row = tableContainerRef.current?.querySelector<HTMLElement>(
                `[data-field-key="${key}"]`,
            );
            row?.scrollIntoView({ block: 'nearest' });
            row?.querySelector<HTMLElement>('input, textarea')?.focus();
        });
    };

    // While loading, shows a spinner
    if (editor.isLoading) {
        return (
            <Stack align="center" gap="xs" p="xl">
                <Spinner />
                {editor.loadProgress && editor.loadProgress.total > 1 && (
                    <Text c="dimmed" size="sm">
                        {editor.loadProgress.processed} / {editor.loadProgress.total}
                    </Text>
                )}
            </Stack>
        );
    }

    // If there was an error loading the metadata, shows the error message
    if (editor.error) {
        return (
            <Stack p="md">
                <Text c="red">{editor.error}</Text>
            </Stack>
        );
    }

    return (
        <Stack gap="xs">
            <Tabs defaultValue="tags" keepMounted={false}>
                <Tabs.List>
                    <Tabs.Tab className={styles.tabLabel} value="tags">
                        {t('page.itemDetail.tagsTab', 'Tags')}
                    </Tabs.Tab>
                    <Tabs.Tab className={styles.tabLabel} value="artwork">
                        {t('page.itemDetail.artworkTab', 'Artwork')}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="tags">
                    <Stack gap="xs" pt="xs">
                        {editor.readWarning && (
                            <Text c="orange" size="sm">
                                {editor.readWarning}
                            </Text>
                        )}
                        {editor.availableToAdd.length > 0 && (
                            <Select
                                clearable
                                data={editor.availableToAdd}
                                onChange={handleAddField}
                                placeholder={t('page.itemDetail.addField', 'Add field…')}
                                value={null}
                            />
                        )}
                        <div className={styles.tableScroller} ref={tableContainerRef}>
                            <Table
                                classNames={{ td: styles.tableCell, th: styles.tableHeader }}
                                highlightOnHover={false}
                                withRowBorders
                            >
                                <Table.Tbody>
                                    {editor.sortedFieldEntries.map(([key, value]) => (
                                        <TagFieldRow
                                            isDirty={key in editor.editedFields}
                                            isMixed={editor.mixedKeys.has(key)}
                                            key={key}
                                            meta={editor.getFieldMeta(key)}
                                            mixedPlaceholder={
                                                editor.mixedKeys.has(key)
                                                    ? editor.mixedPlaceholder
                                                    : undefined
                                            }
                                            onChange={(v) => editor.handleFieldChange(key, v)}
                                            onRemove={() => editor.handleRemoveField(key)}
                                            tagKey={key}
                                            value={value}
                                        />
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </div>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="artwork">
                    <ArtworkPanel
                        artworkDisplayUrl={editor.artworkDisplayUrl}
                        artworkIsMixed={editor.artworkIsMixed}
                        multipleArtworksLabel={t(
                            'page.itemDetail.multipleArtworks',
                            'Multiple Artworks',
                        )}
                        noArtworkLabel={t('page.itemDetail.noArtwork', 'No Artwork')}
                        onApplyBytes={editor.applyArtworkBytes}
                        onBrowse={editor.handleChangeArtwork}
                        onRemove={editor.handleRemoveArtwork}
                        removeArtworkLabel={t('page.itemDetail.removeArtwork', 'Remove Artwork')}
                        showRemoveButton={editor.showRemoveArtworkButton}
                    />
                </Tabs.Panel>
            </Tabs>

            <Checkbox
                checked={editor.rescan}
                label={t('page.itemDetail.triggerRescan')}
                onChange={(e) => editor.setRescan(e.currentTarget.checked)}
            />

            <Group justify="flex-end">
                <Button onClick={() => closeAllModals()} variant="subtle">
                    {t('common.cancel', 'Cancel')}
                </Button>
                <Button loading={editor.isSaving} onClick={editor.handleSave} variant="filled">
                    {editor.isSaving && editor.loadProgress && editor.loadProgress.total > 1
                        ? `${t('common.save', 'Save')} (${editor.loadProgress.processed}/${editor.loadProgress.total})`
                        : t('common.save', 'Save')}
                </Button>
            </Group>
        </Stack>
    );
};
