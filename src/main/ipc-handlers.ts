import { ipcMain, dialog, shell, app } from "electron";
import Store from "electron-store";

type StoreType = {
  [key: string]: any;
};
import fs from "node:fs/promises";
import path from "node:path";
import keytar from "keytar";
import { OpenAI } from "openai";
import log from "./log";
import { v4 as uuidv4 } from "uuid";
import { 
  IPC_CHANNELS, 
  StoreGetRequest, 
  StoreSetRequest, 
  AIGenerateRequest, 
  AIGenerateResponse,
  LocalFile,
  CloudServiceResponse,
  SupportEmailRequest,
  SupportEmailResponse
} from "./types/ipc";
import { handleError, ErrorSeverity } from "./services/errorHandler";
import { validateInput, sanitizeApplicantData, generateRequestSchema, apiKeySchema } from "./services/validation";
import { z } from 'zod';
import { validateFileSize, validateFileType } from "./services/security";
import { authService } from "./services/auth";
import { cloudStorageService } from "./services/cloudStorageNew";
import { rateLimiter } from "./services/rateLimiter";
import { monitoringService } from "./services/monitoring";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { generateHTMLForPDF } from "./services/pdfGenerator";
import { jsPDF } from "jspdf";
import { anthropicApiService } from "./services/anthropicApi";
import { geminiApiService } from "./services/geminiApi";
import { supportChatbotService, SupportChatRequest, SupportChatResponse } from "./services/supportChatbot";

const store = new Store<StoreType>({ 
  encryptionKey: process.env.STORE_ENCRYPTION_KEY || "clerk-local-state-key-dev",
  name: "clerk-secure-store",
  clearInvalidConfig: true
});

const SERVICE = "clerk-app";
const API_KEY_ACCOUNTS = {
  openai: "openai-api-key",
  anthropic: "anthropic-api-key",
  gemini: "gemini-api-key"
} as const;

// Remove the guard for now to fix issues

// Rate limiting for API calls
const apiRateLimiter = rateLimiter.create('openai-api', {
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60 // Block for 60 seconds if exceeded
});

ipcMain.handle(IPC_CHANNELS.STORE_GET, async (_e, request: StoreGetRequest) => {
  try {
    const { key } = validateInput(z.object({ key: z.string() }), request);
    return store.get(key);
  } catch (error) {
    log.error('Store get error', error);
    handleError(error as Error, ErrorSeverity.LOW);
    return null;
  }
});

ipcMain.handle(IPC_CHANNELS.STORE_SET, async (_e, request: StoreSetRequest) => {
  try {
    const { key, data } = request;
    store.set(key, data);
    return true;
  } catch (error) {
    log.error('Store set error', error);
    handleError(error as Error, ErrorSeverity.LOW);
    return false;
  }
});

ipcMain.handle(IPC_CHANNELS.SECRETS_GET, async (_e, provider?: 'openai' | 'anthropic' | 'gemini') => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // For backward compatibility, default to openai if no provider specified
    const selectedProvider = provider || 'openai';
    const account = API_KEY_ACCOUNTS[selectedProvider];
    
    return await keytar.getPassword(SERVICE, `${account}-${user.id}`);
  } catch (error) {
    log.error('Secrets get error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return null;
  }
});

