# Security Policy

## OAuth Credentials

The OAuth Client IDs and Client Secrets in this codebase are **intentionally included** and **publicly visible**. This is standard practice for desktop applications.

### Why This Is Safe:

1. **Client IDs are public identifiers** - They only identify the application to OAuth providers
2. **Users authenticate directly with Google/Dropbox/OneDrive** - The app never sees user passwords
3. **Each user authorizes their own account** - Tokens are user-specific and secure
4. **Desktop apps cannot hide credentials** - Unlike server apps, desktop apps run on user machines

### What These Credentials Do:
- Identify "DocWriter" to Google/Dropbox/OneDrive
- Allow users to authorize their own accounts
- Enable secure OAuth flow

### What These Credentials DON'T Do:
- Give access to any user data
- Allow unauthorized access
- Compromise user security

### Industry Standard:
Every major desktop application (Slack, Discord, VS Code, etc.) includes OAuth Client IDs in their distributed code. This is the correct implementation for desktop OAuth.

## Reporting Security Issues

For actual security concerns, please email: support@docwriter.co

## False Positives

GitHub's automated scanner may flag OAuth credentials. These are false positives for desktop applications and can be safely ignored.