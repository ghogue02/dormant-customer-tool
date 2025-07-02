import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const { data: job, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Format response to match the expected structure
    const response = {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      timestamp: job.updated_at,
      files: {
        sales_file: job.sales_filename,
        planning_file: job.planning_filename
      }
    }

    // Add result summary if completed
    if (job.status === 'completed') {
      response.result_summary = {
        dormant_customers: job.dormant_customers_count || 0,
        total_value_at_risk: job.total_value_at_risk || 0,
        data_accuracy: job.data_accuracy_score || 0
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}