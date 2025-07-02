'use client'

import { useState, useMemo } from 'react'
import { EnhancedProcessingResult } from '@/lib/enhanced-data-processor'
import { EnhancedCustomerData } from '@/lib/enhanced-analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface QuickWinsModalProps {
  results: EnhancedProcessingResult
  onClose: () => void
  onSelectCustomer: (customer: EnhancedCustomerData) => void
  onSelectSalesperson: (salesperson: any) => void
  onNavigateToProjectedRecovery: () => void
  onNavigateToVIP: () => void
  onNavigateToAtRisk: () => void
}

export function QuickWinsModal({ 
  results, 
  onClose, 
  onSelectCustomer, 
  onSelectSalesperson,
  onNavigateToProjectedRecovery,
  onNavigateToVIP,
  onNavigateToAtRisk
}: QuickWinsModalProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'customers' | 'probability' | 'salespeople' | 'actions'>('overview')
  const [sortBy, setSortBy] = useState<'value' | 'probability' | 'days' | 'risk'>('probability')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Quick wins analysis (customers with >70% win-back probability)
  const quickWinsData = useMemo(() => {
    const quickWinCustomers = results.dormantCustomers.filter(c => c.winBackProbability.score > 0.7)
    
    if (quickWinCustomers.length === 0) {
      return {
        customers: [],
        totalValue: 0,
        avgValue: 0,
        avgDays: 0,
        avgProbability: 0,
        totalRecoveryPotential: 0,
        probabilityDistribution: [],
        salespersonBreakdown: [],
        urgencyDistribution: []
      }
    }

    const totalValue = quickWinCustomers.reduce((sum, c) => sum + c.total6MonthValue, 0)
    const avgDays = Math.round(quickWinCustomers.reduce((sum, c) => sum + c.daysSinceOrder, 0) / quickWinCustomers.length)
    const avgProbability = quickWinCustomers.reduce((sum, c) => sum + c.winBackProbability.score, 0) / quickWinCustomers.length
    const totalRecoveryPotential = quickWinCustomers.reduce((sum, c) => sum + (c.winBackProbability.estimatedRevenue * c.winBackProbability.score), 0)

    // Probability distribution (within quick wins)
    const probabilityDistribution = [
      {
        name: 'Very High (90-100%)',
        value: quickWinCustomers.filter(c => c.winBackProbability.score >= 0.9).length,
        color: '#059669',
        customers: quickWinCustomers.filter(c => c.winBackProbability.score >= 0.9)
      },
      {
        name: 'High (80-89%)',
        value: quickWinCustomers.filter(c => c.winBackProbability.score >= 0.8 && c.winBackProbability.score < 0.9).length,
        color: '#10b981',
        customers: quickWinCustomers.filter(c => c.winBackProbability.score >= 0.8 && c.winBackProbability.score < 0.9)
      },
      {
        name: 'Good (70-79%)',
        value: quickWinCustomers.filter(c => c.winBackProbability.score >= 0.7 && c.winBackProbability.score < 0.8).length,
        color: '#34d399',
        customers: quickWinCustomers.filter(c => c.winBackProbability.score >= 0.7 && c.winBackProbability.score < 0.8)
      }
    ]

    // Urgency distribution based on days since order
    const urgencyDistribution = [
      {
        name: 'Urgent (45-60 days)',
        value: quickWinCustomers.filter(c => c.daysSinceOrder <= 60).length,
        color: '#f59e0b',
        customers: quickWinCustomers.filter(c => c.daysSinceOrder <= 60)
      },
      {
        name: 'Soon (61-90 days)',
        value: quickWinCustomers.filter(c => c.daysSinceOrder > 60 && c.daysSinceOrder <= 90).length,
        color: '#3b82f6',
        customers: quickWinCustomers.filter(c => c.daysSinceOrder > 60 && c.daysSinceOrder <= 90)
      },
      {
        name: 'Moderate (91+ days)',
        value: quickWinCustomers.filter(c => c.daysSinceOrder > 90).length,
        color: '#6b7280',
        customers: quickWinCustomers.filter(c => c.daysSinceOrder > 90)
      }
    ]

    // Salesperson breakdown
    const salespersonMap = new Map()
    quickWinCustomers.forEach(customer => {
      const rep = customer.salesperson
      if (!salespersonMap.has(rep)) {
        salespersonMap.set(rep, {
          name: rep,
          customers: [],
          totalValue: 0,
          avgProbability: 0,
          recovery: 0
        })
      }
      const repData = salespersonMap.get(rep)
      repData.customers.push(customer)
      repData.totalValue += customer.total6MonthValue
      repData.recovery += (customer.winBackProbability.estimatedRevenue * customer.winBackProbability.score)
    })

    const salespersonBreakdown = Array.from(salespersonMap.values()).map(rep => ({
      ...rep,
      customerCount: rep.customers.length,
      avgValue: rep.totalValue / rep.customers.length,
      avgProbability: rep.customers.reduce((sum: number, c: EnhancedCustomerData) => sum + c.winBackProbability.score, 0) / rep.customers.length,
      avgDays: Math.round(rep.customers.reduce((sum: number, c: EnhancedCustomerData) => sum + c.daysSinceOrder, 0) / rep.customers.length)
    })).sort((a, b) => b.totalValue - a.totalValue)

    // Sort customers
    const sortedCustomers = [...quickWinCustomers].sort((a, b) => {
      switch (sortBy) {
        case 'value': return b.total6MonthValue - a.total6MonthValue
        case 'probability': return b.winBackProbability.score - a.winBackProbability.score
        case 'days': return a.daysSinceOrder - b.daysSinceOrder
        case 'risk': return a.churnRiskScore - b.churnRiskScore
        default: return 0
      }
    })

    return {
      customers: sortedCustomers,
      totalValue,
      avgValue: totalValue / quickWinCustomers.length,
      avgDays,
      avgProbability,
      totalRecoveryPotential,
      probabilityDistribution,
      urgencyDistribution,
      salespersonBreakdown
    }
  }, [results.dormantCustomers, sortBy])

  const sections = [
    { id: 'overview', label: '📊 Overview', count: null },
    { id: 'customers', label: '⚡ Quick Win Customers', count: quickWinsData.customers.length },
    { id: 'probability', label: '🎯 Probability Analysis', count: 3 },
    { id: 'salespeople', label: '👥 By Salesperson', count: quickWinsData.salespersonBreakdown.length },
    { id: 'actions', label: '🚀 Action Plan', count: null }
  ]

  if (quickWinsData.customers.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Quick Wins Found</h2>
            <p className="text-gray-600 mb-6">
              Currently no dormant customers have a win-back probability above 70%. 
              Focus on improving customer engagement strategies or review the criteria for other opportunities.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Quick Wins Strategy</h2>
              <p className="text-orange-100 mt-1">
                {quickWinsData.customers.length} customers with &gt;70% win-back probability
              </p>
              <p className="text-orange-200 text-sm mt-2">
                {formatCurrency(quickWinsData.totalRecoveryPotential)} potential recovery • Average {(quickWinsData.avgProbability * 100).toFixed(1)}% probability
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Quick Navigation */}
              <button
                onClick={onNavigateToProjectedRecovery}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs transition-colors"
                title="Go to Projected Recovery"
              >
                Recovery
              </button>
              <button
                onClick={onNavigateToVIP}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs transition-colors"
                title="Go to VIP Customers"
              >
                VIP
              </button>
              <button
                onClick={onNavigateToAtRisk}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs transition-colors"
                title="Go to At-Risk Analysis"
              >
                At-Risk
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-orange-600 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
                    ? 'border-orange-500 text-orange-600 bg-white'
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
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Quick Win Potential</p>
                  <p className="text-2xl font-bold text-orange-900">{formatCurrency(quickWinsData.totalRecoveryPotential)}</p>
                  <p className="text-xs text-orange-700">{quickWinsData.customers.length} customers</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Average Win-Back</p>
                  <p className="text-2xl font-bold text-green-900">{(quickWinsData.avgProbability * 100).toFixed(1)}%</p>
                  <p className="text-xs text-green-700">probability</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Average Customer Value</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(quickWinsData.avgValue)}</p>
                  <p className="text-xs text-blue-700">6-month value</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Average Days Dormant</p>
                  <p className="text-2xl font-bold text-yellow-900">{quickWinsData.avgDays}</p>
                  <p className="text-xs text-yellow-700">days since last order</p>
                </div>
              </div>

              {/* Urgency Alerts */}
              <div className="grid gap-4">
                {quickWinsData.urgencyDistribution.filter(urgency => urgency.value > 0).map((urgency, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    urgency.name.includes('Urgent') ? 'bg-yellow-50 border-yellow-200' :
                    urgency.name.includes('Soon') ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`text-2xl mr-3 ${
                          urgency.name.includes('Urgent') ? '⚡' :
                          urgency.name.includes('Soon') ? '🏃' : '🚶'
                        }`} />
                        <div>
                          <h4 className={`font-medium ${
                            urgency.name.includes('Urgent') ? 'text-yellow-900' :
                            urgency.name.includes('Soon') ? 'text-blue-900' :
                            'text-gray-900'
                          }`}>
                            {urgency.value} Quick Win{urgency.value !== 1 ? 's' : ''} - {urgency.name}
                          </h4>
                          <p className={`text-sm ${
                            urgency.name.includes('Urgent') ? 'text-yellow-700' :
                            urgency.name.includes('Soon') ? 'text-blue-700' :
                            'text-gray-700'
                          }`}>
                            {formatCurrency(urgency.customers.reduce((sum, c) => sum + c.total6MonthValue, 0))} total value
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          urgency.name.includes('Urgent') ? 'text-yellow-600' :
                          urgency.name.includes('Soon') ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {urgency.name.includes('Urgent') ? 'Contact Today' :
                           urgency.name.includes('Soon') ? 'Contact This Week' :
                           'Include in Campaign'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Immediate Quick Win Strategy</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Priority Actions (Next 24 Hours):</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Start with customers who have 90%+ win-back probability</li>
                      <li>• Contact urgent customers (45-60 days dormant) first</li>
                      <li>• Prepare personalized offers based on purchase history</li>
                      <li>• Use phone calls for high-value customers (&gt;$2000)</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Quick Win Strategy:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Offer 10-15% discount (higher probability = less discount needed)</li>
                      <li>• Highlight their favorite products in outreach</li>
                      <li>• Create urgency with limited-time offers</li>
                      <li>• Follow up within 48 hours if no response</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Win Customers List */}
          {activeSection === 'customers' && (
            <div className="space-y-4">
              {/* Sort Controls */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="probability">Win-Back Probability (Highest First)</option>
                  <option value="value">6-Month Value (Highest First)</option>
                  <option value="days">Days Since Order (Most Urgent First)</option>
                  <option value="risk">Churn Risk (Lowest First)</option>
                </select>
              </div>

              {/* Quick Win Customer Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win-Back Probability</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">6-Month Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Dormant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recovery Potential</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quickWinsData.customers.map((customer, index) => (
                      <tr 
                        key={index}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 cursor-pointer transition-colors`}
                        onClick={() => {
                          onSelectCustomer(customer)
                          onClose()
                        }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-orange-600 mr-2">⚡</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{customer.customer}</p>
                              <p className="text-xs text-gray-500">{customer.locationData.city}, {customer.locationData.state}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {customer.salesperson}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${customer.winBackProbability.score * 100}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${
                              customer.winBackProbability.score >= 0.9 ? 'text-green-700' :
                              customer.winBackProbability.score >= 0.8 ? 'text-green-600' :
                              'text-green-500'
                            }`}>
                              {(customer.winBackProbability.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-orange-600">
                          {formatCurrency(customer.total6MonthValue)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {customer.daysSinceOrder} days
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600">
                          {formatCurrency(customer.winBackProbability.estimatedRevenue * customer.winBackProbability.score)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <span className={`px-2 py-1 rounded text-white font-medium ${
                            customer.daysSinceOrder <= 60 ? 'bg-yellow-600' :
                            customer.daysSinceOrder <= 90 ? 'bg-blue-600' :
                            'bg-gray-600'
                          }`}>
                            {customer.daysSinceOrder <= 60 ? 'Urgent' :
                             customer.daysSinceOrder <= 90 ? 'Soon' :
                             'Moderate'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Probability Analysis Section */}
          {activeSection === 'probability' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Win-Back Probability Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={quickWinsData.probabilityDistribution.filter(p => p.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {quickWinsData.probabilityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {quickWinsData.probabilityDistribution.filter(p => p.value > 0).map((prob, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{prob.name}</h4>
                        <span 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: prob.color }}
                        />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{prob.value} customers</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(prob.customers.reduce((sum, c) => sum + c.total6MonthValue, 0))} total value
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Recovery: {formatCurrency(prob.customers.reduce((sum, c) => sum + (c.winBackProbability.estimatedRevenue * c.winBackProbability.score), 0))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Urgency Timeline */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Urgency Timeline</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quickWinsData.urgencyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value">
                      {quickWinsData.urgencyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Salespeople Section */}
          {activeSection === 'salespeople' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Wins by Salesperson</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quickWinsData.salespersonBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="totalValue" fill="#ea580c" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {quickWinsData.salespersonBreakdown.map((rep, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => {
                      const salesperson = results.salespersonSummaries.find(s => s.salesperson === rep.name)
                      if (salesperson) {
                        onSelectSalesperson(salesperson)
                        onClose()
                      }
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{rep.name}</p>
                      <p className="text-sm text-gray-600">
                        {rep.customerCount} quick win{rep.customerCount !== 1 ? 's' : ''} • Avg {(rep.avgProbability * 100).toFixed(0)}% probability
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{formatCurrency(rep.totalValue)}</p>
                      <p className="text-sm text-gray-600">
                        Recovery: {formatCurrency(rep.recovery)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions Section */}
          {activeSection === 'actions' && (
            <div className="space-y-6">
              {/* Very High Probability Actions */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🚀</span>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Very High Probability (90%+)</h3>
                    <p className="text-green-700">{quickWinsData.probabilityDistribution[0]?.value || 0} customers - Almost guaranteed wins</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Immediate Actions:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Contact within 4 hours (these are hot leads)</li>
                      <li>• Start with phone call, not email</li>
                      <li>• Minimal discount needed (5-10%)</li>
                      <li>• Close the sale today if possible</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">Conversation Points:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• "We miss having you as a customer"</li>
                      <li>• Highlight their favorite products</li>
                      <li>• Create urgency with inventory or pricing</li>
                      <li>• Ask about their current wine needs</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* High Probability Actions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🎯</span>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">High Probability (80-89%)</h3>
                    <p className="text-blue-700">{quickWinsData.probabilityDistribution[1]?.value || 0} customers - Strong potential</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Strategy:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Contact within 24 hours</li>
                      <li>• Personalized email + follow-up call</li>
                      <li>• Offer 10-15% discount</li>
                      <li>• Share new product recommendations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Follow-up Plan:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Second contact in 3 days if no response</li>
                      <li>• Include testimonials from similar customers</li>
                      <li>• Offer to schedule a tasting session</li>
                      <li>• Create FOMO with limited-time offers</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Good Probability Actions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⚡</span>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900">Good Probability (70-79%)</h3>
                    <p className="text-yellow-700">{quickWinsData.probabilityDistribution[2]?.value || 0} customers - Solid opportunities</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Approach:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Contact within 48 hours</li>
                      <li>• Start with personalized email campaign</li>
                      <li>• Offer 15-20% discount</li>
                      <li>• Include free shipping or bonus items</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">Value Enhancement:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Bundle their favorite products</li>
                      <li>• Introduce new products in their price range</li>
                      <li>• Offer payment terms if high-value customer</li>
                      <li>• Follow up weekly for 1 month</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Success Tracking Template */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Win Tracking Template</h3>
                <div className="bg-white border border-gray-200 rounded p-4 font-mono text-sm text-gray-900">
                  <p><strong>Quick Win Campaign - Week [DATE]</strong></p>
                  <br />
                  <p>📊 <strong>Targets This Week:</strong></p>
                  <p>• Very High Probability: {quickWinsData.probabilityDistribution[0]?.value || 0} customers</p>
                  <p>• High Probability: {quickWinsData.probabilityDistribution[1]?.value || 0} customers</p>
                  <p>• Good Probability: {quickWinsData.probabilityDistribution[2]?.value || 0} customers</p>
                  <br />
                  <p>🎯 <strong>Daily Actions:</strong></p>
                  <p>• Monday: Contact all Very High (90%+) customers</p>
                  <p>• Tuesday: Contact High (80-89%) customers</p>
                  <p>• Wednesday: Contact Good (70-79%) customers</p>
                  <p>• Thursday: Follow up on no-responses</p>
                  <p>• Friday: Close deals and update tracking</p>
                  <br />
                  <p>📈 <strong>Success Metrics:</strong></p>
                  <p>• Target: Convert 60%+ of Very High probability</p>
                  <p>• Target: Convert 45%+ of High probability</p>
                  <p>• Target: Convert 35%+ of Good probability</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Quick wins analysis updated: {new Date().toLocaleDateString()}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}