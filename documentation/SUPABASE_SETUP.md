# Supabase Setup Guide

This guide will walk you through setting up Supabase for the Chatbot Evaluation Dashboard.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in the project details:
   - **Name**: Chatbot Evaluator (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Free tier is sufficient for development and small-scale use
5. Click "Create new project"
6. Wait for the project to be provisioned (takes 1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll need these values:
   - **Project URL**: Copy this as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: Copy this as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: Copy this as `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Step 3: Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy and paste the entire SQL script into the SQL Editor
5. Click "Run" (or press Ctrl/Cmd + Enter)
6. Verify the migration succeeded - you should see:
   - Tables created: `transcripts`, `evaluations`
   - Indexes created
   - Views created: `unevaluated_transcripts`
   - RLS policies enabled

## Step 4: Configure Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider:
   - Toggle "Enable Email provider" to ON
   - Configure email settings (you can use Supabase's default email service for development)
   - For production, configure SMTP settings or use a service like SendGrid, Mailgun, etc.
3. (Optional) Enable other providers like Google OAuth if desired

## Step 5: Set Up Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the magic link email template if desired
3. The default template works fine for development

## Step 6: Configure Row Level Security (RLS)

The migration script already sets up RLS policies, but you can verify them:

1. Go to **Authentication** → **Policies**
2. You should see policies for:
   - `transcripts` table: Authenticated users can read
   - `evaluations` table: Users can view/insert/update their own evaluations

## Step 7: Test the Connection

1. Create a `.env.local` file in your project root (if you haven't already)
2. Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Start your Next.js development server:
   ```bash
   npm run dev
   ```
4. Navigate to `http://localhost:3000`
5. Try logging in with your email - you should receive a magic link

## Step 8: Create Your First User (Optional)

You can create users manually in Supabase:

1. Go to **Authentication** → **Users**
2. Click "Add user"
3. Enter an email address
4. Set a password or send a magic link
5. The user will be able to log in immediately

## Troubleshooting

### Migration Fails

- **Error: "relation already exists"**: The tables might already exist. Drop them first or modify the migration script.
- **Error: "permission denied"**: Make sure you're running the migration as the project owner or with service role key.

### Authentication Not Working

- **Magic links not sending**: Check your email provider settings in Authentication → Providers
- **Can't log in**: Verify your environment variables are set correctly
- **RLS blocking queries**: Check that RLS policies are correctly set up

### Connection Issues

- **"Invalid API key"**: Double-check your environment variables match the values from Supabase dashboard
- **"Failed to fetch"**: Check your network connection and Supabase project status
- **CORS errors**: Supabase handles CORS automatically, but ensure your project URL is correct

## Production Considerations

### Security

- Never commit `.env.local` or service role keys to version control
- Use environment variables in your hosting platform
- Rotate keys periodically
- Use the service role key only in server-side code (API routes)

### Performance

- Monitor your database usage in Supabase dashboard
- Set up database backups (automatic on paid plans)
- Consider connection pooling for high-traffic applications
- Add indexes for frequently queried columns

### Scaling

- Free tier includes:
  - 500 MB database
  - 2 GB bandwidth
  - 50,000 monthly active users
- Upgrade to Pro plan for:
  - Larger database (8 GB)
  - More bandwidth (50 GB)
  - Daily backups
  - Priority support

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Discord Community](https://discord.supabase.com)

## Next Steps

Once Supabase is set up:

1. Configure your Salesforce API credentials
2. Configure your Sierra API credentials
3. Test the transcript fetching functionality
4. Start evaluating conversations!

