import { NextRequest, NextResponse } from 'next/server'

// Demo results endpoint that works without Supabase
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    // Return demo results
    const demoResponse = {
      summary: {
        total_dormant_customers: 2,
        total_value_at_risk: 5355.50,
        average_churn_risk: 0.785,
        data_quality_score: 0.95
      },
      salesperson_summaries: [
        {
          salesperson: 'Mike Allen',
          dormant_customer_count: 1,
          total_value_at_risk: 3105.50,
          high_value_dormant_count: 1,
          quick_win_count: 0,
          average_churn_risk: 0.75
        },
        {
          salesperson: 'Angela Fultz',
          dormant_customer_count: 1,
          total_value_at_risk: 2250.00,
          high_value_dormant_count: 1,
          quick_win_count: 0,
          average_churn_risk: 0.82
        }
      ],
      dormant_customers: [
        {
          customer: 'Washington Golf and Country Club',
          salesperson: 'Mike Allen',
          last_order_date: '2025-03-15',
          days_since_order: 75,
          total_6_month_value: 3105.50,
          order_count_6_months: 5,
          average_order_value: 621.10,
          churn_risk_score: 0.75,
          customer_lifetime_value: 7452.00,
          preferred_products: ['Cabernet Sauvignon', 'Chardonnay'],
          seasonal_pattern: 'Spring buyer'
        },
        {
          customer: 'Crystal Palate',
          salesperson: 'Angela Fultz',
          last_order_date: '2025-02-20',
          days_since_order: 98,
          total_6_month_value: 2250.00,
          order_count_6_months: 3,
          average_order_value: 750.00,
          churn_risk_score: 0.82,
          customer_lifetime_value: 5400.00,
          preferred_products: ['Pinot Noir', 'Sauvignon Blanc'],
          seasonal_pattern: 'Winter buyer'
        }
      ],
      insights: {
        top_priority_rep: 'Focus on Mike Allen, who has $3,105.50 in sales at risk across 1 dormant customer.',
        top_priority_customer: 'Prioritize outreach to Washington Golf and Country Club. They represent $3,105.50 in potential lost revenue.',
        quick_wins: 'Both customers are high-value accounts requiring immediate attention.'
      },
      data_quality_report: {
        total_records: 500,
        valid_records: 475,
        data_completeness_score: 0.95,
        missing_customer_mappings: 0,
        invalid_dates: 0,
        invalid_prices: 0,
        recommendations: []
      },
      processing_timestamp: new Date().toISOString(),
      total_customers_analyzed: 150,
      data_accuracy_score: 0.95,
      demo_mode: true
    }

    return NextResponse.json(demoResponse)

  } catch (error) {
    console.error('Demo results error:', error)
    return NextResponse.json(
      { error: 'Demo results fetch failed' },
      { status: 500 }
    )
  }
}