ipcMain.handle(IPC_CHANNELS.SECRETS_SET, async (_e, key: string, provider?: 'openai' | 'anthropic' | 'gemini') => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // For backward compatibility, default to openai if no provider specified
    const selectedProvider = provider || 'openai';
    const account = API_KEY_ACCOUNTS[selectedProvider];
    
    // Temporarily log the key format for debugging (first few chars only)
    log.info(`API key format check for ${selectedProvider}: ${key.substring(0, 10)}... (length: ${key.length})`);
    
    // Provider-specific validation
    if (selectedProvider === 'openai') {
      if (!key.startsWith('sk-') || key.length < 20) {
        throw new Error('Invalid OpenAI API key format. Key must start with "sk-" and be at least 20 characters long.');
      }
    } else if (selectedProvider === 'anthropic') {
      if (!key.startsWith('sk-ant-') || key.length < 20) {
        throw new Error('Invalid Anthropic API key format. Key must start with "sk-ant-" and be at least 20 characters long.');
      }
    } else if (selectedProvider === 'gemini') {
      if (key.length < 20) {
        throw new Error('Invalid Gemini API key format. Key must be at least 20 characters long.');
      }
    }
    
    await keytar.setPassword(SERVICE, `${account}-${user.id}`, key.trim());
    log.info(`${selectedProvider} API key saved successfully`);
    return true;
  } catch (error) {
    log.error('Secrets set error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return false;
  }
});

ipcMain.handle(IPC_CHANNELS.FILES_OPEN, async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Documents", extensions: ["pdf", "docx", "txt", "md"] }],
      securityScopedBookmarks: process.platform === 'darwin'
    });
    
    if (canceled) return [];
    
    const files: LocalFile[] = [];
    
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        
        if (!validateFileSize(stats.size)) {
          log.warn(`File too large: ${filePath}`);
          continue;
        }
        
        if (!validateFileType(filePath)) {
          log.warn(`Invalid file type: ${filePath}`);
          continue;
        }
        
        files.push({
          id: uuidv4(),
          filename: path.basename(filePath),
          filePath: filePath,
          size: stats.size
        });
      } catch (error) {
        log.error(`Error processing file ${filePath}`, error);
      }
    }
    
    return files;
  } catch (error) {
    log.error('File open error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return [];
  }
});

