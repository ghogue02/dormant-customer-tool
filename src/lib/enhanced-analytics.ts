import { DormantCustomer } from './data-processor'

export interface SeasonalPattern {
  pattern: string
  confidence: number
  peakMonths: number[]
  description: string
}

export interface ProductPreference {
  product: string
  frequency: number
  totalValue: number
  lastOrdered: Date
  trend: 'increasing' | 'stable' | 'decreasing'
}

export interface WinBackProbability {
  score: number // 0-1
  factors: {
    recencyScore: number
    frequencyScore: number
    monetaryScore: number
    seasonalScore: number
    productDiversityScore: number
  }
  recommendation: string
  estimatedRevenue: number
}

export interface CustomerSegment {
  segment: 'VIP' | 'Regular' | 'Occasional' | 'At-Risk' | 'Lost'
  criteria: string
  actionPlan: string
}

export interface EnhancedCustomerData extends DormantCustomer {
  seasonalPattern: SeasonalPattern
  productPreferences: ProductPreference[]
  winBackProbability: WinBackProbability
  segment: CustomerSegment
  locationData: {
    city: string
    state: string
    postalCode: string
  }
  orderHistory: {
    firstOrderDate: Date
    totalOrders: number
    totalLifetimeValue: number
    averageOrderGap: number
    orderTrend: 'increasing' | 'stable' | 'declining'
  }
}

// Analyze seasonal buying patterns
export function analyzeSeasonalPattern(orderDates: Date[]): SeasonalPattern {
  if (orderDates.length < 3) {
    return {
      pattern: 'Insufficient data',
      confidence: 0,
      peakMonths: [],
      description: 'Need more order history to determine pattern'
    }
  }

  // Count orders by month
  const monthCounts = new Array(12).fill(0)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  orderDates.forEach(date => {
    monthCounts[date.getMonth()]++
  })

  // Find peak months (months with above average orders)
  const avgOrders = orderDates.length / 12
  const peakMonths: number[] = []
  monthCounts.forEach((count, month) => {
    if (count > avgOrders * 1.5) {
      peakMonths.push(month)
    }
  })

  // Determine pattern
  let pattern = 'Year-round'
  let description = 'Orders throughout the year'
  let confidence = 0.5

  if (peakMonths.length === 0) {
    pattern = 'Sporadic'
    description = 'No clear seasonal pattern'
    confidence = 0.3
  } else if (peakMonths.length <= 3) {
    // Check for seasonal clustering
    const seasons = {
      'Holiday': [10, 11, 0], // Nov, Dec, Jan
      'Spring': [2, 3, 4],    // Mar, Apr, May
      'Summer': [5, 6, 7],    // Jun, Jul, Aug
      'Fall': [8, 9, 10]      // Sep, Oct, Nov
    }

    for (const [seasonName, seasonMonths] of Object.entries(seasons)) {
      const matchCount = peakMonths.filter(m => seasonMonths.includes(m)).length
      if (matchCount >= 2) {
        pattern = `${seasonName} buyer`
        description = `Peak ordering in ${seasonName.toLowerCase()} months`
        confidence = Math.min(0.9, 0.6 + (matchCount * 0.15))
        break
      }
    }

    if (pattern === 'Year-round' && peakMonths.length > 0) {
      pattern = 'Selective months'
      description = `Peak ordering in ${peakMonths.map(m => monthNames[m]).join(', ')}`
      confidence = 0.7
    }
  }

  return { pattern, confidence, peakMonths, description }
}

