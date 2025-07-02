import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Demo endpoint that works without Supabase
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const salesFile = formData.get('sales_file') as File
    const planningFile = formData.get('planning_file') as File
    
    if (!salesFile || !planningFile) {
      return NextResponse.json(
        { error: 'Both sales and planning files are required' },
        { status: 400 }
      )
    }

    // Validate file types
    if (!salesFile.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Sales file must be a CSV file' },
        { status: 400 }
      )
    }

    if (!planningFile.name.endsWith('.xlsx') && !planningFile.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Planning file must be an Excel file' },
        { status: 400 }
      )
    }

    // Generate a demo job ID
    const jobId = uuidv4()
    
    // Simulate successful upload without Supabase
    return NextResponse.json({
      job_id: jobId,
      status: 'processing_started',
      message: 'Demo mode: Files uploaded successfully. Processing simulated data...',
      demo_mode: true
    })

  } catch (error) {
    console.error('Demo upload error:', error)
    return NextResponse.json(
      { error: 'Demo upload failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}