// Handler for downloading cloud files
ipcMain.handle(IPC_CHANNELS.FILES_DOWNLOAD_CLOUD, async (_e, fileId: string, service: string) => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    // Download file from cloud service
    const fileBuffer = await cloudStorageService.downloadFile(fileId, service, user.id);
    
    // Save to temporary location
    const tempDir = await import('os').then(os => os.tmpdir());
    const tempPath = path.join(tempDir, `cloud-download-${Date.now()}.tmp`);
    await fs.writeFile(tempPath, fileBuffer);
    
    return { success: true, tempPath };
  } catch (error) {
    log.error('Cloud file download error', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.FILES_READ, async (_e, filePath: string) => {
  try {
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    
    // Check if file exists
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error('File not found');
    }
    
    // Check file size
    const stats = await fs.stat(filePath);
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (stats.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB');
    }
    
    // Determine file type
    const extension = path.extname(filePath).toLowerCase();
    const textExtensions = ['.txt', '.md', '.log', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.sql', '.sh', '.yml', '.yaml', '.ini', '.cfg', '.conf'];
    
    // For binary files, return metadata only
    if (!textExtensions.includes(extension) && !['.pdf', '.docx'].includes(extension)) {
      return {
        success: true,
        content: `Binary file (${extension}). Size: ${(stats.size / 1024).toFixed(2)}KB`,
        isBinary: true
      };
    }
    
    // Read text files
    if (textExtensions.includes(extension)) {
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    }
    
    // For PDF and DOCX, return file info
    if (extension === '.pdf' || extension === '.docx') {
      return {
        success: true,
        content: `${extension.toUpperCase()} file. Size: ${(stats.size / 1024).toFixed(2)}KB. Preview not available.`,
        isBinary: true
      };
    }
    
    return { success: false, error: 'Unsupported file type' };
    
  } catch (error) {
    log.error('File read error', error);
    return { success: false, error: (error as Error).message };
  }
});

/* Export handler */
ipcMain.handle(IPC_CHANNELS.EXPORT_LETTER, async (_e, data) => {
  try {
    const { applicantData, sections, format } = data;
    
    const fileName = `Immigration_Letter_${applicantData.beneficiaryName.replace(/\s+/g, '_')}_${Date.now()}`;
    const filters = format === 'pdf' 
      ? [{ name: 'PDF', extensions: ['pdf'] }]
      : format === 'docx'
      ? [{ name: 'Word Document', extensions: ['docx'] }]
      : [{ name: 'HTML', extensions: ['html'] }];
    
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: fileName,
      filters
    });
    
    if (canceled || !filePath) {
      return { success: false, error: 'Export cancelled' };
    }
    
    if (format === 'pdf') {
      // Generate PDF using jsPDF which works better in Electron
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });
      
      // Set colors
      const navyColor = [11, 10, 59];
      const goldColor = [180, 143, 90];
      const grayColor = [102, 102, 102];
      const darkGrayColor = [51, 51, 51];
      
      let yPosition = 60;
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(...navyColor);
      doc.text('Immigration Support Letter', doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
      
      yPosition += 30;
      doc.setFontSize(14);
      doc.setTextColor(...grayColor);
      doc.text(
        `${applicantData.visaType.replace('default-', '').toUpperCase()} - ${applicantData.templateVariant}`,
        doc.internal.pageSize.width / 2,
        yPosition,
        { align: 'center' }
      );
      
      // Metadata box
      yPosition += 50;
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(...goldColor);
      doc.rect(60, yPosition - 15, doc.internal.pageSize.width - 120, 90, 'FD');
      
      doc.setFontSize(11);
      doc.setTextColor(...darkGrayColor);
      doc.text(`Beneficiary: ${applicantData.beneficiaryName}`, 75, yPosition);
      doc.text(`Nationality: ${applicantData.beneficiaryNationality}`, 75, yPosition + 20);
      doc.text(`Petitioner: ${applicantData.petitionerName}`, 75, yPosition + 40);
      
      if (applicantData.caseNumber) {
        doc.text(`Case Number: ${applicantData.caseNumber}`, 75, yPosition + 60);
      }
      
      yPosition += 120;
      
      // Sections
      sections.forEach((section: { title: string; content: string }) => {
        // Check if we need a new page
        if (yPosition > doc.internal.pageSize.height - 100) {
          doc.addPage();
          yPosition = 60;
        }
        
        // Section title
        doc.setFontSize(16);
        doc.setTextColor(...navyColor);
        doc.text(section.title, 60, yPosition);
        
        yPosition += 25;
        
        // Section content
        doc.setFontSize(11);
        doc.setTextColor(...darkGrayColor);
        const lines = doc.splitTextToSize(section.content, doc.internal.pageSize.width - 120);
        
        lines.forEach((line: string) => {
          if (yPosition > doc.internal.pageSize.height - 60) {
            doc.addPage();
            yPosition = 60;
          }
          doc.text(line, 60, yPosition);
          yPosition += 16;
        });
        
        yPosition += 20;
      });
      
      // Footer
      if (yPosition > doc.internal.pageSize.height - 80) {
        doc.addPage();
        yPosition = 60;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        doc.internal.pageSize.width - 60,
        doc.internal.pageSize.height - 40,
        { align: 'right' }
      );
      
      // Save the PDF
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      await fs.writeFile(filePath, pdfBuffer);
      
      return { success: true, message: 'PDF exported successfully!' };
      
    } else if (format === 'docx') {
      // Generate DOCX using docx library
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Header
            new Paragraph({
              text: "Immigration Support Letter",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: `${applicantData.visaType.replace('default-', '').toUpperCase()} - ${applicantData.templateVariant}`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Metadata
            new Paragraph({
              children: [
                new TextRun({ text: "Beneficiary: ", bold: true }),
                new TextRun(applicantData.beneficiaryName)
              ],
              spacing: { after: 120 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Nationality: ", bold: true }),
                new TextRun(applicantData.beneficiaryNationality)
              ],
              spacing: { after: 120 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Petitioner: ", bold: true }),
                new TextRun(applicantData.petitionerName)
              ],
              spacing: { after: 120 }
            }),
            ...(applicantData.caseNumber ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Case Number: ", bold: true }),
                  new TextRun(applicantData.caseNumber)
                ],
                spacing: { after: 120 }
              })
            ] : []),
            ...(applicantData.priorityDate ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Priority Date: ", bold: true }),
                  new TextRun(applicantData.priorityDate)
                ],
                spacing: { after: 400 }
              })
            ] : []),
            
            // Sections
            ...sections.flatMap((section: { title: string; content: string }) => [
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),
              ...section.content.split('\n').map((line: string) => 
                new Paragraph({
                  text: line,
                  spacing: { after: 120 }
                })
              )
            ]),
            
            // Footer
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              alignment: AlignmentType.RIGHT,
              spacing: { before: 600 }
            })
          ]
        }]
      });
      
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(filePath, buffer);
      
      return { success: true, message: 'Word document exported successfully!' };
      
    } else {
      // HTML export (fallback)
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Immigration Letter - ${applicantData.beneficiaryName}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px;
      color: #333;
    }
    h1 { color: #0b0a3b; margin-bottom: 10px; }
    h2 { color: #0b0a3b; margin-top: 30px; margin-bottom: 15px; }
    .header { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 20px;
      border-bottom: 2px solid #b48f5a;
    }
    .metadata { 
      background: #f5f5f5; 
      padding: 15px; 
      margin-bottom: 30px;
      border-left: 4px solid #b48f5a;
    }
    .metadata p { margin: 5px 0; }
    .section { margin-bottom: 30px; }
    .section-content { 
      white-space: pre-wrap; 
      line-height: 1.8;
      text-align: justify;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Immigration Support Letter</h1>
    <p>${applicantData.visaType.replace('default-', '').toUpperCase()} - ${applicantData.templateVariant}</p>
  </div>
  
  <div class="metadata">
    <p><strong>Beneficiary:</strong> ${applicantData.beneficiaryName}</p>
    <p><strong>Nationality:</strong> ${applicantData.beneficiaryNationality}</p>
    <p><strong>Petitioner:</strong> ${applicantData.petitionerName}</p>
    ${applicantData.caseNumber ? `<p><strong>Case Number:</strong> ${applicantData.caseNumber}</p>` : ''}
    ${applicantData.priorityDate ? `<p><strong>Priority Date:</strong> ${applicantData.priorityDate}</p>` : ''}
  </div>
  
  ${sections.map((section: { title: string; content: string }) => `
    <div class="section">
      <h2>${section.title}</h2>
      <div class="section-content">${section.content}</div>
    </div>
  `).join('')}
  
  <div style="margin-top: 50px; text-align: right;">
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;
      
      await fs.writeFile(filePath, htmlContent, 'utf-8');
      return { success: true };
    }
    
  } catch (error) {
    log.error('Export error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, error: (error as Error).message };
  }
});

