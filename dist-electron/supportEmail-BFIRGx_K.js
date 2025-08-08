"use strict";var l=Object.defineProperty;var p=(s,e,r)=>e in s?l(s,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):s[e]=r;var n=(s,e,r)=>p(s,typeof e!="symbol"?e+"":e,r);Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const t=require("./main-Deb-vt3t.js");let i;try{i=require("nodemailer")}catch{t.log.warn("Nodemailer not installed - email features will be disabled")}class c{constructor(){n(this,"transporter",null);this.initializeTransporter()}initializeTransporter(){if(!i){t.log.warn("Nodemailer not available - email service disabled");return}const e={host:process.env.EMAIL_HOST||"smtp.gmail.com",port:parseInt(process.env.EMAIL_PORT||"587"),secure:process.env.EMAIL_SECURE==="true",auth:{user:process.env.EMAIL_USER||"",pass:process.env.EMAIL_PASS||""}};if(e.auth.user&&e.auth.pass)try{this.transporter=i.createTransporter(e),this.transporter.verify(r=>{r?t.log.error("Email service initialization failed:",r):t.log.info("Email service ready")})}catch(r){t.log.error("Failed to create email transporter:",r)}else t.log.warn("Email credentials not configured - support emails will be simulated")}async sendSupportEmail(e){try{if(!this.transporter)return t.log.info("Email service not configured - simulating support email send:",{to:e.to,subject:e.subject,ticketId:e.ticketId}),t.log.info("Support request details:",{ticketId:e.ticketId,from:e.from,subject:e.subject,description:e.description,systemInfo:e.systemInfo}),{success:!0};const r=`
        <h2>New Support Request</h2>
        <p><strong>Ticket ID:</strong> ${e.ticketId}</p>
        <p><strong>From:</strong> ${e.from}</p>
        <p><strong>Subject:</strong> ${e.subject}</p>
        
        <h3>Description:</h3>
        <p>${e.description.replace(/\n/g,"<br>")}</p>
        
        <h3>System Information:</h3>
        <ul>
          <li><strong>Platform:</strong> ${e.systemInfo.platform}</li>
          <li><strong>Architecture:</strong> ${e.systemInfo.arch}</li>
          <li><strong>App Version:</strong> ${e.systemInfo.appVersion}</li>
          <li><strong>Node Version:</strong> ${e.systemInfo.nodeVersion}</li>
          <li><strong>Licensed:</strong> ${e.systemInfo.isLicensed?"Yes":"No"}</li>
          <li><strong>License Type:</strong> ${e.systemInfo.licenseType}</li>
        </ul>
      `,o=await this.transporter.sendMail({from:`"DocWriter Support" <${process.env.EMAIL_USER}>`,to:e.to,replyTo:e.from,subject:e.subject,text:this.stripHtml(r),html:r});return t.log.info("Support email sent:",o.messageId),{success:!0}}catch(r){return t.log.error("Failed to send support email:",r),{success:!1,error:r.message}}}async sendAutoReply(e){try{if(!this.transporter)return t.log.info("Simulating auto-reply email:",{to:e.to,ticketId:e.ticketId}),{success:!0};const r=`
        <h2>Thank you for contacting DocWriter Support</h2>
        
        <p>We have received your support request and it has been assigned ticket ID: <strong>${e.ticketId}</strong></p>
        
        <p>Please reference this ticket ID in any future correspondence about this issue.</p>
        
        <p><strong>Your request summary:</strong><br>
        ${e.subject}</p>
        
        <p>Our support team will review your request and respond as soon as possible, typically within 24-48 hours.</p>
        
        <p>Thank you for using DocWriter!</p>
        
        <hr>
        <p style="font-size: 12px; color: #666;">
          This is an automated response. Please do not reply to this email.<br>
          For urgent matters, please contact us at support@docwriter.co
        </p>
      `,o=await this.transporter.sendMail({from:`"DocWriter Support" <${process.env.EMAIL_USER}>`,to:e.to,subject:`Support Request Received - ${e.ticketId}`,text:this.stripHtml(r),html:r});return t.log.info("Auto-reply sent:",o.messageId),{success:!0}}catch(r){return t.log.error("Failed to send auto-reply:",r),{success:!1,error:r.message}}}stripHtml(e){return e.replace(/<h[1-6]>/g,`
`).replace(/<\/h[1-6]>/g,`

`).replace(/<br>/g,`
`).replace(/<p>/g,"").replace(/<\/p>/g,`

`).replace(/<li>/g,"• ").replace(/<\/li>/g,`
`).replace(/<[^>]*>/g,"").replace(/\n{3,}/g,`

`).trim()}}const u=new c;exports.supportEmailService=u;
