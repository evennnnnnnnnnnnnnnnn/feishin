import { Code } from '@feishin/ui/components/code/code';

import styles from './json-preview.module.css';

interface JsonPreviewProps {
    value: Record<string, any> | string;
}

export const JsonPreview = ({ value }: JsonPreviewProps) => {
    return (
        <Code block className={styles.preview} lang="json" p="md">
            {JSON.stringify(value, null, 2)}
        </Code>
    );
};
