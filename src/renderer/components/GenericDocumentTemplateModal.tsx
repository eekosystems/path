import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Copy, FileText, Edit3, Check } from 'lucide-react';
import { GenericSection } from '../types/generic';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  isCustom: boolean;
  sections: GenericSection[];
  createdAt?: string;
  updatedAt?: string;
}

interface DocumentTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: DocumentTemplate[];
  currentSections: GenericSection[];
  onSaveTemplates: (templates: DocumentTemplate[]) => void;
  onLoadTemplate: (sections: GenericSection[]) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const GenericDocumentTemplateModal: React.FC<DocumentTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  currentSections,
  onSaveTemplates,
  onLoadTemplate,
  addNotification
}) => {
  const [localTemplates, setLocalTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showNewTemplateInput, setShowNewTemplateInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Ensure all templates have isCustom flag properly set
      const fixedTemplates = templates.map(template => {
        // If template doesn't have isCustom flag, determine it based on name
        if (template.isCustom === undefined) {
          // Only "Immigration Document" with exactly 3 sections is a default template
          // "Blank Document" and "Basic Contract" should be marked as custom (deletable)
          const isDefault = template.name === 'Immigration Document' && 
                           template.sections.length === 3 &&
                           template.sections[0]?.title === 'Beneficiary Details';
          return { ...template, isCustom: !isDefault };
        }
        // Force "Blank Document" and "Basic Contract" to be custom/deletable
        if (template.name === 'Blank Document' || template.name === 'Basic Contract') {
          return { ...template, isCustom: true };
        }
        return template;
      });
      setLocalTemplates(fixedTemplates);
      setSelectedTemplateId(null);
      setEditingTemplateId(null);
      setShowNewTemplateInput(false);
    }
  }, [isOpen, templates]);

  const selectedTemplate = localTemplates.find(t => t.id === selectedTemplateId);

  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      addNotification('Please enter a preset name', 'error');
      return;
    }

    const newTemplate: DocumentTemplate = {
      id: uuidv4(),
      name: newTemplateName.trim(),
      isCustom: true,
      sections: currentSections.map(section => ({
        ...section,
        id: uuidv4(), // New ID for template section
        fields: section.fields.map(field => ({
          ...field,
          id: uuidv4(), // New ID for template field
          value: '' // Clear values for template
        }))
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalTemplates([...localTemplates, newTemplate]);
    setNewTemplateName('');
    setShowNewTemplateInput(false);
    addNotification(`Preset "${newTemplate.name}" created successfully`, 'success');
  };

  const handleDuplicateTemplate = (template: DocumentTemplate) => {
    const duplicated: DocumentTemplate = {
      ...template,
      id: uuidv4(),
      name: `${template.name} (Copy)`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setLocalTemplates([...localTemplates, duplicated]);
    addNotification(`Preset duplicated as "${duplicated.name}"`, 'success');
  };

  const handleDeleteTemplate = (id: string) => {
    const template = localTemplates.find(t => t.id === id);
    if (!template) {
      addNotification('Preset not found', 'error');
      return;
    }
    
    // Only allow deletion of custom templates
    if (!template.isCustom) {
      addNotification('Cannot delete default presets', 'error');
      return;
    }
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the preset "${template.name}"? This action cannot be undone.`)) {
      return;
    }
    
    setLocalTemplates(localTemplates.filter(t => t.id !== id));
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
    }
    addNotification(`Preset "${template.name}" deleted successfully`, 'success');
  };

  const handleRenameTemplate = (id: string) => {
    const template = localTemplates.find(t => t.id === id);
    if (template) {
      setEditingTemplateId(id);
      setEditingName(template.name);
    }
  };

  const saveRename = () => {
    if (editingTemplateId && editingName.trim()) {
      setLocalTemplates(localTemplates.map(t => 
        t.id === editingTemplateId 
          ? { ...t, name: editingName.trim(), updatedAt: new Date().toISOString() }
          : t
      ));
      setEditingTemplateId(null);
      addNotification('Preset renamed', 'success');
    }
  };

  const handleLoadTemplate = () => {
    if (selectedTemplate) {
      // Create new instances with new IDs to avoid conflicts
      const newSections = selectedTemplate.sections.map(section => ({
        ...section,
        id: uuidv4(),
        fields: section.fields.map(field => ({
          ...field,
          id: uuidv4(),
          value: '' // Start with empty values
        }))
      }));
      onLoadTemplate(newSections);
      addNotification(`Loaded preset: ${selectedTemplate.name}`, 'success');
      onClose();
    }
  };

  const handleSaveAll = () => {
    onSaveTemplates(localTemplates);
    addNotification('Presets saved successfully', 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Document Structure Presets</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Template List */}
          <div className="w-1/3 border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="space-y-2 mb-4">
              {showNewTemplateInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Preset name..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
                  />
                  <button
                    onClick={handleSaveAsTemplate}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewTemplateInput(false);
                      setNewTemplateName('');
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewTemplateInput(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gold-600 hover:bg-gold-700 rounded-md flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Save Current as Preset
                </button>
              )}
            </div>

            <div className="space-y-2">
              {localTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg cursor-pointer transition ${
                    selectedTemplateId === template.id
                      ? 'bg-gold-100 border-2 border-gold-500'
                      : 'bg-white hover:bg-gray-100 border border-gray-200'
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  {editingTemplateId === template.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveRename();
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRename();
                        }}
                        className="p-1 text-green-600"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{template.name}</span>
                          <div className="text-xs text-gray-600 mt-1">
                            {template.sections.length} sections
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {template.isCustom ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameTemplate(template.id);
                                }}
                                className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                                title="Rename"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTemplate(template.id);
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500 px-1">Default</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Template Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                  <div className="flex gap-2">
                    {selectedTemplate.isCustom && (
                      <>
                        <button
                          onClick={() => handleRenameTemplate(selectedTemplate.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="Rename"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDuplicateTemplate(selectedTemplate)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sections Preview */}
                <div className="space-y-3">
                  {selectedTemplate.sections.map((section, index) => (
                    <div key={section.id} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2">
                        {index + 1}. {section.title}
                      </h4>
                      {section.fields.length > 0 ? (
                        <div className="space-y-1">
                          {section.fields.map((field) => (
                            <div key={field.id} className="text-xs text-gray-600">
                              • {field.label} ({field.type})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">No fields</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Load Button */}
                <button
                  onClick={handleLoadTemplate}
                  className="w-full mt-6 px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 font-medium"
                >
                  Load This Preset
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FileText className="w-12 h-12 mb-4" />
                <p>Select a preset to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {localTemplates.filter(t => t.isCustom).length} custom presets
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};