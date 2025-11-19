# Replit Deployment Guide

This guide walks you through deploying the Chatbot Evaluation Dashboard on Replit.

## Prerequisites

- Replit account
- Supabase account with project set up (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- Salesforce API credentials
- Sierra API credentials

## Step 1: Import Project to Replit

1. Go to [Replit](https://replit.com)
2. Click "Create Repl"
3. Choose "Import from GitHub" and paste your repository URL
4. Or upload the project files directly

## Step 2: Configure Environment Variables (Secrets)

Replit provides a secure way to store environment variables called **Secrets**. These are encrypted and not visible in the code.

### Access Replit Secrets:
1. Open your Repl
2. Click the **🔒 Secrets** icon in the left sidebar (or Tools → Secrets)
3. Add each of the following variables:

### Required Secrets:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Salesforce Configuration
SALESFORCE_CLIENT_ID=your_salesforce_client_id
SALESFORCE_CLIENT_SECRET=your_salesforce_client_secret
SALESFORCE_OAUTH_URL=https://login.salesforce.com/services/oauth2/token
SALESFORCE_API_VERSION=v65.0

# Sierra API Configuration
SIERRA_API_KEY=your_sierra_api_key
SIERRA_API_TOKEN=your_sierra_api_token
SIERRA_API_URL=https://api.sierra.chat
SIERRA_VERSION=v2.1.0
```

### How to Find Your Values:

**Supabase Variables:**
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to Settings → API
- Copy the Project URL and anon/public key
- Copy the service_role key (keep this secret!)

**Salesforce Variables:**
- Contact your Salesforce administrator for OAuth credentials
- Or create a Connected App in Salesforce Setup

**Sierra Variables:**
- Contact Sierra support for API credentials
- Or check your Sierra dashboard

## Step 3: Install Dependencies

Replit should automatically run `npm install` when you open the project. If not:

1. Click the "Shell" tab
2. Run:
   ```bash
   npm install
   ```

## Step 4: Run Database Migrations

You need to run the database migrations in Supabase:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Click "Run"
6. Repeat for `supabase/migrations/002_chat_sessions.sql`

Alternatively, if you have Supabase CLI installed locally:
```bash
supabase db push
```

## Step 5: Configure Supabase Authentication URLs

Since your Replit URL is unique to your deployment:

1. Find your Replit URL:
   - Format: `https://your-repl-slug.your-username.repl.co`
   - You can see it in the webview preview once you run the app

2. Go to [Supabase Dashboard](https://app.supabase.com)
3. Select your project
4. Go to Authentication → URL Configuration
5. Add your Replit URL to:
   - **Site URL**: `https://your-repl-slug.your-username.repl.co`
   - **Redirect URLs**: Add the following:
     - `https://your-repl-slug.your-username.repl.co`
     - `https://your-repl-slug.your-username.repl.co/auth/callback`
     - `https://your-repl-slug.your-username.repl.co/**` (wildcard)

## Step 6: Start the Application

1. Click the "Run" button in Replit
2. The application will start and be available at your Replit URL
3. Open the preview to access your application

## Step 7: Test the Deployment

1. Navigate to your Replit URL
2. Try to login (you should receive a magic link email)
3. After login, try loading a case number
4. Test the chat functionality
5. Check the analytics page

## Troubleshooting

### Issue: "Missing required environment variable"

**Solution:**
- Make sure all Secrets are added in Replit
- Check that there are no typos in the Secret names
- Restart the Repl after adding new Secrets

### Issue: "Authentication not working"

**Solution:**
- Verify your Replit URL is added to Supabase Auth URLs
- Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correct
- Make sure the URL in Supabase matches your Replit URL exactly

### Issue: "Cannot connect to Salesforce/Sierra"

**Solution:**
- Verify API credentials are correct
- Check that the URLs are properly formatted (no trailing slashes)
- Test the credentials outside of the application first

### Issue: "Database tables not found"

**Solution:**
- Make sure you ran both migration files in Supabase SQL Editor
- Check the Supabase Table Editor to verify tables exist
- Verify the connection string is correct

### Issue: Port already in use

**Solution:**
- Replit should handle port management automatically
- If issues persist, try stopping all processes and clicking Run again

## Production Deployment

For production deployment on Replit:

1. Enable "Always On" in Replit settings (requires Hacker plan)
2. Set up custom domain (optional)
3. Enable HTTPS (automatic on Replit)
4. Monitor logs regularly
5. Set up backup strategy for your Supabase database

## Security Best Practices

✅ **DO:**
- Use Replit Secrets for all sensitive data
- Rotate API keys regularly
- Use different credentials for development and production
- Monitor access logs

❌ **DON'T:**
- Commit .env files to version control
- Share your service role keys
- Use the same credentials across environments
- Expose sensitive variables in client-side code

## Monitoring and Maintenance

### Check Application Health:
- Monitor Replit console for errors
- Check Supabase Dashboard for query performance
- Review authentication logs regularly

### Update Dependencies:
```bash
npm update
npm audit fix
```

### Backup Your Data:
- Supabase provides automatic backups
- Export evaluation data regularly via CSV export feature

## Support

If you encounter issues:
1. Check the Replit console for error messages
2. Review Supabase logs in the Dashboard
3. Verify all environment variables are set correctly
4. Check the troubleshooting section above

## Next Steps

After successful deployment:
1. Invite team members to evaluate conversations
2. Set up regular data export schedules
3. Monitor analytics for insights
4. Consider setting up automated testing