// Google Drive handlers
ipcMain.handle(IPC_CHANNELS.GDRIVE_CONNECT, async (): Promise<CloudServiceResponse> => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    log.info('Starting Google Drive connection', { userId: user.id });
    await cloudStorageService.connectGoogleDrive(user.id);
    log.info('Google Drive connection completed', { userId: user.id });
    return { success: true, service: 'googleDrive' };
  } catch (error) {
    log.error('Google Drive connect error', { 
      error,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.GDRIVE_FETCH, async () => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    // Check token status first
    const tokenStatus = await cloudStorageService.checkTokenStatus('google', user.id);
    log.info('Google token status before fetch', tokenStatus);
    
    if (!tokenStatus.hasAccess) {
      throw new Error('No access token found. Please reconnect to Google Drive.');
    }
    
    log.info('Fetching Google Drive files for user', { userId: user.id });
    const files = await cloudStorageService.fetchGoogleDriveFiles(user.id);
    log.info('Google Drive files fetched', { count: files.length });
    return { success: true, files };
  } catch (error) {
    log.error('Google Drive fetch error', { 
      error,
      message: (error as Error).message,
      stack: (error as Error).stack 
    });
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, files: [], error: (error as Error).message };
  }
});

// Cloud disconnect handler
ipcMain.handle(IPC_CHANNELS.CLOUD_DISCONNECT, async (_e, service: string) => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    await cloudStorageService.disconnect(service, user.id);
    return { success: true, service };
  } catch (error) {
    log.error('Cloud disconnect error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("ai:generate", async (_e, payload) => {
  try {
    // Apply rate limiting
    await apiRateLimiter.consume('global');
    
    // Get current user to retrieve their API key
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    
    // Get the provider from applicantData (default to openai for backward compatibility)
    const provider = payload.applicantData?.llmProvider || 'openai';
    const account = API_KEY_ACCOUNTS[provider];
    
    const secret = await keytar.getPassword(SERVICE, `${account}-${user.id}`);
    if (!secret) throw new Error(`Missing API key. Please set your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key in Settings.`);

    // Check for required fields before validation
    if (!payload.applicantData?.beneficiaryName && 
        !payload.applicantData?.petitionerName && 
        !payload.applicantData?.beneficiaryNationality) {
      return { 
        success: false, 
        error: "Please fill in the Case Details (Beneficiary Name, Nationality, and Petitioner Name) before generating content." 
      };
    }

    // Validate the request payload
    const validatedRequest = await validateInput(generateRequestSchema, payload);
    const { section, applicantData, selectedDocuments, llmModel, systemPrompt } = validatedRequest;
    
    // Sanitize applicant data
    const sanitizedApplicantData = sanitizeApplicantData(applicantData);
    
    // Process documents safely
    const docSnippets = await Promise.all(
      selectedDocuments.slice(0, 3).map(async (d: any) => {
        try {
          if (!d.filePath || !validateFileType(d.filePath)) {
            return '';
          }
          
          const stats = await fs.stat(d.filePath);
          if (!validateFileSize(stats.size)) {
            return '';
          }
          
          const content = await fs.readFile(d.filePath, 'utf-8');
          return `### ${path.basename(d.filePath)}\n\n${content.slice(0, 1500)}`;
        } catch (error) {
          log.error(`Error reading document ${d.filePath}`, error);
          return '';
        }
      })
    );

    // Use provided system prompt or fall back to a basic one
    const finalSystemPrompt = systemPrompt ? `${systemPrompt}

Applicant Information:
${JSON.stringify(sanitizedApplicantData, null, 2)}

Relevant Documents:
${docSnippets.filter(s => s).join("\n\n")}` : `You are a professional immigration letter drafting assistant. 
Generate content based on the following information:

Applicant Information:
${JSON.stringify(sanitizedApplicantData, null, 2)}

Relevant Documents:
${docSnippets.filter(s => s).join("\n\n")}

IMPORTANT: Generate professional, accurate content suitable for official immigration correspondence.`;

    // Model is now directly passed from the frontend
    const model = llmModel;
    
    // Use monitoring service to track AI generation
    const result = await monitoringService.measureAIGeneration(
      model,
      section.title,
      async () => {
        let content = '';
        let usage = undefined;
        
        // Route to appropriate AI provider
        if (provider === 'openai') {
          const openai = new OpenAI({ apiKey: secret });
          const resp = await openai.chat.completions.create({
            model,
            max_tokens: 1500,
            temperature: 0.3,
            messages: [
              { role: "system", content: finalSystemPrompt },
              { role: "user", content: section.prompt }
            ]
          });

          content = resp.choices[0].message.content || '';
          usage = resp.usage ? {
            promptTokens: resp.usage.prompt_tokens,
            completionTokens: resp.usage.completion_tokens,
            totalTokens: resp.usage.total_tokens
          } : undefined;
          
        } else if (provider === 'anthropic') {
          anthropicApiService.initialize({ apiKey: secret, model });
          content = await anthropicApiService.generateContent({
            prompt: section.prompt,
            systemPrompt: finalSystemPrompt,
            maxTokens: 1500,
            temperature: 0.3
          });
          
        } else if (provider === 'gemini') {
          geminiApiService.initialize({ apiKey: secret, model });
          content = await geminiApiService.generateContent({
            prompt: section.prompt,
            systemPrompt: finalSystemPrompt,
            maxTokens: 1500,
            temperature: 0.3
          });
          
        } else {
          throw new Error(`Unsupported AI provider: ${provider}`);
        }
        
        // Log usage for monitoring
        log.info('AI generation completed', { 
          provider,
          model, 
          usage,
          sectionTitle: section.title 
        });
        
        // Track feature usage
        monitoringService.trackFeatureUsage('ai_generation', {
          provider,
          model,
          sectionTitle: section.title,
          tokensUsed: usage?.totalTokens
        });
        
        return { success: true, content, usage };
      }
    );
    
    return result;
  } catch (error: any) {
    log.error('AI generation error', error);
    handleError(error, ErrorSeverity.HIGH);
    
    // Provide user-friendly error messages
    let errorMessage = 'An error occurred while generating content.';
    
    if (error.message.includes('Rate limit')) {
      errorMessage = error.message;
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid API key. Please check your OpenAI API key in settings.';
    } else if (error.response?.status === 429) {
      errorMessage = 'OpenAI rate limit exceeded. Please try again later.';
    } else if (error.response?.status === 500) {
      errorMessage = 'OpenAI service error. Please try again later.';
    }
    
    return { success: false, error: errorMessage };
  }
});

