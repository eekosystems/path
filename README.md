# Clerk - AI Immigration Letter Assistant

A professional-grade Electron application that helps immigration attorneys and legal professionals generate high-quality immigration letters using AI.

## Features

- 🤖 **AI-Powered Content Generation**: Uses OpenAI's GPT models to generate professional immigration letters
- 📁 **Document Management**: Support for local files and cloud storage (Google Drive, Dropbox, OneDrive)
- 🔐 **Secure Authentication**: Built-in user authentication with encrypted credential storage
- 📝 **Template System**: Pre-built templates for H-1B, Green Card applications with customizable variants
- 🎨 **Modern UI**: Clean, responsive interface built with React and Tailwind CSS
- 🔒 **Enterprise Security**: CSP headers, input sanitization, rate limiting, and secure IPC communication
- 📊 **Monitoring & Logging**: Integrated Sentry monitoring and comprehensive error tracking
- ✅ **Testing**: Unit and integration tests with Jest and React Testing Library

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Electron 29, Node.js
- **Build Tools**: Vite, electron-builder
- **Security**: keytar (secure credential storage), bcrypt, JWT
- **AI Integration**: OpenAI API
- **Testing**: Jest, React Testing Library
- **Monitoring**: Sentry, electron-log

## Prerequisites

- Node.js 18+ and npm
- Windows, macOS, or Linux
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/eeko-systems/clerk.git
cd clerk
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env` file):
```env
SENTRY_DSN=your_sentry_dsn
JWT_SECRET=your_jwt_secret
STORE_ENCRYPTION_KEY=your_encryption_key
AUTH_ENCRYPTION_KEY=your_auth_key
CLOUD_ENCRYPTION_KEY=your_cloud_key

# Email configuration for support system (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Development

Run the application in development mode:
```bash
npm run dev
```

Run tests:
```bash
npm test
npm run test:coverage
```

Lint and format code:
```bash
npm run lint
npm run format
```

Type checking:
```bash
npm run typecheck
```

## Building

Build for production:
```bash
npm run build
```

This will create distributables for your current platform in the `dist` folder.

## Default Credentials

For development, the default admin credentials are:
- Email: admin@clerk.app
- Password: admin123

**Important**: Change these credentials before deploying to production.

## Project Structure

```
├── src/
│   ├── main/              # Electron main process
│   │   ├── services/      # Business logic services
│   │   ├── types/         # TypeScript type definitions
│   │   ├── main.ts        # Main process entry
│   │   ├── preload.ts     # Preload script
│   │   └── ipc-handlers.ts # IPC communication handlers
│   └── renderer/          # React application
│       ├── components/    # React components
│       ├── services/      # Frontend services
│       ├── store/         # State management
│       ├── styles/        # Global styles
│       ├── types/         # TypeScript types
│       └── App.tsx        # Main React component
├── tests/                 # Test files
├── electron-builder.yml   # Build configuration
└── package.json
```

## Security Features

- **Content Security Policy**: Strict CSP headers prevent XSS attacks
- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: API calls are rate-limited to prevent abuse
- **Secure Storage**: Sensitive data encrypted using electron-store
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Sandboxed Renderer**: Renderer process runs in a sandbox with context isolation

## Production Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Code sign the application (platform-specific)
4. Distribute via your preferred method

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@eeko.systems or create an issue in the GitHub repository.

---

© 2024 Eeko Systems. All rights reserved.