import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

// Get Supabase client - creates it lazily when needed
export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Return a mock client during build time
      return {
        from: () => ({
          select: () => ({ single: () => ({ data: null, error: new Error('Supabase not configured') }) }),
          insert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
          update: () => ({ eq: () => ({}) }),
          delete: () => ({ eq: () => ({}) })
        }),
        storage: {
          from: () => ({
            upload: () => ({ error: new Error('Supabase not configured') })
          })
        }
      } as any
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  
  return supabaseInstance
}

// Export the function only - do not create instance at module level
// This prevents build-time errors when env vars are not available

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