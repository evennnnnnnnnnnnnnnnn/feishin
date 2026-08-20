import { ItemListKey } from '@feishin/core/types/types';
import { Button } from '@feishin/ui/components/button/button';
import { DropdownMenu } from '@feishin/ui/components/dropdown-menu/dropdown-menu';
import { Select } from '@feishin/ui/components/select/select';

import { useSelectFilter } from '/@/renderer/features/shared/hooks/use-select-filter';

export type SelectOption = string | { label: string; value: string };

interface ListSelectFilterProps {
    data?: Array<SelectOption>;
    filterKey: string;
    listKey: ItemListKey;
}

export const ListSelectFilter = ({ data, filterKey, listKey }: ListSelectFilterProps) => {
    const selectData = data || [];

    const { setValue, value } = useSelectFilter(filterKey, '', listKey);

    const handleSetValue = (newValue: string) => {
        if (newValue === value) {
            setValue('');
            return;
        }

        setValue(newValue);
    };

    const getOptionLabel = (option: SelectOption): string => {
        if (typeof option === 'string') {
            return option;
        }
        return option.label;
    };

    const getOptionValue = (option: SelectOption): string => {
        if (typeof option === 'string') {
            return option;
        }
        return option.value;
    };

    const selectedOption = selectData.find((option) => getOptionValue(option) === value);
    const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : '—';

    return (
        <Select
            data={selectData}
            onChange={(value) => handleSetValue(value ?? '')}
            value={value ?? ''}
        />
    );

    return (
        <DropdownMenu position="bottom-start">
            <DropdownMenu.Target>
                <Button variant="subtle">{selectedLabel}</Button>
            </DropdownMenu.Target>
            <DropdownMenu.Dropdown>
                {selectData.map((option) => {
                    const optionValue = getOptionValue(option);
                    const optionLabel = getOptionLabel(option);

                    return (
                        <DropdownMenu.Item
                            isSelected={value === optionValue}
                            key={`${filterKey}-${optionValue}`}
                            onClick={() => handleSetValue(optionValue)}
                            value={optionValue}
                        >
                            {optionLabel}
                        </DropdownMenu.Item>
                    );
                })}
            </DropdownMenu.Dropdown>
        </DropdownMenu>
    );
};
