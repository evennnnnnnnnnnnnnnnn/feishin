import { Select, SelectProps } from '@feishin/ui/components/select/select';
import { useTranslation } from 'react-i18next';

export interface YesNoSelectProps extends SelectProps {}

export const YesNoSelect = ({ ...props }: YesNoSelectProps) => {
    const { t } = useTranslation();

    return (
        <Select
            clearable
            data={[
                {
                    label: t('common.no'),
                    value: 'false',
                },
                {
                    label: t('common.yes'),
                    value: 'true',
                },
            ]}
            {...props}
        />
    );
};
