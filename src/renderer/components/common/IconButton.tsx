import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
  spin?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon: Icon, 
  onClick, 
  disabled, 
  tooltip, 
  className = '', 
  spin = false,
  type = 'button'
}) => {
  const button = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`icon-button ${className}`}
    >
      <Icon className={`w-5 h-5 ${spin ? 'animate-spin' : ''}`} />
    </button>
  );

  if (tooltip) {
    return <Tooltip text={tooltip}>{button}</Tooltip>;
  }

  return button;
};