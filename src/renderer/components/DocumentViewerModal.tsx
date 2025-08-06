import React, { useEffect, useState } from 'react';
import { X, FileText, FileImage, FileCode, Loader2 } from 'lucide-react';
import { IconButton } from './common';
import { LocalFile, CloudFile } from '../types';
import { apiService } from '../services/api';

interface DocumentViewerModalProps {
  document: LocalFile | CloudFile;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('text');
  
  const documentName = (document as LocalFile).filename || document.name;
  const filePath = (document as LocalFile).filePath;
  
  useEffect(() => {
    const loadContent = async () => {
      if (!filePath) {
        setError('File path not available');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Determine file type
        const extension = filePath.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
          setFileType('image');
        } else if (extension === 'pdf') {
          setFileType('pdf');
        } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'cs', 'php', 'rb', 'go'].includes(extension)) {
          setFileType('code');
        } else if (extension === 'md') {
          setFileType('markdown');
        } else {
          setFileType('text');
        }
        
        // Fetch file content
        const result = await apiService.readFileContent(filePath);
        if (result.success) {
          setContent(result.content || '');
        } else {
          setError(result.error || 'Failed to read file');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading file');
      } finally {
        setLoading(false);
      }
    };
    
    loadContent();
  }, [filePath]);
  
  const getFileIcon = () => {
    switch (fileType) {
      case 'image':
        return <FileImage className="w-5 h-5" />;
      case 'code':
        return <FileCode className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-50 text-gold-600 rounded-lg">
              {getFileIcon()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy">{documentName}</h3>
              <p className="text-sm text-gray-500">Type: {fileType.toUpperCase()}</p>
            </div>
          </div>
          <IconButton 
            icon={X} 
            onClick={onClose} 
            tooltip="Close" 
            className="text-gray-500 hover:bg-gray-100" 
          />
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-600">
                <X className="w-8 h-8 mx-auto mb-4" />
                <p className="font-semibold">Error loading file</p>
                <p className="text-sm mt-2">{error}</p>
              </div>
            </div>
          ) : fileType === 'pdf' ? (
            <div className="p-6 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">PDF preview not available in this version</p>
              <p className="text-sm text-gray-500">
                The document contains {content.length} characters.
                To view PDF files, please open them in your default PDF viewer.
              </p>
            </div>
          ) : fileType === 'image' ? (
            <div className="p-6 text-center">
              <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Image preview not available</p>
              <p className="text-sm text-gray-500">
                Please open the image file in your default image viewer.
              </p>
            </div>
          ) : fileType === 'code' ? (
            <div className="relative">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {filePath.split('.').pop()?.toUpperCase()}
                </span>
              </div>
              <pre className="p-6 bg-gray-50 overflow-x-auto">
                <code className="text-sm text-gray-800 font-mono leading-relaxed">
                  {content || 'Empty file'}
                </code>
              </pre>
            </div>
          ) : fileType === 'markdown' ? (
            <div className="p-6 prose prose-sm max-w-none">
              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
                <strong>Note:</strong> Markdown preview shows raw content. Full rendering would require a markdown parser.
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg overflow-x-auto">
                {content || 'Empty file'}
              </pre>
            </div>
          ) : (
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                {content || 'Empty file'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};