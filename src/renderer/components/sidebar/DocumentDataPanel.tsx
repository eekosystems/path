import React, { useState } from 'react';
import { FileText, Plus, Settings2 } from 'lucide-react';
import { GenericSection } from './GenericSection';
import { GenericSection as GenericSectionType, DOCUMENT_TEMPLATES } from '../../types/generic';
import { v4 as uuidv4 } from 'uuid';
import { FormSection } from '../common';

interface DocumentDataPanelProps {
  sections: GenericSectionType[];
  onUpdateSections: (sections: GenericSectionType[]) => void;
  onLoadTemplate: (templateId: string) => void;
  onManageTemplates?: () => void;
  documentTemplates?: any[];
}

export const DocumentDataPanel: React.FC<DocumentDataPanelProps> = ({
  sections,
  onUpdateSections,
  onLoadTemplate,
  onManageTemplates,
  documentTemplates = []
}) => {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const addSection = () => {
    const newSection: GenericSectionType = {
      id: uuidv4(),
      title: 'New Section',
      fields: [],
      isExpanded: true,
      order: sections.length + 1
    };
    onUpdateSections([...sections, newSection]);
  };

  const updateSection = (sectionId: string, updatedSection: GenericSectionType) => {
    onUpdateSections(
      sections.map(section =>
        section.id === sectionId ? updatedSection : section
      )
    );
  };

  const deleteSection = (sectionId: string) => {
    onUpdateSections(sections.filter(section => section.id !== sectionId));
  };

  const loadTemplate = (templateId: string) => {
    // Find template in documentTemplates array
    const template = documentTemplates.find(t => t.id === templateId);
    if (template) {
      // Load the sections from the template
      onUpdateSections(template.sections);
      setShowTemplateMenu(false);
    }
  };


  return (
    <div className="space-y-6">
      <FormSection title="Document Data" icon={FileText} collapsible defaultExpanded={true}>
          <div className="space-y-4">
          {/* Template selector */}
          <div className="mb-4 space-y-2">
            <div className="relative">
              <button
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                Load Preset
              </button>
              {showTemplateMenu && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
                  {documentTemplates.length > 0 ? (
                    documentTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => loadTemplate(template.id)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md flex items-center justify-between"
                      >
                        <span>{template.name}</span>
                        {template.isCustom && <span className="text-xs text-gray-500">Custom</span>}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No presets available. Click "Manage Presets" to create one.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {onManageTemplates && (
              <button
                onClick={onManageTemplates}
                className="w-full px-4 py-2 text-sm font-medium text-gold-600 bg-gold-50 border border-gold-200 rounded-md hover:bg-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500 flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Manage Presets
              </button>
            )}
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <GenericSection
              key={section.id}
              section={section}
              onUpdate={(updatedSection) => updateSection(section.id, updatedSection)}
              onDelete={() => deleteSection(section.id)}
            />
          ))}

          {sections.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No sections yet</p>
              <p className="text-sm text-gray-400 mb-6">
                Start by loading a template or creating your own sections
              </p>
            </div>
          )}

          {/* Add section button */}
          <button
            onClick={addSection}
            className="w-full py-3 px-4 text-sm font-medium text-gold-600 bg-gold-50 hover:bg-gold-100 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
          </div>
        </FormSection>
    </div>
  );
};