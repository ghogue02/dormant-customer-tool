'use client'

import { useState, useMemo } from 'react'
import { EnhancedProcessingResult } from '@/lib/enhanced-data-processor'
import { EnhancedCustomerData } from '@/lib/enhanced-analytics'
import { SalespersonModal } from './SalespersonModal'
import { CustomerModal } from './CustomerModal'
import { AtRiskModal } from './AtRiskModal'
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface EnhancedResultsDashboardProps {
  results: EnhancedProcessingResult
  onReset: () => void
}

export function EnhancedResultsDashboard({ results, onReset }: EnhancedResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'salespeople' | 'customers' | 'products'>('overview')
  const [selectedSalesperson, setSelectedSalesperson] = useState<any>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<EnhancedCustomerData | null>(null)
  const [showAtRiskModal, setShowAtRiskModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSegment, setFilterSegment] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'value' | 'risk' | 'winback'>('value')

  // Colors for consistent visualization
  const COLORS = {
    segments: {
      'VIP': '#9333ea',
      'Regular': '#3b82f6',
      'Occasional': '#f59e0b',
      'At-Risk': '#ef4444',
      'Lost': '#6b7280'
    },
    risk: {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    },
    charts: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
  }

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = results.dormantCustomers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.salesperson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.locationData.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.locationData.state?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Segment filter
    if (filterSegment !== 'all') {
      filtered = filtered.filter(c => c.segment.segment === filterSegment)
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.total6MonthValue - a.total6MonthValue
        case 'risk':
          return b.churnRiskScore - a.churnRiskScore
        case 'winback':
          return b.winBackProbability.score - a.winBackProbability.score
        default:
          return 0
      }
    })
  }, [results.dormantCustomers, searchTerm, filterSegment, sortBy])

  // Generate data for charts
  const segmentChartData = Object.entries(results.customerSegments).map(([segment, count]) => ({
    name: segment,
    value: count,
    fill: COLORS.segments[segment as keyof typeof COLORS.segments] || '#6b7280'
  }))

  const riskDistribution = [
    { 
      name: 'Low Risk', 
      value: results.dormantCustomers.filter(c => c.churnRiskScore <= 0.4).length,
      fill: COLORS.risk.low
    },
    { 
      name: 'Medium Risk', 
      value: results.dormantCustomers.filter(c => c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7).length,
      fill: COLORS.risk.medium
    },
    { 
      name: 'High Risk', 
      value: results.dormantCustomers.filter(c => c.churnRiskScore > 0.7).length,
      fill: COLORS.risk.high
    }
  ]


  // Export functionality
  // Handle insight clicks for navigation
  const handleInsightClick = (key: string, insight: string) => {
    if (key === 'topPriorityRep') {
      // Extract salesperson name and show their modal
      const match = insight.match(/Focus on ([^,]+),/)
      if (match) {
        const salesPersonName = match[1]
        const salesperson = results.salespersonSummaries.find(s => s.salesperson === salesPersonName)
        if (salesperson) {
          setSelectedSalesperson(salesperson)
        }
      }
    } else if (key === 'topPriorityCustomer') {
      // Extract customer name and show their modal
      const match = insight.match(/^([^\\s]+(?:\\s+[^\\s]+)*?)\\s+is your top priority/)
      if (match) {
        const customerName = match[1]
        const customer = results.dormantCustomers.find(c => c.customer === customerName)
        if (customer) {
          setSelectedCustomer(customer)
        }
      }
    } else if (key === 'quickWins') {
      // Navigate to customers tab and filter for high win-back probability
      setActiveTab('customers')
      setSortBy('winback')
    } else if (key === 'vipAlert') {
      // Navigate to customers tab and filter for VIP
      setActiveTab('customers')
      setFilterSegment('VIP')
    } else if (key === 'geographicInsight') {
      // Navigate to salespeople or customers tab
      setActiveTab('customers')
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Customer', 'Salesperson', 'Segment', 'Last Order Date', 'Days Since Order',
      '6-Month Value', 'Churn Risk', 'Win-Back Probability', 'Location', 'Top Products'
    ]

    const rows = filteredCustomers.map(c => [
      c.customer,
      c.salesperson,
      c.segment.segment,
      new Date(c.lastOrderDate).toLocaleDateString(),
      c.daysSinceOrder,
      c.total6MonthValue.toFixed(2),
      (c.churnRiskScore * 100).toFixed(1) + '%',
      (c.winBackProbability.score * 100).toFixed(1) + '%',
      `${c.locationData.city}, ${c.locationData.state}`,
      c.productPreferences.slice(0, 3).map(p => p.product).join('; ')
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dormant-customers-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enhanced Analysis Complete!</h2>
            <p className="text-gray-600">
              {results.dormantCustomers.length} dormant customers identified with {(results.summary.averageWinBackProbability * 100).toFixed(0)}% average win-back probability
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Report generated</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export to CSV</span>
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
          <nav className="flex flex-wrap">
            {[
              { id: 'overview', label: '📊 Overview', count: null },
              { id: 'insights', label: '💡 Key Insights', count: null },
              { id: 'salespeople', label: '👥 By Salesperson', count: results.salespersonSummaries.length },
              { id: 'customers', label: '🏢 Customers', count: results.dormantCustomers.length },
              { id: 'products', label: '🍷 Products', count: results.productInsights.topProducts.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-6 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div 
                  className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-300"
                  onClick={() => setShowAtRiskModal(true)}
                  title={`Total at Risk Calculation:\n\n• Formula: Sum of all dormant customers' 6-month revenue\n• Dormant = Ordered in last 6 months BUT not in last 45 days\n• Represents revenue that could be lost if customers don't return\n• ${results.summary.totalDormantCustomers} customers with average of ${formatCurrency(results.summary.totalValueAtRisk / results.summary.totalDormantCustomers)} per customer\n\nClick to see detailed at-risk analysis`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-600 font-medium">Total at Risk</p>
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{formatCurrency(results.summary.totalValueAtRisk)}</p>
                  <p className="text-xs text-blue-700 mt-1">{results.summary.totalDormantCustomers} customers</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Click for detailed analysis →</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Projected Recovery</p>
                  <p className="text-3xl font-bold text-green-900">{formatCurrency(results.revenueForecasts.realistic)}</p>
                  <p className="text-xs text-green-700 mt-1">Next 6 months</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">VIP Customers</p>
                  <p className="text-3xl font-bold text-purple-900">{results.customerSegments['VIP'] || 0}</p>
                  <p className="text-xs text-purple-700 mt-1">Require immediate attention</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Quick Wins</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {results.dormantCustomers.filter(c => c.winBackProbability.score > 0.7).length}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">&gt;70% win-back probability</p>
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Segments */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 text-gray-900">Customer Segments</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={segmentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        dataKey="value"
                      >
                        {segmentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Risk Distribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={riskDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value">
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Quick Win Opportunities */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Top 10 Quick Win Opportunities</h3>
                <div className="space-y-3">
                  {results.dormantCustomers
                    .filter(c => c.winBackProbability.score > 0.7)
                    .sort((a, b) => b.winBackProbability.score - a.winBackProbability.score)
                    .slice(0, 10)
                    .map((customer, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer transition-colors"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{customer.customer}</p>
                          <p className="text-sm text-gray-600">Rep: {customer.salesperson} • Last order: {customer.daysSinceOrder} days ago</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{(customer.winBackProbability.score * 100).toFixed(0)}%</p>
                          <p className="text-sm text-gray-600">{formatCurrency(customer.winBackProbability.estimatedRevenue)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* Main Insights */}
              <div className="space-y-4">
                {Object.entries(results.insights).map(([key, insight]) => (
                  <div 
                    key={key} 
                    className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                      key === 'vipAlert' && results.customerSegments['VIP'] > 0 
                        ? 'bg-purple-50 border-purple-200 hover:bg-purple-100' 
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={() => handleInsightClick(key, insight as string)}
                  >
                    <p className={`${
                      key === 'vipAlert' && results.customerSegments['VIP'] > 0 
                        ? 'text-purple-800' 
                        : 'text-blue-800'
                    }`}>
                      {insight as string}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Click to explore this insight →
                    </p>
                  </div>
                ))}
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Actionable Recommendations</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="font-medium text-gray-900">Immediate Action Required</p>
                      <p className="text-sm text-gray-600">
                        {results.customerSegments['VIP'] || 0} VIP customers need personal outreach within 24 hours
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="font-medium text-gray-900">Quick Win Opportunities</p>
                      <p className="text-sm text-gray-600">
                        {results.dormantCustomers.filter(c => c.winBackProbability.score > 0.7).length} customers have &gt;70% win-back probability
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">🍷</span>
                    <div>
                      <p className="font-medium text-gray-900">Top Products to Promote</p>
                      <p className="text-sm text-gray-600">
                        Focus on {results.summary.topProducts.slice(0, 3).map(p => p.product).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <p className="font-medium text-gray-900">Seasonal Timing</p>
                      <p className="text-sm text-gray-600">
                        {results.dormantCustomers.filter(c => c.seasonalPattern.pattern !== 'Sporadic').length} customers have seasonal buying patterns to leverage
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Top Products Among Dormant Customers</h3>
                <div className="space-y-3">
                  {results.summary.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{product.product}</span>
                      <span className="text-gray-600">{formatCurrency(product.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Salespeople Tab */}
          {activeTab === 'salespeople' && (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salesperson
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dormant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value at Risk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Potential Recovery
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quick Wins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Win-Back
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.salespersonSummaries.map((summary, index) => (
                      <tr 
                        key={index} 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                        onClick={() => setSelectedSalesperson(summary)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {summary.salesperson}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.dormantCustomerCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(summary.totalValueAtRisk)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(summary.potentialRecovery)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.quickWinCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${summary.averageWinBackProbability * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {(summary.averageWinBackProbability * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-blue-600 hover:text-blue-800">
                            View Details →
                          </button>
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
              {/* Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <input
                    type="text"
                    placeholder="Search customers, cities, states..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-[300px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={filterSegment}
                    onChange={(e) => setFilterSegment(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Segments</option>
                    {Object.keys(results.customerSegments).map(segment => (
                      <option key={segment} value={segment}>{segment}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="value">Sort by Value</option>
                    <option value="risk">Sort by Risk</option>
                    <option value="winback">Sort by Win-Back Probability</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600">
                  Showing {filteredCustomers.length} of {results.dormantCustomers.length} customers
                </p>
              </div>

              {/* Customer Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">6-Month Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win-Back</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCustomers.slice(0, 50).map((customer, index) => (
                      <tr 
                        key={index} 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.customer}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.segment.segment === 'VIP' ? 'bg-purple-100 text-purple-800' :
                            customer.segment.segment === 'Regular' ? 'bg-blue-100 text-blue-800' :
                            customer.segment.segment === 'At-Risk' ? 'bg-red-100 text-red-800' :
                            customer.segment.segment === 'Occasional' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {customer.segment.segment}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {customer.locationData.city}, {customer.locationData.state}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(customer.total6MonthValue)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.churnRiskScore > 0.7 ? 'bg-red-100 text-red-800' :
                            customer.churnRiskScore > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {(customer.churnRiskScore * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div 
                            className="flex items-center cursor-help" 
                            title={`Win-Back Score Breakdown:\n• Recency: ${(customer.winBackProbability.factors.recencyScore * 100).toFixed(0)}% (30% weight)\n• Frequency: ${(customer.winBackProbability.factors.frequencyScore * 100).toFixed(0)}% (25% weight)\n• Value: ${(customer.winBackProbability.factors.monetaryScore * 100).toFixed(0)}% (25% weight)\n• Seasonal: ${(customer.winBackProbability.factors.seasonalScore * 100).toFixed(0)}% (10% weight)\n• Diversity: ${(customer.winBackProbability.factors.productDiversityScore * 100).toFixed(0)}% (10% weight)\n\nHigher scores = more likely to return when contacted`}
                          >
                            <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${customer.winBackProbability.score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {(customer.winBackProbability.score * 100).toFixed(0)}%
                            </span>
                            <span className="ml-1 text-xs text-gray-400">ⓘ</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-blue-600 text-xs">
                            Click row for details
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCustomers.length > 50 && (
                  <p className="mt-4 text-sm text-gray-500 text-center">
                    Showing first 50 customers. Export CSV for complete list.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Product Performance Table */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Top Products Among Dormant Customers</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg per Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.productInsights.topProducts.slice(0, 15).map((product, index) => {
                        const trendingUp = results.productInsights.trendingUp.includes(product.product)
                        const trendingDown = results.productInsights.trendingDown.includes(product.product)
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.product}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{product.customers}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(product.revenue)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatCurrency(product.revenue / product.customers)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {trendingUp && <span className="text-green-600">📈 Trending Up</span>}
                              {trendingDown && <span className="text-red-600">📉 Trending Down</span>}
                              {!trendingUp && !trendingDown && <span className="text-gray-400">→ Stable</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Product Trends */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 text-green-600">📈 Trending Up</h3>
                  <div className="space-y-2">
                    {results.productInsights.trendingUp.length > 0 ? (
                      results.productInsights.trendingUp.slice(0, 10).map((product, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">{product}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No trending up products identified</p>
                    )}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 text-red-600">📉 Trending Down</h3>
                  <div className="space-y-2">
                    {results.productInsights.trendingDown.length > 0 ? (
                      results.productInsights.trendingDown.slice(0, 10).map((product, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-800">{product}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No trending down products identified</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Customer Matrix */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Product Performance Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg per Customer</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.productInsights.topProducts.map((product, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-gray-900">{product.product}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{product.customers}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(product.revenue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatCurrency(product.revenue / product.customers)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {selectedSalesperson && (
        <SalespersonModal
          salesperson={selectedSalesperson}
          customers={results.dormantCustomers}
          onClose={() => setSelectedSalesperson(null)}
          onSelectCustomer={(customer) => {
            setSelectedSalesperson(null)
            setSelectedCustomer(customer)
          }}
        />
      )}

      {selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {showAtRiskModal && (
        <AtRiskModal
          results={results}
          onClose={() => setShowAtRiskModal(false)}
          onSelectCustomer={(customer) => {
            setShowAtRiskModal(false)
            setSelectedCustomer(customer)
          }}
          onSelectSalesperson={(salesperson) => {
            setShowAtRiskModal(false)
            setSelectedSalesperson(salesperson)
          }}
        />
      )}
    </div>
  )
}