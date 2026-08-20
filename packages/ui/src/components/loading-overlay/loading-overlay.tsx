import { Spinner } from '@feishin/ui/components/spinner/spinner';
import {
    LoadingOverlay as MantineLoadingOverlay,
    LoadingOverlayProps as MantineLoadingOverlayProps,
} from '@mantine/core';

interface LoadingOverlayProps extends MantineLoadingOverlayProps {
    color?: string;
    opacity?: number;
}

export const LoadingOverlay = ({ ...props }: LoadingOverlayProps) => {
    return (
        <MantineLoadingOverlay
            loaderProps={{ children: <Spinner /> }}
            overlayProps={{
                color: 'var(--theme-colors-background)',
                opacity: 0.5,
            }}
            styles={{
                root: {
                    zIndex: 150,
                },
            }}
            transitionProps={{
                duration: 0.5,
                transition: 'fade',
            }}
            {...props}
        />
    );
};
