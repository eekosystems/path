import React, { ReactNode, useState } from 'react';
import { LucideIcon, ChevronDown, ChevronRight } from 'lucide-react';

interface FormSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultExpanded = true,
  collapsible = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!collapsible) {
    return (
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2 border-b pb-2">
          <Icon className="w-5 h-5 text-gray-400" />
          {title}
        </h3>
        <div className="space-y-4">{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left"
      >
        <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2 border-b pb-2 hover:bg-gray-50 px-2 py-1 rounded-t-md transition-colors">
          <Icon className="w-5 h-5 text-gray-400" />
          {title}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 ml-auto transition-transform" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto transition-transform" />
          )}
        </h3>
      </button>
      {isExpanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};