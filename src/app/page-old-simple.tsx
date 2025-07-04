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
        setError('Processing large file... This may take a moment.')
        try {
          processedSalesContent = await preprocessSalesData(salesFile)
          setError(null) // Clear the processing message
          
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getRiskColor = (risk: number) => {
    if (risk > 0.7) return 'text-red-600'
    if (risk > 0.4) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getRiskLabel = (risk: number) => {
    if (risk > 0.7) return 'High Risk'
    if (risk > 0.4) return 'Medium Risk'
    return 'Low Risk'
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

  // Original upload UI when no results
  if (false) {
    return (
      <div>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Results Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Analysis Complete!</h2>
                <p className="text-gray-600 mt-1">
                  Found {results.summary.totalDormantCustomers} dormant customers
                </p>
              </div>
              <button
                onClick={() => {
                  setResults(null)
                  setSalesFile(null)
                  setPlanningFile(null)
                  window.history.pushState({}, '', '/')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                New Analysis
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{results.summary.totalDormantCustomers}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Value at Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(results.summary.totalValueAtRisk)}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Avg Churn Risk</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(results.summary.averageChurnRisk * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Data Quality</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(results.summary.dataQualityScore * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
            <div className="space-y-3">
              {Object.entries(results.insights).map(([key, insight]) => (
                <div key={key} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">{insight as string}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Calculation Legend */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">📊 How Risk is Calculated</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Churn Risk Score Components:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="font-medium mr-2">50%</span>
                    <span><strong>Days Since Last Order:</strong> Customers who haven't ordered recently are at higher risk. Scale: 0-180 days (180+ days = maximum risk)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">30%</span>
                    <span><strong>Order Frequency:</strong> Customers with fewer orders are at higher risk. Scale: 1-12 orders (12+ orders = minimum risk)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-medium mr-2">20%</span>
                    <span><strong>Customer Value:</strong> Lower-value customers are at higher risk. Thresholds: &lt;$1k = high risk, $1k-$5k = medium risk, &gt;$5k = low risk</span>
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Low Risk (0-40%)
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Quick wins for re-engagement</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Medium Risk (40-70%)
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Requires targeted outreach</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    High Risk (70-100%)
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Urgent action needed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Quality Explanation */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">📈 Data Quality Score</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                The data quality score of <strong>{(results.summary.dataQualityScore * 100).toFixed(1)}%</strong> represents the percentage of records in your file that have:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Valid date format</li>
                <li>Customer name present</li>
                <li>Parseable price data</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                <strong>Note:</strong> Records outside the 6-month analysis window are still considered valid for quality scoring. Only records with missing or unparseable data reduce the quality score.
              </p>
              {results.dataQualityReport && (
                <div className="mt-3 text-xs text-gray-600">
                  <p>{results.dataQualityReport.dataCompleteness}</p>
                  <p>{results.dataQualityReport.windowCoverage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Salesperson Summary */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">By Salesperson</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Salesperson
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dormant Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Value at Risk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.salespersonSummaries.map((summary: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {summary.salesperson}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {summary.dormantCustomerCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(summary.totalValueAtRisk)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getRiskColor(summary.averageChurnRisk)}>
                          {(summary.averageChurnRisk * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Dormant Customers (Top 20)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Salesperson
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      6-Month Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.dormantCustomers.slice(0, 20).map((customer: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.salesperson}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(customer.total6MonthValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`${getRiskColor(customer.churnRiskScore)} font-medium`}>
                          {getRiskLabel(customer.churnRiskScore)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                Analyzing... This may take a moment
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
              <li>• Results can be shared with your sales team via a unique link</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}