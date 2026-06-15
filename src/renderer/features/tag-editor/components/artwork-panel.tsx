import { DragDropZone } from '/@/shared/components/drag-drop-zone/drag-drop-zone';
import { Button } from '/@/shared/components/button/button';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

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
    <Stack align="center" gap="md" pt="md">
        <DragDropZone
            className={styles.artworkBox}
            mode="file"
            onClick={onBrowse}
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
        </DragDropZone>
        {showRemoveButton && (
            <Button
                className={styles.removeButton}
                onClick={onRemove}
                size="sm"
                variant="subtle"
            >
                {removeArtworkLabel}
            </Button>
        )}
    </Stack>
);
