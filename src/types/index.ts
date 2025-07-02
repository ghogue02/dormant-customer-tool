// Type definitions for the application

export interface ProcessingResult {
  job_id: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  result_summary?: {
    dormant_customers: number
    total_value_at_risk: number
    data_accuracy: number
  }
  error?: string
  timestamp?: string
  files?: {
    sales_file?: string
    planning_file?: string
  }
}

export interface DormantCustomer {
  customer: string
  salesperson: string
  last_order_date: string
  days_since_order: number
  total_6_month_value: number
  order_count_6_months: number
  average_order_value: number
  churn_risk_score: number
  customer_lifetime_value?: number
  preferred_products?: string[]
  seasonal_pattern?: string
}

export interface SalespersonSummary {
  salesperson: string
  dormant_customer_count: number
  total_value_at_risk: number
  high_value_dormant_count: number
  quick_win_count: number
  average_churn_risk: number
}

export interface AnalysisResults {
  summary: {
    total_dormant_customers: number
    total_value_at_risk: number
    average_churn_risk: number
    data_quality_score: number
  }
  salesperson_summaries: SalespersonSummary[]
  dormant_customers: DormantCustomer[]
  insights: Record<string, string>
  data_quality_report: {
    total_records: number
    valid_records: number
    data_completeness_score: number
    missing_customer_mappings: number
    invalid_dates: number
    invalid_prices: number
    recommendations: string[]
  }
  processing_timestamp: string
  total_customers_analyzed: number
  data_accuracy_score: number
}