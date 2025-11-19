# Chatbot Evaluation Dashboard

A full-stack Next.js application for side-by-side comparison and evaluation of Sierra AI and Salesforce Agentforce chatbot conversations. This tool enables human evaluators to score performance and build a versioned evaluation database.

## Features

- **Side-by-Side Comparison**: View Agentforce and Sierra transcripts simultaneously
- **Human Evaluation**: Score conversations on multiple metrics (Resolution, Empathy, Efficiency, Accuracy)
- **Keyboard Shortcuts**: Fast evaluation workflow with keyboard navigation
- **Analytics Dashboard**: Visualize win rates, score comparisons, and evaluation progress
- **CSV Export**: Export evaluation data for further analysis
- **Authentication**: Secure user authentication via Supabase
- **Progress Tracking**: Track evaluation progress across multiple evaluators

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Type Safety**: TypeScript

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier sufficient)
- Salesforce API credentials
- Sierra API credentials

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd evaluation-dashboard
npm install
```

### 2. Set Up Supabase

Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:
- Create a Supabase project
- Run the database migration
- Configure authentication

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual credentials. See `.env.example` for all required variables and descriptions.

**Required Variables:**
- Supabase: URL, anon key, and service role key
- Salesforce: Client ID, client secret, OAuth URL
- Sierra: API key, API token, API URL

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Evaluation Workflow

1. **Login**: Use your email to receive a magic link
2. **Load Transcript**: Enter a case number or click "Next Unevaluated"
3. **Review**: Compare Agentforce and Sierra transcripts side-by-side
4. **Evaluate**: 
   - Select overall winner (Agentforce, Sierra, Tie, or Both Poor)
   - Score each metric (1-5 scale) for both chatbots
   - Add optional notes
5. **Submit**: Click "Submit & Next" or press Enter to save and load next case

### Keyboard Shortcuts

- `1` - Select Agentforce as winner
- `2` - Select Sierra as winner
- `3` - Select Tie
- `4` - Select Both Poor
- `Enter` - Submit evaluation and load next case
- `Esc` - Skip current case

### Analytics Dashboard

View evaluation statistics including:
- Win rate distribution (pie chart)
- Average scores by metric (bar chart)
- Evaluation progress
- Summary statistics

Export all evaluation data to CSV for further analysis.

## Project Structure

```
evaluation-dashboard/
├── app/
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Main evaluation interface
│   ├── analytics/        # Analytics dashboard
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── analytics/        # Analytics components
│   ├── transcript-viewer.tsx
│   ├── evaluation-form.tsx
│   └── case-loader.tsx
├── lib/
│   ├── supabase/         # Supabase client setup
│   ├── salesforce/       # Salesforce API integration
│   └── sierra/           # Sierra API integration
├── types/                # TypeScript type definitions
├── supabase/
│   └── migrations/       # Database migrations
└── public/               # Static assets
```

## API Routes

### `/api/transcripts/[case]`
- **GET**: Fetch transcript by case number
  - Checks database first
  - Fetches from Salesforce and generates Sierra transcript if not found
  - Saves to database

### `/api/transcripts/next`
- **GET**: Get next unevaluated transcript for current user

### `/api/evaluations`
- **POST**: Submit a new evaluation
- **GET**: List evaluations (with optional filters)

## Deployment

### Replit Deployment

For detailed instructions on deploying to Replit, see [REPLIT_DEPLOYMENT.md](./REPLIT_DEPLOYMENT.md).

**Quick Steps:**
1. Import project to Replit
2. Add all environment variables as Replit Secrets (see `.env.example` for list)
3. Run database migrations in Supabase
4. Update Supabase Auth URLs with your Replit URL
5. Click "Run"

**Environment Variables:**
- Use Replit Secrets (🔒 icon) for all sensitive data
- Never commit `.env` files
- See `.env.example` for complete list of required variables

## Development

### Running Tests

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Authentication Issues

- Ensure Supabase authentication is properly configured
- Check that email magic links are enabled in Supabase
- Verify environment variables are set correctly

### Transcript Loading Issues

- Verify Salesforce API credentials are correct
- Check that the case number exists in Salesforce
- Ensure Sierra API credentials are valid
- Check browser console for detailed error messages

### Database Issues

- Verify Supabase connection string
- Ensure migrations have been run
- Check Row Level Security (RLS) policies

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is provided as-is for internal use.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase and Salesforce API documentation
3. Verify all credentials and environment variables
