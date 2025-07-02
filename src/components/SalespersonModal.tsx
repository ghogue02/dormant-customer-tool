'use client'

import { EnhancedCustomerData } from '@/lib/enhanced-analytics'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts'

interface SalespersonModalProps {
  salesperson: any
  customers: EnhancedCustomerData[]
  onClose: () => void
  onSelectCustomer?: (customer: EnhancedCustomerData) => void
}

export function SalespersonModal({ salesperson, customers, onClose, onSelectCustomer }: SalespersonModalProps) {
  // Filter customers for this salesperson
  const repCustomers = customers.filter(c => c.salesperson === salesperson.salesperson)
  
  // Segment data for pie chart
  const segmentData = Object.entries(salesperson.segments || {})
    .filter(([_, count]) => count > 0)
    .map(([segment, count]) => ({
      name: segment,
      value: count as number
    }))

  // Risk distribution
  const riskData = [
    { name: 'Low Risk', value: repCustomers.filter(c => c.churnRiskScore <= 0.4).length, color: '#10b981' },
    { name: 'Medium Risk', value: repCustomers.filter(c => c.churnRiskScore > 0.4 && c.churnRiskScore <= 0.7).length, color: '#f59e0b' },
    { name: 'High Risk', value: repCustomers.filter(c => c.churnRiskScore > 0.7).length, color: '#ef4444' }
  ]

  // Product performance
  const productData = salesperson.topProducts?.slice(0, 5) || []

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{salesperson.salesperson}</h2>
              <p className="text-gray-600 mt-1">Sales Representative Performance Overview</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Dormant Customers</p>
              <p className="text-2xl font-bold text-gray-900">{salesperson.dormantCustomerCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Value at Risk</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(salesperson.totalValueAtRisk)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Potential Recovery</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(salesperson.potentialRecovery || 0)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Quick Wins</p>
              <p className="text-2xl font-bold text-blue-600">{salesperson.quickWinCount}</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Segments */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Segments</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Top Wine Products by Revenue</h3>
            {productData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                  <YAxis dataKey="product" type="category" width={150} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">📦</p>
                  <p className="text-sm">No wine product data available</p>
                  <p className="text-xs text-gray-400 mt-1">This rep's customers may have only purchased non-wine items</p>
                </div>
              </div>
            )}
          </div>

          {/* Customer List */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Dormant Customers</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win-Back</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {repCustomers
                    .sort((a, b) => b.winBackProbability.score - a.winBackProbability.score)
                    .map((customer, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(customer.total6MonthValue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${customer.winBackProbability.score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {(customer.winBackProbability.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <button 
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          onClick={() => onSelectCustomer?.(customer)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print Section */}
          <div className="mt-6 flex justify-end space-x-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Print Call Sheet
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}