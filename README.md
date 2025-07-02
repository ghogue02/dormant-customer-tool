# Dormant Customer Sales Intelligence Tool

A modern web application that automates dormant customer reporting with AI-powered insights for Well Crafted Wine & Beverage Co.

## 🚀 Features

- **Automated Data Processing**: Clean and validate sales data with intelligent error detection
- **AI-Powered Analytics**: Advanced customer insights with churn risk scoring and lifetime value calculations
- **Beautiful Dashboard**: Intuitive web-based interface designed for non-technical users
- **Interactive Results**: Searchable and sortable customer data with visual risk indicators
- **Real-time Processing**: Live progress tracking with detailed status updates
- **Data Accuracy Verification**: Comprehensive data quality checks and reporting

## 📋 What It Does

1. **Identifies Dormant Customers**: 
   - Analyzes your sales data to find the most recent transaction date
   - Looks back 6 months from that date
   - Identifies customers who ordered during those 6 months
   - Flags those who haven't ordered in the last 45 days
   - Example: If your data goes to June 30, 2025:
     - Analyzes orders from January 1 to June 30, 2025
     - Flags customers with no orders after May 15, 2025

2. **Corrects Data Issues**: Automatically fixes salesperson assignments using current planning data

3. **Generates Insights**: Creates actionable recommendations prioritized by value and risk

4. **Interactive Dashboard**: Web-based results with search, sort, and filter capabilities

## 🛠 Technology Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Real-time updates** with Server Actions

### Backend
- **FastAPI** for high-performance API
- **Pandas** for data processing
- **Pydantic** for data validation
- **Advanced Analytics** with ML-based insights
- **CSV Export** for data portability

### Deployment
- **Vercel** for frontend hosting
- **Supabase** for backend services
- **Local development** support

## 🏃‍♂️ Quick Start

### Live Application
**URL**: https://dormant-customer-tool.vercel.app

No installation needed! Just visit the URL and upload your files.

### File Requirements
1. **Sales CSV**: Export from your system with columns:
   - Posted date, Customer, Salesperson, Item, Qty., Net price
   
2. **Planning Excel**: Current customer assignments with columns:
   - Customer, Assigned Rep

### Local Development

#### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

1. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

2. **Frontend Setup**
   ```bash
   npm install
   ```

3. **Start Development Servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   source venv/bin/activate
   python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Terminal 2 (Frontend):
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Using the Application

1. **Prepare Your Files**:
   - Sales Report: CSV file with transaction data (can be 10MB+)
   - Planning Sheet: Excel file with customer-to-salesperson mappings
   - Files with title rows are automatically cleaned

2. **Upload and Process**:
   - Visit https://dormant-customer-tool.vercel.app
   - Upload both files using the interface
   - Large files (>4MB) are automatically preprocessed in your browser
   - Watch real-time processing progress

3. **Review Results**:
   - View AI-powered strategic insights with visual risk distribution
   - Search and sort customer data interactively
   - Download CSV for further analysis
   - Print web report for meetings

### Troubleshooting

**Upload Failed Error?**
1. Check demo mode checkbox to test without database
2. Visit `/api/health` to check configuration status
3. Ensure environment variables are set in Vercel
4. Verify Supabase database and storage bucket are created

**Test Files Available:**
- Sales Report: `reference/Sales report 2024-07-01 to 2025-06-30.csv`
- Planning Sheet: `reference/Updated_Planning_Q3_2025_with_Realistic_Targets_AF.xlsx`

## 📊 Data Requirements

### Sales Report (CSV)
Required columns:
- `Posted date`: Transaction date (MM/DD/YYYY)
- `Customer`: Customer name
- `Salesperson`: Current assigned rep
- `Item`: Product/wine name
- `Qty`: Quantity ordered
- `Net price`: Transaction value

### Planning Sheet (Excel)
Required columns:
- `Customer`: Customer name (must match sales data)
- `Assigned Rep`: Current salesperson

## 🎯 Key Features of Web-Based Dashboard

### Interactive Customer Analysis
- **Search Functionality**: Find customers by name or salesperson
- **Dynamic Sorting**: Sort by value, risk score, or last order date
- **Risk Visualization**: Color-coded risk indicators and distribution charts
- **Print-Friendly**: Optimized print styles for professional reports

### Data Export Options
- **CSV Download**: Export all customer data for further analysis
- **Print Report**: Generate print-friendly version of web dashboard
- **Web-Based Access**: No Excel required - all data viewable in browser

## 🧪 Testing

Run the comprehensive test suite:

```bash
cd backend
pytest tests/ -v
```

Tests cover:
- Data validation accuracy
- Analytics calculations
- Edge cases and error handling
- Data consistency verification

## 🚀 Deployment

### Vercel + Supabase (Recommended)

1. **Frontend Deployment**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Backend Deployment**:
   - Use Supabase Edge Functions or Railway
   - Set environment variables
   - Update CORS settings

3. **Environment Variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api-url.com
   ```

### Local Production Build

```bash
# Build frontend
npm run build
npm start

# Run backend
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## 📁 Project Structure

```
dormant-customer-tool/
├── src/                          # Next.js frontend
│   ├── app/                      # App router pages
│   └── components/               # React components
├── backend/                      # FastAPI backend
│   ├── src/                      # Application code
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # Pydantic models
│   │   ├── data_processor.py    # Core analytics engine
│   │   └── excel_generator.py   # Report generation
│   └── tests/                   # Test suite
├── reference/                   # Sample data files
└── docs/                       # Documentation
```

## 🔧 Configuration

### Analytics Settings
Modify `AnalyticsConfig` in `backend/src/models.py`:
- `dormant_days_threshold`: Days to consider dormant (default: 45)
- `analysis_period_months`: Analysis window (default: 6)
- `high_value_threshold`: High-value customer threshold
- `quick_win_threshold`: Quick win opportunity threshold

### UI Customization
Update branding in:
- `src/components/Header.tsx`: Company name and colors
- `tailwind.config.js`: Theme colors
- `src/app/page.tsx`: Hero content

## 🤝 Support

### Common Issues

1. **File Upload Errors**: Check file formats (CSV for sales, Excel for planning)
2. **Processing Failures**: Verify required columns exist in data files
3. **CORS Errors**: Ensure backend CORS settings include frontend URL

### Troubleshooting

- Check browser console for errors
- Review backend logs for detailed error messages
- Verify data quality using the built-in validation reports

## 📈 Advanced Features

### Custom Analytics
- Extend `AdvancedAnalytics` class for new insights
- Add custom risk scoring algorithms
- Implement seasonal pattern detection

### Integration Options
- REST API for external systems
- Webhook support for automated processing
- Database integration for data persistence

## 🔒 Security

- File uploads are validated and sandboxed
- No persistent data storage by default
- CORS protection enabled
- Input sanitization and validation

## 📝 License

This project is designed specifically for Well Crafted Wine & Beverage Co. internal use.

---

**Built with ❤️ using Claude-Flow development methodology**
