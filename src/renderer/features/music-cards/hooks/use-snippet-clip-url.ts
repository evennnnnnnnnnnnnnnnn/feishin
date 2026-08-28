import { useEffect, useState } from 'react';

import { getSnippetClip } from '/@/renderer/features/music-cards/storage/music-card-clip-storage';
import { logger } from '/@/renderer/utils/logger';

/**
 * Object URL for a snippet's locally stored audio clip, or null when there is
 * no clip yet (callers fall back to seek-and-stop stream playback). The URL is
 * revoked on unmount and whenever the snippet changes.
 */
export const useSnippetClipUrl = (snippetId: string | undefined): null | string => {
    const [url, setUrl] = useState<null | string>(null);

    useEffect(() => {
        if (!snippetId) {
            setUrl(null);
            return;
        }

        let objectUrl: null | string = null;
        let cancelled = false;

        getSnippetClip(snippetId)
            .then((clip) => {
                if (cancelled || !clip) {
                    setUrl(null);
                    return;
                }

                objectUrl = URL.createObjectURL(clip);
                setUrl(objectUrl);
            })
            .catch((error) => {
                logger.warn('Failed to read music card clip', {
                    error: String(error),
                    snippetId,
                });
                if (!cancelled) setUrl(null);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [snippetId]);

    return url;
};
