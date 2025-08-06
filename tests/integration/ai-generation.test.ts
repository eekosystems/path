import { apiService } from '../../src/renderer/services/api';
import { AIGenerateRequest } from '../../src/renderer/types';

describe('AI Generation Integration', () => {
  const mockGenerateRequest: AIGenerateRequest = {
    section: {
      id: 1,
      title: 'Test Section',
      prompt: 'Generate test content',
      content: '',
      isEditing: false,
      isGenerating: false,
      documents: []
    },
    applicantData: {
      beneficiaryName: 'John Doe',
      beneficiaryNationality: 'Canadian',
      currentLocation: 'New York, NY',
      petitionerName: 'Tech Corp',
      petitionerType: 'Corporation',
      petitionerState: 'Delaware',
      petitionerAddress: '123 Tech St, San Francisco, CA',
      visaType: 'H-1B',
      industry: 'Technology',
      complexity: 'Moderate',
      priorityDate: '',
      filingDate: '',
      caseNumber: 'TEST-001',
      attorneyName: 'Jane Attorney',
      additionalInfo: '',
      llmModel: 'GPT-4',
      templateVariant: 'Standard',
      customFields: []
    },
    selectedDocuments: [],
    llmModel: 'GPT-4'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully generate content', async () => {
    const mockResponse = {
      success: true,
      content: 'Generated test content for the section.',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };

    global.window.electronAPI.generateContent = jest.fn().mockResolvedValue(mockResponse);

    const result = await apiService.generateContent(mockGenerateRequest);

    expect(result).toEqual(mockResponse);
    expect(global.window.electronAPI.generateContent).toHaveBeenCalledWith(mockGenerateRequest);
  });

  it('should handle generation errors', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'Invalid API key'
    };

    global.window.electronAPI.generateContent = jest.fn().mockResolvedValue(mockErrorResponse);

    const result = await apiService.generateContent(mockGenerateRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid API key');
  });

  it('should include documents in request', async () => {
    const requestWithDocs = {
      ...mockGenerateRequest,
      selectedDocuments: [
        {
          id: 'doc1',
          filename: 'test.pdf',
          filePath: '/path/to/test.pdf'
        }
      ]
    };

    global.window.electronAPI.generateContent = jest.fn().mockResolvedValue({
      success: true,
      content: 'Content with document context'
    });

    await apiService.generateContent(requestWithDocs);

    expect(global.window.electronAPI.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedDocuments: expect.arrayContaining([
          expect.objectContaining({
            id: 'doc1',
            filename: 'test.pdf'
          })
        ])
      })
    );
  });

  it('should handle rate limiting', async () => {
    const mockRateLimitResponse = {
      success: false,
      error: 'Rate limit exceeded. Try again in 60 seconds'
    };

    global.window.electronAPI.generateContent = jest.fn().mockResolvedValue(mockRateLimitResponse);

    const result = await apiService.generateContent(mockGenerateRequest);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit exceeded');
  });

  it('should throw error when electron API is not available', async () => {
    const originalAPI = global.window.electronAPI;
    delete (global.window as any).electronAPI;

    await expect(apiService.generateContent(mockGenerateRequest)).rejects.toThrow('Electron API not available');

    global.window.electronAPI = originalAPI;
  });
});