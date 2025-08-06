import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

// Simple PDF generator without external dependencies
export class SimplePDFGenerator {
  private content: string[] = [];
  private pageWidth = 612; // Letter size in points
  private pageHeight = 792;
  private margin = 72;
  private currentY = this.margin;
  private fontSize = 12;
  
  constructor() {
    this.startDocument();
  }
  
  private startDocument() {
    this.content = [
      '%PDF-1.4',
      '1 0 obj',
      '<<',
      '/Type /Catalog',
      '/Pages 2 0 R',
      '>>',
      'endobj',
      '2 0 obj',
      '<<',
      '/Type /Pages',
      '/Kids [3 0 R]',
      '/Count 1',
      '>>',
      'endobj',
      '3 0 obj',
      '<<',
      '/Type /Page',
      '/Parent 2 0 R',
      '/MediaBox [0 0 612 792]',
      '/Resources <<',
      '/Font <<',
      '/F1 4 0 R',
      '>>',
      '>>',
      '/Contents 5 0 R',
      '>>',
      'endobj',
      '4 0 obj',
      '<<',
      '/Type /Font',
      '/Subtype /Type1',
      '/BaseFont /Helvetica',
      '>>',
      'endobj'
    ];
  }
  
  text(str: string, options: { align?: 'left' | 'center' | 'right', fontSize?: number } = {}) {
    this.fontSize = options.fontSize || this.fontSize;
    const x = options.align === 'center' ? this.pageWidth / 2 : this.margin;
    
    // Add text to content stream
    if (!this.contentStream) {
      this.contentStream = [];
    }
    
    this.contentStream.push('BT');
    this.contentStream.push(`/F1 ${this.fontSize} Tf`);
    
    if (options.align === 'center') {
      const textWidth = str.length * this.fontSize * 0.5; // Approximate
      this.contentStream.push(`${x - textWidth / 2} ${this.pageHeight - this.currentY} Td`);
    } else {
      this.contentStream.push(`${x} ${this.pageHeight - this.currentY} Td`);
    }
    
    // Escape special characters in PDF
    const escapedStr = str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    
    this.contentStream.push(`(${escapedStr}) Tj`);
    this.contentStream.push('ET');
    
    this.currentY += this.fontSize * 1.5;
    return this;
  }
  
  moveDown(lines: number = 1) {
    this.currentY += this.fontSize * 1.5 * lines;
    return this;
  }
  
  private contentStream: string[] = [];
  
  async toBuffer(): Promise<Buffer> {
    // Create content stream
    const contentStr = this.contentStream.join('\n');
    const contentLength = contentStr.length;
    
    // Add content stream object
    this.content.push('5 0 obj');
    this.content.push('<<');
    this.content.push(`/Length ${contentLength}`);
    this.content.push('>>');
    this.content.push('stream');
    this.content.push(contentStr);
    this.content.push('endstream');
    this.content.push('endobj');
    
    // Add xref table
    const xrefPos = this.content.join('\n').length + 1;
    this.content.push('xref');
    this.content.push('0 6');
    this.content.push('0000000000 65535 f');
    this.content.push('0000000009 00000 n');
    this.content.push('0000000074 00000 n');
    this.content.push('0000000131 00000 n');
    this.content.push('0000000308 00000 n');
    this.content.push('0000000396 00000 n');
    
    // Add trailer
    this.content.push('trailer');
    this.content.push('<<');
    this.content.push('/Size 6');
    this.content.push('/Root 1 0 R');
    this.content.push('>>');
    this.content.push('startxref');
    this.content.push(xrefPos.toString());
    this.content.push('%%EOF');
    
    return Buffer.from(this.content.join('\n'), 'utf-8');
  }
}

// Alternative: Generate HTML and suggest conversion
export async function generateHTMLForPDF(data: {
  applicantData: any;
  sections: Array<{ title: string; content: string }>;
}): Promise<string> {
  const { applicantData, sections } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Immigration Letter - ${applicantData.beneficiaryName}</title>
  <style>
    @page {
      size: letter;
      margin: 1in;
    }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      line-height: 1.6; 
      color: #333;
      max-width: 6.5in;
      margin: 0 auto;
    }
    h1 { 
      color: #0b0a3b; 
      text-align: center;
      margin-bottom: 0.5em;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 2em;
    }
    .metadata {
      background: #f5f5f5;
      border-left: 4px solid #b48f5a;
      padding: 1em;
      margin-bottom: 2em;
    }
    .metadata p {
      margin: 0.25em 0;
    }
    h2 {
      color: #0b0a3b;
      margin-top: 1.5em;
    }
    .section-content {
      text-align: justify;
    }
    .footer {
      margin-top: 3em;
      text-align: right;
      color: #666;
      font-size: 0.9em;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>Immigration Support Letter</h1>
  <p class="subtitle">${applicantData.visaType.replace('default-', '').toUpperCase()} - ${applicantData.templateVariant}</p>
  
  <div class="metadata">
    <p><strong>Beneficiary:</strong> ${applicantData.beneficiaryName}</p>
    <p><strong>Nationality:</strong> ${applicantData.beneficiaryNationality}</p>
    <p><strong>Petitioner:</strong> ${applicantData.petitionerName}</p>
    ${applicantData.caseNumber ? `<p><strong>Case Number:</strong> ${applicantData.caseNumber}</p>` : ''}
    ${applicantData.priorityDate ? `<p><strong>Priority Date:</strong> ${applicantData.priorityDate}</p>` : ''}
  </div>
  
  ${sections.map(section => `
    <h2>${section.title}</h2>
    <div class="section-content">${section.content.replace(/\n/g, '<br>')}</div>
  `).join('')}
  
  <div class="footer">
    <p>Generated on: ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;
}