// Calculate win-back probability
export function calculateWinBackProbability(
  customer: DormantCustomer,
  allCustomerOrders: any[]
): WinBackProbability {
  
  // Recency: How recently they ordered (inverse of risk)
  const recencyScore = 1 - (customer.daysSinceOrder / 365) // Normalize to 0-1

  // Frequency: How often they ordered
  const orderDates = allCustomerOrders.map(o => new Date(o['Posted date']))
  const timeSpan = (Math.max(...orderDates.map(d => d.getTime())) - Math.min(...orderDates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24)
  const orderFrequency = orderDates.length / (timeSpan / 30) // Orders per month
  const frequencyScore = Math.min(1, orderFrequency / 2) // Normalize (2+ orders/month = max)

  // Monetary: Customer value
  const monetaryScore = Math.min(1, customer.total6MonthValue / 10000) // Normalize ($10k = max)

  // Seasonal: Are we in their buying season?
  const seasonal = analyzeSeasonalPattern(orderDates)
  const currentMonth = new Date().getMonth()
  const seasonalScore = seasonal.peakMonths.includes(currentMonth) ? 0.9 : 0.5

  // Product diversity: How many different products they buy
  const uniqueProducts = new Set(allCustomerOrders.map(o => o.Item)).size
  const productDiversityScore = Math.min(1, uniqueProducts / 10) // 10+ products = max

  // Calculate overall score (weighted average)
  const score = (
    recencyScore * 0.3 +
    frequencyScore * 0.25 +
    monetaryScore * 0.25 +
    seasonalScore * 0.1 +
    productDiversityScore * 0.1
  )

  // Generate recommendation
  let recommendation = ''
  if (score > 0.7) {
    recommendation = 'High probability - Immediate personalized outreach recommended'
  } else if (score > 0.5) {
    recommendation = 'Medium probability - Include in targeted campaign'
  } else if (score > 0.3) {
    recommendation = 'Low probability - Add to nurture sequence'
  } else {
    recommendation = 'Very low probability - Monitor for re-engagement signals'
  }

  // Estimate potential revenue (based on historical average)
  const estimatedRevenue = customer.averageOrderValue * orderFrequency * 6 // 6 month projection

  return {
    score,
    factors: {
      recencyScore,
      frequencyScore,
      monetaryScore,
      seasonalScore,
      productDiversityScore
    },
    recommendation,
    estimatedRevenue
  }
}

// Segment customers based on value AND frequency
export function segmentCustomer(
  customer: DormantCustomer,
  winBackScore: number,
  totalOrders: number
): CustomerSegment {
  const avgOrderValue = customer.total6MonthValue / Math.max(customer.orderCount6Months, 1)
  const orderFrequency = customer.orderCount6Months
  
  // VIP: High value AND/OR high frequency
  if ((customer.total6MonthValue > 5000 && orderFrequency >= 4) || 
      (orderFrequency >= 8 && avgOrderValue > 500)) {
    return {
      segment: 'VIP',
      criteria: 'High value ($5k+) or very frequent orders (8+/6mo)',
      actionPlan: 'Personal call from account manager within 24 hours'
    }
  }

  // At-Risk: Was previously good but declining
  if ((customer.total6MonthValue > 2000 || orderFrequency >= 4) && 
      customer.churnRiskScore > 0.7) {
    return {
      segment: 'At-Risk',
      criteria: 'Previously valuable/frequent customer with high churn risk',
      actionPlan: 'Urgent outreach with incentive to return'
    }
  }

  // Regular: Consistent frequency OR decent value
  if ((orderFrequency >= 3 && winBackScore > 0.5) ||
      (customer.total6MonthValue > 1500 && orderFrequency >= 2)) {
    return {
      segment: 'Regular',
      criteria: 'Consistent orders (3+) or good value ($1.5k+)',
      actionPlan: 'Personalized email with loyalty rewards'
    }
  }

  // Occasional: Low frequency but still engaged
  if (orderFrequency >= 1 && winBackScore > 0.3) {
    return {
      segment: 'Occasional',
      criteria: 'Infrequent but recent orders',
      actionPlan: 'Add to seasonal campaigns and product launches'
    }
  }

  // Lost: Very high risk, minimal engagement
  return {
    segment: 'Lost',
    criteria: 'Minimal recent activity with very high churn risk',
    actionPlan: 'Win-back campaign with significant incentive'
  }
}

// Filter out non-wine products
export function isWineProduct(productName: string): boolean {
  if (!productName || productName.toLowerCase() === 'unknown') return false
  
  const nonWinePatterns = [
    'check', 'pick up', 'pickup', 'delivery', 'shipping', 'freight',
    'fee', 'charge', 'tax', 'discount', 'credit', 'refund',
    'service', 'labor', 'setup', 'install', 'consultation',
    'deposit', 'balance', 'payment', 'adjustment', 'misc'
  ]
  
  const lowerProduct = productName.toLowerCase()
  return !nonWinePatterns.some(pattern => lowerProduct.includes(pattern))
}

// Analyze product preferences
export function analyzeProductPreferences(
  customerOrders: any[]
): ProductPreference[] {
  const productMap = new Map<string, {
    frequency: number
    totalValue: number
    lastOrdered: Date
    orderDates: Date[]
  }>()

  // Aggregate by product (only wine products)
  customerOrders.forEach(order => {
    const product = order.Item || 'Unknown'
    
    // Filter out non-wine products
    if (!isWineProduct(product)) return
    
    const value = parseFloat(order['Net price']) || 0
    const date = new Date(order['Posted date'])

    if (!productMap.has(product)) {
      productMap.set(product, {
        frequency: 0,
        totalValue: 0,
        lastOrdered: date,
        orderDates: []
      })
    }

    const data = productMap.get(product)!
    data.frequency++
    data.totalValue += value
    data.orderDates.push(date)
    if (date > data.lastOrdered) {
      data.lastOrdered = date
    }
  })

  // Calculate trends
  const preferences: ProductPreference[] = []
  
  productMap.forEach((data, product) => {
    // Sort dates to analyze trend
    const sortedDates = data.orderDates.sort((a, b) => a.getTime() - b.getTime())
    
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable'
    if (sortedDates.length >= 3) {
      // Compare first half vs second half frequency
      const midPoint = Math.floor(sortedDates.length / 2)
      const firstHalfGap = (sortedDates[midPoint - 1].getTime() - sortedDates[0].getTime()) / (midPoint)
      const secondHalfGap = (sortedDates[sortedDates.length - 1].getTime() - sortedDates[midPoint].getTime()) / (sortedDates.length - midPoint)
      
      if (secondHalfGap < firstHalfGap * 0.8) {
        trend = 'increasing'
      } else if (secondHalfGap > firstHalfGap * 1.2) {
        trend = 'decreasing'
      }
    }

    preferences.push({
      product,
      frequency: data.frequency,
      totalValue: data.totalValue,
      lastOrdered: data.lastOrdered,
      trend
    })
  })

  // Sort by total value descending
  return preferences.sort((a, b) => b.totalValue - a.totalValue)
}

// Forecast revenue recovery
export function forecastRevenueRecovery(
  dormantCustomers: EnhancedCustomerData[]
): {
  optimistic: number
  realistic: number
  conservative: number
  bySegment: Record<string, number>
  timeline: { month: string; projected: number }[]
} {
  let optimistic = 0
  let realistic = 0
  let conservative = 0
  const bySegment: Record<string, number> = {}

  dormantCustomers.forEach(customer => {
    const winBack = customer.winBackProbability
    const potential = winBack.estimatedRevenue

    // Different scenarios based on win-back probability
    optimistic += potential * Math.min(1, winBack.score * 1.2)
    realistic += potential * winBack.score
    conservative += potential * Math.max(0, winBack.score * 0.7)

    // By segment
    if (!bySegment[customer.segment.segment]) {
      bySegment[customer.segment.segment] = 0
    }
    bySegment[customer.segment.segment] += potential * winBack.score
  })

  // Timeline projection (next 6 months)
  const timeline = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const startMonth = new Date().getMonth()

  for (let i = 0; i < 6; i++) {
    const monthIndex = (startMonth + i) % 12
    const monthName = monthNames[monthIndex]
    
    // Assume recovery happens gradually with peak in months 2-3
    const recoveryFactor = i === 0 ? 0.1 : i === 1 ? 0.25 : i === 2 ? 0.3 : i === 3 ? 0.2 : 0.1
    
    timeline.push({
      month: monthName,
      projected: realistic * recoveryFactor
    })
  }

  return {
    optimistic,
    realistic,
    conservative,
    bySegment,
    timeline
  }
}