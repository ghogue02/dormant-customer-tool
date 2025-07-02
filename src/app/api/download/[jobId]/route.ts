import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params

    // Check if job exists and is completed
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Analysis not completed yet' },
        { status: 400 }
      )
    }

    // For now, return a message indicating that Excel generation would happen here
    // In a full implementation, you would:
    // 1. Fetch all the data from Supabase
    // 2. Generate Excel file using a library like ExcelJS
    // 3. Return the file as a download

    return NextResponse.json({
      message: 'Excel generation would happen here',
      download_url: '#',
      note: 'In production, this would generate and return an actual Excel file'
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}