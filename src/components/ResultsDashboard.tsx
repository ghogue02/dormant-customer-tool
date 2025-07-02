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
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'value' | 'risk' | 'date'>('value')

  const handleDownloadCSV = async () => {
    setIsDownloading(true)
    try {
      // Generate CSV from the results data
      const csvData = generateCSV(results.dormant_customers || [])
      
      // Create blob and download
      const blob = new Blob([csvData], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dormant-customers-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download CSV')
    } finally {
      setIsDownloading(false)
    }
  }

  const generateCSV = (customers: any[]) => {
    const headers = [
      'Customer',
      'Salesperson',
      'Last Order Date',
      'Days Since Order',
      '6-Month Value',
      'Order Count',
      'Avg Order Value',
      'Churn Risk',
      'Lifetime Value',
      'Preferred Products'
    ]
    
    const rows = customers.map(c => [
      c.customer,
      c.salesperson,
      c.last_order_date,
      c.days_since_order,
      c.total_6_month_value,
      c.order_count_6_months,
      c.average_order_value,
      c.churn_risk_score,
      c.customer_lifetime_value,
      (c.preferred_products || []).join('; ')
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n')
    
    return csvContent
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
            onClick={handleDownloadCSV}
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
                <span>Download CSV</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Report</span>
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
                onClick={() => setActiveTab(tab.id as 'insights' | 'salespeople' | 'customers')}
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

              {/* Summary Stats with Visual Charts */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Summary Statistics</h3>
                <div className="grid md:grid-cols-4 gap-4 mb-6">
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
                
                {/* Risk Distribution Chart */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Distribution</h4>
                  <div className="space-y-2">
                    {(() => {
                      const highRisk = results.dormant_customers?.filter(c => c.churn_risk_score > 0.7).length || 0
                      const mediumRisk = results.dormant_customers?.filter(c => c.churn_risk_score > 0.4 && c.churn_risk_score <= 0.7).length || 0
                      const lowRisk = results.dormant_customers?.filter(c => c.churn_risk_score <= 0.4).length || 0
                      const total = highRisk + mediumRisk + lowRisk
                      
                      return [
                        { label: 'High Risk', count: highRisk, color: 'bg-red-500' },
                        { label: 'Medium Risk', count: mediumRisk, color: 'bg-yellow-500' },
                        { label: 'Low Risk', count: lowRisk, color: 'bg-green-500' }
                      ].map(item => (
                        <div key={item.label} className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-20">{item.label}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div 
                              className={`${item.color} h-6 rounded-full flex items-center justify-end pr-2`}
                              style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                            >
                              <span className="text-xs text-white font-medium">{item.count}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    })()}
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

          {/* Customers Tab with Search and Sort */}
          {activeTab === 'customers' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">All Dormant Customers</h3>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'value' | 'risk' | 'date')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="value">Sort by Value</option>
                    <option value="risk">Sort by Risk</option>
                    <option value="date">Sort by Last Order</option>
                  </select>
                </div>
              </div>
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
                    {(() => {
                      let customers = results.dormant_customers || []
                      
                      // Filter by search term
                      if (searchTerm) {
                        customers = customers.filter(c => 
                          c.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.salesperson.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      }
                      
                      // Sort
                      customers = [...customers].sort((a, b) => {
                        switch (sortBy) {
                          case 'value':
                            return b.total_6_month_value - a.total_6_month_value
                          case 'risk':
                            return b.churn_risk_score - a.churn_risk_score
                          case 'date':
                            return new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
                          default:
                            return 0
                        }
                      })
                      
                      return customers.slice(0, 50).map((customer, index) => (
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
                      ))
                    })()}
                  </tbody>
                </table>
                {results.dormant_customers?.length > 50 && (
                  <p className="mt-4 text-sm text-gray-500 text-center">
                    Showing first 50 customers. Download CSV for complete list.
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