'use client'

import { useState, useMemo } from 'react'
import { EnhancedProcessingResult } from '@/lib/enhanced-data-processor'
import { EnhancedCustomerData } from '@/lib/enhanced-analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface ProjectedRecoveryModalProps {
  results: EnhancedProcessingResult
  onClose: () => void
  onSelectCustomer: (customer: EnhancedCustomerData) => void
  onSelectSalesperson: (salesperson: any) => void
  onNavigateToVIP: () => void
  onNavigateToQuickWins: () => void
  onNavigateToAtRisk: () => void
}

export function ProjectedRecoveryModal({ 
  results, 
  onClose, 
  onSelectSalesperson,
  onNavigateToVIP,
  onNavigateToQuickWins,
  onNavigateToAtRisk
}: ProjectedRecoveryModalProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'salesperson' | 'segments' | 'risk' | 'timeline' | 'methodology'>('overview')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate recovery breakdowns
  const recoveryData = useMemo(() => {
    // By salesperson
    const salespersonRecovery = results.salespersonSummaries.map(rep => ({
      name: rep.salesperson,
      recovery: rep.potentialRecovery || 0,
      customers: rep.dormantCustomerCount,
      avgRecovery: (rep.potentialRecovery || 0) / rep.dormantCustomerCount
    })).sort((a, b) => b.recovery - a.recovery)

    // By customer segment
    const segmentRecovery = Object.entries(results.customerSegments).map(([segment, count]) => {
      const segmentCustomers = results.dormantCustomers.filter(c => c.segment.segment === segment)
      const recovery = segmentCustomers.reduce((sum, c) => sum + (c.winBackProbability.estimatedRevenue * c.winBackProbability.score), 0)
      return {
        name: segment,
        recovery,
        customers: count,
        avgRecovery: recovery / count,
        color: segment === 'VIP' ? '#9333ea' :
               segment === 'Regular' ? '#3b82f6' :
               segment === 'Occasional' ? '#f59e0b' :
               segment === 'At-Risk' ? '#ef4444' : '#6b7280'
      }
    }).sort((a, b) => b.recovery - a.recovery)

    // By risk level
    const riskRecovery = [
      {
        name: 'High Risk (>70%)',
        customers: results.dormantCustomers.filter(c => c.churnRiskScore > 0.7),
        color: '#ef4444'
      },
      {
        name: 'Medium Risk (40-70%)',
        customers: results.dormantCustomers.filter(c => c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7),
        color: '#f59e0b'
      },
      {
        name: 'Low Risk (<40%)',
        customers: results.dormantCustomers.filter(c => c.churnRiskScore <= 0.4),
        color: '#10b981'
      }
    ].map(risk => ({
      ...risk,
      recovery: risk.customers.reduce((sum, c) => sum + (c.winBackProbability.estimatedRevenue * c.winBackProbability.score), 0),
      count: risk.customers.length
    }))

    // Monthly timeline (6 months)
    const monthlyTimeline = Array.from({ length: 6 }, (_, i) => {
      const month = new Date()
      month.setMonth(month.getMonth() + i + 1)
      const monthName = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      
      // Distribute recovery over months with higher probability in early months
      const monthlyFactor = i === 0 ? 0.35 : i === 1 ? 0.25 : i === 2 ? 0.20 : i === 3 ? 0.12 : i === 4 ? 0.05 : 0.03
      const monthlyRecovery = results.revenueForecasts.realistic * monthlyFactor
      
      return {
        month: monthName,
        projected: monthlyRecovery,
        cumulative: results.revenueForecasts.realistic * (i === 0 ? 0.35 : 
                    i === 1 ? 0.60 : i === 2 ? 0.80 : i === 3 ? 0.92 : i === 4 ? 0.97 : 1.0)
      }
    })

    return {
      salespersonRecovery,
      segmentRecovery,
      riskRecovery,
      monthlyTimeline,
      totalRecovery: results.revenueForecasts.realistic,
      confidenceRate: (results.revenueForecasts.realistic / results.summary.totalValueAtRisk) * 100
    }
  }, [results])

  const sections = [
    { id: 'overview', label: '📊 Overview', count: null },
    { id: 'salesperson', label: '👥 By Salesperson', count: recoveryData.salespersonRecovery.length },
    { id: 'segments', label: '🏷️ By Segment', count: recoveryData.segmentRecovery.length },
    { id: 'risk', label: '⚠️ By Risk Level', count: 3 },
    { id: 'timeline', label: '📅 Timeline', count: 6 },
    { id: 'methodology', label: '🔬 Methodology', count: null }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Projected Revenue Recovery Analysis</h2>
              <p className="text-green-100 mt-1">
                {formatCurrency(recoveryData.totalRecovery)} projected over next 6 months
              </p>
              <p className="text-green-200 text-sm mt-2">
                {recoveryData.confidenceRate.toFixed(1)}% of total at-risk value • Conservative estimate based on win-back probabilities
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Quick Navigation */}
              <button
                onClick={onNavigateToVIP}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs transition-colors"
                title="Go to VIP Customers"
              >
                VIP
              </button>
              <button
                onClick={onNavigateToQuickWins}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs transition-colors"
                title="Go to Quick Wins"
              >
                Quick Wins
              </button>
              <button
                onClick={onNavigateToAtRisk}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded-lg text-xs transition-colors"
                title="Go to At-Risk Analysis"
              >
                At-Risk
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-green-600 rounded-lg transition-colors"
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
                    ? 'border-green-500 text-green-600 bg-white'
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
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Projected Recovery</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(recoveryData.totalRecovery)}</p>
                  <p className="text-xs text-green-700">Next 6 months</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Recovery Confidence</p>
                  <p className="text-2xl font-bold text-blue-900">{recoveryData.confidenceRate.toFixed(1)}%</p>
                  <p className="text-xs text-blue-700">Of total at-risk value</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Top Recovery Segment</p>
                  <p className="text-2xl font-bold text-purple-900">{recoveryData.segmentRecovery[0]?.name || 'N/A'}</p>
                  <p className="text-xs text-purple-700">{formatCurrency(recoveryData.segmentRecovery[0]?.recovery || 0)}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Peak Recovery Month</p>
                  <p className="text-2xl font-bold text-orange-900">{recoveryData.monthlyTimeline[0]?.month}</p>
                  <p className="text-xs text-orange-700">{formatCurrency(recoveryData.monthlyTimeline[0]?.projected || 0)}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Recommended Next Steps</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <button
                    onClick={onNavigateToVIP}
                    className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-purple-600 mr-2">👑</span>
                      <span className="font-medium text-purple-900">Focus on VIP Customers</span>
                    </div>
                    <p className="text-sm text-purple-700">
                      {results.customerSegments['VIP'] || 0} VIP customers need immediate attention
                    </p>
                  </button>
                  
                  <button
                    onClick={onNavigateToQuickWins}
                    className="p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-orange-600 mr-2">⚡</span>
                      <span className="font-medium text-orange-900">Target Quick Wins</span>
                    </div>
                    <p className="text-sm text-orange-700">
                      {results.dormantCustomers.filter(c => c.winBackProbability.score > 0.7).length} customers with &gt;70% probability
                    </p>
                  </button>
                  
                  <button
                    onClick={onNavigateToAtRisk}
                    className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-blue-600 mr-2">🎯</span>
                      <span className="font-medium text-blue-900">Review At-Risk Analysis</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Complete breakdown of all {results.summary.totalDormantCustomers} dormant customers
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Salesperson Section */}
          {activeSection === 'salesperson' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Recovery Potential by Salesperson</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={recoveryData.salespersonRecovery.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="recovery" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {recoveryData.salespersonRecovery.map((rep, index) => (
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
                      <p className="text-sm text-gray-600">{rep.customers} dormant customers</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(rep.recovery)}</p>
                      <p className="text-sm text-gray-600">Avg: {formatCurrency(rep.avgRecovery)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segments Section */}
          {activeSection === 'segments' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Recovery by Segment</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={recoveryData.segmentRecovery}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="recovery"
                      >
                        {recoveryData.segmentRecovery.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {recoveryData.segmentRecovery.map((segment, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{segment.name} Customers</h4>
                        <span 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(segment.recovery)}</p>
                      <p className="text-sm text-gray-600">
                        {segment.customers} customers • Avg: {formatCurrency(segment.avgRecovery)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Risk Level Section */}
          {activeSection === 'risk' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Recovery Potential by Risk Level</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={recoveryData.riskRecovery}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="recovery">
                      {recoveryData.riskRecovery.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {recoveryData.riskRecovery.map((risk, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">{risk.name}</h4>
                      <span 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: risk.color }}
                      />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(risk.recovery)}</p>
                    <p className="text-sm text-gray-600 mt-1">{risk.count} customers</p>
                    <p className="text-xs text-gray-500">
                      Avg: {formatCurrency(risk.recovery / Math.max(risk.count, 1))} per customer
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Section */}
          {activeSection === 'timeline' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">6-Month Recovery Timeline</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={recoveryData.monthlyTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="projected" fill="#10b981" name="Monthly Recovery" />
                    <Line type="monotone" dataKey="cumulative" stroke="#059669" strokeWidth={3} name="Cumulative" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-6 gap-4">
                {recoveryData.monthlyTimeline.map((month, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{month.month}</h4>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(month.projected)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Cumulative: {formatCurrency(month.cumulative)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-medium text-blue-900 mb-2">Timeline Assumptions</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 35% of recovery expected in Month 1 (immediate outreach)</li>
                  <li>• 25% in Month 2 (follow-up campaigns)</li>
                  <li>• 20% in Month 3 (seasonal opportunities)</li>
                  <li>• Remaining 20% distributed over Months 4-6</li>
                  <li>• Higher probability customers contacted first</li>
                </ul>
              </div>
            </div>
          )}

          {/* Methodology Section */}
          {activeSection === 'methodology' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Recovery Calculation Methodology</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Base Formula</h4>
                    <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                      <p>Projected Recovery = Σ (Customer's Baseline Revenue × Win-Back Probability)</p>
                      <p className="mt-2 text-gray-600">Where:</p>
                      <p className="text-gray-600">• Baseline Revenue = MAX(6-month value × 0.5, Average Order Value)</p>
                      <p className="text-gray-600">• Win-Back Probability = Calculated score (0-1) based on 5 factors</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Win-Back Probability Factors</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Recency Score</span>
                          <span className="font-medium">30% weight</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Frequency Score</span>
                          <span className="font-medium">25% weight</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Monetary Score</span>
                          <span className="font-medium">25% weight</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Seasonal Score</span>
                          <span className="font-medium">10% weight</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Product Diversity</span>
                          <span className="font-medium">10% weight</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Conservative Assumptions</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Revenue baseline is 50% of historical 6-month value (conservative)</li>
                      <li>• Only customers with &gt;30% win-back probability included</li>
                      <li>• No account for market growth or price increases</li>
                      <li>• Seasonal adjustments based on historical patterns</li>
                      <li>• Assumes current economic conditions continue</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Confidence Intervals</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="font-medium text-green-900">Optimistic (85%)</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(results.revenueForecasts.optimistic)}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium text-blue-900">Realistic (65%)</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(results.revenueForecasts.realistic)}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium text-gray-900">Conservative (45%)</p>
                        <p className="text-2xl font-bold text-gray-600">{formatCurrency(results.revenueForecasts.conservative)}</p>
                      </div>
                    </div>
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
              Recovery projection updated: {new Date().toLocaleDateString()}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}