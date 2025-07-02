import { NextRequest, NextResponse } from 'next/server'
import { processFiles } from '@/lib/data-processor'
import { processLargeFiles } from '@/lib/data-processor-chunked'
import { kv } from '@vercel/kv'
import { nanoid } from 'nanoid'

export const maxDuration = 60 // 60 seconds timeout
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting file analysis...')
    
    // Check content length
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Files too large. Maximum total size is 50MB.' },
        { status: 413 }
      )
    }
    
    const formData = await request.formData()
    const salesFile = formData.get('salesFile') as File
    const planningFile = formData.get('planningFile') as File

    if (!salesFile || !planningFile) {
      return NextResponse.json(
        { error: 'Both sales and planning files are required' },
        { status: 400 }
      )
    }

    // Read file contents
    const salesContent = await salesFile.text()
    const planningBuffer = await planningFile.arrayBuffer()

    console.log(`Processing ${salesFile.name} (${(salesFile.size / 1024 / 1024).toFixed(2)}MB)`)
    console.log(`Processing ${planningFile.name} (${(planningFile.size / 1024).toFixed(2)}KB)`)

    // Use chunked processing for large files
    const results = salesFile.size > 5 * 1024 * 1024 
      ? await processLargeFiles(salesContent, planningBuffer)
      : await processFiles(salesContent, planningBuffer)

    // Generate unique ID for this analysis
    const analysisId = nanoid(10)

    // Store results in Vercel KV (or fallback to in-memory if KV not configured)
    try {
      if (process.env.KV_REST_API_URL) {
        await kv.set(
          `analysis:${analysisId}`,
          JSON.stringify({
            ...results,
            createdAt: new Date().toISOString(),
            salesFileName: salesFile.name,
            planningFileName: planningFile.name
          }),
          {
            ex: 60 * 60 * 24 * 7 // Expire after 7 days
          }
        )
        console.log(`Results stored with ID: ${analysisId}`)
      } else {
        console.log('KV not configured, returning results directly')
      }
    } catch (kvError) {
      console.error('KV storage error:', kvError)
      // Continue without persistence
    }

    return NextResponse.json({
      success: true,
      analysisId,
      results,
      shareUrl: `/results/${analysisId}`
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}