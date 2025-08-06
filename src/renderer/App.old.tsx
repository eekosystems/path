// Paste the full App component code you provided earlier into this file.
// Make sure the default export remains 'App'.

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, RefreshCw, Edit3, Save, X, FileText, Cloud, Upload, Eye, Trash2, CheckCircle, AlertCircle, Settings, Globe, Loader2, Info, ListChecks, ChevronUp, ChevronDown, KeyRound, XCircle, Eraser, RotateCcw, FileUp, Building, User, FolderOpen, PanelRightOpen, PanelRightClose, BookUser, Paperclip, Workflow, Pencil, Lock } from 'lucide-react';

// --- CONFIGURATION (Default templates) ---
const DEFAULT_TEMPLATES = {
    "H-1B Visa Letter": {
        id: 'default-h1b',
        name: "H-1B Visa Letter",
        isCustom: false,
        variants: {
            "Standard": {
                description: "Default prompts for a standard H-1B petition.",
                sections: [
                    { title: "Petitioner Introduction and Background", prompt: "Draft a professional introduction identifying the petitioning employer, including company history, size, industry, annual revenue, and number of employees. Emphasize the company's legitimacy and stability." },
                    { title: "Position Description and Requirements", prompt: "Provide a detailed description of the H-1B position including job title, duties, responsibilities, and minimum requirements. Explain why this position requires a specialty occupation and bachelor's degree or higher." },
                    { title: "Beneficiary Qualifications", prompt: "Detail the beneficiary's educational background, professional experience, and specialized skills that qualify them for the H-1B position." },
                    { title: "Specialty Occupation Justification", prompt: "Explain how the position qualifies as a specialty occupation requiring theoretical and practical application of specialized knowledge." },
                    { title: "Terms of Employment", prompt: "Outline the employment terms including salary (confirming it meets prevailing wage), work location, employment dates, and benefits." },
                    { title: "Employer-Employee Relationship", prompt: "Establish the employer-employee relationship, confirming the petitioner's right to control the beneficiary's work." }
                ]
            },
            "RFE Response (Specialty Occupation)": {
                description: "Prompts tailored to addressing a common 'Specialty Occupation' RFE.",
                sections: [
                    { title: "Introduction & RFE Summary", prompt: "Draft an introduction that acknowledges receipt of the Request for Evidence (RFE), references the case number, and briefly summarizes that the RFE questions the position's qualification as a specialty occupation." },
                    { title: "In-Depth Position Analysis", prompt: "Provide an exhaustive breakdown of the job duties. For each duty, specify the percentage of time spent and explain why it requires the application of a specialized body of knowledge. Go far beyond the initial job description." },
                    { title: "Connecting Duties to Degree", prompt: "Explicitly link the complex duties of the role to specific coursework and theoretical knowledge gained from the beneficiary's bachelor's degree (or higher) in a specific field." },
                    { title: "Industry Standard & Precedent", prompt: "Present evidence that similar companies in the industry require a degree in a specific specialty for similar positions. Reference O*NET, prior company hiring practices, and letters from industry experts if available." },
                    { title: "Conclusion and Reiteration", prompt: "Conclude by summarizing the evidence provided and respectfully asserting that the position has been proven to be a specialty occupation and requesting approval of the petition." }
                ]
            }
        }
    },
    "Green Card Application Letter": {
        id: 'default-gc',
        name: "Green Card Application Letter",
        isCustom: false,
        variants: {
            "Standard": {
                description: "Default prompts for a Green Card application.",
                sections: [
                    { title: "Petitioner and Beneficiary Overview", prompt: "Introduce the petitioner and beneficiary, establishing the basis for the green card application (employment-based category, family-based, etc.)." },
                    { title: "Eligibility Category Justification", prompt: "Provide detailed justification for the specific green card category (EB-1, EB-2, EB-3, family-based, etc.)." },
                    { title: "Evidence of Qualifications", prompt: "Detail all evidence supporting the beneficiary's qualifications including education, experience, achievements, awards, or family relationships." },
                    { title: "Labor Certification Details (if applicable)", prompt: "For employment-based petitions requiring labor certification, explain the PERM process completion and recruitment efforts." },
                    { title: "National Interest or Extraordinary Ability (if applicable)", prompt: "For EB-1 or EB-2 NIW petitions, articulate the beneficiary's extraordinary ability or how their work is in the national interest." },
                    { title: "Immigration History and Admissibility", prompt: "Address the beneficiary's immigration history, current status, and confirm admissibility to the United States." }
                ]
            }
        }
    },
};
const INDUSTRY_CONTEXTS = { "Technology": "Include emphasis on STEM fields, emerging technologies, innovation, and technical expertise. Address prevailing wage requirements for tech positions.", "Healthcare": "Emphasize patient care, medical licensure requirements, J-1 waiver issues if applicable, and critical healthcare workforce needs.", "Education": "Focus on academic credentials, research contributions, teaching experience, and educational institution requirements.", "Business/Finance": "Highlight business acumen, financial expertise, regulatory knowledge, and contribution to U.S. economic growth.", "Arts/Entertainment": "Emphasize creative achievements, performances, exhibitions, and cultural contributions to substantiate extraordinary ability.", "Manufacturing/Engineering": "Detail technical expertise, engineering credentials, industrial applications, and contribution to U.S. manufacturing competitiveness.", "Research/Science": "Focus on research contributions, publications, citations, grants, and advancement of scientific knowledge." };
const COMPLEXITY_LEVELS = { "Straightforward": "Use clear, direct language for cases with strong, uncomplicated fact patterns. Focus on essential elements without excessive detail.", "Moderate": "Use professional language with moderate detail for typical cases. Include standard supporting arguments and address common issues.", "Complex": "Use sophisticated legal arguments for challenging cases. Include detailed analysis, preemptive issue addressing, and comprehensive supporting evidence references." };
const LLM_MODELS = { "GPT-4": "Most capable model for complex legal writing and nuanced arguments", "GPT-3.5-Turbo": "Efficient model for standard letter drafting with good quality", "Claude-3": "Alternative model with strong analytical capabilities", "Custom Model": "Use your organization's fine-tuned model" };

