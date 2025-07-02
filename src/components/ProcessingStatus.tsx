'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ProcessingResult, AnalysisResults } from '@/types'

interface ProcessingStatusProps {
  result: ProcessingResult
  onComplete: (results: AnalysisResults) => void
  onReset: () => void
}

export function ProcessingStatus({ result, onComplete, onReset }: ProcessingStatusProps) {
  const [currentStatus, setCurrentStatus] = useState(result)

  const fetchResults = useCallback(async () => {
    try {
      const isDemoMode = (result as any).demo_mode || (currentStatus as any).demo_mode
      const endpoint = isDemoMode ? `/api/results-demo/${result.job_id}` : `/api/results/${result.job_id}`
      const response = await fetch(endpoint)
      if (response.ok) {
        const results = await response.json()
        onComplete(results)
      }
    } catch (error) {
      console.error('Error fetching results:', error)
    }
  }, [result.job_id, currentStatus, onComplete])

  useEffect(() => {
    if (result.status === 'completed') {
      // Fetch the full results
      fetchResults()
      return
    }

    if (result.status === 'failed') {
      return
    }

    // Poll for status updates
    const interval = setInterval(async () => {
      try {
        const isDemoMode = (result as any).demo_mode
        const endpoint = isDemoMode ? `/api/status-demo/${result.job_id}` : `/api/status/${result.job_id}`
        const response = await fetch(endpoint)
        if (response.ok) {
          const statusUpdate = await response.json()
          setCurrentStatus(statusUpdate)
          
          if (statusUpdate.status === 'completed') {
            clearInterval(interval)
            fetchResults()
          } else if (statusUpdate.status === 'failed') {
            clearInterval(interval)
          }
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [result.job_id, result.status, fetchResults])

  const getStatusColor = () => {
    switch (currentStatus.status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'processing':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (currentStatus.status) {
      case 'completed':
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'processing':
        return (
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        )
      default:
        return (
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
        )
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <div className="text-center space-y-6">
        
        {/* Status Icon */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Status Text */}
        <div>
          <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
            {currentStatus.status === 'completed' ? 'Processing Complete!' :
             currentStatus.status === 'failed' ? 'Processing Failed' :
             currentStatus.status === 'processing' ? 'Processing Your Data...' :
             'Getting Started...'}
          </h2>
          <p className="text-gray-600 mt-2">
            {currentStatus.message}
          </p>
        </div>

        {/* Progress Bar */}
        {currentStatus.status !== 'failed' && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{currentStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  currentStatus.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${currentStatus.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Processing Steps */}
        {currentStatus.status === 'processing' && (
          <div className="text-left max-w-md mx-auto space-y-3">
            <h3 className="font-semibold text-gray-900 text-center mb-4">Processing Steps</h3>
            
            <div className="space-y-2">
              <div className={`flex items-center space-x-3 ${currentStatus.progress >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                {currentStatus.progress >= 10 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                )}
                <span className="text-sm">File validation</span>
              </div>

              <div className={`flex items-center space-x-3 ${currentStatus.progress >= 30 ? 'text-green-600' : 'text-gray-400'}`}>
                {currentStatus.progress >= 30 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : currentStatus.progress >= 10 ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                )}
                <span className="text-sm">Data cleaning & mapping</span>
              </div>

              <div className={`flex items-center space-x-3 ${currentStatus.progress >= 70 ? 'text-green-600' : 'text-gray-400'}`}>
                {currentStatus.progress >= 70 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : currentStatus.progress >= 30 ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                )}
                <span className="text-sm">AI analytics & insights</span>
              </div>

              <div className={`flex items-center space-x-3 ${currentStatus.progress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                {currentStatus.progress >= 100 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : currentStatus.progress >= 70 ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                )}
                <span className="text-sm">Report generation</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {currentStatus.status === 'failed' && currentStatus.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-red-800 mb-2">Error Details:</h4>
            <p className="text-sm text-red-700">{currentStatus.error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {currentStatus.status === 'failed' && (
            <button
              onClick={onReset}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          )}
          
          {currentStatus.status !== 'processing' && (
            <button
              onClick={onReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>

        {/* Fun Fact */}
        {currentStatus.status === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              💡 <strong>Did you know?</strong> Our AI analyzes customer purchasing patterns, 
              calculates churn risk scores, and identifies seasonal trends to help you 
              prioritize your outreach efforts effectively.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}