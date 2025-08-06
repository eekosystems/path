import React from 'react';
import { Tooltip } from './Tooltip';

interface TooltipWrapperProps {
  title?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ title, children, position = 'auto' }) => {
  if (!title) {
    return children;
  }

  // Clone the child element and remove the title prop to prevent native tooltip
  const childWithoutTitle = React.cloneElement(children, {
    ...children.props,
    title: undefined
  });

  return (
    <Tooltip text={title} position={position}>
      {childWithoutTitle}
    </Tooltip>
  );
};