'use client'

import { useState, useMemo } from 'react'
import { EnhancedCustomerData } from '@/lib/enhanced-analytics'
import { EnhancedProcessingResult } from '@/lib/enhanced-data-processor'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AtRiskModalProps {
  results: EnhancedProcessingResult
  onClose: () => void
  onSelectCustomer: (customer: EnhancedCustomerData) => void
  onSelectSalesperson: (salesperson: any) => void
}

export function AtRiskModal({ results, onClose, onSelectCustomer, onSelectSalesperson }: AtRiskModalProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'customers' | 'risk' | 'segments' | 'actions'>('overview')
  const [sortBy, setSortBy] = useState<'value' | 'risk' | 'days' | 'winback'>('value')
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate overview metrics
  const overviewMetrics = useMemo(() => {
    const avgDaysSinceOrder = results.dormantCustomers.reduce((sum, c) => sum + c.daysSinceOrder, 0) / results.dormantCustomers.length
    const totalRecoveryPotential = results.dormantCustomers.reduce((sum, c) => sum + (c.winBackProbability.estimatedRevenue * c.winBackProbability.score), 0)
    
    return {
      avgDaysSinceOrder: Math.round(avgDaysSinceOrder),
      totalRecoveryPotential,
      recoveryRate: (totalRecoveryPotential / results.summary.totalValueAtRisk) * 100
    }
  }, [results])

  // Risk distribution data
  const riskDistribution = useMemo(() => {
    return [
      { 
        name: 'High Risk',
        value: results.dormantCustomers.filter(c => c.churnRiskScore > 0.7).length,
        color: '#ef4444',
        customers: results.dormantCustomers.filter(c => c.churnRiskScore > 0.7)
      },
      { 
        name: 'Medium Risk',
        value: results.dormantCustomers.filter(c => c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7).length,
        color: '#f59e0b',
        customers: results.dormantCustomers.filter(c => c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7)
      },
      { 
        name: 'Low Risk',
        value: results.dormantCustomers.filter(c => c.churnRiskScore <= 0.4).length,
        color: '#10b981',
        customers: results.dormantCustomers.filter(c => c.churnRiskScore <= 0.4)
      }
    ]
  }, [results])

  // Top at-risk salespeople
  const topAtRiskSalespeople = useMemo(() => {
    return results.salespersonSummaries
      .sort((a, b) => b.totalValueAtRisk - a.totalValueAtRisk)
      .slice(0, 5)
  }, [results])

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    let filtered = results.dormantCustomers

    if (filterRisk !== 'all') {
      filtered = filtered.filter(c => {
        if (filterRisk === 'high') return c.churnRiskScore > 0.7
        if (filterRisk === 'medium') return c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7
        if (filterRisk === 'low') return c.churnRiskScore <= 0.4
        return true
      })
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value': return b.total6MonthValue - a.total6MonthValue
        case 'risk': return b.churnRiskScore - a.churnRiskScore
        case 'days': return b.daysSinceOrder - a.daysSinceOrder
        case 'winback': return b.winBackProbability.score - a.winBackProbability.score
        default: return 0
      }
    })
  }, [results.dormantCustomers, filterRisk, sortBy])

  const sections = [
    { id: 'overview', label: '📊 Overview', count: null },
    { id: 'customers', label: '👥 Customer List', count: filteredCustomers.length },
    { id: 'risk', label: '⚠️ Risk Analysis', count: null },
    { id: 'segments', label: '🏷️ Segments', count: null },
    { id: 'actions', label: '🎯 Recommended Actions', count: null }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">At-Risk Customer Analysis</h2>
              <p className="text-blue-100 mt-1">
                {formatCurrency(results.summary.totalValueAtRisk)} from {results.summary.totalDormantCustomers} customers
              </p>
              <p className="text-blue-200 text-sm mt-2">
                Formula: Sum of all dormant customers' 6-month revenue • Dormant = Ordered in last 6 months BUT not in last 45 days
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`py-3 px-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {section.label}
                {section.count !== null && (
                  <span className="ml-2 bg-gray-200 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {section.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Average Days Since Order</p>
                  <p className="text-2xl font-bold text-blue-900">{overviewMetrics.avgDaysSinceOrder}</p>
                  <p className="text-xs text-blue-700">days dormant</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Recovery Potential</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(overviewMetrics.totalRecoveryPotential)}</p>
                  <p className="text-xs text-green-700">{overviewMetrics.recoveryRate.toFixed(1)}% of at-risk value</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Average Customer Value</p>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(results.summary.totalValueAtRisk / results.summary.totalDormantCustomers)}</p>
                  <p className="text-xs text-purple-700">6-month value</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">High Risk Customers</p>
                  <p className="text-2xl font-bold text-red-900">{riskDistribution[0].value}</p>
                  <p className="text-xs text-red-700">Need immediate attention</p>
                </div>
              </div>

              {/* Top At-Risk Salespeople */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Top Salespeople by At-Risk Value</h3>
                <div className="space-y-3">
                  {topAtRiskSalespeople.map((rep, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => {
                        onSelectSalesperson(rep)
                        onClose()
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{rep.salesperson}</p>
                        <p className="text-sm text-gray-600">{rep.dormantCustomerCount} dormant customers</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(rep.totalValueAtRisk)}</p>
                        <p className="text-sm text-gray-600">{rep.quickWinCount} quick wins</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Customer List Section */}
          {activeSection === 'customers' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="value">Sort by Value</option>
                  <option value="risk">Sort by Risk</option>
                  <option value="days">Sort by Days Since Order</option>
                  <option value="winback">Sort by Win-Back Probability</option>
                </select>
                
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk Only</option>
                  <option value="medium">Medium Risk Only</option>
                  <option value="low">Low Risk Only</option>
                </select>
              </div>

              {/* Customer Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">Salesperson</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">6-Month Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">Days Since Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">Risk Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">Win-Back</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCustomers.slice(0, 50).map((customer, index) => (
                      <tr 
                        key={index} 
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                        onClick={() => {
                          onSelectCustomer(customer)
                          onClose()
                        }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.customer}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {customer.salesperson}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(customer.total6MonthValue)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {customer.daysSinceOrder} days
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.churnRiskScore > 0.7 ? 'bg-red-100 text-red-800' :
                            customer.churnRiskScore > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {customer.churnRiskScore > 0.7 ? 'High' :
                             customer.churnRiskScore > 0.4 ? 'Medium' : 'Low'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${customer.winBackProbability.score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-900">
                              {(customer.winBackProbability.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCustomers.length > 50 && (
                  <p className="mt-4 text-sm text-gray-900 text-center">
                    Showing first 50 customers. Use filters to narrow results.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Risk Analysis Section */}
          {activeSection === 'risk' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Level Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        dataKey="value"
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {riskDistribution.map((risk, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{risk.name} (&gt;{index === 0 ? '70' : index === 1 ? '40-70' : '40'}%)</h4>
                        <span 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: risk.color }}
                        />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{risk.value} customers</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(risk.customers.reduce((sum, c) => sum + c.total6MonthValue, 0))} at risk
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Segments Section */}
          {activeSection === 'segments' && (
            <div className="grid md:grid-cols-2 gap-6">
              {Object.entries(results.customerSegments).map(([segment, count]) => {
                const segmentCustomers = results.dormantCustomers.filter(c => c.segment.segment === segment)
                const segmentValue = segmentCustomers.reduce((sum, c) => sum + c.total6MonthValue, 0)
                const avgDays = segmentCustomers.length > 0 
                  ? Math.round(segmentCustomers.reduce((sum, c) => sum + c.daysSinceOrder, 0) / segmentCustomers.length)
                  : 0

                return (
                  <div key={segment} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{segment} Customers</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        segment === 'VIP' ? 'bg-purple-100 text-purple-800' :
                        segment === 'Regular' ? 'bg-blue-100 text-blue-800' :
                        segment === 'At-Risk' ? 'bg-red-100 text-red-800' :
                        segment === 'Occasional' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {count} customers
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-medium">{formatCurrency(segmentValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg per Customer:</span>
                        <span className="font-medium">{formatCurrency(segmentValue / count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Days Dormant:</span>
                        <span className="font-medium">{avgDays} days</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Recommended Actions Section */}
          {activeSection === 'actions' && (
            <div className="space-y-6">
              {/* High Risk Actions */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🚨</span>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">High Risk Customers ({riskDistribution[0].value})</h3>
                    <p className="text-red-700">Churn risk &gt; 70% - Immediate action required</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Immediate Actions:</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• Personal phone call within 24 hours</li>
                      <li>• Offer 15-20% discount or free shipping</li>
                      <li>• Schedule face-to-face meeting if possible</li>
                      <li>• Understand why they haven&apos;t ordered</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Follow-up Strategy:</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• Send product recommendations based on history</li>
                      <li>• Invite to exclusive tasting events</li>
                      <li>• Assign dedicated account manager</li>
                      <li>• Weekly check-ins for 1 month</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Medium Risk Actions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900">Medium Risk Customers ({riskDistribution[1].value})</h3>
                    <p className="text-yellow-700">Churn risk 40-70% - Proactive engagement needed</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Engagement Actions:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Personalized email with product suggestions</li>
                      <li>• 10-15% loyalty discount offer</li>
                      <li>• Include in next newsletter campaign</li>
                      <li>• Schedule follow-up call in 1-2 weeks</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Prevention Strategy:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Add to automated nurture sequence</li>
                      <li>• Send seasonal buying reminders</li>
                      <li>• Invite to virtual tastings</li>
                      <li>• Monthly value-added content</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Low Risk Actions */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">✅</span>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Low Risk Customers ({riskDistribution[2].value})</h3>
                    <p className="text-green-700">Churn risk &lt; 40% - Maintain engagement</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Maintenance Actions:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Include in regular email campaigns</li>
                      <li>• Send new product announcements</li>
                      <li>• Seasonal ordering reminders</li>
                      <li>• Educational wine content</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Growth Strategy:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Cross-sell complementary products</li>
                      <li>• Invite to customer events</li>
                      <li>• Referral program enrollment</li>
                      <li>• Quarterly check-in calls</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Analysis generated on {new Date().toLocaleDateString()}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}