// --- HELPER & UI COMPONENTS ---

const Tooltip = ({ children, text }) => (
    <div className="relative group flex items-center">
        {children}
        <div className="absolute bottom-full mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            {text}
        </div>
    </div>
);

const IconButton = ({ icon: Icon, onClick, disabled, tooltip, className = '', spin = false }) => (
    <Tooltip text={tooltip}>
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            <Icon className={`w-5 h-5 ${spin ? 'animate-spin' : ''}`} />
        </button>
    </Tooltip>
);

const Notification = ({ notification, onDismiss }) => {
    const { id, message, type } = notification;
    const baseClasses = 'p-4 rounded-xl shadow-lg flex items-start gap-3 w-full max-w-sm transition-all duration-300';
    const typeClasses = {
        success: 'bg-green-50 text-green-800 border border-green-200',
        error: 'bg-red-50 text-red-800 border border-red-200',
        info: 'bg-sky-50 text-sky-800 border border-sky-200'
    };
    const Icon = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info
    }[type];

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(id), 5000);
        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <span className="flex-grow">{message}</span>
            <button onClick={() => onDismiss(id)} className="p-1 -m-1 rounded-full hover:bg-black/10">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const Header = ({ onToggleSidebar }) => (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <Globe className="w-9 h-9 text-indigo-600" />
            <div>
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">AI Immigration Letter Assistant</h1>
                <p className="text-gray-500 text-sm">Professional Edition</p>
            </div>
        </div>
        <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors lg:hidden"
        >
            <PanelRightOpen className="w-6 h-6" />
        </button>
    </header>
);

const Sidebar = ({
    isOpen,
    onToggleSidebar,
    applicantData,
    updateApplicantDataField,
    addCustomField,
    updateCustomField,
    removeCustomField,
    availableFiles,
    selectedDocuments,
    cloudConnections,
    isLoading,
    handleConnectService,
    handleDisconnectService,
    handleFetchFiles,
    handleFileUpload,
    addDocumentToSelection,
    removeDocumentFromSelection,
    handleDeleteLocalFile,
    viewDocument,
    apiKey,
    handleApiKeyChange,
    handleVisaTypeChange,
    handleVariantChange,
    allTemplates,
    onManageTemplates,
}) => {
    const [activeTab, setActiveTab] = useState('details');

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === id ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-700'}`}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );

    return (
        <aside className={`fixed top-0 right-0 z-30 w-full max-w-md h-full bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 lg:max-w-sm xl:max-w-md`}>
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800">Case Controls</h2>
                    <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors lg:hidden">
                        <PanelRightClose className="w-6 h-6" />
                    </button>
                </div>

                <div className="border-b border-gray-200">
                    <nav className="flex">
                        <TabButton id="details" label="Case Details" icon={BookUser} />
                        <TabButton id="docs" label="Documents" icon={FolderOpen} />
                        <TabButton id="settings" label="Settings" icon={Settings} />
                    </nav>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                    {activeTab === 'details' && <CaseDetailsPanel {...{ applicantData, updateApplicantDataField, addCustomField, updateCustomField, removeCustomField }} />}
                    {activeTab === 'docs' && <DocumentPanel {...{ availableFiles, selectedDocuments, cloudConnections, isLoading, handleConnectService, handleDisconnectService, handleFetchFiles, handleFileUpload, addDocumentToSelection, removeDocumentFromSelection, handleDeleteLocalFile, viewDocument }} />}
                    {activeTab === 'settings' && <SettingsPanel {...{ apiKey, handleApiKeyChange, applicantData, handleVisaTypeChange, handleVariantChange, updateApplicantDataField, allTemplates, onManageTemplates }} />}
                </div>
            </div>
        </aside>
    );
};

const FormSection = ({ title, icon: Icon, children }) => (
    <div className="space-y-4">
        <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2 border-b pb-2">
            <Icon className="w-5 h-5 text-gray-400" />
            {title}
        </h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const FormInput = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
    </div>
);

const FormSelect = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <select
            value={value}
            onChange={onChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition bg-white"
        >
            {children}
        </select>
    </div>
);

