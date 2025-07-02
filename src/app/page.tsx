'use client'

import { useState, useCallback } from 'react'
import { FileUploadSection } from '@/components/FileUploadSection'
import { ProcessingStatus } from '@/components/ProcessingStatus'
import { ResultsDashboard } from '@/components/ResultsDashboard'
import { Header } from '@/components/Header'
import { DataQualityIndicator } from '@/components/DataQualityIndicator'

interface ProcessingResult {
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
}

export default function Home() {
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
  const [results, setResults] = useState<any>(null)

  const handleFilesUploaded = useCallback((result: ProcessingResult) => {
    setProcessingResult(result)
    setResults(null) // Clear previous results
  }, [])

  const handleProcessingComplete = useCallback((finalResults: any) => {
    setResults(finalResults)
  }, [])

  const handleReset = useCallback(() => {
    setProcessingResult(null)
    setResults(null)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
              Sales Intelligence Tool
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Automatically identify dormant customers and generate actionable insights 
              for your sales team with AI-powered analytics.
            </p>
          </div>

          {/* Main Content */}
          {!processingResult && (
            <FileUploadSection onFilesUploaded={handleFilesUploaded} />
          )}

          {processingResult && !results && (
            <div className="space-y-6">
              <ProcessingStatus 
                result={processingResult}
                onComplete={handleProcessingComplete}
                onReset={handleReset}
              />
              
              {processingResult.result_summary && (
                <DataQualityIndicator 
                  accuracy={processingResult.result_summary.data_accuracy}
                  customerCount={processingResult.result_summary.dormant_customers}
                  valueAtRisk={processingResult.result_summary.total_value_at_risk}
                />
              )}
            </div>
          )}

          {results && (
            <ResultsDashboard 
              results={results}
              jobId={processingResult?.job_id || ''}
              onReset={handleReset}
            />
          )}

          {/* Features Section */}
          {!processingResult && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
                What You'll Get
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Detailed Analytics
                  </h3>
                  <p className="text-gray-600">
                    Advanced customer insights including churn risk scores, lifetime value, 
                    and purchasing patterns for strategic decision making.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Data Accuracy
                  </h3>
                  <p className="text-gray-600">
                    Automated data validation and cleaning ensures your reports are 
                    accurate and trustworthy for critical business decisions.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready-to-Use Reports
                  </h3>
                  <p className="text-gray-600">
                    Professional Excel reports with separate tabs for each salesperson, 
                    complete with customer history and strategic recommendations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
