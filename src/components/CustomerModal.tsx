'use client'

import { EnhancedCustomerData } from '@/lib/enhanced-analytics'
import { CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

interface CustomerModalProps {
  customer: EnhancedCustomerData
  onClose: () => void
}

export function CustomerModal({ customer, onClose }: CustomerModalProps) {
  // Win-back factors for radar chart
  const radarData = [
    {
      factor: 'Recency',
      score: customer.winBackProbability.factors.recencyScore * 100,
      fullMark: 100
    },
    {
      factor: 'Frequency',
      score: customer.winBackProbability.factors.frequencyScore * 100,
      fullMark: 100
    },
    {
      factor: 'Value',
      score: customer.winBackProbability.factors.monetaryScore * 100,
      fullMark: 100
    },
    {
      factor: 'Seasonal',
      score: customer.winBackProbability.factors.seasonalScore * 100,
      fullMark: 100
    },
    {
      factor: 'Diversity',
      score: customer.winBackProbability.factors.productDiversityScore * 100,
      fullMark: 100
    }
  ]

  // Top products data
  const productData = customer.productPreferences.slice(0, 5).map(pref => ({
    product: pref.product.length > 20 ? pref.product.substring(0, 20) + '...' : pref.product,
    value: pref.totalValue,
    frequency: pref.frequency,
    trend: pref.trend
  }))

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  // Calculate days until peak season
  const currentMonth = new Date().getMonth()
  const nextPeakMonth = customer.seasonalPattern.peakMonths.find(m => m >= currentMonth) || 
                       customer.seasonalPattern.peakMonths[0]
  const monthsUntilPeak = nextPeakMonth >= currentMonth ? nextPeakMonth - currentMonth : 12 - currentMonth + nextPeakMonth

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
              <h2 className="text-2xl font-bold text-gray-900">{customer.customer}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  customer.segment.segment === 'VIP' ? 'bg-purple-100 text-purple-800' :
                  customer.segment.segment === 'Regular' ? 'bg-blue-100 text-blue-800' :
                  customer.segment.segment === 'At-Risk' ? 'bg-red-100 text-red-800' :
                  customer.segment.segment === 'Occasional' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {customer.segment.segment} Customer
                </span>
                <span className="text-gray-600">Rep: {customer.salesperson}</span>
                {customer.locationData.city && (
                  <span className="text-gray-600">
                    📍 {customer.locationData.city}, {customer.locationData.state}
                  </span>
                )}
              </div>
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
          {/* Action Plan Alert */}
          <div className={`p-4 rounded-lg ${
            customer.segment.segment === 'VIP' ? 'bg-purple-50 border border-purple-200' :
            customer.segment.segment === 'At-Risk' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <h3 className="font-semibold text-gray-900 mb-2">Recommended Action Plan</h3>
            <p className="text-gray-700">{customer.segment.actionPlan}</p>
            <p className="text-sm text-gray-600 mt-2">{customer.winBackProbability.recommendation}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div 
              className="bg-gray-50 p-4 rounded-lg cursor-help transition-all hover:shadow-md hover:bg-gray-100"
              title={`Last Order Calculation:\n\n• Current Date: ${new Date().toLocaleDateString()}\n• Last Order Date: ${new Date(customer.lastOrderDate).toLocaleDateString()}\n• Days Since = Current Date - Last Order Date\n• Result: ${customer.daysSinceOrder} days\n\nCustomers are considered dormant after 45 days without an order.`}
            >
              <p className="text-sm text-gray-600">Last Order</p>
              <p className="text-lg font-bold text-gray-900">{customer.daysSinceOrder} days ago</p>
              <p className="text-xs text-gray-500">{new Date(customer.lastOrderDate).toLocaleDateString()}</p>
            </div>
            <div 
              className="bg-blue-50 p-4 rounded-lg cursor-help transition-all hover:shadow-md hover:bg-blue-100"
              title={`6-Month Value Calculation:\n\n• Sum of all order values in the last 6 months\n• Total Orders: ${customer.orderCount6Months}\n• Total Value: ${formatCurrency(customer.total6MonthValue)}\n• Average per Order: ${formatCurrency(customer.averageOrderValue)}\n\nThis represents the customer's purchasing volume over the past 6 months, indicating their importance to your business.`}
            >
              <p className="text-sm text-gray-600">6-Month Value</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(customer.total6MonthValue)}</p>
              <p className="text-xs text-gray-500">{customer.orderCount6Months} orders</p>
            </div>
            <div 
              className="bg-green-50 p-4 rounded-lg cursor-help transition-all hover:shadow-md hover:bg-green-100"
              title={`Win-Back Score Calculation:\n\n• Recency (30%): ${(customer.winBackProbability.factors.recency * 100).toFixed(0)}% - How recently they ordered\n• Frequency (25%): ${(customer.winBackProbability.factors.frequency * 100).toFixed(0)}% - How often they order\n• Value (25%): ${(customer.winBackProbability.factors.value * 100).toFixed(0)}% - How much they spend\n• Seasonal (10%): ${(customer.winBackProbability.factors.seasonal * 100).toFixed(0)}% - Seasonal patterns\n• Diversity (10%): ${(customer.winBackProbability.factors.diversity * 100).toFixed(0)}% - Product variety\n\nWeighted Score: ${(customer.winBackProbability.score * 100).toFixed(0)}%\nEstimated Revenue: ${formatCurrency(customer.winBackProbability.estimatedRevenue)}\n\nHigher scores indicate customers more likely to return with proper outreach.`}
            >
              <p className="text-sm text-gray-600">Win-Back Score</p>
              <p className="text-lg font-bold text-green-600">{(customer.winBackProbability.score * 100).toFixed(0)}%</p>
              <p className="text-xs text-gray-500">Est. {formatCurrency(customer.winBackProbability.estimatedRevenue)}</p>
            </div>
            <div 
              className="bg-purple-50 p-4 rounded-lg cursor-help transition-all hover:shadow-md hover:bg-purple-100"
              title={`Lifetime Value Calculation:\n\n• Customer Since: ${new Date(customer.orderHistory.firstOrderDate).toLocaleDateString()}\n• Total Orders: ${customer.orderHistory.totalOrders}\n• Total Spent: ${formatCurrency(customer.orderHistory.totalLifetimeValue)}\n• Average Order Value: ${formatCurrency(customer.orderHistory.totalLifetimeValue / customer.orderHistory.totalOrders)}\n• Order Trend: ${customer.orderHistory.orderTrend}\n\nThis is the total revenue generated by this customer since their first order, showing their long-term value to your business.`}
            >
              <p className="text-sm text-gray-600">Lifetime Value</p>
              <p className="text-lg font-bold text-purple-600">{formatCurrency(customer.orderHistory.totalLifetimeValue)}</p>
              <p className="text-xs text-gray-500">{customer.orderHistory.totalOrders} total orders</p>
            </div>
            <div 
              className="bg-yellow-50 p-4 rounded-lg cursor-help transition-all hover:shadow-md hover:bg-yellow-100"
              title={`Churn Risk Calculation:\n\n• Days Since Order Score: ${((Math.min(customer.daysSinceOrder / 180, 1)) * 100).toFixed(0)}% (50% weight)\n• Order Frequency Score: ${((1 - Math.min(customer.orderCount6Months / 12, 1)) * 100).toFixed(0)}% (30% weight)\n• Value Score: ${(customer.total6MonthValue < 1000 ? 80 : customer.total6MonthValue < 5000 ? 50 : 20)}% (20% weight)\n\nWeighted Risk Score: ${(customer.churnRiskScore * 100).toFixed(0)}%\n\n• 0-40%: Low risk - Customer likely to return\n• 40-70%: Medium risk - Needs attention\n• 70-100%: High risk - Immediate action required\n\nHigher scores indicate customers at greater risk of not returning.`}
            >
              <p className="text-sm text-gray-600">Churn Risk</p>
              <p className={`text-lg font-bold ${
                customer.churnRiskScore > 0.7 ? 'text-red-600' :
                customer.churnRiskScore > 0.4 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {(customer.churnRiskScore * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">
                {customer.churnRiskScore > 0.7 ? 'High' :
                 customer.churnRiskScore > 0.4 ? 'Medium' : 'Low'} Risk
              </p>
            </div>
          </div>

          {/* Win-Back Factors Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Win-Back Probability Factors</h3>
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">How to Read This Chart:</p>
              <p className="text-xs text-blue-700 mt-1">
                • <strong>Outer edge (100%)</strong> = Excellent score for that factor<br/>
                • <strong>Center (0%)</strong> = Poor score for that factor<br/>
                • <strong>Larger blue area</strong> = Higher overall win-back probability
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Radar 
                  name="Score" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                  labelFormatter={(label) => `${label} Factor`}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div><strong>Recency:</strong> How recently they ordered (30% weight)</div>
              <div><strong>Frequency:</strong> How often they order (25% weight)</div>
              <div><strong>Value:</strong> How much they spend (25% weight)</div>
              <div><strong>Seasonal:</strong> Seasonal buying patterns (10% weight)</div>
              <div><strong>Diversity:</strong> Product variety purchased (10% weight)</div>
            </div>
          </div>

          {/* Seasonal Pattern & Order History */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Seasonal Buying Pattern</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">Pattern:</span>
                  <span className="font-medium text-gray-900">{customer.seasonalPattern.pattern}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">Confidence:</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${customer.seasonalPattern.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-900">{(customer.seasonalPattern.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-900 mt-2">{customer.seasonalPattern.description}</p>
                {customer.seasonalPattern.peakMonths.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ⏰ Next peak season in approximately {monthsUntilPeak} month{monthsUntilPeak !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Order History Insights</h3>
              <div className="space-y-3">
                <div 
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-help"
                  title={`Customer History:\n\n• First Order: ${new Date(customer.orderHistory.firstOrderDate).toLocaleDateString()}\n• Total Orders: ${customer.orderHistory.totalOrders}\n• Days as Customer: ${Math.floor((new Date().getTime() - new Date(customer.orderHistory.firstOrderDate).getTime()) / (1000 * 60 * 60 * 24))} days\n\nThis is when the customer placed their very first order with your business.`}
                >
                  <span className="text-gray-900">Customer Since:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(customer.orderHistory.firstOrderDate).toLocaleDateString()}
                  </span>
                </div>
                <div 
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-help"
                  title={`Average Order Gap Calculation:\n\n• Based on ${customer.orderHistory.totalOrders} total orders\n• Calculated from gaps between consecutive orders\n• Does NOT include current ${customer.daysSinceOrder}-day dormant period\n• Average Gap: ${Math.round(customer.orderHistory.averageOrderGap)} days\n\nThis shows how frequently the customer ordered when they were active. The current dormant period of ${customer.daysSinceOrder} days is ${Math.round(customer.daysSinceOrder / Math.max(customer.orderHistory.averageOrderGap, 1))}x longer than their typical ordering pattern.`}
                >
                  <span className="text-gray-900">Average Order Gap:</span>
                  <span className="font-medium text-gray-900">{Math.round(customer.orderHistory.averageOrderGap)} days</span>
                </div>
                <div 
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-help"
                  title={`Order Trend Analysis:\n\n• Compares order frequency over last 90 days vs previous 90 days\n• Increasing: 20%+ more orders in recent period\n• Declining: 20%+ fewer orders in recent period\n• Stable: Order frequency within 20% of previous period\n• Current Trend: ${customer.orderHistory.orderTrend}\n\nThis helps identify if the customer was already showing signs of reduced engagement before going dormant.`}
                >
                  <span className="text-gray-900">Order Trend:</span>
                  <span className={`font-medium flex items-center ${
                    customer.orderHistory.orderTrend === 'increasing' ? 'text-green-600' :
                    customer.orderHistory.orderTrend === 'declining' ? 'text-red-600' :
                    'text-gray-900'
                  }`}>
                    {customer.orderHistory.orderTrend === 'increasing' ? '📈' :
                     customer.orderHistory.orderTrend === 'declining' ? '📉' : '➡️'}
                    <span className="ml-1">{customer.orderHistory.orderTrend}</span>
                  </span>
                </div>
                <div 
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-help"
                  title={`Average Order Value Calculation:\n\n• Based on last 6 months of orders\n• Total 6-Month Value: ${formatCurrency(customer.total6MonthValue)}\n• Number of Orders: ${customer.orderCount6Months}\n• Average = Total Value ÷ Order Count\n• Result: ${formatCurrency(customer.averageOrderValue)}\n\nThis represents the typical order size for this customer over the past 6 months.`}
                >
                  <span className="text-gray-900">Avg Order Value:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(customer.averageOrderValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Table */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Product Purchase History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Times Ordered</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Ordered</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customer.productPreferences.map((pref, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900">{pref.product}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{pref.frequency}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(pref.totalValue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(pref.lastOrdered).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`flex items-center ${
                          pref.trend === 'increasing' ? 'text-green-600' :
                          pref.trend === 'decreasing' ? 'text-red-600' :
                          'text-gray-900'
                        }`}>
                          {pref.trend === 'increasing' ? '↑' :
                           pref.trend === 'decreasing' ? '↓' : '→'}
                          <span className="ml-1">{pref.trend}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contact Template */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Suggested Outreach Template</h3>
            <div className="bg-white border border-gray-200 rounded p-4 font-mono text-sm text-gray-900">
              <p>Hi {customer.customer.split(' ')[0] || 'there'},</p>
              <br />
              <p>I noticed it's been {customer.daysSinceOrder} days since your last order of {customer.productPreferences[0]?.product || 'our wines'}. 
              {customer.seasonalPattern.peakMonths.length > 0 && monthsUntilPeak <= 2 && 
                ` With your busy season coming up, I wanted to ensure you're fully stocked.`
              }</p>
              <br />
              <p>Based on your preferences, I'd recommend checking out our latest selection of:
              {customer.productPreferences.slice(0, 3).map(p => ` ${p.product}`).join(',')}</p>
              <br />
              <p>Would you like me to prepare your usual order or discuss any new additions to your wine list?</p>
              <br />
              <p>Best regards,<br />{customer.salesperson}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Print Customer Profile
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