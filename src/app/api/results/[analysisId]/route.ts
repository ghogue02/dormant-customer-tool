import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params

    // Try to get from KV
    if (process.env.KV_REST_API_URL) {
      const data = await kv.get(`analysis:${analysisId}`)
      
      if (data) {
        return NextResponse.json(data)
      }
    }

    return NextResponse.json(
      { error: 'Analysis not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Results fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    )
  }
}