// Authentication handlers
ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_e, { email, password }) => {
  try {
    const result = await authService.login(email, password);
    
    if (result.success && result.user) {
      monitoringService.setUser({
        id: result.user.id,
        email: result.user.email,
        username: result.user.name
      });
      monitoringService.trackFeatureUsage('login', {
        method: 'password',
        role: result.user.role
      });
    }
    
    return result;
  } catch (error) {
    log.error('Login error', error);
    monitoringService.captureException(error as Error, { context: 'login' });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
  try {
    await authService.logout();
    monitoringService.clearUser();
    monitoringService.trackFeatureUsage('logout');
    return { success: true };
  } catch (error) {
    log.error('Logout error', error);
    monitoringService.captureException(error as Error, { context: 'logout' });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.AUTH_CHECK, async () => {
  try {
    // Check for license-based authentication first
    const { licenseService } = await import('./services/license');
    const licenseInfo = await licenseService.getLicenseInfo();
    
    if (licenseInfo.isLicensed) {
      // Create a virtual user based on license
      const user = {
        id: licenseInfo.licenseKey || 'licensed-user',
        email: licenseInfo.email || 'user@clerk.app',
        name: 'Licensed User',
        role: 'user'
      };
      return { success: true, user };
    }
    
    // Fall back to traditional auth (shouldn't happen in normal flow)
    const user = await authService.getCurrentUser();
    return { success: true, user };
  } catch (error) {
    return { success: false };
  }
});

// Dropbox handlers
ipcMain.handle(IPC_CHANNELS.DROPBOX_CONNECT, async (): Promise<CloudServiceResponse> => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    await cloudStorageService.connectDropbox(user.id);
    return { success: true, service: 'dropbox' };
  } catch (error) {
    log.error('Dropbox connect error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.DROPBOX_FETCH, async () => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const files = await cloudStorageService.fetchDropboxFiles(user.id);
    return { success: true, files };
  } catch (error) {
    log.error('Dropbox fetch error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, files: [], error: (error as Error).message };
  }
});

// OneDrive handlers
ipcMain.handle(IPC_CHANNELS.ONEDRIVE_CONNECT, async (): Promise<CloudServiceResponse> => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    await cloudStorageService.connectOneDrive(user.id);
    return { success: true, service: 'oneDrive' };
  } catch (error) {
    log.error('OneDrive connect error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.ONEDRIVE_FETCH, async () => {
  try {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const files = await cloudStorageService.fetchOneDriveFiles(user.id);
    return { success: true, files };
  } catch (error) {
    log.error('OneDrive fetch error', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    return { success: false, files: [], error: (error as Error).message };
  }
});

// License handlers - commented out temporarily to fix startup issues
/*
ipcMain.handle(IPC_CHANNELS.LICENSE_ACTIVATE, async (_e, { key, email, name }: { key: string; email: string; name: string }) => {
  try {
    const { licenseManager } = await import('./services/licenseManager');
    const result = await licenseManager.activateLicense(key, email, name);
    return result;
  } catch (error) {
    log.error('License activation error', error);
    return { isValid: false, error: (error as Error).message };
  }
});
*/

// License handlers with Stripe integration
ipcMain.handle(IPC_CHANNELS.LICENSE_ACTIVATE, async (_e, { key }: { key: string }) => {
  try {
    const { licenseService } = await import('./services/license');
    const result = await licenseService.validateLicense(key);
    
    if (result.isValid) {
      return { 
        success: true, 
        isValid: true,
        message: 'License activated successfully'
      };
    } else {
      return { 
        success: false, 
        isValid: false, 
        error: result.error || 'Invalid license key' 
      };
    }
  } catch (error) {
    log.error('License activation error', error);
    return { 
      success: false, 
      isValid: false, 
      error: (error as Error).message 
    };
  }
});

ipcMain.handle(IPC_CHANNELS.LICENSE_VALIDATE, async () => {
  try {
    const { licenseService } = await import('./services/license');
    const status = await licenseService.checkLicenseStatus();
    return { 
      isValid: status.isValid && !status.isExpired,
      firmName: status.firmName,
      daysRemaining: status.daysRemaining
    };
  } catch (error) {
    log.error('License validation error', error);
    return { isValid: false };
  }
});

ipcMain.handle(IPC_CHANNELS.LICENSE_INFO, async () => {
  try {
    const { licenseService } = await import('./services/license');
    const info = await licenseService.getLicenseInfo();
    return info;
  } catch (error) {
    log.error('License info error', error);
    return { isLicensed: false };
  }
});

ipcMain.handle(IPC_CHANNELS.LICENSE_CHECK_FEATURE, async (_e, feature: string) => {
  try {
    const { licenseService } = await import('./services/license');
    const hasFeature = await licenseService.isFeatureEnabled(feature);
    return { hasFeature };
  } catch (error) {
    log.error('Feature check error', error);
    return { hasFeature: false };
  }
});

// Subscription handlers
ipcMain.handle(IPC_CHANNELS.SUBSCRIPTION_CREATE_CHECKOUT, async (_e, { email, planType }: { email: string; planType: 'monthly' | 'annual' }) => {
  try {
    const { licenseService } = await import('./services/license');
    const result = await licenseService.createCheckoutSession(email, planType);
    
    if (result.error) {
      return { 
        success: false, 
        error: result.error 
      };
    }
    
    // Open the checkout URL in the default browser
    if (result.url) {
      shell.openExternal(result.url);
    }
    
    return { 
      success: true, 
      sessionId: result.sessionId,
      url: result.url
    };
  } catch (error) {
    log.error('Checkout session error', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
});

ipcMain.handle(IPC_CHANNELS.SUBSCRIPTION_GET_STATUS, async (_e, { licenseKey }: { licenseKey: string }) => {
  try {
    const { licenseService } = await import('./services/license');
    const subscription = await licenseService.getSubscriptionStatus(licenseKey);
    
    return { 
      success: true, 
      subscription 
    };
  } catch (error) {
    log.error('Subscription status error', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
});

ipcMain.handle(IPC_CHANNELS.SUBSCRIPTION_CREATE_PORTAL, async (_e, { licenseKey }: { licenseKey: string }) => {
  try {
    const { licenseService } = await import('./services/license');
    const result = await licenseService.createPortalSession(licenseKey);
    
    if (result.error) {
      return { 
        success: false, 
        error: result.error 
      };
    }
    
    // Open the portal URL in the default browser
    if (result.url) {
      shell.openExternal(result.url);
    }
    
    return { 
      success: true, 
      url: result.url
    };
  } catch (error) {
    log.error('Portal session error', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
});

// Handle external links
ipcMain.on('open-external', (_event, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    shell.openExternal(url);
  }
});

// Support email handler
ipcMain.handle(IPC_CHANNELS.SUPPORT_SEND_EMAIL, async (_e, { subject, issueType, description }: SupportEmailRequest): Promise<SupportEmailResponse> => {
  try {
    log.info('Support email request received:', { subject, issueType });
    
    // Get license info to include user email
    const { licenseService } = await import('./services/license');
    const licenseInfo = await licenseService.getLicenseInfo();
    const userEmail = licenseInfo.email || 'unknown@user.com';
    
    log.info('User email for support:', userEmail);
    
    // Generate ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Get system info
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      appVersion: app.getVersion(),
      isLicensed: licenseInfo.isLicensed,
      licenseType: licenseInfo.subscription?.planType || 'none'
    };
    
    // Import email service
    const { supportEmailService } = await import('./services/supportEmail');
    
    // Send support email
    const result = await supportEmailService.sendSupportEmail({
      to: 'support@docwriter.co',
      from: userEmail,
      subject: `[${ticketId}] ${issueType}: ${subject}`,
      description,
      systemInfo,
      ticketId
    });
    
    log.info('Support email send result:', result);
    
    if (result.success) {
      // Send auto-reply to user
      const autoReplyResult = await supportEmailService.sendAutoReply({
        to: userEmail,
        ticketId,
        subject
      });
      
      log.info('Auto-reply result:', autoReplyResult);
      
      // Store ticket locally
      const ticketStore = new Store({ name: 'support-tickets' });
      const tickets = ticketStore.get('tickets', []) as any[];
      tickets.push({
        id: ticketId,
        subject,
        issueType,
        description,
        createdAt: new Date().toISOString(),
        status: 'open',
        userEmail
      });
      ticketStore.set('tickets', tickets);
      
      log.info('Support ticket stored:', ticketId);
    }
    
    return {
      success: result.success,
      ticketId: result.success ? ticketId : undefined,
      error: result.error
    };
  } catch (error) {
    log.error('Support email handler error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to process support request: ${errorMessage}`
    };
  }
});

// Support Chatbot handler
ipcMain.handle(IPC_CHANNELS.SUPPORT_CHAT, async (_e, request: SupportChatRequest): Promise<SupportChatResponse> => {
  try {
    // Get the appropriate API key based on provider
    const user = await authService.getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    const provider = request.llmProvider || 'openai';
    const account = API_KEY_ACCOUNTS[provider];
    const apiKey = await keytar.getPassword(SERVICE, `${account}-${user.id}`);
    
    if (!apiKey) {
      return {
        success: false,
        error: `No ${provider} API key found. Please set your API key in Settings.`
      };
    }
    
    // Apply rate limiting
    try {
      await apiRateLimiter.consume('support-chat');
    } catch (rateLimitError) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before sending another message.'
      };
    }
    
    // Generate response using the support chatbot service
    const response = await supportChatbotService.generateResponse(request, apiKey);
    
    // Track usage
    monitoringService.trackFeatureUsage('support-chat', {
      provider,
      model: request.llmModel,
      messageLength: request.message.length
    });
    
    return response;
    
  } catch (error) {
    log.error('Support chat error:', error);
    handleError(error as Error, ErrorSeverity.MEDIUM);
    
    return {
      success: false,
      error: 'Failed to process support chat request. Please try again or contact support@eeko.systems'
    };
  }
});
