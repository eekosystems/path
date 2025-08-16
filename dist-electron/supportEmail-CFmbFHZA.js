"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const main = require("./main-BzuPO7X1.js");
let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (error) {
  main.log.warn("Nodemailer not installed - email features will be disabled");
}
class SupportEmailService {
  constructor() {
    __publicField(this, "transporter", null);
    this.initializeTransporter();
  }
  initializeTransporter() {
    if (!nodemailer) {
      main.log.warn("Nodemailer not available - email service disabled");
      return;
    }
    const emailConfig = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER || "",
        pass: process.env.EMAIL_PASS || ""
      }
    };
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      try {
        this.transporter = nodemailer.createTransporter(emailConfig);
        this.transporter.verify((error) => {
          if (error) {
            main.log.error("Email service initialization failed:", error);
          } else {
            main.log.info("Email service ready");
          }
        });
      } catch (error) {
        main.log.error("Failed to create email transporter:", error);
      }
    } else {
      main.log.warn("Email credentials not configured - support emails will be simulated");
    }
  }
  async sendSupportEmail(data) {
    try {
      if (!this.transporter) {
        main.log.info("Email service not configured - simulating support email send:", {
          to: data.to,
          subject: data.subject,
          ticketId: data.ticketId
        });
        main.log.info("Support request details:", {
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
        <p>${data.description.replace(/\n/g, "<br>")}</p>
        
        <h3>System Information:</h3>
        <ul>
          <li><strong>Platform:</strong> ${data.systemInfo.platform}</li>
          <li><strong>Architecture:</strong> ${data.systemInfo.arch}</li>
          <li><strong>App Version:</strong> ${data.systemInfo.appVersion}</li>
          <li><strong>Node Version:</strong> ${data.systemInfo.nodeVersion}</li>
          <li><strong>Licensed:</strong> ${data.systemInfo.isLicensed ? "Yes" : "No"}</li>
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
      main.log.info("Support email sent:", info.messageId);
      return { success: true };
    } catch (error) {
      main.log.error("Failed to send support email:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async sendAutoReply(data) {
    try {
      if (!this.transporter) {
        main.log.info("Simulating auto-reply email:", {
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
      main.log.info("Auto-reply sent:", info.messageId);
      return { success: true };
    } catch (error) {
      main.log.error("Failed to send auto-reply:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  stripHtml(html) {
    return html.replace(/<h[1-6]>/g, "\n").replace(/<\/h[1-6]>/g, "\n\n").replace(/<br>/g, "\n").replace(/<p>/g, "").replace(/<\/p>/g, "\n\n").replace(/<li>/g, "• ").replace(/<\/li>/g, "\n").replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }
}
const supportEmailService = new SupportEmailService();
exports.supportEmailService = supportEmailService;
