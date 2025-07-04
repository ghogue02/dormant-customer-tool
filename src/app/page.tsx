'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { preprocessSalesData } from '@/lib/client-processor'
import { EnhancedResultsDashboard } from '@/components/EnhancedResultsDashboard'

interface AnalysisResult {
  success: boolean
  analysisId?: string
  results?: any
  shareUrl?: string
  error?: string
  details?: string
}

export default function Home() {
  const [salesFile, setSalesFile] = useState<File | null>(null)
  const [planningFile, setPlanningFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState<string>('')
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleResponse = async (response: Response) => {
    // Handle non-JSON responses (like 413 errors)
    const contentType = response.headers.get('content-type')
    let data: AnalysisResult
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // Handle non-JSON error responses
      const text = await response.text()
      data = {
        success: false,
        error: response.status === 413 
          ? 'File too large even after processing. Please contact support.'
          : `Server error: ${text}`,
      }
    }

    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed')
    }

    if (data.success && data.results) {
      setResults(data.results)
      
      // If we have a share URL, update the browser URL
      if (data.shareUrl) {
        window.history.pushState({}, '', data.shareUrl)
      }
    }
  }

  const handleAnalyze = async () => {
    if (!salesFile || !planningFile) {
      setError('Please upload both files')
      return
    }

    // Check planning file size
    const maxPlanningSize = 5 * 1024 * 1024; // 5MB for planning file
    if (planningFile.size > maxPlanningSize) {
      setError(`Planning file is too large (${(planningFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Preprocess large sales file on client side
      let processedSalesContent: string
      
      if (salesFile.size > 4 * 1024 * 1024) { // If larger than 4MB
        setProcessingMessage('Processing large file... This may take a moment.')
        try {
          processedSalesContent = await preprocessSalesData(salesFile)
          setProcessingMessage('Uploading processed data...')
          
          // Create a new smaller file from processed content
          const processedBlob = new Blob([processedSalesContent], { type: 'text/csv' })
          const processedFile = new File([processedBlob], salesFile.name, { type: 'text/csv' })
          
          console.log(`Reduced file size from ${(salesFile.size / 1024 / 1024).toFixed(2)}MB to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)
          
          if (processedFile.size === 0) {
            setError('No valid data found after processing. Please check your file format.')
            setIsProcessing(false)
            setProcessingMessage('')
            return
          }
          
          const formData = new FormData()
          formData.append('salesFile', processedFile)
          formData.append('planningFile', planningFile)
          
          const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData,
          })
          
          await handleResponse(response)
        } catch (preprocessError) {
          console.error('Preprocessing error:', preprocessError)
          const errorMessage = preprocessError instanceof Error ? preprocessError.message : 'Unknown error'
          setError(`Failed to process file: ${errorMessage}`)
          setIsProcessing(false)
          setProcessingMessage('')
          return
        }
      } else {
        // File is small enough, send as-is
        const formData = new FormData()
        formData.append('salesFile', salesFile)
        formData.append('planningFile', planningFile)
        
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        })
        
        await handleResponse(response)
      }

    } catch (err) {
      console.error('Analysis error:', err)
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('413') || err.message.includes('Request Entity Too Large')) {
          setError('Files are too large. Please ensure total upload size is under 20MB.')
        } else if (err.message.includes('Failed to fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Analysis failed. Please try again.')
      }
    } finally {
      setIsProcessing(false)
      setProcessingMessage('')
    }
  }

  if (results) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EnhancedResultsDashboard 
            results={results} 
            onReset={() => {
              setResults(null)
              setSalesFile(null)
              setPlanningFile(null)
              window.history.pushState({}, '', '/')
            }} 
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dormant Customer Sales Intelligence
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload your sales data and planning sheet to instantly identify dormant customers 
            and get AI-powered insights for re-engagement.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6">Upload Your Files</h2>
          
          {/* Sales File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sales Report (CSV)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="text-sm text-gray-600">
                  <label
                    htmlFor="sales-file"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                  >
                    <span>Upload sales CSV</span>
                    <input
                      id="sales-file"
                      name="sales-file"
                      type="file"
                      className="sr-only"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setSalesFile(file)
                      }}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                {salesFile && (
                  <p className="text-sm text-gray-900 mt-2">
                    ✓ {salesFile.name} ({(salesFile.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Planning File Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planning Sheet (Excel)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="text-sm text-gray-600">
                  <label
                    htmlFor="planning-file"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                  >
                    <span>Upload planning Excel</span>
                    <input
                      id="planning-file"
                      name="planning-file"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setPlanningFile(file)
                      }}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                {planningFile && (
                  <p className="text-sm text-gray-900 mt-2">
                    ✓ {planningFile.name} ({(planningFile.size / 1024).toFixed(2)}KB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!salesFile || !planningFile || isProcessing}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              salesFile && planningFile && !isProcessing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {processingMessage || 'Analyzing... This may take a moment'}
              </span>
            ) : (
              'Analyze Files'
            )}
          </button>

          {/* Help Text */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• We&apos;ll identify customers who ordered in the last 6 months but not in the last 45 days</li>
              <li>• Salesperson assignments will be corrected using your planning sheet</li>
              <li>• AI-powered insights will highlight priority customers and quick wins</li>
              <li>• Interactive dashboard with customer segments, risk analysis, and revenue forecasts</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}