import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const checks = {
      environment: {
        supabase_url_set: !!supabaseUrl,
        supabase_key_set: !!supabaseKey,
        supabase_url_preview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
        node_env: process.env.NODE_ENV
      },
      supabase_client: false,
      storage_test: false,
      database_test: false,
      timestamp: new Date().toISOString()
    }
    
    // Test Supabase client creation
    try {
      const supabase = getSupabase()
      checks.supabase_client = !!supabase
      
      // Test database connection
      if (supabase && supabaseUrl !== 'https://placeholder.supabase.co') {
        const { error: dbError } = await supabase
          .from('analysis_jobs')
          .select('count')
          .limit(1)
        
        checks.database_test = !dbError
        
        // Test storage bucket
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
        checks.storage_test = !storageError
        checks.storage_buckets = buckets?.map(b => b.name) || []
      }
    } catch (error) {
      console.error('Supabase test error:', error)
    }
    
    return NextResponse.json({
      status: 'ok',
      checks,
      message: 'Health check endpoint'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}