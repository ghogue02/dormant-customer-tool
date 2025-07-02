import { NextRequest, NextResponse } from 'next/server'

// Demo status endpoint that works without Supabase
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    
    // Simulate processing status
    return NextResponse.json({
      job_id: jobId,
      status: 'completed',
      progress: 100,
      message: 'Demo processing completed',
      timestamp: new Date().toISOString(),
      files: {
        sales_file: 'Sales report 2024-07-01 to 2025-06-30.csv',
        planning_file: 'Updated_Planning_Q3_2025_with_Realistic_Targets_AF.xlsx'
      },
      result_summary: {
        dormant_customers: 2,
        total_value_at_risk: 5355.50,
        data_accuracy: 0.95
      },
      demo_mode: true
    })

  } catch (error) {
    console.error('Demo status error:', error)
    return NextResponse.json(
      { error: 'Demo status check failed' },
      { status: 500 }
    )
  }
}