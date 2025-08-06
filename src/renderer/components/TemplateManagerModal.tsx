import React, { useState, useEffect } from 'react';
import { Plus, Minus, X, Workflow, Trash2, Pencil, Copy } from 'lucide-react';
import { IconButton } from './common';
import { Template } from '../types';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTemplates: Template[];
  onSaveTemplates: (templates: Template[]) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  allTemplates,
  onSaveTemplates,
  addNotification
}) => {
  const [localTemplates, setLocalTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalTemplates(JSON.parse(JSON.stringify(allTemplates)));
    }
  }, [isOpen, allTemplates]);

  const selectedTemplate = localTemplates.find(t => t.id === selectedTemplateId);

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name: "Untitled Template",
      isCustom: true,
      sections: [{ title: "New Section", prompt: "Your prompt here..." }]
    };
    setLocalTemplates([...localTemplates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      setLocalTemplates(localTemplates.filter(t => t.id !== id));
      if (selectedTemplateId === id) {
        setSelectedTemplateId(null);
      }
      addNotification("Template deleted.", "info");
    }
  };

  const handleDuplicateTemplate = (templateId: string) => {
    const templateToDuplicate = localTemplates.find(t => t.id === templateId);
    if (!templateToDuplicate) return;

    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name: `${templateToDuplicate.name} (Copy)`,
      isCustom: true,
      sections: JSON.parse(JSON.stringify(templateToDuplicate.sections))
    };
    
    setLocalTemplates([...localTemplates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    addNotification(`Template "${templateToDuplicate.name}" duplicated successfully!`, "success");
  };

  const handleUpdateField = (templateId: string, path: string[], value: any) => {
    setLocalTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        const newTemplate = JSON.parse(JSON.stringify(t));
        let current: any = newTemplate;
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        return newTemplate;
      }
      return t;
    }));
  };

  const handleAddSection = (templateId: string) => {
    setLocalTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        const newTemplate = JSON.parse(JSON.stringify(t));
        newTemplate.sections.push({ 
          title: "New Section", 
          prompt: "Your prompt here..." 
        });
        return newTemplate;
      }
      return t;
    }));
  };

  const handleRemoveSection = (templateId: string, sectionIndex: number) => {
    setLocalTemplates(prev => prev.map(t => {
      if (t.id === templateId) {
        const newTemplate = JSON.parse(JSON.stringify(t));
        newTemplate.sections.splice(sectionIndex, 1);
        return newTemplate;
      }
      return t;
    }));
  };

  const handleSaveChanges = () => {
    onSaveTemplates(localTemplates);
    addNotification("Templates saved successfully!", "success");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-lg shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Workflow className="w-6 h-6 text-gold-600" /> Template Manager
          </h2>
          <IconButton 
            icon={X} 
            onClick={onClose} 
            tooltip="Close" 
            className="text-gray-500 hover:bg-gray-100" 
          />
        </div>
        
        <div className="flex flex-1 min-h-0">
          <div className="w-1/3 bg-white border-r flex flex-col">
            <div className="p-4">
              <button 
                onClick={handleCreateTemplate} 
                className="w-full btn-primary"
              >
                <Plus className="w-4 h-4" /> Create New Template
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {['Standard Templates', 'Custom Templates'].map(group => {
                const templatesInGroup = localTemplates.filter(t => 
                  (group === 'Custom Templates') === t.isCustom
                );
                if (templatesInGroup.length === 0) return null;
                
                return (
                  <div key={group} className="p-2">
                    <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {group}
                    </h3>
                    <div className="mt-1 space-y-1">
                      {templatesInGroup.map(t => (
                        <div key={t.id} className="group flex items-center gap-1">
                          <button 
                            onClick={() => setSelectedTemplateId(t.id)} 
                            className={`flex-1 text-left flex items-center justify-between p-2 rounded-md text-sm ${
                              selectedTemplateId === t.id 
                                ? 'bg-gold-100 text-gold-700 font-semibold' 
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                            {selectedTemplateId === t.id && <Pencil className="w-4 h-4" />}
                          </button>
                          <IconButton
                            icon={Copy}
                            onClick={() => handleDuplicateTemplate(t.id)}
                            tooltip="Duplicate Template"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:bg-gray-100"
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="w-2/3 flex flex-col">
            {selectedTemplate ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b">
                  <label className="text-sm font-medium text-gray-600">Template Name</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedTemplate.name}
                      onChange={(e) => handleUpdateField(selectedTemplate.id, ['name'], e.target.value)}
                      className="w-full p-2 text-lg font-bold border border-gray-300 rounded-md"
                    />
                    <IconButton 
                      icon={Trash2} 
                      onClick={() => handleDeleteTemplate(selectedTemplate.id)} 
                      disabled={!selectedTemplate.isCustom} 
                      tooltip={selectedTemplate.isCustom ? "Delete Template" : "Cannot delete standard templates"} 
                      className="text-red-500 hover:bg-red-100" 
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3">Sections</h3>
                    
                    {selectedTemplate.sections.map((section, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-600">
                            Section {index + 1}: Title
                          </label>
                          <IconButton 
                            icon={Minus} 
                            onClick={() => handleRemoveSection(selectedTemplate.id, index)} 
                            tooltip="Remove Section" 
                            className="text-red-500 hover:bg-red-100" 
                          />
                        </div>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleUpdateField(
                            selectedTemplate.id, 
                            ['sections', index, 'title'], 
                            e.target.value
                          )}
                          className="w-full p-2 border rounded-md mb-3"
                        />
                        <label className="text-sm font-medium text-gray-600">Prompt</label>
                        <textarea
                          value={section.prompt}
                          onChange={(e) => handleUpdateField(
                            selectedTemplate.id, 
                            ['sections', index, 'prompt'], 
                            e.target.value
                          )}
                          className="w-full p-2 border rounded-md min-h-[100px] text-sm"
                        />
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => handleAddSection(selectedTemplate.id)} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300"
                    >
                      <Plus className="w-4 h-4" /> Add Section
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                <p>Select a template to edit or create a new one.</p>
              </div>
            )}
            
            <div className="p-4 border-t bg-white">
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveChanges} className="btn-success">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};