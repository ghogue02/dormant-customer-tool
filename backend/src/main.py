from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os
import shutil
import asyncio
from typing import Dict, Any, List
import logging
from datetime import datetime, date
import json
import uuid

from .data_processor import DormantCustomerProcessor, AnalyticsConfig
from .models import ProcessingResult
from .excel_generator import ExcelReportGenerator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dormant Customer Sales Intelligence API",
    description="Advanced analytics for identifying and analyzing dormant customers",
    version="2.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for processing results (use Redis/DB in production)
processing_results: Dict[str, ProcessingResult] = {}
processing_status: Dict[str, Dict[str, Any]] = {}

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Dormant Customer Analytics API",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "uptime": "running",
        "features": [
            "file_upload",
            "data_validation", 
            "advanced_analytics",
            "excel_export",
            "real_time_processing"
        ]
    }

@app.post("/upload-files")
async def upload_files(
    background_tasks: BackgroundTasks,
    sales_file: UploadFile = File(..., description="Sales report CSV file"),
    planning_file: UploadFile = File(..., description="Planning Excel file"),
    analysis_date: str = None,
    dormant_threshold: int = 45,
    period_months: int = 6
):
    """
    Upload sales and planning files for processing.
    Returns a job ID for tracking processing status.
    """
    
    # Validate file types
    if not sales_file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Sales file must be a CSV")
    
    if not planning_file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Planning file must be an Excel file")
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Initialize processing status
    processing_status[job_id] = {
        "status": "uploaded",
        "progress": 0,
        "message": "Files uploaded successfully",
        "timestamp": datetime.now().isoformat(),
        "files": {
            "sales_file": sales_file.filename,
            "planning_file": planning_file.filename
        }
    }
    
    # Save uploaded files
    temp_dir = tempfile.mkdtemp()
    sales_path = os.path.join(temp_dir, sales_file.filename)
    planning_path = os.path.join(temp_dir, planning_file.filename)
    
    with open(sales_path, "wb") as buffer:
        shutil.copyfileobj(sales_file.file, buffer)
    
    with open(planning_path, "wb") as buffer:
        shutil.copyfileobj(planning_file.file, buffer)
    
    # Configure analytics
    config = AnalyticsConfig(
        today_date=datetime.strptime(analysis_date, "%Y-%m-%d").date() if analysis_date else date.today(),
        dormant_days_threshold=dormant_threshold,
        analysis_period_months=period_months
    )
    
    # Start background processing
    background_tasks.add_task(
        process_files_background, 
        job_id, 
        sales_path, 
        planning_path, 
        config,
        temp_dir
    )
    
    return {
        "job_id": job_id,
        "status": "processing_started",
        "message": "Files uploaded successfully. Processing started."
    }

async def process_files_background(
    job_id: str, 
    sales_path: str, 
    planning_path: str, 
    config: AnalyticsConfig,
    temp_dir: str
):
    """Background task for processing files."""
    try:
        # Update status
        processing_status[job_id].update({
            "status": "processing",
            "progress": 10,
            "message": "Starting data validation..."
        })
        
        # Initialize processor
        processor = DormantCustomerProcessor(config)
        
        # Update status
        processing_status[job_id].update({
            "progress": 30,
            "message": "Validating and cleaning data..."
        })
        
        # Process files
        result = processor.process_files(sales_path, planning_path)
        
        # Update status
        processing_status[job_id].update({
            "progress": 70,
            "message": "Generating insights and analytics..."
        })
        
        # Store result
        processing_results[job_id] = result
        
        # Update status
        processing_status[job_id].update({
            "status": "completed",
            "progress": 100,
            "message": "Processing completed successfully",
            "result_summary": {
                "dormant_customers": len(result.dormant_customers),
                "total_value_at_risk": float(result.summary["total_value_at_risk"]),
                "data_accuracy": result.data_accuracy_score
            }
        })
        
        logger.info(f"Processing completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Processing failed for job {job_id}: {str(e)}")
        processing_status[job_id].update({
            "status": "failed",
            "progress": 0,
            "message": f"Processing failed: {str(e)}",
            "error": str(e)
        })
    
    finally:
        # Cleanup temporary files
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

