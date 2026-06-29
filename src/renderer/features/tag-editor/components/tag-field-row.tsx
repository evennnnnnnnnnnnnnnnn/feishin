import { RiCloseLine } from 'react-icons/ri';

import type { KnownTag } from '../utils/known-tags';

import styles from './tag-field-row.module.css';

import { Button } from '/@/shared/components/button/button';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Table } from '/@/shared/components/table/table';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Textarea } from '/@/shared/components/textarea/textarea';

interface TagFieldRowProps {
    isDirty?: boolean;
    isMixed: boolean;
    meta: KnownTag;
    mixedPlaceholder?: string;
    onChange: (value: string) => void;
    onRemove: () => void;
    tagKey: string;
    value: string;
}

export const TagFieldRow = ({
    isDirty,
    isMixed,
    meta,
    mixedPlaceholder,
    onChange,
    onRemove,
    tagKey,
    value,
}: TagFieldRowProps) => (
    <Table.Tr data-field-key={tagKey} key={tagKey}>
        <Table.Th className={isDirty ? styles.dirtyLabel : undefined}>{meta.label}</Table.Th>
        <Table.Td>
            {meta.type === 'textarea' ? (
                <Textarea
                    autosize
                    maxRows={6}
                    minRows={2}
                    onChange={(e) => onChange(e.currentTarget.value)}
                    placeholder={mixedPlaceholder}
                    size="sm"
                    value={value}
                />
            ) : meta.type === 'number' ? (
                <NumberInput
                    onChange={(v) => onChange(v === undefined ? '' : String(v))}
                    placeholder={mixedPlaceholder}
                    size="sm"
                    value={isMixed || value === '' ? undefined : Number(value)}
                />
            ) : meta.type === 'boolean' ? (
                <Checkbox
                    checked={!isMixed && value === '1'}
                    indeterminate={isMixed}
                    onChange={(e) => onChange(e.currentTarget.checked ? '1' : '0')}
                    size="sm"
                />
            ) : (
                <TextInput
                    onChange={(e) => onChange(e.currentTarget.value)}
                    placeholder={mixedPlaceholder}
                    size="sm"
                    value={value}
                />
            )}
        </Table.Td>
        <Table.Td className={styles.removeCell}>
            <Button className={styles.removeButton} onClick={onRemove} size="sm" variant="subtle">
                <RiCloseLine size={16} />
            </Button>
        </Table.Td>
    </Table.Tr>
);
