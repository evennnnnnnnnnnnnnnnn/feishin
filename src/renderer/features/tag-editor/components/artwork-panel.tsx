import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { DragDropZone } from '@feishin/ui/components/drag-drop-zone/drag-drop-zone';
import { Group } from '@feishin/ui/components/group/group';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Text } from '@feishin/ui/components/text/text';

import styles from './artwork-panel.module.css';

interface ArtworkPanelProps {
    artworkDisplayUrl: null | string;
    artworkIsMixed: boolean;
    multipleArtworksLabel: string;
    noArtworkLabel: string;
    onApplyBytes: (bytes: Uint8Array, mimeType: string) => void;
    onBrowse: () => void;
    onRemove: () => void;
    removeArtworkLabel: string;
    showRemoveButton: boolean;
}

export const ArtworkPanel = ({
    artworkDisplayUrl,
    artworkIsMixed,
    multipleArtworksLabel,
    noArtworkLabel,
    onApplyBytes,
    onBrowse,
    onRemove,
    removeArtworkLabel,
    showRemoveButton,
}: ArtworkPanelProps) => (
    <Stack gap="md" pt="md">
        <DragDropZone
            accept="image/*"
            className={styles.artworkBox}
            mode="file"
            onFileSelected={async (file) => {
                const buf = await file.arrayBuffer();
                onApplyBytes(new Uint8Array(buf), file.type);
            }}
        >
            {artworkDisplayUrl ? (
                <img alt="Cover art" className={styles.artworkImage} src={artworkDisplayUrl} />
            ) : (
                <Stack align="center" className={styles.placeholder} justify="center">
                    <Text className={styles.placeholderText}>
                        {artworkIsMixed ? multipleArtworksLabel : noArtworkLabel}
                    </Text>
                </Stack>
            )}
            <Group className={styles.iconControls} gap={4} wrap="nowrap">
                <ActionIcon
                    icon="uploadImage"
                    iconProps={{ size: 'lg' }}
                    onClick={onBrowse}
                    radius="xl"
                    size="sm"
                    variant="default"
                />
                <ActionIcon
                    aria-label={removeArtworkLabel}
                    disabled={!showRemoveButton}
                    icon="delete"
                    iconProps={{ size: 'lg' }}
                    onClick={onRemove}
                    radius="xl"
                    size="sm"
                    variant="default"
                />
            </Group>
        </DragDropZone>
    </Stack>
);
