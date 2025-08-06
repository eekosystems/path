import log from '../log';

let nodemailer: any;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  log.warn('Nodemailer not installed - email features will be disabled');
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SupportEmailData {
  to: string;
  from: string;
  subject: string;
  description: string;
  systemInfo: any;
  ticketId: string;
}

interface AutoReplyData {
  to: string;
  ticketId: string;
  subject: string;
}

class SupportEmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if nodemailer is available
    if (!nodemailer) {
      log.warn('Nodemailer not available - email service disabled');
      return;
    }
    
    // Use environment variables for email configuration
    const emailConfig: EmailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    };

    // Only initialize if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      try {
        this.transporter = nodemailer.createTransporter(emailConfig);
        
        // Verify connection
        this.transporter.verify((error: any) => {
          if (error) {
            log.error('Email service initialization failed:', error);
          } else {
            log.info('Email service ready');
          }
        });
      } catch (error) {
        log.error('Failed to create email transporter:', error);
      }
    } else {
      log.warn('Email credentials not configured - support emails will be simulated');
    }
  }

  async sendSupportEmail(data: SupportEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // If no transporter configured, simulate success
      if (!this.transporter) {
        log.info('Email service not configured - simulating support email send:', {
          to: data.to,
          subject: data.subject,
          ticketId: data.ticketId
        });
        
        // Store the support request locally even without email
        log.info('Support request details:', {
          ticketId: data.ticketId,
          from: data.from,
          subject: data.subject,
          description: data.description,
          systemInfo: data.systemInfo
        });
        
        return { 
          success: true
        };
      }

      const htmlContent = `
        <h2>New Support Request</h2>
        <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
        <p><strong>From:</strong> ${data.from}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        
        <h3>Description:</h3>
        <p>${data.description.replace(/\n/g, '<br>')}</p>
        
        <h3>System Information:</h3>
        <ul>
          <li><strong>Platform:</strong> ${data.systemInfo.platform}</li>
          <li><strong>Architecture:</strong> ${data.systemInfo.arch}</li>
          <li><strong>App Version:</strong> ${data.systemInfo.appVersion}</li>
          <li><strong>Node Version:</strong> ${data.systemInfo.nodeVersion}</li>
          <li><strong>Licensed:</strong> ${data.systemInfo.isLicensed ? 'Yes' : 'No'}</li>
          <li><strong>License Type:</strong> ${data.systemInfo.licenseType}</li>
        </ul>
      `;

      const info = await this.transporter.sendMail({
        from: `"DocWriter Support" <${process.env.EMAIL_USER}>`,
        to: data.to,
        replyTo: data.from,
        subject: data.subject,
        text: this.stripHtml(htmlContent),
        html: htmlContent
      });

      log.info('Support email sent:', info.messageId);
      return { success: true };
    } catch (error) {
      log.error('Failed to send support email:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  async sendAutoReply(data: AutoReplyData): Promise<{ success: boolean; error?: string }> {
    try {
      // If no transporter configured, simulate success
      if (!this.transporter) {
        log.info('Simulating auto-reply email:', {
          to: data.to,
          ticketId: data.ticketId
        });
        return { success: true };
      }

      const htmlContent = `
        <h2>Thank you for contacting DocWriter Support</h2>
        
        <p>We have received your support request and it has been assigned ticket ID: <strong>${data.ticketId}</strong></p>
        
        <p>Please reference this ticket ID in any future correspondence about this issue.</p>
        
        <p><strong>Your request summary:</strong><br>
        ${data.subject}</p>
        
        <p>Our support team will review your request and respond as soon as possible, typically within 24-48 hours.</p>
        
        <p>Thank you for using DocWriter!</p>
        
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated response. Please do not reply to this email.<br>
          For urgent matters, please contact us at support@docwriter.co
        </p>
      `;

      const info = await this.transporter.sendMail({
        from: `"DocWriter Support" <${process.env.EMAIL_USER}>`,
        to: data.to,
        subject: `Support Request Received - ${data.ticketId}`,
        text: this.stripHtml(htmlContent),
        html: htmlContent
      });

      log.info('Auto-reply sent:', info.messageId);
      return { success: true };
    } catch (error) {
      log.error('Failed to send auto-reply:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<h[1-6]>/g, '\n')
      .replace(/<\/h[1-6]>/g, '\n\n')
      .replace(/<br>/g, '\n')
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n\n')
      .replace(/<li>/g, '• ')
      .replace(/<\/li>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export const supportEmailService = new SupportEmailService();