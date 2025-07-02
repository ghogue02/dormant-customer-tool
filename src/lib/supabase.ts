import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface AnalysisJob {
  id: string
  user_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  created_at: string
  updated_at: string
  completed_at?: string
  analysis_date: string
  dormant_threshold_days: number
  analysis_period_months: number
  sales_filename?: string
  planning_filename?: string
  total_customers_analyzed?: number
  dormant_customers_count?: number
  total_value_at_risk?: number
  data_accuracy_score?: number
  total_records?: number
  valid_records?: number
  data_completeness_score?: number
}

export interface DormantCustomer {
  id: string
  job_id: string
  customer_name: string
  salesperson: string
  last_order_date: string
  days_since_order: number
  total_6_month_value: number
  order_count_6_months: number
  average_order_value: number
  customer_lifetime_value?: number
  churn_risk_score: number
  seasonal_pattern?: string
  preferred_products?: string[]
  created_at: string
}

export interface SalespersonSummary {
  id: string
  job_id: string
  salesperson: string
  dormant_customer_count: number
  total_value_at_risk: number
  high_value_dormant_count: number
  quick_win_count: number
  average_churn_risk: number
  created_at: string
}

export interface AnalysisInsight {
  id: string
  job_id: string
  insight_type: string
  insight_text: string
  priority: number
  created_at: string
}