const CaseDetailsPanel = ({ applicantData, updateApplicantDataField, addCustomField, updateCustomField, removeCustomField }) => (
    <div className="space-y-6">
        <FormSection title="Beneficiary Details" icon={User}>
            <FormInput label="Name" placeholder="Beneficiary Name" value={applicantData.beneficiaryName} onChange={(e) => updateApplicantDataField('beneficiaryName', e.target.value)} />
            <FormInput label="Nationality" placeholder="Nationality" value={applicantData.beneficiaryNationality} onChange={(e) => updateApplicantDataField('beneficiaryNationality', e.target.value)} />
            <FormInput label="Current Location" placeholder="e.g., San Francisco, CA" value={applicantData.currentLocation} onChange={(e) => updateApplicantDataField('currentLocation', e.target.value)} />
        </FormSection>

        <FormSection title="Petitioner Details" icon={Building}>
            <FormInput label="Name" placeholder="Petitioner Name" value={applicantData.petitionerName} onChange={(e) => updateApplicantDataField('petitionerName', e.target.value)} />
            <FormInput label="Address" placeholder="Petitioner Address" value={applicantData.petitionerAddress} onChange={(e) => updateApplicantDataField('petitionerAddress', e.target.value)} />
        </FormSection>

        <FormSection title="Case Specifics" icon={FileText}>
            <FormInput label="Case Number" placeholder="Case Number" value={applicantData.caseNumber} onChange={(e) => updateApplicantDataField('caseNumber', e.target.value)} />
            <FormInput label="Attorney Name" placeholder="Attorney Name" value={applicantData.attorneyName} onChange={(e) => updateApplicantDataField('attorneyName', e.target.value)} />
        </FormSection>

        <FormSection title="Custom Data Points" icon={Plus}>
            <div className="space-y-3">
                {applicantData.customFields && applicantData.customFields.map(field => (
                    <div key={field.id} className="flex items-center gap-2">
                        <input type="text" placeholder="Label" value={field.label} onChange={(e) => updateCustomField(field.id, 'label', e.target.value)} className="w-1/3 p-2 border rounded-md" />
                        <input type="text" placeholder="Value" value={field.value} onChange={(e) => updateCustomField(field.id, 'value', e.target.value)} className="flex-grow p-2 border rounded-md" />
                        <IconButton icon={XCircle} onClick={() => removeCustomField(field.id)} tooltip="Remove Field" className="text-red-500 hover:bg-red-100" />
                    </div>
                ))}
            </div>
            <button onClick={addCustomField} className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-200 transition">
                <Plus className="w-4 h-4" /> Add Field
            </button>
        </FormSection>

        <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Additional Case Information</label>
            <textarea placeholder="Add any other relevant details or unstructured notes for the AI..." value={applicantData.additionalInfo} onChange={(e) => updateApplicantDataField('additionalInfo', e.target.value)} className="w-full p-2 border rounded-md min-h-[120px] focus:ring-indigo-500 focus:border-indigo-500 transition" />
        </div>
    </div>
);

