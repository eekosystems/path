import React from 'react';
import { FileText, FileUp, Eye, XCircle, Plus, Trash2, Cloud, Globe, HardDrive } from 'lucide-react';
import { IconButton, FormSection } from '../common';
import { LocalFile, CloudFile, CloudConnections, AvailableFiles, LoadingState } from '../../types';

// Helper function to format cloud service names properly
const formatCloudServiceName = (service: string): string => {
  const serviceMap: Record<string, string> = {
    'googleDrive': 'Google Drive',
    'dropbox': 'Dropbox',
    'oneDrive': 'OneDrive'
  };
  return serviceMap[service] || service;
};

interface DocumentPanelProps {
  availableFiles: AvailableFiles;
  selectedDocuments: (LocalFile | CloudFile)[];
  cloudConnections: CloudConnections;
  isLoading: LoadingState;
  handleConnectService: (service: string) => void;
  handleDisconnectService: (service: string) => void;
  handleFetchFiles: (service: string) => void;
  handleFileUpload: () => void;
  addDocumentToSelection: (doc: LocalFile | CloudFile) => void;
  removeDocumentFromSelection: (id: string) => void;
  handleDeleteLocalFile: (id: string) => void;
  viewDocument: (doc: LocalFile | CloudFile) => void;
}

interface FileItemProps {
  file: LocalFile | CloudFile;
  onAdd?: () => void;
  onRemove?: () => void;
  onView?: () => void;
  isSelected?: boolean;
  isLocal?: boolean;
}

const FileItem: React.FC<FileItemProps> = ({ 
  file, 
  onAdd, 
  onRemove, 
  onView, 
  isSelected, 
  isLocal 
}) => (
  <div className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${
    isSelected ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
  }`}>
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <FileText className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-green-600' : 'text-gray-500'}`} />
      <span className="text-sm font-medium truncate text-gray-800" title={(file as LocalFile).filePath || file.name}>
        {(file as LocalFile).filename || file.name}
      </span>
    </div>
    <div className="flex items-center gap-1 ml-2">
      {onView && (
        <IconButton 
          icon={Eye} 
          onClick={onView} 
          tooltip="Preview" 
          className="text-sky-600 hover:bg-sky-100" 
        />
      )}
      {isLocal && onRemove && (
        <IconButton 
          icon={XCircle} 
          onClick={onRemove} 
          tooltip="Delete File Reference" 
          className="text-red-500 hover:bg-red-100" 
        />
      )}
      {isSelected ? (
        <IconButton 
          icon={Trash2} 
          onClick={onRemove} 
          tooltip="Remove from Context" 
          className="text-red-600 hover:bg-red-100" 
        />
      ) : (
        onAdd && (
          <IconButton 
            icon={Plus} 
            onClick={onAdd} 
            tooltip="Add to Global Context" 
            className="text-green-600 hover:bg-green-100" 
          />
        )
      )}
    </div>
  </div>
);

export const DocumentPanel: React.FC<DocumentPanelProps> = ({
  availableFiles,
  selectedDocuments,
  cloudConnections,
  isLoading,
  handleConnectService,
  handleDisconnectService,
  handleFileUpload,
  addDocumentToSelection,
  removeDocumentFromSelection,
  handleDeleteLocalFile,
  viewDocument
}) => (
  <div className="space-y-6">
    <FormSection title={`Global AI Context (${selectedDocuments.length})`} icon={Globe} collapsible defaultExpanded={false}>
      <div className="space-y-2">
        {selectedDocuments.length > 0 ? (
          selectedDocuments.map(doc => (
            <FileItem 
              key={doc.id} 
              file={doc} 
              onRemove={() => removeDocumentFromSelection(doc.id)} 
              onView={() => viewDocument(doc)} 
              isSelected 
            />
          ))
        ) : (
          <p className="text-center text-sm text-gray-500 italic py-4">
            Select files from below to add to global context.
          </p>
        )}
      </div>
    </FormSection>

    <FormSection title={`Local Files (${availableFiles.local.length})`} icon={HardDrive} collapsible defaultExpanded={false}>
      <div className="flex justify-end mb-3">
        <button 
          onClick={handleFileUpload} 
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-600 text-white rounded-md text-sm font-semibold hover:bg-gold-700 transition"
        >
          <FileUp className="w-4 h-4" /> Upload
        </button>
      </div>
      <div className="space-y-2">
        {availableFiles.local.length > 0 ? (
          availableFiles.local.map(file => (
            <FileItem 
              key={file.id} 
              file={file} 
              onAdd={() => addDocumentToSelection(file)} 
              onRemove={() => handleDeleteLocalFile(file.id)} 
              onView={() => viewDocument(file)} 
              isSelected={selectedDocuments.some(d => d.id === file.id)} 
              isLocal 
            />
          ))
        ) : (
          <p className="text-center text-sm text-gray-500 italic py-4">
            No local files uploaded.
          </p>
        )}
      </div>
    </FormSection>

    <FormSection title="Cloud Services" icon={Cloud} collapsible defaultExpanded={false}>
      <div className="space-y-3">
        {Object.keys(cloudConnections).map(key => (
          <div key={key} className="bg-gray-50 p-3 rounded-lg border flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-800">
              {formatCloudServiceName(key)}
            </span>
            {cloudConnections[key as keyof CloudConnections] ? (
              <button 
                onClick={() => handleDisconnectService(key)} 
                className="px-3 py-1 rounded-md text-xs font-medium border bg-red-100 text-red-700 hover:bg-red-200 transition"
              >
                Disconnect
              </button>
            ) : (
              <button 
                onClick={() => handleConnectService(key)} 
                disabled={isLoading.connect === key} 
                className="px-3 py-1 rounded-md text-xs font-medium border bg-sky-100 text-sky-700 hover:bg-sky-200 transition disabled:opacity-50"
              >
                {isLoading.connect === key ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
        ))}
      </div>
    </FormSection>

    {Object.keys(availableFiles)
      .filter(s => s !== 'local')
      .map(source => (
        <FormSection 
          key={source} 
          title={`${formatCloudServiceName(source)} Files (${availableFiles[source as keyof AvailableFiles].length})`} 
          icon={Cloud} 
          collapsible 
          defaultExpanded={false}
        >
          <div className="space-y-2">
            {cloudConnections[source as keyof CloudConnections] ? (
              availableFiles[source as keyof AvailableFiles].length > 0 ? (
                availableFiles[source as keyof AvailableFiles].map(file => (
                  <FileItem 
                    key={file.id} 
                    file={file} 
                    onAdd={() => addDocumentToSelection(file)} 
                    onView={() => viewDocument(file)} 
                    isSelected={selectedDocuments.some(d => d.id === file.id)} 
                  />
                ))
              ) : (
                <p className="text-center text-sm text-gray-500 italic py-4">
                  No files found.
                </p>
              )
            ) : (
              <p className="text-center text-sm text-gray-500 italic py-4">
                Connect to see files.
              </p>
            )}
          </div>
        </FormSection>
      ))}
  </div>
);