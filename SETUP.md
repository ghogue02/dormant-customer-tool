# Setup Instructions for Dormant Customer Tool

## Current Status
The application is now deployed to Vercel with a simplified architecture that processes files directly without needing Supabase.

**Live URL**: https://dormant-customer-tool.vercel.app

## How It Works Now

1. **Upload Files**: Upload your CSV sales report and Excel planning sheet
2. **Direct Processing**: Files are processed entirely in Vercel serverless functions
3. **Instant Results**: View results immediately on the same page
4. **Optional Persistence**: Set up Vercel KV to enable shareable links

## Optional: Enable Shareable Links with Vercel KV

If you want to share results with your sales team via unique links, follow these steps:

### 1. Create a Vercel KV Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `dormant-customer-tool` project
3. Go to the "Storage" tab
4. Click "Create Database" → Select "KV" (Redis)
5. Name it (e.g., "dormant-customer-kv")
6. Select your preferred region
7. Click "Create"

### 2. Connect KV to Your Project

1. After creating the KV database, you'll see a "Connect Project" button
2. Select your `dormant-customer-tool` project
3. Select all environments (Production, Preview, Development)
4. Click "Connect"

Vercel will automatically add these environment variables:
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 3. Redeploy to Activate KV

The project will automatically redeploy after connecting KV. Once complete:
- Results will be stored for 7 days
- Each analysis gets a unique shareable link
- Sales team can access results without uploading files

## Testing the Application

1. **Visit**: https://dormant-customer-tool.vercel.app
2. **Upload Test Files**:
   - Sales CSV: Use the file in `reference/Sales report 2024-07-01 to 2025-06-30.csv`
   - Planning Excel: Use `reference/Updated_Planning_Q3_2025_with_Realistic_Targets_AF.xlsx`
3. **Click "Analyze Files"**
4. **View Results**: See dormant customers, insights, and risk analysis

## How the Analysis Works

The tool identifies dormant customers using these criteria:
- **Dormant**: Customers who ordered in the last 6 months BUT NOT in the last 45 days
- **Risk Score**: Calculated based on days since last order, order frequency, and total value
- **Insights**: AI-powered recommendations for re-engagement priorities

## Features

✅ **Working Now**:
- File upload and processing
- Dormant customer identification
- Risk scoring and insights
- Salesperson assignment correction
- Web-based results display

🔄 **With Vercel KV** (optional):
- Shareable result links
- 7-day result persistence
- Team collaboration

## Troubleshooting

If you see "Analysis failed":
1. Make sure both files are uploaded
2. Check that the CSV has the required columns
3. Ensure the Excel file has a "Customer" and "Assigned Rep" column
4. File size limit is 50MB

## Next Steps

1. Set up Vercel KV for shareable links (optional)
2. Share the tool with your sales team
3. Run regular analyses to track dormant customers
4. Use insights to prioritize outreach efforts