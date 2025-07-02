import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = getSupabase()

    // Get the analysis job
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('*')
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

    // Get dormant customers
    const { data: dormantCustomers, error: customersError } = await supabase
      .from('dormant_customers')
      .select('*')
      .eq('job_id', jobId)
      .order('churn_risk_score', { ascending: false })

    if (customersError) {
      console.error('Error fetching dormant customers:', customersError)
      return NextResponse.json(
        { error: 'Failed to fetch dormant customers' },
        { status: 500 }
      )
    }

    // Get salesperson summaries
    const { data: salespersonSummaries, error: summariesError } = await supabase
      .from('salesperson_summaries')
      .select('*')
      .eq('job_id', jobId)
      .order('total_value_at_risk', { ascending: false })

    if (summariesError) {
      console.error('Error fetching salesperson summaries:', summariesError)
      return NextResponse.json(
        { error: 'Failed to fetch salesperson summaries' },
        { status: 500 }
      )
    }

    // Get insights
    const { data: insights, error: insightsError } = await supabase
      .from('analysis_insights')
      .select('*')
      .eq('job_id', jobId)
      .order('priority', { ascending: true })

    if (insightsError) {
      console.error('Error fetching insights:', insightsError)
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      )
    }

    // Format insights as key-value pairs
    const formattedInsights = {}
    insights?.forEach(insight => {
      formattedInsights[insight.insight_type] = insight.insight_text
    })

    // Format the response to match the expected structure
    const response = {
      summary: {
        total_dormant_customers: job.dormant_customers_count || 0,
        total_value_at_risk: job.total_value_at_risk || 0,
        average_churn_risk: salespersonSummaries?.length > 0 
          ? salespersonSummaries.reduce((sum, s) => sum + s.average_churn_risk, 0) / salespersonSummaries.length
          : 0,
        data_quality_score: job.data_accuracy_score || 0
      },
      salesperson_summaries: salespersonSummaries?.map(summary => ({
        salesperson: summary.salesperson,
        dormant_customer_count: summary.dormant_customer_count,
        total_value_at_risk: summary.total_value_at_risk,
        high_value_dormant_count: summary.high_value_dormant_count,
        quick_win_count: summary.quick_win_count,
        average_churn_risk: summary.average_churn_risk
      })) || [],
      dormant_customers: dormantCustomers?.map(customer => ({
        customer: customer.customer_name,
        salesperson: customer.salesperson,
        last_order_date: customer.last_order_date,
        days_since_order: customer.days_since_order,
        total_6_month_value: customer.total_6_month_value,
        order_count_6_months: customer.order_count_6_months,
        average_order_value: customer.average_order_value,
        churn_risk_score: customer.churn_risk_score,
        customer_lifetime_value: customer.customer_lifetime_value,
        preferred_products: customer.preferred_products || [],
        seasonal_pattern: customer.seasonal_pattern
      })) || [],
      insights: formattedInsights,
      data_quality_report: {
        total_records: job.total_records || 0,
        valid_records: job.valid_records || 0,
        data_completeness_score: job.data_completeness_score || 0,
        missing_customer_mappings: 0,
        invalid_dates: 0,
        invalid_prices: 0,
        recommendations: []
      },
      processing_timestamp: job.completed_at || job.updated_at,
      total_customers_analyzed: job.total_customers_analyzed || 0,
      data_accuracy_score: job.data_accuracy_score || 0
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Results fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}