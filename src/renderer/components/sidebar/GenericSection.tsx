import React, { useState } from 'react';
import { GenericSection as GenericSectionType, GenericField, FieldType } from '../../types/generic';
import { GenericFieldInput } from '../common/GenericFieldInput';
import { ChevronDown, ChevronRight, Plus, Edit3, Check, X, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface GenericSectionProps {
  section: GenericSectionType;
  onUpdate: (section: GenericSectionType) => void;
  onDelete: () => void;
  isEditable?: boolean;
}

export const GenericSection: React.FC<GenericSectionProps> = ({
  section,
  onUpdate,
  onDelete,
  isEditable = true
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(section.title);
  const [isEditingFields, setIsEditingFields] = useState(false);

  const toggleExpanded = () => {
    onUpdate({ ...section, isExpanded: !section.isExpanded });
  };

  const updateTitle = () => {
    onUpdate({ ...section, title: tempTitle });
    setIsEditingTitle(false);
  };

  const cancelEditTitle = () => {
    setTempTitle(section.title);
    setIsEditingTitle(false);
  };

  const addField = () => {
    const newField: GenericField = {
      id: uuidv4(),
      label: 'New Field',
      value: '',
      type: 'text',
      placeholder: ''
    };
    onUpdate({
      ...section,
      fields: [...section.fields, newField]
    });
  };

  const updateField = (fieldId: string, updates: Partial<GenericField>) => {
    onUpdate({
      ...section,
      fields: section.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    });
  };

  const deleteField = (fieldId: string) => {
    onUpdate({
      ...section,
      fields: section.fields.filter(field => field.id !== fieldId)
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={toggleExpanded}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {section.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
            
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="w-full max-w-[200px] px-2 py-1 text-sm font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={updateTitle}
                  className="p-1 text-green-600 hover:text-green-700 flex-shrink-0"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelEditTitle}
                  className="p-1 text-red-600 hover:text-red-700 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h3 className="text-sm font-semibold text-gray-900 flex-1">
                {section.title}
              </h3>
            )}
          </div>
          
          {isEditable && !isEditingTitle && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditingTitle(true)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit section title"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditingFields(!isEditingFields)}
                className={`p-1 transition-colors ${
                  isEditingFields 
                    ? 'text-gold-600 bg-gold-50' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title={isEditingFields ? "Done editing" : "Edit fields"}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete section"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="cursor-move p-1 text-gray-400">
                <GripVertical className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
        
        {section.isExpanded && (
          <div className="space-y-3 mt-4">
            {section.fields.map((field) => (
              <GenericFieldInput
                key={field.id}
                field={field}
                onChange={(value) => updateField(field.id, { value })}
                onLabelChange={(label) => updateField(field.id, { label })}
                onTypeChange={(type) => updateField(field.id, { type })}
                onDelete={() => deleteField(field.id)}
                isEditing={isEditingFields}
              />
            ))}
            
            {isEditingFields && (
              <button
                onClick={addField}
                className="w-full py-2 px-3 text-sm text-gold-600 font-medium bg-gold-50 hover:bg-gold-100 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Field
              </button>
            )}
            
            {section.fields.length === 0 && !isEditingFields && (
              <p className="text-sm text-gray-500 text-center py-4">
                No fields yet. Click edit to add fields.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};