import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    const kvUrl = process.env.KV_REST_API_URL
    
    const checks = {
      environment: {
        kv_configured: !!kvUrl,
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV || 'development'
      },
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    }
    
    return NextResponse.json({
      status: 'ok',
      checks,
      message: 'Dormant Customer Tool is running'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}