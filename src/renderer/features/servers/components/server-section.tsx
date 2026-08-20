import { Text } from '@feishin/ui/components/text/text';
import React, { Fragment } from 'react';

interface ServerSectionProps {
    children: React.ReactNode;
    title: React.ReactNode | string;
}

export const ServerSection = ({ children, title }: ServerSectionProps) => {
    return (
        <Fragment>
            {React.isValidElement(title) ? title : <Text>{title}</Text>}
            <div style={{ padding: '1rem' }}>{children}</div>
        </Fragment>
    );
};
