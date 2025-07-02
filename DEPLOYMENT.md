# Deployment Guide

## 🚀 Quick Deployment to Vercel + Supabase

### 1. Setup Supabase Database

1. **Log into your Supabase project**: https://hyacidnuusxakunqjnwd.supabase.co
2. **Go to SQL Editor**
3. **Run the database schema** from `supabase/schema.sql`
4. **Create a storage bucket** named `analysis-files`:
   - Go to Storage
   - Create new bucket: `analysis-files`
   - Make it public

### 2. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ghogue02/dormant-customer-tool)

Or manually:

1. **Connect GitHub repo** to Vercel:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel --prod
   ```

2. **Set Environment Variables** in Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://hyacidnuusxakunqjnwd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5YWNpZG51dXN4YWt1bnFqbndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDIxNDcsImV4cCI6MjA2NDI3ODE0N30.bHIPNnGDqy5rATVkAyFQprFjLiQI3QwlqJFoTMvLbP0
   ```

### 3. Test the Deployment

1. Visit your deployed app
2. Upload test files from the `reference/` folder
3. Verify the analysis completes successfully

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

## 📊 Database Schema

The application uses these main tables:
- `analysis_jobs` - Processing jobs and status
- `dormant_customers` - Identified dormant customers
- `salesperson_summaries` - Performance analytics by rep
- `analysis_insights` - AI-generated insights
- `uploaded_files` - File tracking

## 🛡️ Security

- Row Level Security (RLS) enabled on all tables
- File uploads validated and stored securely
- Environment variables for sensitive data
- CORS protection enabled

## 📈 Features

✅ **File Upload & Validation**
✅ **Real-time Processing Status**
✅ **Advanced Customer Analytics**
✅ **AI-Powered Strategic Insights**
✅ **Data Quality Scoring**
✅ **Professional Report Generation**
✅ **Salesperson Performance Metrics**
✅ **Secure Data Storage**

## 🔗 URLs

- **GitHub**: https://github.com/ghogue02/dormant-customer-tool
- **Live App**: https://dormant-customer-tool.vercel.app
- **Supabase**: https://hyacidnuusxakunqjnwd.supabase.co