import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Minus, RefreshCw, Edit3, Save, X, FileText, 
  Eraser, ChevronUp, ChevronDown, Paperclip, CheckCircle, MessageCircle 
} from 'lucide-react';
import { IconButton } from './common';
import { Section, LocalFile, CloudFile, AvailableFiles } from '../types';

interface AttachDocumentMenuProps {
  availableFiles: AvailableFiles;
  sectionDocs: (LocalFile | CloudFile)[];
  onAttach: (file: LocalFile | CloudFile) => void;
  onClose: () => void;
}

const AttachDocumentMenu: React.FC<AttachDocumentMenuProps> = ({ 
  availableFiles, 
  sectionDocs, 
  onAttach, 
  onClose 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const allFiles = Object.values(availableFiles).flat();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div ref={menuRef} className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-elevation-5 border border-neutral-200 z-20 max-h-80 overflow-y-auto animate-scale-in">
      <div className="p-3">
        <h4 className="text-sm font-semibold text-navy-800 px-2 py-1">Attach a document</h4>
      </div>
      <div className="border-t border-neutral-100">
        {allFiles.length > 0 ? allFiles.map(file => {
          const isAttached = sectionDocs.some(d => d.id === file.id);
          return (
            <button
              key={file.id}
              onClick={() => onAttach(file)}
              disabled={isAttached}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 text-neutral-400" />
              <span className="truncate flex-1">
                {(file as LocalFile).filename || file.name}
              </span>
              {isAttached && <CheckCircle className="w-4 h-4 text-success-500" />}
            </button>
          );
        }) : (
          <p className="text-sm text-neutral-500 p-4 text-center">
            No documents available. Upload files in the 'Documents' tab.
          </p>
        )}
      </div>
    </div>
  );
};

interface SectionCardProps {
  section: Section;
  index: number;
  onUpdate: (field: keyof Section, value: any) => void;
  onRemove: () => void;
  onAddAfter: () => void;
  onGenerate: () => void;
  onClear: () => void;
  onToggleEdit: () => void;
  onAttachDoc: (file: LocalFile | CloudFile) => void;
  onRemoveDoc: (docId: string) => void;
  availableFiles: AvailableFiles;
  onChatClick?: () => void;
  onContentChatClick?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({ 
  section, 
  index, 
  onUpdate, 
  onRemove, 
  onAddAfter, 
  onGenerate, 
  onClear, 
  onToggleEdit, 
  onAttachDoc, 
  onRemoveDoc, 
  availableFiles,
  onChatClick,
  onContentChatClick 
}) => {
  const [isPromptOpen, setIsPromptOpen] = useState(true);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  return (
    <div className="card card-interactive animate-fade-in stagger-item">
      <div className="card-header flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-grow min-w-0">
          <span className="flex-shrink-0 bg-gradient-to-br from-gold-500 to-gold-600 text-white w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold shadow-elevation-2 animate-scale-in">
            {index + 1}
          </span>
          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdate('title', e.target.value)}
            className="text-lg font-bold text-navy-800 bg-transparent outline-none w-full transition-all duration-200 hover:bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-gold-400/20 focus:shadow-inner-1 rounded-lg px-3 py-1"
          />
        </div>
        <div className="flex items-center gap-1">
          {onChatClick && (
            <IconButton 
              icon={MessageCircle} 
              onClick={onChatClick} 
              tooltip="Plan this section" 
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" 
            />
          )}
          <IconButton 
            icon={Eraser} 
            onClick={onClear} 
            tooltip="Clear Output" 
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" 
          />
          <IconButton 
            icon={RefreshCw} 
            onClick={onGenerate} 
            disabled={section.isGenerating} 
            spin={section.isGenerating} 
            tooltip="Generate" 
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" 
          />
          <IconButton 
            icon={section.isEditing ? Save : Edit3} 
            onClick={onToggleEdit} 
            tooltip={section.isEditing ? 'Save' : 'Edit'} 
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" 
          />
          <IconButton 
            icon={Minus} 
            onClick={onRemove} 
            tooltip="Remove Section" 
            className="text-gray-600 hover:text-red-600 hover:bg-red-50" 
          />
          <IconButton 
            icon={Plus} 
            onClick={onAddAfter} 
            tooltip="Add Section After" 
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" 
          />
        </div>
      </div>
      
      <div className="card-body space-y-5">
        <div>
          <button 
            onClick={() => setIsPromptOpen(!isPromptOpen)} 
            className="flex items-center justify-between w-full text-left mb-2 p-2 -mx-2 rounded-lg hover:bg-neutral-50 transition-colors duration-200 group"
          >
            <label className="text-sm font-semibold text-navy-700 group-hover:text-gold-600 transition-colors duration-200">
              AI Prompt
            </label>
            {isPromptOpen ? (
              <ChevronUp className="w-5 h-5 text-neutral-500 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500 transition-transform duration-200" />
            )}
          </button>
          {isPromptOpen && (
            <textarea
              value={section.prompt}
              onChange={(e) => onUpdate('prompt', e.target.value)}
              className="form-textarea bg-neutral-50 hover:bg-white text-sm font-mono"
            />
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-navy-700">
              Section-Specific Documents ({section.documents.length})
            </label>
            <div className="relative">
              <IconButton 
                icon={Paperclip} 
                onClick={() => setIsAttachMenuOpen(prev => !prev)} 
                tooltip="Attach Document" 
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" 
              />
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
          <div className="bg-neutral-50 rounded-lg p-3 min-h-[50px] border border-neutral-200 shadow-inner-1">
            {section.documents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {section.documents.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 bg-white border border-neutral-200 rounded-full py-1 pl-2 pr-1 text-sm font-medium text-neutral-700 shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 animate-fade-in">
                    <FileText className="w-4 h-4 text-neutral-500" />
                    <span className="truncate max-w-xs">
                      {(doc as LocalFile).filename || doc.name}
                    </span>
                    <button 
                      onClick={() => onRemoveDoc(doc.id)} 
                      className="p-1 rounded-full hover:bg-error-100 text-error-500 transition-colors duration-150"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 italic text-center py-1">
                No documents attached to this section.
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-navy-700">
              Generated Content
            </label>
            {section.content && onContentChatClick && (
              <IconButton 
                icon={MessageCircle} 
                onClick={onContentChatClick} 
                tooltip="Analyze this content" 
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50" 
              />
            )}
          </div>
          {section.isEditing ? (
            <textarea
              value={section.content}
              onChange={(e) => onUpdate('content', e.target.value)}
              className="form-textarea min-h-[250px] font-mono text-sm shadow-inner-1"
            />
          ) : (
            <div className="w-full p-4 border border-neutral-200 rounded-lg bg-white min-h-[250px] whitespace-pre-wrap text-neutral-800 prose-immigration shadow-inner-1">
              {section.content || (
                <span className="text-gray-400 italic">
                  No content generated yet. Click the refresh icon to generate.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};