@app.get("/processing-status/{job_id}")
async def get_processing_status(job_id: str):
    """Get the current processing status for a job."""
    if job_id not in processing_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_status[job_id]

@app.get("/results/{job_id}")
async def get_results(job_id: str):
    """Get processing results for a completed job."""
    if job_id not in processing_results:
        raise HTTPException(status_code=404, detail="Results not found or processing not completed")
    
    result = processing_results[job_id]
    
    # Convert to JSON-serializable format
    return {
        "summary": result.summary,
        "salesperson_summaries": [summary.__dict__ for summary in result.salesperson_summaries],
        "dormant_customers": [customer.__dict__ for customer in result.dormant_customers],
        "insights": result.insights,
        "data_quality_report": result.data_quality_report,
        "processing_timestamp": result.processing_timestamp.isoformat(),
        "total_customers_analyzed": result.total_customers_analyzed,
        "data_accuracy_score": result.data_accuracy_score
    }

@app.post("/generate-excel/{job_id}")
async def generate_excel_report(job_id: str):
    """Generate and return Excel report for processed data."""
    if job_id not in processing_results:
        raise HTTPException(status_code=404, detail="Results not found")
    
    result = processing_results[job_id]
    
    # Generate Excel file
    generator = ExcelReportGenerator()
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    
    try:
        excel_path = generator.generate_report(result, temp_file.name)
        
        return FileResponse(
            path=excel_path,
            filename=f"Dormant_Customer_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    
    except Exception as e:
        logger.error(f"Excel generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Excel generation failed: {str(e)}")

@app.get("/analytics/customer-insights/{job_id}")
async def get_customer_insights(job_id: str, customer_name: str = None):
    """Get detailed insights for specific customers or all customers."""
    if job_id not in processing_results:
        raise HTTPException(status_code=404, detail="Results not found")
    
    result = processing_results[job_id]
    
    if customer_name:
        # Find specific customer
        customer = next((c for c in result.dormant_customers if c.customer == customer_name), None)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {
            "customer": customer.__dict__,
            "recommendations": _generate_customer_recommendations(customer)
        }
    else:
        # Return all customers with basic info
        return {
            "customers": [
                {
                    "customer": c.customer,
                    "salesperson": c.salesperson,
                    "value_at_risk": float(c.total_6_month_value),
                    "churn_risk": c.churn_risk_score,
                    "days_since_order": c.days_since_order
                }
                for c in result.dormant_customers
            ]
        }

@app.get("/analytics/rep-performance/{job_id}")
async def get_rep_performance(job_id: str):
    """Get detailed performance analytics by sales rep."""
    if job_id not in processing_results:
        raise HTTPException(status_code=404, detail="Results not found")
    
    result = processing_results[job_id]
    
    return {
        "rep_summaries": [summary.__dict__ for summary in result.salesperson_summaries],
        "performance_insights": _generate_rep_performance_insights(result.salesperson_summaries)
    }

def _generate_customer_recommendations(customer) -> List[str]:
    """Generate specific recommendations for a customer."""
    recommendations = []
    
    if customer.churn_risk_score > 0.7:
        recommendations.append("HIGH PRIORITY: Immediate outreach recommended due to high churn risk")
    
    if customer.preferred_products:
        recommendations.append(f"Mention these products they previously enjoyed: {', '.join(customer.preferred_products[:3])}")
    
    if customer.seasonal_pattern and customer.seasonal_pattern != "No clear pattern":
        recommendations.append(f"Consider timing based on their {customer.seasonal_pattern} pattern")
    
    if customer.total_6_month_value > 1000:
        recommendations.append("High-value customer - consider special offers or personal visit")
    
    return recommendations

def _generate_rep_performance_insights(summaries: List) -> Dict[str, Any]:
    """Generate performance insights across all reps."""
    if not summaries:
        return {}
    
    total_at_risk = sum(s.total_value_at_risk for s in summaries)
    avg_customers = sum(s.dormant_customer_count for s in summaries) / len(summaries)
    
    return {
        "total_value_at_risk": float(total_at_risk),
        "average_dormant_customers_per_rep": avg_customers,
        "top_performer": summaries[0].salesperson if summaries else None,
        "needs_attention": [s.salesperson for s in summaries if s.average_churn_risk > 0.7][:3]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)