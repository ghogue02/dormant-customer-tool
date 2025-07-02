# Testing Guide for Dormant Customer Tool

## Latest Deployment
**URL**: https://dormant-customer-tool.vercel.app

## Test Files Location
- **Sales CSV**: `reference/Sales report 2024-07-01 to 2025-06-30.csv` (11MB)
- **Planning Excel**: `reference/Updated_Planning_Q3_2025_with_Realistic_Targets_AF.xlsx` (52KB)

## Step-by-Step Testing

### 1. Initial Page Load
- Visit https://dormant-customer-tool.vercel.app
- Verify the page loads without errors
- Check browser console for any JavaScript errors

### 2. File Upload Test
1. Click "Upload sales CSV" and select the sales report file
2. Click "Upload planning Excel" and select the planning file
3. Both files should show with their sizes displayed

### 3. Processing Test
1. Click "Analyze Files"
2. You should see:
   - "Processing large file... This may take a moment." (for files >4MB)
   - Then "Uploading processed data..."
   - Finally the results should appear

### 4. Expected Results
Based on the data (July 2024 - June 2025), you should see:

**Dormant Customers**: Customers who:
- Have orders between January 2025 and June 2025 (last 6 months from June 30)
- BUT no orders after May 15, 2025 (45 days before June 30)

**Key Metrics to Verify**:
- Total dormant customers found
- Total value at risk (sum of their 6-month purchases)
- Average churn risk percentage
- Data quality score (should be high, ~90%+)

### 5. Results Features to Test
1. **By Salesperson Tab**: 
   - Shows each salesperson's dormant customer count
   - Value at risk per salesperson
   - Average risk score

2. **All Customers Tab**:
   - List of dormant customers
   - Last order date for each
   - 6-month value
   - Risk level (High/Medium/Low)

3. **CSV Download**:
   - Click "Download CSV" button
   - Should download a CSV with all dormant customer data

### 6. Error Handling Tests
1. **Empty Upload**: Try analyzing without selecting files
   - Should show: "Please upload both files"

2. **Wrong File Type**: Try uploading a non-CSV/Excel file
   - Should be prevented by file input filters

3. **Large File**: The 11MB CSV should work now
   - Should process client-side first
   - Then upload reduced version

## Troubleshooting

### If "No dormant customers found"
- The data might all be too recent or too old
- Check the console logs for date ranges being analyzed

### If "Upload failed" error
1. Check browser console for specific errors
2. Verify files aren't corrupted
3. Try refreshing and re-uploading

### If Processing Hangs
- Large files may take 10-30 seconds to process
- Check browser console for progress logs
- If stuck >1 minute, refresh and try again

## Console Debugging
Open browser DevTools (F12) to see:
```
Total rows processed: X
Valid rows to send: Y
CSV size after processing: Z MB
Latest date in data: [date]
Analysis date: [date]
45 days ago: [date]
```

## Success Criteria
✅ Files upload successfully
✅ Processing completes without errors
✅ Results show dormant customers (if any exist in date range)
✅ Data can be viewed by salesperson
✅ CSV download works
✅ No JavaScript errors in console

## API Health Check
Visit: https://dormant-customer-tool.vercel.app/api/health
- Should return JSON with status "ok"
- Shows if KV is configured (for persistence)