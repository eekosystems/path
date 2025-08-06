import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Section, ApplicantData } from '../types';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: Section[];
  applicantData: ApplicantData;
  onExportPDF: () => void;
  onExportDOCX: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  sections,
  applicantData,
  onExportPDF,
  onExportDOCX
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">Document Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onExportPDF}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Export PDF
            </button>
            <button
              onClick={onExportDOCX}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Export DOCX
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <div className="max-w-3xl mx-auto bg-white shadow-lg" style={{ minHeight: '11in' }}>
            <div className="p-16">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {applicantData.visaType === 'h1b' ? 'H-1B Petition Letter' : 
                   applicantData.visaType === 'green-card' ? 'Green Card Application Letter' :
                   'Immigration Support Letter'}
                </h1>
                <p className="text-gray-600">
                  For: {applicantData.beneficiaryName || '[Beneficiary Name]'}
                </p>
              </div>

              {/* Date */}
              <div className="mb-6 text-gray-700">
                <p>{formatDate(new Date().toISOString())}</p>
              </div>

              {/* Recipient */}
              <div className="mb-6 text-gray-700">
                <p>U.S. Citizenship and Immigration Services</p>
                <p>Department of Homeland Security</p>
              </div>

              {/* Subject Line */}
              <div className="mb-6">
                <p className="font-semibold text-gray-900">
                  Re: {applicantData.visaType === 'h1b' ? 'H-1B Petition' : 
                       applicantData.visaType === 'green-card' ? 'Form I-140 Immigrant Petition' :
                       'Immigration Petition'} for {applicantData.beneficiaryName || '[Beneficiary Name]'}
                </p>
                {applicantData.caseNumber && (
                  <p className="text-gray-700">Case Number: {applicantData.caseNumber}</p>
                )}
              </div>

              {/* Salutation */}
              <div className="mb-6 text-gray-700">
                <p>Dear USCIS Officer:</p>
              </div>

              {/* Content Sections */}
              <div className="space-y-6 text-gray-700 leading-relaxed">
                {sections.map((section, index) => (
                  <div key={section.id}>
                    {section.content ? (
                      <>
                        <h3 className="font-semibold text-gray-900 mb-2">{section.title}</h3>
                        <div className="whitespace-pre-wrap">{section.content}</div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Closing */}
              <div className="mt-8 text-gray-700">
                <p>Sincerely,</p>
                <div className="mt-8">
                  <p>_______________________</p>
                  <p>{applicantData.attorneyName || '[Attorney Name]'}</p>
                  <p>Attorney for Petitioner</p>
                  <p>{applicantData.petitionerName || '[Petitioner Name]'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};