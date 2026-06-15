import type { BatchFileError } from '/@/shared/types/tag-editor';

import { KNOWN_TAG_MAP } from './known-tags';

export const base64ToBytes = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

export const formatBatchFileErrors = (failed: BatchFileError[], summary: string): string => {
    const details = failed
        .slice(0, 3)
        .map((f) => f.path.split(/[/\\]/).pop() ?? f.path)
        .join(', ');
    const suffix = failed.length > 3 ? '…' : '';
    return `${summary} ${details}${suffix}`;
};

export const filterTagSummary = (
    tagSummary: Record<string, null | string>,
): Record<string, null | string> => {
    const filtered: Record<string, null | string> = {};
    for (const [k, v] of Object.entries(tagSummary)) {
        if (KNOWN_TAG_MAP.has(k)) filtered[k] = v;
    }
    return filtered;
};
