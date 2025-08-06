import React from 'react';
import { User, Building, FileText, Plus, XCircle, MessageSquare, Workflow } from 'lucide-react';
import { FormSection, FormInput, FormSelect } from '../common';
import { ApplicantData, CustomField, Template } from '../../types';

interface CaseDetailsPanelProps {
  applicantData: ApplicantData;
  updateApplicantDataField: (field: keyof ApplicantData, value: any) => void;
  addCustomField: () => void;
  updateCustomField: (id: number, field: keyof CustomField, value: string) => void;
  removeCustomField: (id: number) => void;
  allTemplates: Template[];
  handleVisaTypeChange: (type: string) => void;
}

export const CaseDetailsPanel: React.FC<CaseDetailsPanelProps> = ({
  applicantData,
  updateApplicantDataField,
  addCustomField,
  updateCustomField,
  removeCustomField,
  allTemplates,
  handleVisaTypeChange
}) => (
  <div className="space-y-6">
    <FormSection title="Template Selection" icon={Workflow} collapsible defaultExpanded={true}>
      <FormSelect
        label="Letter Template"
        value={applicantData.visaType}
        onChange={(e) => handleVisaTypeChange(e.target.value)}
      >
        {allTemplates.length > 0 ? (
          <>
            <optgroup label="Standard Templates">
              {allTemplates.filter(t => !t.isCustom).map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </optgroup>
            {allTemplates.some(t => t.isCustom) && (
              <optgroup label="Custom Templates">
                {allTemplates.filter(t => t.isCustom).map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
            )}
          </>
        ) : (
          <option value="">No templates available</option>
        )}
      </FormSelect>
    </FormSection>

    <FormSection title="Beneficiary Details" icon={User} collapsible defaultExpanded={false}>
      <FormInput 
        label="Name" 
        placeholder="Beneficiary Name" 
        value={applicantData.beneficiaryName} 
        onChange={(e) => updateApplicantDataField('beneficiaryName', e.target.value)} 
      />
      <FormInput 
        label="Nationality" 
        placeholder="Nationality" 
        value={applicantData.beneficiaryNationality} 
        onChange={(e) => updateApplicantDataField('beneficiaryNationality', e.target.value)} 
      />
      <FormInput 
        label="Current Location" 
        placeholder="e.g., San Francisco, CA" 
        value={applicantData.currentLocation} 
        onChange={(e) => updateApplicantDataField('currentLocation', e.target.value)} 
      />
    </FormSection>

    <FormSection title="Petitioner Details" icon={Building} collapsible defaultExpanded={false}>
      <FormInput 
        label="Name" 
        placeholder="Petitioner Name" 
        value={applicantData.petitionerName} 
        onChange={(e) => updateApplicantDataField('petitionerName', e.target.value)} 
      />
      <FormInput 
        label="Address" 
        placeholder="Petitioner Address" 
        value={applicantData.petitionerAddress} 
        onChange={(e) => updateApplicantDataField('petitionerAddress', e.target.value)} 
      />
    </FormSection>

    <FormSection title="Case Specifics" icon={FileText} collapsible defaultExpanded={false}>
      <FormInput 
        label="Case Number" 
        placeholder="Case Number" 
        value={applicantData.caseNumber} 
        onChange={(e) => updateApplicantDataField('caseNumber', e.target.value)} 
      />
      <FormInput 
        label="Attorney Name" 
        placeholder="Attorney Name" 
        value={applicantData.attorneyName} 
        onChange={(e) => updateApplicantDataField('attorneyName', e.target.value)} 
      />
    </FormSection>

    <FormSection title="Custom Data Points" icon={Plus} collapsible defaultExpanded={false}>
      <div className="space-y-3 pr-2">
        {applicantData.customFields && applicantData.customFields.map(field => (
          <div key={field.id} className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Label" 
              value={field.label} 
              onChange={(e) => updateCustomField(field.id, 'label', e.target.value)} 
              className="w-1/3 p-2 border rounded-md" 
            />
            <input 
              type="text" 
              placeholder="Value" 
              value={field.value} 
              onChange={(e) => updateCustomField(field.id, 'value', e.target.value)} 
              className="flex-grow p-2 border rounded-md" 
            />
            <button
              onClick={() => removeCustomField(field.id)}
              className="flex-shrink-0 p-1.5 rounded-md text-red-500 hover:bg-red-100 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={addCustomField} 
        className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-200 transition"
      >
        <Plus className="w-4 h-4" /> Add Field
      </button>
    </FormSection>

    <FormSection title="Additional Information" icon={MessageSquare} collapsible defaultExpanded={false}>
      <textarea 
        placeholder="Add any other relevant details or unstructured notes for the AI..." 
        value={applicantData.additionalInfo} 
        onChange={(e) => updateApplicantDataField('additionalInfo', e.target.value)} 
        className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-vertical min-h-[100px]" 
      />
    </FormSection>
  </div>
);