import React from 'react';
import { GenericField, FieldType } from '../../types/generic';
import { X, GripVertical } from 'lucide-react';

interface GenericFieldInputProps {
  field: GenericField;
  onChange: (value: string) => void;
  onLabelChange: (label: string) => void;
  onTypeChange: (type: FieldType) => void;
  onDelete: () => void;
  isEditing: boolean;
}

export const GenericFieldInput: React.FC<GenericFieldInputProps> = ({
  field,
  onChange,
  onLabelChange,
  onTypeChange,
  onDelete,
  isEditing
}) => {
  const renderInput = () => {
    switch (field.type) {
      case 'longText':
        return (
          <textarea
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
            rows={3}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter email...`}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        );
      
      case 'phone':
        return (
          <input
            type="tel"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter phone number...`}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        );
      
      case 'url':
        return (
          <input
            type="url"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter URL...`}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        );
      
      case 'select':
        return (
          <select
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          >
            <option value="">Select {field.label.toLowerCase()}...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            type="text"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
        );
    }
  };

  return (
    <div className="group relative">
      <div className="flex items-start gap-2">
        {isEditing && (
          <div className="pt-8 cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => onLabelChange(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1 text-sm font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="Field label..."
                />
                <select
                  value={field.type}
                  onChange={(e) => onTypeChange(e.target.value as FieldType)}
                  className="w-full sm:w-auto px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                >
                  <option value="text">Text</option>
                  <option value="longText">Long Text</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="url">URL</option>
                  <option value="select">Dropdown</option>
                </select>
              </>
            ) : (
              <label className="text-sm font-medium text-gray-700 break-words">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
          
          {renderInput()}
        </div>
        
        {isEditing && (
          <button
            onClick={onDelete}
            className="mt-8 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all flex-shrink-0"
            title="Delete field"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};