const DocumentPanel = ({ availableFiles, selectedDocuments, cloudConnections, isLoading, handleConnectService, handleDisconnectService, handleFileUpload, addDocumentToSelection, removeDocumentFromSelection, handleDeleteLocalFile, viewDocument }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-md font-semibold text-gray-700 mb-3">Cloud Services</h3>
            <div className="space-y-3">
                {Object.keys(cloudConnections).map(key => (
                    <div key={key} className="bg-gray-50 p-3 rounded-lg border flex items-center justify-between">
                        <span className="font-semibold capitalize text-sm text-gray-800">{key.replace('Drive', ' Drive')}</span>
                        {cloudConnections[key] ? (
                            <button onClick={() => handleDisconnectService(key)} className="px-3 py-1 rounded-md text-xs font-medium border bg-red-100 text-red-700 hover:bg-red-200 transition">Disconnect</button>
                        ) : (
                            <button onClick={() => handleConnectService(key)} disabled={isLoading.connect === key} className="px-3 py-1 rounded-md text-xs font-medium border bg-sky-100 text-sky-700 hover:bg-sky-200 transition disabled:opacity-50">
                                {isLoading.connect === key ? 'Connecting...' : 'Connect'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
        <div>
            <h3 className="text-md font-semibold text-gray-700 mb-3">Global AI Context ({selectedDocuments.length})</h3>
            <div className="space-y-2">
                {selectedDocuments.length > 0 ? (
                    selectedDocuments.map(doc => <FileItem key={doc.id} file={doc} onRemove={() => removeDocumentFromSelection(doc.id)} onView={() => viewDocument(doc)} isSelected />)
                ) : (
                    <p className="text-center text-sm text-gray-500 italic py-4">Select files from below to add to global context.</p>
                )}
            </div>
        </div>
        <div className="space-y-4">
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-semibold text-gray-700">Local Files ({availableFiles.local.length})</h3>
                    <button onClick={handleFileUpload} className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition">
                        <FileUp className="w-4 h-4" /> Upload
                    </button>
                </div>
                <div className="space-y-2">
                    {availableFiles.local.length > 0 ? (
                        availableFiles.local.map(file => (
                            <FileItem key={file.id} file={file} onAdd={() => addDocumentToSelection(file)} onRemove={() => handleDeleteLocalFile(file.id)} onView={() => viewDocument(file)} isSelected={selectedDocuments.some(d => d.id === file.id)} isLocal />
                        ))
                    ) : (
                        <p className="text-center text-sm text-gray-500 italic py-4">No local files uploaded.</p>
                    )}
                </div>
            </div>
            {Object.keys(availableFiles).filter(s => s !== 'local').map(source => (
                <div key={source}>
                    <h3 className="text-md font-semibold text-gray-700 mb-3 capitalize">{source.replace('Drive', ' Drive')} Files ({availableFiles[source].length})</h3>
                    <div className="space-y-2">
                        {cloudConnections[source] ? (
                            availableFiles[source].length > 0 ? (
                                availableFiles[source].map(file => (
                                    <FileItem key={file.id} file={file} onAdd={() => addDocumentToSelection(file)} onView={() => viewDocument(file)} isSelected={selectedDocuments.some(d => d.id === file.id)} />
                                ))
                            ) : (
                                <p className="text-center text-sm text-gray-500 italic py-4">No files found.</p>
                            )
                        ) : (
                            <p className="text-center text-sm text-gray-500 italic py-4">Connect to see files.</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const FileItem = ({ file, onAdd, onRemove, onView, isSelected, isLocal }) => (
    <div className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${isSelected ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-green-600' : 'text-gray-500'}`} />
            <span className="text-sm font-medium truncate text-gray-800" title={file.filePath || file.name}>{file.filename || file.name}</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
            {onView && <IconButton icon={Eye} onClick={onView} tooltip="Preview" className="text-sky-600 hover:bg-sky-100" />}
            {isLocal && onRemove && <IconButton icon={XCircle} onClick={onRemove} tooltip="Delete File Reference" className="text-red-500 hover:bg-red-100" />}
            {isSelected ? (
                <IconButton icon={Trash2} onClick={onRemove} tooltip="Remove from Context" className="text-red-600 hover:bg-red-100" />
            ) : (
                onAdd && <IconButton icon={Plus} onClick={onAdd} tooltip="Add to Global Context" className="text-green-600 hover:bg-green-100" />
            )}
        </div>
    </div>
);


const SettingsPanel = ({ apiKey, handleApiKeyChange, applicantData, handleVisaTypeChange, handleVariantChange, updateApplicantDataField, allTemplates, onManageTemplates }) => {
    const selectedTemplate = allTemplates.find(t => t.id === applicantData.visaType);
    const customTemplates = allTemplates.filter(t => t.isCustom);
    const standardTemplates = allTemplates.filter(t => !t.isCustom);

    return (
        <div className="space-y-6">
            <FormSection title="API & Model" icon={KeyRound}>
                <FormInput
                    label="OpenAI API Key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                />
                <FormSelect
                    label="LLM Model"
                    value={applicantData.llmModel}
                    onChange={(e) => updateApplicantDataField('llmModel', e.target.value)}
                >
                    {Object.entries(LLM_MODELS).map(([key, desc]) => <option key={key} value={key}>{key} - {desc}</option>)}
                </FormSelect>
            </FormSection>
            <FormSection title="Template" icon={ListChecks}>
                <FormSelect
                    label="Case Type"
                    value={applicantData.visaType}
                    onChange={(e) => handleVisaTypeChange(e.target.value)}
                >
                    <optgroup label="Standard Templates">
                        {standardTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                    {customTemplates.length > 0 && (
                        <optgroup label="Custom Templates">
                            {customTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </optgroup>
                    )}
                </FormSelect>
                
                {selectedTemplate && !selectedTemplate.isCustom && Object.keys(selectedTemplate.variants).length > 1 && (
                    <div>
                        <FormSelect
                            label="Template Variant"
                            value={applicantData.templateVariant}
                            onChange={(e) => handleVariantChange(e.target.value)}
                        >
                            {Object.keys(selectedTemplate.variants).map(v => <option key={v} value={v}>{v}</option>)}
                        </FormSelect>
                        <p className="text-xs text-gray-500 mt-1.5">
                            {selectedTemplate.variants[applicantData.templateVariant]?.description}
                        </p>
                    </div>
                )}
                <div className="pt-2">
                    <button
                        onClick={onManageTemplates}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-200 transition"
                    >
                        <Workflow className="w-4 h-4" /> Manage Templates
                    </button>
                </div>
            </FormSection>
        </div>
    );
}

const AttachDocumentMenu = ({ availableFiles, sectionDocs, onAttach, onClose }) => {
    const menuRef = useRef(null);
    const allFiles = Object.values(availableFiles).flat();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div ref={menuRef} className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border z-20 max-h-80 overflow-y-auto">
            <div className="p-2">
                <h4 className="text-sm font-semibold text-gray-800 px-2 py-1">Attach a document</h4>
            </div>
            <div className="border-t border-gray-100">
                {allFiles.length > 0 ? allFiles.map(file => {
                    const isAttached = sectionDocs.some(d => d.id === file.id);
                    return (
                        <button
                            key={file.id}
                            onClick={() => onAttach(file)}
                            disabled={isAttached}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="truncate flex-1">{file.filename || file.name}</span>
                            {isAttached && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </button>
                    )
                }) : (
                    <p className="text-sm text-gray-500 p-4 text-center">No documents available. Upload files in the 'Documents' tab.</p>
                )}
            </div>
        </div>
    );
};


const SectionCard = ({ section, index, onUpdate, onRemove, onAddAfter, onGenerate, onClear, onToggleEdit, onAttachDoc, onRemoveDoc, availableFiles }) => {
    const [isPromptOpen, setIsPromptOpen] = useState(true);
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3 flex-grow min-w-0">
                    <span className="flex-shrink-0 bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">{index + 1}</span>
                    <input
                        type="text"
                        value={section.title}
                        onChange={(e) => onUpdate('title', e.target.value)}
                        className="text-lg font-bold text-gray-800 bg-transparent outline-none w-full focus:ring-1 focus:ring-indigo-300 rounded-md px-2"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <IconButton icon={Eraser} onClick={onClear} tooltip="Clear Output" className="text-yellow-600 hover:bg-yellow-100" />
                    <IconButton icon={RefreshCw} onClick={onGenerate} disabled={section.isGenerating} spin={section.isGenerating} tooltip="Generate" className="text-sky-600 hover:bg-sky-100" />
                    <IconButton icon={section.isEditing ? Save : Edit3} onClick={onToggleEdit} tooltip={section.isEditing ? 'Save' : 'Edit'} className="text-purple-600 hover:bg-purple-100" />
                    <IconButton icon={Minus} onClick={onRemove} tooltip="Remove Section" className="text-red-600 hover:bg-red-100" />
                    <IconButton icon={Plus} onClick={onAddAfter} tooltip="Add Section After" className="text-green-600 hover:bg-green-100" />
                </div>
            </div>
            <div className="p-5 space-y-5">
                <div>
                    <button onClick={() => setIsPromptOpen(!isPromptOpen)} className="flex items-center justify-between w-full text-left mb-2 group">
                        <label className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600">AI Prompt</label>
                        {isPromptOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </button>
                    {isPromptOpen && (
                        <textarea
                            value={section.prompt}
                            onChange={(e) => onUpdate('prompt', e.target.value)}
                            className="w-full p-3 border rounded-md bg-gray-50 min-h-[120px] text-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-gray-700">Section-Specific Documents ({section.documents.length})</label>
                        <div className="relative">
                            <IconButton icon={Paperclip} onClick={() => setIsAttachMenuOpen(prev => !prev)} tooltip="Attach Document" className="text-indigo-600 hover:bg-indigo-100" />
                            {isAttachMenuOpen && (
                                <AttachDocumentMenu
                                    availableFiles={availableFiles}
                                    sectionDocs={section.documents}
                                    onAttach={(file) => {
                                        onAttachDoc(file);
                                        setIsAttachMenuOpen(false);
                                    }}
                                    onClose={() => setIsAttachMenuOpen(false)}
                                />
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 min-h-[50px] border">
                        {section.documents.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {section.documents.map(doc => (
                                    <div key={doc.id} className="flex items-center gap-2 bg-white border rounded-full py-1 pl-2 pr-1 text-sm font-medium text-gray-700">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span className="truncate max-w-xs">{doc.filename || doc.name}</span>
                                        <button onClick={() => onRemoveDoc(doc.id)} className="p-1 rounded-full hover:bg-red-100 text-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-1">No documents attached to this section.</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Generated Content</label>
                    {section.isEditing ? (
                        <textarea
                            value={section.content}
                            onChange={(e) => onUpdate('content', e.target.value)}
                            className="w-full p-3 border rounded-md min-h-[250px] font-mono text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 transition"
                        />
                    ) : (
                        <div className="w-full p-4 border rounded-md bg-white min-h-[250px] whitespace-pre-wrap text-gray-800 prose prose-sm max-w-none">
                            {section.content || <span className="text-gray-400 italic">No content generated yet. Click the refresh icon to generate.</span>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DocumentViewerModal = ({ document, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold text-gray-800">{document.filename || document.name}</h3>
                <IconButton icon={X} onClick={onClose} tooltip="Close" className="text-gray-500 hover:bg-gray-100" />
            </div>
            <div className="flex-1 overflow-auto p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">{document.content || "Content preview not available for this file."}</pre>
            </div>
        </div>
    </div>
);

const TemplateManagerModal = ({ isOpen, onClose, allTemplates, onSaveTemplates, addNotification }) => {
    const [localTemplates, setLocalTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setLocalTemplates(JSON.parse(JSON.stringify(allTemplates)));
        }
    }, [isOpen, allTemplates]);

    const selectedTemplate = localTemplates.find(t => t.id === selectedTemplateId);
    
    const handleCreateTemplate = () => {
        const newTemplate = {
            id: `custom-${Date.now()}`,
            name: "Untitled Template",
            isCustom: true,
            variants: {
                "Standard": {
                    description: "A user-defined custom template.",
                    sections: [{ title: "New Section", prompt: "Your prompt here..." }]
                }
            }
        };
        setLocalTemplates([...localTemplates, newTemplate]);
        setSelectedTemplateId(newTemplate.id);
    };

    const handleDeleteTemplate = (id) => {
        if (window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
            setLocalTemplates(localTemplates.filter(t => t.id !== id));
            if (selectedTemplateId === id) {
                setSelectedTemplateId(null);
            }
            addNotification("Template deleted.", "info");
        }
    };

    const handleUpdateField = (templateId, path, value) => {
        setLocalTemplates(prev => prev.map(t => {
            if (t.id === templateId) {
                // A bit of magic to update a nested property
                const newTemplate = JSON.parse(JSON.stringify(t));
                let current = newTemplate;
                for (let i = 0; i < path.length - 1; i++) {
                    current = current[path[i]];
                }
                current[path[path.length - 1]] = value;
                return newTemplate;
            }
            return t;
        }));
    };

    const handleAddSection = (templateId, variantKey) => {
        setLocalTemplates(prev => prev.map(t => {
            if (t.id === templateId) {
                const newTemplate = JSON.parse(JSON.stringify(t));
                newTemplate.variants[variantKey].sections.push({ title: "New Section", prompt: "Your prompt here..." });
                return newTemplate;
            }
            return t;
        }));
    };

    const handleRemoveSection = (templateId, variantKey, sectionIndex) => {
        setLocalTemplates(prev => prev.map(t => {
            if (t.id === templateId) {
                const newTemplate = JSON.parse(JSON.stringify(t));
                newTemplate.variants[variantKey].sections.splice(sectionIndex, 1);
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
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Workflow className="w-6 h-6 text-indigo-600" /> Template Manager</h2>
                    <IconButton icon={X} onClick={onClose} tooltip="Close" className="text-gray-500 hover:bg-gray-100" />
                </div>
                <div className="flex flex-1 min-h-0">
                    <div className="w-1/3 bg-white border-r flex flex-col">
                        <div className="p-4">
                            <button onClick={handleCreateTemplate} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition">
                                <Plus className="w-4 h-4" /> Create New Template
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {['Standard Templates', 'Custom Templates'].map(group => {
                                const templatesInGroup = localTemplates.filter(t => (group === 'Custom Templates') === t.isCustom);
                                if (templatesInGroup.length === 0) return null;
                                return (
                                    <div key={group} className="p-2">
                                        <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{group}</h3>
                                        <div className="mt-1 space-y-1">
                                            {templatesInGroup.map(t => (
                                                <button key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={`w-full text-left flex items-center justify-between p-2 rounded-md text-sm ${selectedTemplateId === t.id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
                                                    <span className="truncate">{t.name}</span>
                                                    {selectedTemplateId === t.id && <Pencil className="w-4 h-4" />}
                                                </button>
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
                                        <IconButton icon={Trash2} onClick={() => handleDeleteTemplate(selectedTemplate.id)} disabled={!selectedTemplate.isCustom} tooltip={selectedTemplate.isCustom ? "Delete Template" : "Cannot delete standard templates"} className="text-red-500 hover:bg-red-100" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {Object.entries(selectedTemplate.variants).map(([variantKey, variantData]) => (
                                        <div key={variantKey} className="bg-white p-4 rounded-lg border border-gray-200">
                                            <h3 className="font-semibold text-gray-800 mb-3">
                                                {Object.keys(selectedTemplate.variants).length > 1 ? `Variant: ${variantKey}` : 'Sections'}
                                            </h3>
                                            {variantData.sections.map((section, index) => (
                                                <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-sm font-medium text-gray-600">Section {index + 1}: Title</label>
                                                        <IconButton icon={Minus} onClick={() => handleRemoveSection(selectedTemplate.id, variantKey, index)} tooltip="Remove Section" className="text-red-500 hover:bg-red-100" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={section.title}
                                                        onChange={(e) => handleUpdateField(selectedTemplate.id, ['variants', variantKey, 'sections', index, 'title'], e.target.value)}
                                                        className="w-full p-2 border rounded-md mb-3"
                                                    />
                                                    <label className="text-sm font-medium text-gray-600">Prompt</label>
                                                    <textarea
                                                        value={section.prompt}
                                                        onChange={(e) => handleUpdateField(selectedTemplate.id, ['variants', variantKey, 'sections', index, 'prompt'], e.target.value)}
                                                        className="w-full p-2 border rounded-md min-h-[100px] text-sm"
                                                    />
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddSection(selectedTemplate.id, variantKey)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300">
                                                <Plus className="w-4 h-4" /> Add Section to {variantKey}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                                <p>Select a template to edit or create a new one.</p>
                            </div>
                        )}
                        <div className="p-4 border-t bg-white">
                            <div className="flex justify-end gap-3">
                                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold hover:bg-gray-300">Cancel</button>
                                <button onClick={handleSaveChanges} className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
const App = () => {
    const defaultState = {
        applicantData: {
            beneficiaryName: '', beneficiaryNationality: '', currentLocation: '', petitionerName: '',
            petitionerType: 'Corporation', petitionerState: '', petitionerAddress: '', visaType: 'default-h1b',
            industry: 'Technology', complexity: 'Moderate', priorityDate: '', filingDate: '',
            caseNumber: '', attorneyName: '', additionalInfo: '', llmModel: 'GPT-4',
            templateVariant: 'Standard',
            customFields: []
        },
        sections: [],
        availableFiles: { local: [], googleDrive: [], dropbox: [], oneDrive: [] },
        selectedDocuments: [],
        cloudConnections: { googleDrive: false, dropbox: false, oneDrive: false },
        allTemplates: Object.values(DEFAULT_TEMPLATES),
    };

    // --- STATE MANAGEMENT ---
    const [applicantData, setApplicantData] = useState(defaultState.applicantData);
    const [sections, setSections] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [cloudCreds, setCloudCreds] = useState({ google: {}, dropbox: {}, oneDrive: {} });
    const [availableFiles, setAvailableFiles] = useState(defaultState.availableFiles);
    const [selectedDocuments, setSelectedDocuments] = useState([]);
    const [cloudConnections, setCloudConnections] = useState(defaultState.cloudConnections);
    const [allTemplates, setAllTemplates] = useState(defaultState.allTemplates);
    const [isLoading, setIsLoading] = useState({ files: false, connect: null });
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showDocumentViewer, setShowDocumentViewer] = useState(false);
    const [viewingDocument, setViewingDocument] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [nextId, setNextId] = useState(1);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

    // --- LIFECYCLE & DATA PERSISTENCE ---
    useEffect(() => {
        const loadState = async () => {
            if (window.electronAPI) {
                const storedState = await window.electronAPI.getStoreData('appState') || {};
                const loadedData = storedState.applicantData || defaultState.applicantData;
                if (!loadedData.customFields) loadedData.customFields = [];
                if (!loadedData.templateVariant) loadedData.templateVariant = 'Standard';
                
                const loadedSections = (storedState.sections || []).map(s => ({...s, documents: s.documents || [] }));

                setApplicantData(loadedData);
                setSections(loadedSections);
                setAvailableFiles(storedState.availableFiles || defaultState.availableFiles);
                setSelectedDocuments(storedState.selectedDocuments || []);
                setCloudConnections(storedState.cloudConnections || defaultState.cloudConnections);
                setAllTemplates(storedState.allTemplates || defaultState.allTemplates);
                setNextId((storedState.sections || []).reduce((maxId, s) => Math.max(s.id, maxId), 0) + 1);
                const storedApiKey = await window.electronAPI.getApiKey();
                if (storedApiKey) setApiKey(storedApiKey);
                const storedCloudCreds = await window.electronAPI.getCloudCreds();
                if (storedCloudCreds) setCloudCreds(storedCloudCreds);
                if (!storedState.sections || storedState.sections.length === 0) {
                    updateSections(loadedData.visaType, loadedData.templateVariant);
                }
            } else {
                updateSections(defaultState.applicantData.visaType, defaultState.applicantData.templateVariant);
            }
            setIsLoaded(true);
        };
        loadState();
    }, []);

    useEffect(() => {
        if (isLoaded && window.electronAPI) {
            const stateToSave = { applicantData, sections, availableFiles, selectedDocuments, cloudConnections, allTemplates };
            window.electronAPI.setStoreData({ key: 'appState', data: stateToSave });
        }
    }, [applicantData, sections, availableFiles, selectedDocuments, cloudConnections, allTemplates, isLoaded]);
    
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // initial check
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // --- HANDLERS & LOGIC ---
    const addNotification = (message, type = 'info') => {
        const notification = { id: Date.now(), message, type };
        setNotifications(prev => [notification, ...prev]);
    };
    
    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleCloudCredsChange = (service, field, value) => {
        const newCreds = { ...cloudCreds, [service]: { ...cloudCreds[service], [field]: value } };
        setCloudCreds(newCreds);
        if (window.electronAPI) window.electronAPI.setCloudCreds(newCreds);
    };

    const handleConnectService = async (service) => {
        if (!window.electronAPI) return;
        setIsLoading(prev => ({ ...prev, connect: service }));
        addNotification(`Connecting to ${service}...`, 'info');
        let result;
        if (service === 'googleDrive') result = await window.electronAPI.connectGoogleDrive();
        if (service === 'dropbox') result = await window.electronAPI.connectDropbox();
        if (service === 'oneDrive') result = await window.electronAPI.connectOneDrive();
        if (result && result.success) {
            setCloudConnections(prev => ({ ...prev, [result.service]: true }));
            addNotification(`Successfully connected to ${service}! Fetching files...`, 'success');
            handleFetchFiles(service);
        } else {
            addNotification(`Failed to connect to ${service}.`, 'error');
        }
        setIsLoading(prev => ({ ...prev, connect: null }));
    };

    const handleFetchFiles = async (service) => {
        if (!window.electronAPI) return;
        setIsLoading(prev => ({ ...prev, files: true }));
        let result;
        if (service === 'googleDrive') result = await window.electronAPI.fetchGoogleDriveFiles();
        if (service === 'dropbox') result = await window.electronAPI.fetchDropboxFiles();
        if (service === 'oneDrive') result = await window.electronAPI.fetchOneDriveFiles();
        if (result && result.success) {
            setAvailableFiles(prev => ({ ...prev, [service]: result.files }));
        }
        setIsLoading(prev => ({ ...prev, files: false }));
    };

    const handleFileUpload = async () => {
        if (!window.electronAPI) return addNotification('File upload only available in desktop app.', 'error');
        const files = await window.electronAPI.openFileDialog();
        if (files && files.length > 0) {
            const newFiles = files.filter(f => f && !availableFiles.local.some(d => d.filePath === f.filePath));
            if (newFiles.length > 0) {
                setAvailableFiles(prev => ({ ...prev, local: [...prev.local, ...newFiles] }));
                addNotification(`Added ${newFiles.length} new document(s).`, 'success');
            }
        }
    };

    const addDocumentToSelection = (file) => {
        if (!selectedDocuments.some(doc => doc.id === file.id)) {
            setSelectedDocuments(prev => [...prev, file]);
            addNotification(`"${file.name || file.filename}" added to Global AI context.`, 'info');
        }
    };

    const removeDocumentFromSelection = (id) => {
        const doc = selectedDocuments.find(d => d.id === id);
        if (doc) {
            setSelectedDocuments(prev => prev.filter(d => d.id !== id));
            addNotification(`"${doc.name || doc.filename}" removed from Global AI context.`, 'info');
        }
    };

    const handleDeleteLocalFile = (fileId) => {
        const file = availableFiles.local.find(f => f.id === fileId);
        if (file) {
            setAvailableFiles(prev => ({ ...prev, local: prev.local.filter(f => f.id !== fileId) }));
            removeDocumentFromSelection(fileId);
            addNotification(`Removed "${file.filename}" from available files.`, 'info');
        }
    };

    const handleDisconnectService = async (service) => {
        if (!window.electronAPI) return;
        const result = await window.electronAPI.disconnectCloudService(service);
        if (result && result.success) {
            setCloudConnections(prev => ({ ...prev, [service]: false }));
            setAvailableFiles(prev => ({ ...prev, [service]: [] }));
            setSelectedDocuments(prev => prev.filter(doc => doc.source !== service));
            addNotification(`Disconnected from ${service}.`, 'success');
        } else {
            addNotification(`Failed to disconnect from ${service}.`, 'error');
        }
    };

    const handleApiKeyChange = (key) => {
        setApiKey(key);
        if (window.electronAPI) {
            window.electronAPI.setApiKey(key);
            addNotification('API Key saved securely.', 'success');
        }
    };

    const updateSections = (templateId, variantKey = 'Standard') => {
        const template = allTemplates.find(t => t.id === templateId);
        if (!template) {
            console.error("Template not found:", templateId);
            addNotification("Could not load the selected template.", "error");
            return;
        }

        const variant = template.variants[variantKey] || template.variants['Standard'];
        if (!variant) {
            console.error("Variant not found:", variantKey);
            addNotification("Could not load the selected template variant.", "error");
            return;
        }

        const newSections = variant.sections.map((section, index) => ({
            id: Date.now() + index,
            title: section.title,
            prompt: section.prompt,
            content: "", isEditing: false, isGenerating: false,
            documents: [],
        }));
        setSections(newSections);
        setNextId(Date.now() + newSections.length);
    };

    const generateContent = async (id) => {
        if (!window.electronAPI) return addNotification('AI features only available in desktop app.', 'error');
        if (!apiKey) return addNotification('Please set your OpenAI API Key in Settings.', 'error');
        
        updateSection(id, 'isGenerating', true);
        const section = sections.find(s => s.id === id);
        
        const combinedDocs = [...selectedDocuments, ...section.documents];
        const uniqueDocs = [...new Map(combinedDocs.map(item => [item.id, item])).values()];

        try {
            const response = await window.electronAPI.generateContent({
                section, 
                applicantData, 
                selectedDocuments: uniqueDocs,
                llmModel: applicantData.llmModel, 
                apiKey
            });
            if (response.success) {
                updateSection(id, 'content', response.content);
                addNotification(`Generated content for "${section.title}" successfully.`, 'success');
            } else { throw new Error(response.error); }
        } catch (error) {
            console.error('Error generating content:', error);
            updateSection(id, 'content', `Error: ${error.message}`);
            addNotification(`Generation failed: ${error.message}`, 'error');
        } finally {
            updateSection(id, 'isGenerating', false);
        }
    };

    const updateApplicantDataField = (field, value) => setApplicantData(prev => ({ ...prev, [field]: value }));

    const handleVisaTypeChange = (newVisaType) => {
        const template = allTemplates.find(t => t.id === newVisaType);
        const defaultVariant = template && !template.isCustom ? 'Standard' : null;
        const newApplicantData = { ...applicantData, visaType: newVisaType, templateVariant: defaultVariant };
        setApplicantData(newApplicantData);
        updateSections(newVisaType, defaultVariant);
        addNotification(`Switched to ${template.name} template.`, 'info');
    };

    const handleVariantChange = (newVariant) => {
        const newApplicantData = { ...applicantData, templateVariant: newVariant };
        setApplicantData(newApplicantData);
        updateSections(applicantData.visaType, newVariant);
        addNotification(`Switched to "${newVariant}" prompt set.`, 'info');
    };

    const viewDocument = (doc) => { setViewingDocument(doc); setShowDocumentViewer(true); };

    const addSection = (afterId = null) => {
        const newSection = { id: nextId, title: `Custom Section`, prompt: "Enter your custom prompt...", content: "", isEditing: false, isGenerating: false, documents: [] };
        const index = afterId ? sections.findIndex(s => s.id === afterId) + 1 : sections.length;
        const newSections = [...sections]; newSections.splice(index, 0, newSection);
        setSections(newSections); setNextId(prev => prev + 1);
    };

    const removeSection = (id) => { if (sections.length > 1) setSections(prev => prev.filter(s => s.id !== id)); };
    const updateSection = (id, field, value) => setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    const toggleEdit = (id) => updateSection(id, 'isEditing', !sections.find(s => s.id === id).isEditing);
    
    const addDocumentToSection = (sectionId, file) => {
        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                if (s.documents.some(d => d.id === file.id)) {
                    return s;
                }
                return { ...s, documents: [...s.documents, file] };
            }
            return s;
        }));
    };

    const removeDocumentFromSection = (sectionId, docId) => {
        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                return { ...s, documents: s.documents.filter(d => d.id !== docId) };
            }
            return s;
        }));
    };

    const generateAllSections = async () => {
        if (!apiKey) return addNotification('Please set your OpenAI API Key in Settings.', 'error');
        addNotification(`Starting batch generation for ${sections.length} sections...`, 'info');
        for (const section of sections) { await generateContent(section.id); }
        addNotification('Batch generation complete.', 'success');
    };
    
    const handleResetSections = () => {
        updateSections(applicantData.visaType, applicantData.templateVariant);
        addNotification('Sections have been reset to the default template.', 'info');
    };

    const handleClearAllOutputs = () => {
        setSections(prev => prev.map(s => ({ ...s, content: '' })));
        addNotification('All generated content has been cleared.', 'info');
    };

    const handleClearSectionOutput = (id) => {
        updateSection(id, 'content', '');
        addNotification('Section content cleared.', 'info');
    };

    const addCustomField = () => setApplicantData(prev => ({ ...prev, customFields: [...(prev.customFields || []), { id: Date.now(), label: '', value: '' }] }));
    const updateCustomField = (id, field, value) => setApplicantData(prev => ({ ...prev, customFields: prev.customFields.map(f => f.id === id ? { ...f, [field]: value } : f) }));
    const removeCustomField = (id) => setApplicantData(prev => ({ ...prev, customFields: prev.customFields.filter(f => f.id !== id) }));

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <div className="fixed top-4 right-4 z-[60] space-y-3 w-full max-w-sm">
                {notifications.map(n => <Notification key={n.id} notification={n} onDismiss={dismissNotification} />)}
            </div>

            <TemplateManagerModal 
                isOpen={isTemplateManagerOpen}
                onClose={() => setIsTemplateManagerOpen(false)}
                allTemplates={allTemplates}
                onSaveTemplates={setAllTemplates}
                addNotification={addNotification}
            />

            <div className="flex h-screen">
                <main className="flex-1 flex flex-col overflow-y-auto">
                    <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <div className="flex-grow p-4 sm:p-6 lg:p-8">
                        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                            <h2 className="text-2xl font-bold text-gray-900">Letter Sections</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={handleClearAllOutputs} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 transition-colors">
                                    <Eraser className="w-4 h-4" /> Clear All
                                </button>
                                <button onClick={handleResetSections} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold text-red-800 bg-red-100 hover:bg-red-200 border border-red-200 transition-colors">
                                    <RotateCcw className="w-4 h-4" /> Reset
                                </button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {sections.map((section, index) => (
                                <SectionCard
                                    key={section.id}
                                    section={section}
                                    index={index}
                                    availableFiles={availableFiles}
                                    onUpdate={(field, value) => updateSection(section.id, field, value)}
                                    onRemove={() => removeSection(section.id)}
                                    onAddAfter={() => addSection(section.id)}
                                    onGenerate={() => generateContent(section.id)}
                                    onClear={() => handleClearSectionOutput(section.id)}
                                    onToggleEdit={() => toggleEdit(section.id)}
                                    onAttachDoc={(file) => addDocumentToSection(section.id, file)}
                                    onRemoveDoc={(docId) => removeDocumentFromSection(section.id, docId)}
                                />
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <button onClick={() => addSection()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 border border-gray-300 shadow-sm transition">
                                <Plus className="w-5 h-5" /> Add Custom Section
                            </button>
                        </div>
                    </div>
                    <footer className="p-4 bg-white border-t border-gray-200 sticky bottom-0 z-10">
                         <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
                            <div>
                                <p className="text-sm text-gray-600">{sections.length} sections • {selectedDocuments.length} documents in global context</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={generateAllSections} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    <RefreshCw className="w-5 h-5" /> Generate All
                                </button>
                                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                    Export Letter
                                </button>
                            </div>
                         </div>
                    </footer>
                </main>

                <Sidebar
                    isOpen={isSidebarOpen}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    onManageTemplates={() => setIsTemplateManagerOpen(true)}
                    {...{ applicantData, updateApplicantDataField, addCustomField, updateCustomField, removeCustomField, availableFiles, selectedDocuments, cloudConnections, isLoading, handleConnectService, handleDisconnectService, handleFetchFiles, handleFileUpload, addDocumentToSelection, removeDocumentFromSelection, handleDeleteLocalFile, viewDocument, apiKey, handleApiKeyChange, handleVisaTypeChange, handleVariantChange, allTemplates }}
                />
            </div>

            {showDocumentViewer && viewingDocument && (
                <DocumentViewerModal document={viewingDocument} onClose={() => setShowDocumentViewer(false)} />
            )}
        </div>
    );
};

export default App;
