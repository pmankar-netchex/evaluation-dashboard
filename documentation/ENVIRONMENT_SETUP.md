# Environment Setup Guide

This guide explains how to set up environment variables for different deployment scenarios.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Replit Deployment](#replit-deployment)
4. [Environment Variables Reference](#environment-variables-reference)
5. [Troubleshooting](#troubleshooting)

## Quick Start

### For Local Development

```bash
# 1. Copy the example file
cp .env.example .env.local

# 2. Edit .env.local with your actual values
nano .env.local  # or use your favorite editor

# 3. Start the development server
npm run dev
```

### For Replit Deployment

See [REPLIT_DEPLOYMENT.md](./REPLIT_DEPLOYMENT.md) for detailed instructions.

## Local Development

### Step 1: Create Environment File

Copy the example file to create your local environment configuration:

```bash
cp .env.example .env.local
```

### Step 2: Get Your Credentials

#### Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Settings → API
4. Copy the following:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

#### Salesforce Credentials

Contact your Salesforce administrator or:
1. Go to Salesforce Setup
2. Search for "App Manager"
3. Create a new Connected App
4. Enable OAuth settings
5. Copy Client ID and Client Secret

#### Sierra Credentials

Contact Sierra support for your API credentials or check your Sierra dashboard.

### Step 3: Fill in Your .env.local

Edit `.env.local` and replace all `your_*` placeholders with actual values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ... etc
```

### Step 4: Verify Configuration

The application will automatically validate your environment variables on startup. If anything is missing, you'll see a helpful error message.

## Replit Deployment

Replit uses a different approach called **Secrets** for environment variables.

### Add Secrets in Replit

1. Open your Repl
2. Click the **🔒 Secrets** icon in the left sidebar
3. Add each variable from `.env.example` as a separate secret
4. The format is: `KEY = value` (one per line)

### Important Notes for Replit

- **Never** create a `.env` or `.env.local` file in Replit
- All secrets are encrypted and hidden from public view
- Secrets are automatically loaded into `process.env`
- You can edit secrets anytime without redeploying

## Environment Variables Reference

### Public vs Private Variables

**Public Variables (NEXT_PUBLIC_*):**
- These are exposed to the browser
- Safe for client-side code
- Can include in client components
- Example: `NEXT_PUBLIC_SUPABASE_URL`

**Private Variables:**
- Server-side only
- Never exposed to browser
- Must use in API routes or server components
- Example: `SALESFORCE_CLIENT_SECRET`

### Required Variables

All variables in `.env.example` are required unless marked as optional.

### Optional Variables

- `NEXT_PUBLIC_SITE_URL` - Auto-detected if not provided
- `SALESFORCE_API_VERSION` - Defaults to v65.0
- `SIERRA_VERSION` - Defaults to v2.1.0
- `SIERRA_API_URL` - Defaults to https://api.sierra.chat

## Troubleshooting

### Error: "Missing required environment variable"

**Cause:** One or more required variables are not set.

**Solution:**
1. Check that `.env.local` exists (local dev) or Secrets are added (Replit)
2. Verify no typos in variable names (they're case-sensitive!)
3. Make sure there are no spaces around the `=` sign
4. Restart the development server after adding variables

### Error: "Invalid Supabase URL"

**Cause:** URL is incorrectly formatted or empty.

**Solution:**
- Format should be: `https://xxxxx.supabase.co`
- No trailing slash
- Check for extra spaces

### Error: "Authentication failed"

**Cause:** Incorrect Supabase keys or wrong permissions.

**Solution:**
- Verify you're using the correct project's keys
- Make sure you copied the entire key (they're long!)
- Check that RLS policies are set up correctly in Supabase

### Error: "Sierra API connection failed"

**Cause:** Invalid Sierra credentials or network issues.

**Solution:**
- Verify `SIERRA_API_KEY` and `SIERRA_API_TOKEN` are correct
- Check that `SIERRA_API_URL` is formatted correctly
- Test the credentials outside the application first

### Changes Not Taking Effect

**Cause:** Environment variables are cached.

**Solution:**
1. Stop the development server (`Ctrl+C`)
2. Clear Next.js cache: `rm -rf .next`
3. Restart: `npm run dev`

For Replit: Click Stop, wait a moment, then click Run again.

### Can't Find .env.local

**Cause:** File might be hidden in your file browser.

**Solution:**
- In terminal: `ls -la | grep env`
- Make sure you're in the project root directory
- File should be next to `package.json`

## Best Practices

### Security

✅ **DO:**
- Keep `.env.local` in `.gitignore`
- Use different credentials for dev and production
- Rotate keys regularly
- Never share service role keys
- Use Replit Secrets for all sensitive data

❌ **DON'T:**
- Commit `.env.local` to git
- Share your `.env.local` file
- Use production credentials in development
- Hardcode secrets in your code
- Expose private keys in client-side code

### Organization

- Group related variables together
- Add comments to explain what each variable does
- Keep `.env.example` up to date
- Document where to get each credential

### Testing

Always test your environment setup:

```bash
# Check that all variables are loaded
npm run dev

# You should see the app start successfully
# If there are missing variables, you'll get a clear error message
```

## Getting Help

If you're still having issues:

1. Check the [main README](./README.md) for general setup
2. Review [REPLIT_DEPLOYMENT.md](./REPLIT_DEPLOYMENT.md) for Replit-specific help
3. Check the browser console for client-side errors
4. Check the terminal/server logs for server-side errors
5. Verify all credentials are correct with the service providers

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase API Documentation](https://supabase.com/docs/reference/javascript/installing)
- [Replit Secrets Documentation](https://docs.replit.com/programming-ide/workspace-features/secrets)
