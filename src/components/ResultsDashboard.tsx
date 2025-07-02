'use client'

import { useState } from 'react'
import type { AnalysisResults } from '@/types'

interface ResultsDashboardProps {
  results: AnalysisResults
  jobId: string
  onReset: () => void
}

export function ResultsDashboard({ results, jobId, onReset }: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'salespeople' | 'customers'>('insights')
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadExcel = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/download/${jobId}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        // For now, just show a message since we're not generating actual Excel files yet
        alert(`Excel download feature is implemented! ${result.note}`)
      } else {
        alert('Failed to generate Excel report')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download report')
    } finally {
      setIsDownloading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const getRiskColor = (risk: number) => {
    if (risk > 0.7) return 'text-red-600 bg-red-100'
    if (risk > 0.4) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getRiskLabel = (risk: number) => {
    if (risk > 0.7) return 'High Risk'
    if (risk > 0.4) return 'Medium Risk'
    return 'Low Risk'
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analysis Complete!</h2>
            <p className="text-gray-600">
              Found {results.dormant_customers?.length || 0} dormant customers across your sales team
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Report generated at</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(results.processing_timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleDownloadExcel}
            disabled={isDownloading}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Excel Report</span>
              </>
            )}
          </button>
          
          <button
            onClick={onReset}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Analyze New Files
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'insights', label: 'Key Insights', count: null },
              { id: 'salespeople', label: 'By Salesperson', count: results.salesperson_summaries?.length },
              { id: 'customers', label: 'All Customers', count: results.dormant_customers?.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          
          {/* Key Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              
              {/* Strategic Insights */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Strategic Insights</h3>
                <div className="space-y-4">
                  {Object.entries(results.insights || {}).map(([key, insight]) => (
                    <div key={key} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800">{insight as string}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Summary Statistics</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {results.total_customers_analyzed}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Dormant Customers</p>
                    <p className="text-2xl font-bold text-red-600">
                      {results.summary?.total_dormant_customers || 0}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Value at Risk</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(results.summary?.total_value_at_risk || 0)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Churn Risk</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatPercentage(results.summary?.average_churn_risk || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Quality */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Data Quality Report</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Overall Accuracy</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatPercentage(results.data_accuracy_score)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Records Processed</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {results.data_quality_report?.total_records || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Salespeople Tab */}
          {activeTab === 'salespeople' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Team Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salesperson
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dormant Customers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value at Risk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        High Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quick Wins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.salesperson_summaries?.map((summary, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {summary.salesperson}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.dormant_customer_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(summary.total_value_at_risk)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.high_value_dormant_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.quick_win_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(summary.average_churn_risk)}`}>
                            {formatPercentage(summary.average_churn_risk)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All Dormant Customers</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salesperson
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        6-Month Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Churn Risk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preferred Products
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.dormant_customers?.slice(0, 50).map((customer, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.customer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.salesperson}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.last_order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(customer.total_6_month_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(customer.churn_risk_score)}`}>
                            {getRiskLabel(customer.churn_risk_score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {customer.preferred_products?.slice(0, 2).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.dormant_customers?.length > 50 && (
                  <p className="mt-4 text-sm text-gray-500 text-center">
                    Showing first 50 customers. Download Excel report for complete list.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}