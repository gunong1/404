import React, { type ReactNode } from 'react';
import './BentoItem.css';

interface BentoItemProps {
    title?: string;
    subtitle?: string;
    children?: ReactNode;
    colSpan?: number;
    rowSpan?: number;
    className?: string;
    dark?: boolean;
    onClick?: () => void;
}

const BentoItem: React.FC<BentoItemProps> = ({
    title,
    subtitle,
    children,
    colSpan = 1,
    rowSpan = 1,
    className = '',
    dark = false,
    onClick
}) => {
    const style = {
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
    };

    return (
        <div
            className={`bento-item ${dark ? 'dark' : 'glass'} ${className}`}
            style={style}
            onClick={onClick}
        >
            <div className="bento-content">
                {(title || subtitle) && (
                    <div className="bento-header">
                        {subtitle && <span className="bento-subtitle">{subtitle}</span>}
                        {title && <h3 className="bento-title">{title}</h3>}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};

export default BentoItem;
