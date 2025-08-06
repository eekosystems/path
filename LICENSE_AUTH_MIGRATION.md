# License-Based Authentication Migration

## What Changed

The app now uses license keys as the primary authentication method instead of username/password login.

### Before:
1. Users had to log in with email/password (default: admin@clerk.app / admin123)
2. Then activate a license separately
3. Two-step process was confusing

### After:
1. Users enter their license key once
2. The app automatically creates a user session based on the license
3. No passwords to remember!

## How It Works

1. **On First Launch**:
   - App checks for valid license
   - If no license → Shows license modal
   - If valid license → Auto-creates user session

2. **User Identity**:
   - User ID = License key
   - Email = From license info (if available)
   - Name = "Licensed User"
   - Role = "user"

3. **Data Storage**:
   - API keys stored per license
   - Cloud tokens tied to license
   - Settings saved per license

## Benefits

1. **Simpler for Users**:
   - One key to remember
   - No password resets
   - No account recovery

2. **Better Security**:
   - No default passwords
   - License key acts as authentication
   - Keys can be revoked server-side

3. **Easier Support**:
   - Users just need their license key
   - No "forgot password" tickets
   - Clear activation status

## Technical Details

### Changed Files:
- `App.tsx` - Removed login screen, auto-login with license
- `auth.ts` - Added license-based user support
- `ipc-handlers.ts` - Updated AUTH_CHECK to use license

### API Key Storage:
- Still uses keytar for secure storage
- Keys associated with license ID instead of user ID
- Supports multiple API providers (OpenAI, Anthropic, Gemini)

### Cloud Services:
- OAuth tokens tied to license
- Each license can have its own cloud connections
- No changes to cloud service functionality

## Migration Path

For existing users with stored data:
1. They'll need to re-enter their API keys after activating license
2. Cloud services will need to be reconnected
3. All functionality remains the same

## Future Enhancements

If needed, you can later add:
- Optional email/password for advanced features
- License transfer between devices
- Team/organization licenses
- Usage analytics per license