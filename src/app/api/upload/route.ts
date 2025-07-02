import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

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

    // Create analysis job
    const jobId = uuidv4()
    
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({
        id: jobId,
        status: 'pending',
        progress: 0,
        message: 'Files uploaded, preparing for processing...',
        sales_filename: salesFile.name,
        planning_filename: planningFile.name
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create analysis job' },
        { status: 500 }
      )
    }

    // Upload files to Supabase Storage
    const salesBuffer = Buffer.from(await salesFile.arrayBuffer())
    const planningBuffer = Buffer.from(await planningFile.arrayBuffer())

    const salesPath = `${jobId}/sales_${salesFile.name}`
    const planningPath = `${jobId}/planning_${planningFile.name}`

    const { error: salesUploadError } = await supabase.storage
      .from('analysis-files')
      .upload(salesPath, salesBuffer, {
        contentType: salesFile.type,
        upsert: false
      })

    const { error: planningUploadError } = await supabase.storage
      .from('analysis-files')
      .upload(planningPath, planningBuffer, {
        contentType: planningFile.type,
        upsert: false
      })

    if (salesUploadError || planningUploadError) {
      console.error('File upload errors:', { salesUploadError, planningUploadError })
      
      // Clean up job if file upload failed
      await supabase.from('analysis_jobs').delete().eq('id', jobId)
      
      return NextResponse.json(
        { error: 'Failed to upload files' },
        { status: 500 }
      )
    }

    // Record uploaded files
    await supabase.from('uploaded_files').insert([
      {
        job_id: jobId,
        filename: salesFile.name,
        file_type: 'sales',
        file_size: salesFile.size,
        storage_path: salesPath
      },
      {
        job_id: jobId,
        filename: planningFile.name,
        file_type: 'planning',
        file_size: planningFile.size,
        storage_path: planningPath
      }
    ])

    // Start processing (this would trigger a background job in production)
    // For now, we'll simulate the processing
    await startProcessing(jobId, salesPath, planningPath)

    return NextResponse.json({
      job_id: jobId,
      status: 'processing_started',
      message: 'Files uploaded successfully. Processing started.'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function startProcessing(jobId: string, salesPath: string, planningPath: string) {
  try {
    // Update job status to processing
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'processing',
        progress: 10,
        message: 'Processing data files...'
      })
      .eq('id', jobId)

    // In a real implementation, this would be a background job
    // For demo purposes, we'll simulate the processing with setTimeout
    setTimeout(async () => {
      await completeProcessing(jobId)
    }, 5000) // 5 second simulation

  } catch (error) {
    console.error('Processing error:', error)
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        message: 'Processing failed: ' + error
      })
      .eq('id', jobId)
  }
}

async function completeProcessing(jobId: string) {
  try {
    // This is a simplified simulation of the actual data processing
    // In reality, you'd implement the full data processing logic here
    
    // Simulate creating dormant customers
    const mockDormantCustomers = [
      {
        job_id: jobId,
        customer_name: 'Washington Golf and Country Club',
        salesperson: 'Mike Allen',
        last_order_date: '2025-03-15',
        days_since_order: 75,
        total_6_month_value: 3105.50,
        order_count_6_months: 5,
        average_order_value: 621.10,
        customer_lifetime_value: 7452.00,
        churn_risk_score: 0.75,
        seasonal_pattern: 'Spring buyer',
        preferred_products: ['Cabernet Sauvignon', 'Chardonnay']
      },
      {
        job_id: jobId,
        customer_name: 'Crystal Palate',
        salesperson: 'Angela Fultz',
        last_order_date: '2025-02-20',
        days_since_order: 98,
        total_6_month_value: 2250.00,
        order_count_6_months: 3,
        average_order_value: 750.00,
        customer_lifetime_value: 5400.00,
        churn_risk_score: 0.82,
        seasonal_pattern: 'Winter buyer',
        preferred_products: ['Pinot Noir', 'Sauvignon Blanc']
      }
    ]

    await supabase.from('dormant_customers').insert(mockDormantCustomers)

    // Simulate creating salesperson summaries
    const mockSummaries = [
      {
        job_id: jobId,
        salesperson: 'Mike Allen',
        dormant_customer_count: 1,
        total_value_at_risk: 3105.50,
        high_value_dormant_count: 1,
        quick_win_count: 0,
        average_churn_risk: 0.75
      },
      {
        job_id: jobId,
        salesperson: 'Angela Fultz',
        dormant_customer_count: 1,
        total_value_at_risk: 2250.00,
        high_value_dormant_count: 1,
        quick_win_count: 0,
        average_churn_risk: 0.82
      }
    ]

    await supabase.from('salesperson_summaries').insert(mockSummaries)

    // Create insights
    const mockInsights = [
      {
        job_id: jobId,
        insight_type: 'top_priority_rep',
        insight_text: 'Focus on Mike Allen, who has $3,105.50 in sales at risk across 1 dormant customer.',
        priority: 1
      },
      {
        job_id: jobId,
        insight_type: 'top_priority_customer',
        insight_text: 'Prioritize outreach to Washington Golf and Country Club. They represent $3,105.50 in potential lost revenue.',
        priority: 2
      }
    ]

    await supabase.from('analysis_insights').insert(mockInsights)

    // Update job as completed
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        progress: 100,
        message: 'Analysis completed successfully',
        completed_at: new Date().toISOString(),
        total_customers_analyzed: 150,
        dormant_customers_count: 2,
        total_value_at_risk: 5355.50,
        data_accuracy_score: 0.95,
        total_records: 500,
        valid_records: 475,
        data_completeness_score: 0.95
      })
      .eq('id', jobId)

  } catch (error) {
    console.error('Processing completion error:', error)
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        message: 'Processing failed during completion: ' + error
      })
      .eq('id', jobId)
  }
}