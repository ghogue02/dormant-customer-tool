'use client'

import { useState, useMemo } from 'react'
import { EnhancedProcessingResult } from '@/lib/enhanced-data-processor'
import { EnhancedCustomerData } from '@/lib/enhanced-analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface VIPModalProps {
  results: EnhancedProcessingResult
  onClose: () => void
  onSelectCustomer: (customer: EnhancedCustomerData) => void
  onSelectSalesperson: (salesperson: any) => void
  onNavigateToProjectedRecovery: () => void
  onNavigateToQuickWins: () => void
  onNavigateToAtRisk: () => void
}

export function VIPModal({ 
  results, 
  onClose, 
  onSelectCustomer, 
  onSelectSalesperson,
  onNavigateToProjectedRecovery,
  onNavigateToQuickWins,
  onNavigateToAtRisk
}: VIPModalProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'customers' | 'risk' | 'salespeople' | 'actions'>('overview')
  const [sortBy, setSortBy] = useState<'value' | 'risk' | 'days' | 'winback'>('value')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // VIP customer analysis
  const vipData = useMemo(() => {
    const vipCustomers = results.dormantCustomers.filter(c => c.segment.segment === 'VIP')
    
    if (vipCustomers.length === 0) {
      return {
        customers: [],
        totalValue: 0,
        avgValue: 0,
        avgDays: 0,
        riskDistribution: [],
        salespersonBreakdown: [],
        totalRecoveryPotential: 0
      }
    }

    const totalValue = vipCustomers.reduce((sum, c) => sum + c.total6MonthValue, 0)
    const avgDays = Math.round(vipCustomers.reduce((sum, c) => sum + c.daysSinceOrder, 0) / vipCustomers.length)
    const totalRecoveryPotential = vipCustomers.reduce((sum, c) => sum + (c.winBackProbability.estimatedRevenue * c.winBackProbability.score), 0)

    // Risk distribution
    const riskDistribution = [
      {
        name: 'High Risk',
        value: vipCustomers.filter(c => c.churnRiskScore > 0.7).length,
        color: '#ef4444',
        customers: vipCustomers.filter(c => c.churnRiskScore > 0.7)
      },
      {
        name: 'Medium Risk', 
        value: vipCustomers.filter(c => c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7).length,
        color: '#f59e0b',
        customers: vipCustomers.filter(c => c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7)
      },
      {
        name: 'Low Risk',
        value: vipCustomers.filter(c => c.churnRiskScore <= 0.4).length,
        color: '#10b981',
        customers: vipCustomers.filter(c => c.churnRiskScore <= 0.4)
      }
    ]

    // Salesperson breakdown
    const salespersonMap = new Map()
    vipCustomers.forEach(customer => {
      const rep = customer.salesperson
      if (!salespersonMap.has(rep)) {
        salespersonMap.set(rep, {
          name: rep,
          customers: [],
          totalValue: 0,
          avgRisk: 0,
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
      avgRisk: rep.customers.reduce((sum: number, c: EnhancedCustomerData) => sum + c.churnRiskScore, 0) / rep.customers.length,
      avgDays: Math.round(rep.customers.reduce((sum: number, c: EnhancedCustomerData) => sum + c.daysSinceOrder, 0) / rep.customers.length)
    })).sort((a, b) => b.totalValue - a.totalValue)

    // Sort customers
    const sortedCustomers = [...vipCustomers].sort((a, b) => {
      switch (sortBy) {
        case 'value': return b.total6MonthValue - a.total6MonthValue
        case 'risk': return b.churnRiskScore - a.churnRiskScore
        case 'days': return b.daysSinceOrder - a.daysSinceOrder
        case 'winback': return b.winBackProbability.score - a.winBackProbability.score
        default: return 0
      }
    })

    return {
      customers: sortedCustomers,
      totalValue,
      avgValue: totalValue / vipCustomers.length,
      avgDays,
      riskDistribution,
      salespersonBreakdown,
      totalRecoveryPotential
    }
  }, [results.dormantCustomers, sortBy])

  const sections = [
    { id: 'overview', label: '📊 Overview', count: null },
    { id: 'customers', label: '👑 VIP Customers', count: vipData.customers.length },
    { id: 'risk', label: '⚠️ Risk Analysis', count: 3 },
    { id: 'salespeople', label: '👥 By Salesperson', count: vipData.salespersonBreakdown.length },
    { id: 'actions', label: '🎯 Action Plans', count: null }
  ]

  if (vipData.customers.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No VIP Customers Found</h2>
            <p className="text-gray-600 mb-6">
              Great news! You don't have any VIP customers in your dormant list. 
              This means your highest-value customers are still actively ordering.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">VIP Customer Priority Analysis</h2>
              <p className="text-purple-100 mt-1">
                {vipData.customers.length} VIP customers • {formatCurrency(vipData.totalValue)} at risk
              </p>
              <p className="text-purple-200 text-sm mt-2">
                High-value customers requiring immediate personal attention within 24 hours
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Quick Navigation */}
              <button
                onClick={onNavigateToProjectedRecovery}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs transition-colors"
                title="Go to Projected Recovery"
              >
                Recovery
              </button>
              <button
                onClick={onNavigateToQuickWins}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs transition-colors"
                title="Go to Quick Wins"
              >
                Quick Wins
              </button>
              <button
                onClick={onNavigateToAtRisk}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs transition-colors"
                title="Go to At-Risk Analysis"
              >
                At-Risk
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-purple-600 rounded-lg transition-colors"
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
                    ? 'border-purple-500 text-purple-600 bg-white'
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
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Total VIP Value at Risk</p>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(vipData.totalValue)}</p>
                  <p className="text-xs text-purple-700">{vipData.customers.length} customers</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Average VIP Value</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(vipData.avgValue)}</p>
                  <p className="text-xs text-blue-700">per customer</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Average Days Dormant</p>
                  <p className="text-2xl font-bold text-orange-900">{vipData.avgDays}</p>
                  <p className="text-xs text-orange-700">days since last order</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Recovery Potential</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(vipData.totalRecoveryPotential)}</p>
                  <p className="text-xs text-green-700">{((vipData.totalRecoveryPotential / vipData.totalValue) * 100).toFixed(1)}% of at-risk value</p>
                </div>
              </div>

              {/* Priority Alerts */}
              <div className="grid gap-4">
                {vipData.riskDistribution.filter(risk => risk.value > 0).map((risk, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    risk.name === 'High Risk' ? 'bg-red-50 border-red-200' :
                    risk.name === 'Medium Risk' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`text-2xl mr-3 ${
                          risk.name === 'High Risk' ? '🚨' :
                          risk.name === 'Medium Risk' ? '⚠️' : '✅'
                        }`} />
                        <div>
                          <h4 className={`font-medium ${
                            risk.name === 'High Risk' ? 'text-red-900' :
                            risk.name === 'Medium Risk' ? 'text-yellow-900' :
                            'text-green-900'
                          }`}>
                            {risk.value} VIP Customer{risk.value !== 1 ? 's' : ''} - {risk.name}
                          </h4>
                          <p className={`text-sm ${
                            risk.name === 'High Risk' ? 'text-red-700' :
                            risk.name === 'Medium Risk' ? 'text-yellow-700' :
                            'text-green-700'
                          }`}>
                            {formatCurrency(risk.customers.reduce((sum, c) => sum + c.total6MonthValue, 0))} total value
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          risk.name === 'High Risk' ? 'text-red-600' :
                          risk.name === 'Medium Risk' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {risk.name === 'High Risk' ? 'Immediate Action' :
                           risk.name === 'Medium Risk' ? 'Contact Within 48h' :
                           'Include in Weekly Check-ins'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Immediate Next Steps</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">High Priority Actions:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Personal phone calls to all VIP customers within 24 hours</li>
                      <li>• Schedule face-to-face meetings with high-risk VIPs</li>
                      <li>• Prepare personalized win-back offers (15-20% discount)</li>
                      <li>• Review their recent order history and preferences</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">VIP Retention Strategy:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Assign dedicated account manager if not already assigned</li>
                      <li>• Invite to exclusive VIP events and tastings</li>
                      <li>• Provide early access to new product releases</li>
                      <li>• Implement weekly check-ins for next 30 days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIP Customers List */}
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
                  <option value="value">6-Month Value (Highest First)</option>
                  <option value="risk">Risk Level (Highest First)</option>
                  <option value="days">Days Since Order (Most Recent First)</option>
                  <option value="winback">Win-Back Probability (Highest First)</option>
                </select>
              </div>

              {/* VIP Customer Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VIP Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">6-Month Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Dormant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win-Back</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vipData.customers.map((customer, index) => (
                      <tr 
                        key={index}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 cursor-pointer transition-colors`}
                        onClick={() => {
                          onSelectCustomer(customer)
                          onClose()
                        }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-purple-600 mr-2">👑</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{customer.customer}</p>
                              <p className="text-xs text-gray-500">{customer.locationData.city}, {customer.locationData.state}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {customer.salesperson}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-purple-600">
                          {formatCurrency(customer.total6MonthValue)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
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
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${customer.winBackProbability.score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {(customer.winBackProbability.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          <span className={`px-2 py-1 rounded text-white font-medium ${
                            customer.churnRiskScore > 0.7 ? 'bg-red-600' :
                            customer.churnRiskScore > 0.4 ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}>
                            {customer.churnRiskScore > 0.7 ? 'Call Today' :
                             customer.churnRiskScore > 0.4 ? 'Call This Week' :
                             'Include in Campaign'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk Analysis Section */}
          {activeSection === 'risk' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">VIP Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={vipData.riskDistribution.filter(r => r.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {vipData.riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {vipData.riskDistribution.filter(r => r.value > 0).map((risk, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{risk.name} VIPs</h4>
                        <span 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: risk.color }}
                        />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{risk.value} customers</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(risk.customers.reduce((sum, c) => sum + c.total6MonthValue, 0))} total value
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Avg: {Math.round(risk.customers.reduce((sum, c) => sum + c.daysSinceOrder, 0) / risk.customers.length)} days dormant
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Salespeople Section */}
          {activeSection === 'salespeople' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">VIP Customers by Salesperson</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vipData.salespersonBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="totalValue" fill="#9333ea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {vipData.salespersonBreakdown.map((rep, index) => (
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
                        {rep.customerCount} VIP customer{rep.customerCount !== 1 ? 's' : ''} • Avg {rep.avgDays} days dormant
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{formatCurrency(rep.totalValue)}</p>
                      <p className="text-sm text-gray-600">
                        Risk: {(rep.avgRisk * 100).toFixed(0)}% • Recovery: {formatCurrency(rep.recovery)}
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
              {/* Immediate Actions */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🚨</span>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Immediate Actions (Next 24 Hours)</h3>
                    <p className="text-red-700">For all {vipData.customers.length} VIP customers</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Personal Outreach:</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• Phone call from account manager or sales director</li>
                      <li>• Express genuine concern for their absence</li>
                      <li>• Ask about any service issues or concerns</li>
                      <li>• Understand changes in their business needs</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Special Offers:</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• 20% discount on their next order</li>
                      <li>• Free delivery for orders over their average</li>
                      <li>• Complimentary wine tasting session</li>
                      <li>• Early access to limited releases</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* VIP Retention Program */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">👑</span>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900">VIP Retention Program</h3>
                    <p className="text-purple-700">Long-term strategy to prevent future dormancy</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-purple-900 mb-2">Enhanced Service:</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Dedicated account manager</li>
                      <li>• Priority customer service line</li>
                      <li>• Quarterly business reviews</li>
                      <li>• Custom inventory planning</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-900 mb-2">Exclusive Benefits:</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• VIP-only events and tastings</li>
                      <li>• First access to new releases</li>
                      <li>• Special pricing on premium wines</li>
                      <li>• Personalized wine recommendations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-purple-900 mb-2">Proactive Monitoring:</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Weekly order pattern analysis</li>
                      <li>• Early warning system for dormancy</li>
                      <li>• Automatic reorder reminders</li>
                      <li>• Seasonal buying pattern alerts</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Template */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">VIP Outreach Template</h3>
                <div className="bg-white border border-gray-200 rounded p-4 font-mono text-sm text-gray-900">
                  <p>Hi [VIP Customer Name],</p>
                  <br />
                  <p>I hope this message finds you well. I&apos;ve noticed it&apos;s been [X] days since your last order, and as one of our most valued VIP customers, I wanted to personally reach out.</p>
                  <br />
                  <p>Your business is incredibly important to us, and I want to ensure we&apos;re continuing to meet your needs. Have there been any changes in your wine program or any concerns with our service?</p>
                  <br />
                  <p>As a token of our appreciation, I&apos;d like to offer you:</p>
                  <p>• 20% discount on your next order</p>
                  <p>• Complimentary delivery</p>
                  <p>• Invitation to our exclusive VIP tasting event</p>
                  <br />
                  <p>Would you have time for a brief call this week to discuss your upcoming wine needs? I&apos;m here to ensure you receive the exceptional service you deserve.</p>
                  <br />
                  <p>Best regards,<br />[Your Name]<br />VIP Account Manager</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              VIP analysis updated: {new Date().toLocaleDateString()}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}