import { useState } from 'react';

import styles from './lyric-text-editor.module.css';

import { TextInput } from '/@/shared/components/text-input/text-input';

interface LyricTextEditorProps {
    initialValue: string;
    onCancel: () => void;
    onSubmit: (text: string) => void;
}

export const LyricTextEditor = ({ initialValue, onCancel, onSubmit }: LyricTextEditorProps) => {
    const [value, setValue] = useState(initialValue);

    return (
        <TextInput
            autoFocus
            classNames={{ input: styles.input }}
            onBlur={onCancel}
            onChange={(event) => setValue(event.currentTarget.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    onSubmit(value);
                } else if (event.key === 'Escape') {
                    onCancel();
                }
            }}
            value={value}
            w="100%"
        />
    );
};
