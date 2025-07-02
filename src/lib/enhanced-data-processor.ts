import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { 
  analyzeSeasonalPattern, 
  calculateWinBackProbability, 
  segmentCustomer,
  analyzeProductPreferences,
  forecastRevenueRecovery,
  EnhancedCustomerData,
  isWineProduct
} from './enhanced-analytics'
import { DormantCustomer } from './data-processor'

export interface EnhancedProcessingResult {
  dormantCustomers: EnhancedCustomerData[]
  salespersonSummaries: any[]
  insights: Record<string, string>
  summary: {
    totalDormantCustomers: number
    totalValueAtRisk: number
    averageChurnRisk: number
    dataQualityScore: number
    averageWinBackProbability: number
    topProducts: { product: string; revenue: number }[]
  }
  dataQualityReport: {
    totalRecords: number
    validRecords: number
    recordsInWindow: number
    dataCompleteness: string
    windowCoverage: string
    issues: string[]
  }
  revenueForecasts: {
    optimistic: number
    realistic: number
    conservative: number
    bySegment: Record<string, number>
    timeline: { month: string; projected: number }[]
  }
  customerSegments: Record<string, number>
  geographicDistribution: Record<string, { count: number; value: number }>
  productInsights: {
    topProducts: { product: string; customers: number; revenue: number }[]
    trendingUp: string[]
    trendingDown: string[]
  }
}

export async function processFilesEnhanced(
  salesCsvContent: string,
  planningExcelBuffer: ArrayBuffer
): Promise<EnhancedProcessingResult> {
  // Parse Excel
  const workbook = XLSX.read(planningExcelBuffer, { type: 'array' })
  const planningSheet = workbook.Sheets[workbook.SheetNames[0]]
  const planningData = XLSX.utils.sheet_to_json(planningSheet)

  // Create customer mapping from planning sheet
  const customerToRep = new Map<string, string>()
  const customerTargets = new Map<string, any>()
  
  planningData.forEach((row: any) => {
    if (row.Customer && row['Assigned Rep']) {
      const customerKey = row.Customer.toString().toLowerCase().trim()
      customerToRep.set(customerKey, row['Assigned Rep'].toString().trim())
      
      // Store target data for enhanced insights
      customerTargets.set(customerKey, {
        realisticTarget: row['Realistic Target'] || 0,
        targetInvoices: row['Target Number of Invoices'] || 0,
        q2Sales: row['Q2_2025_Total_Sales'] || 0
      })
    }
  })

  // Process sales data
  const customerMap = new Map<string, any>()
  const allOrdersMap = new Map<string, any[]>() // Store all orders per customer
  
  // Find the most recent date in the data
  let maxDate = new Date(0)
  const salesData = Papa.parse(salesCsvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  }).data

  salesData.forEach((row: any) => {
    const postedDate = new Date(row['Posted date'])
    if (!isNaN(postedDate.getTime()) && postedDate > maxDate) {
      maxDate = postedDate
    }
  })

  const analysisDate = new Date(maxDate)
  const sixMonthsAgo = new Date(analysisDate)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const fortyFiveDaysAgo = new Date(analysisDate)
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)

  let validRecords = 0
  let recordsInWindow = 0
  const issues: string[] = []

  // First pass: collect all orders per customer
  salesData.forEach((row: any) => {
    try {
      const postedDate = new Date(row['Posted date'])
      if (isNaN(postedDate.getTime())) {
        issues.push(`Invalid date: ${row['Posted date']}`)
        return
      }

      const customer = row.Customer?.trim()
      if (!customer) {
        issues.push('Missing customer name')
        return
      }

      validRecords++

      // Store all orders for each customer (not just 6-month window)
      if (!allOrdersMap.has(customer)) {
        allOrdersMap.set(customer, [])
      }
      allOrdersMap.get(customer)!.push(row)

      // Process for dormant analysis (6-month window)
      if (postedDate >= sixMonthsAgo) {
        recordsInWindow++
        
        if (!customerMap.has(customer)) {
          const correctRep = customerToRep.get(customer.toLowerCase()) || 
                            (row.Salesperson && row.Salesperson.trim() !== '' ? row.Salesperson.trim() : 'Unassigned')
          
          const locationData = {
            city: row['Shipping address city'] || '',
            state: row['Shipping address province'] || '',
            postalCode: row['Shipping address postal code'] || ''
          }
          
          customerMap.set(customer, {
            customer,
            salesperson: correctRep,
            lastOrderDate: postedDate,
            daysSinceOrder: 0,
            total6MonthValue: 0,
            orderCount6Months: 0,
            averageOrderValue: 0,
            items: [],
            locationData,
            allOrders: [],
            targetData: customerTargets.get(customer.toLowerCase()) || null
          })
        }

        const customerData = customerMap.get(customer)!
        const netPrice = parseFloat(row['Net price']) || 0
        const item = row.Item || 'Unknown'
        
        if (postedDate > customerData.lastOrderDate) {
          customerData.lastOrderDate = postedDate
        }
        
        customerData.total6MonthValue += netPrice
        customerData.orderCount6Months += 1
        
        // Only track wine products in customer items
        if (isWineProduct(item) && !customerData.items.includes(item)) {
          customerData.items.push(item)
        }
        
        customerData.allOrders.push(row)
      }
    } catch (error) {
      issues.push(`Error processing row: ${error}`)
    }
  })

  // Calculate enhanced metrics for dormant customers
  const enhancedDormantCustomers: EnhancedCustomerData[] = []
  const today = analysisDate

  customerMap.forEach((customer) => {
    customer.daysSinceOrder = Math.floor(
      (today.getTime() - customer.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    customer.averageOrderValue = customer.orderCount6Months > 0 
      ? customer.total6MonthValue / customer.orderCount6Months 
      : 0

    // Customer is dormant
    if (customer.lastOrderDate >= sixMonthsAgo && customer.lastOrderDate < fortyFiveDaysAgo) {
      // Basic churn risk calculation
      const daysSinceOrderScore = Math.min(customer.daysSinceOrder / 180, 1)
      const orderFrequencyScore = 1 - Math.min(customer.orderCount6Months / 12, 1)
      const valueScore = customer.total6MonthValue < 1000 ? 0.8 : 
                        customer.total6MonthValue < 5000 ? 0.5 : 0.2
      
      const churnRiskScore = (daysSinceOrderScore * 0.5 + orderFrequencyScore * 0.3 + valueScore * 0.2)

      // Get all historical orders for this customer
      const allCustomerOrders = allOrdersMap.get(customer.customer) || []
      
      // Enhanced analytics
      const orderDates = allCustomerOrders.map((o: any) => new Date(o['Posted date']))
      const seasonalPattern = analyzeSeasonalPattern(orderDates)
      const productPreferences = analyzeProductPreferences(allCustomerOrders)
      const winBackProbability = calculateWinBackProbability(
        {
          ...customer,
          churnRiskScore,
          preferredProducts: customer.items.slice(0, 5),
          seasonalPattern: seasonalPattern.pattern,
          customerLifetimeValue: customer.total6MonthValue * 2.4
        } as DormantCustomer,
        allCustomerOrders
      )
      
      const segment = segmentCustomer(
        {
          ...customer,
          churnRiskScore,
          preferredProducts: customer.items.slice(0, 5),
          seasonalPattern: seasonalPattern.pattern,
          customerLifetimeValue: customer.total6MonthValue * 2.4
        } as DormantCustomer,
        winBackProbability.score,
        allCustomerOrders.length
      )

      // Calculate order history metrics
      const firstOrderDate = new Date(Math.min(...orderDates.map(d => d.getTime())))
      const totalLifetimeValue = allCustomerOrders.reduce((sum: number, o: any) => 
        sum + (parseFloat(o['Net price']) || 0), 0
      )
      
      // Calculate true average order gap
      let averageOrderGap = 0
      if (orderDates.length > 1) {
        // Sort order dates chronologically
        const sortedDates = orderDates.sort((a, b) => a.getTime() - b.getTime())
        const gaps: number[] = []
        
        // Calculate gaps between consecutive orders
        for (let i = 1; i < sortedDates.length; i++) {
          const gapInDays = (sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24)
          gaps.push(gapInDays)
        }
        
        // Average of all gaps
        averageOrderGap = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0
      }
      
      // Determine order trend
      let orderTrend: 'increasing' | 'stable' | 'declining' = 'stable'
      if (orderDates.length >= 3) {
        const recentOrders = orderDates.filter(d => 
          d >= new Date(analysisDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        ).length
        const olderOrders = orderDates.filter(d => 
          d < new Date(analysisDate.getTime() - 90 * 24 * 60 * 60 * 1000) &&
          d >= new Date(analysisDate.getTime() - 180 * 24 * 60 * 60 * 1000)
        ).length
        
        if (recentOrders > olderOrders * 1.2) orderTrend = 'increasing'
        else if (recentOrders < olderOrders * 0.8) orderTrend = 'declining'
      }

      enhancedDormantCustomers.push({
        customer: customer.customer,
        salesperson: customer.salesperson,
        lastOrderDate: customer.lastOrderDate,
        daysSinceOrder: customer.daysSinceOrder,
        total6MonthValue: customer.total6MonthValue,
        orderCount6Months: customer.orderCount6Months,
        averageOrderValue: customer.averageOrderValue,
        items: customer.items,
        allOrders: allCustomerOrders,
        churnRiskScore,
        preferredProducts: customer.items.slice(0, 5),
        seasonalPattern: seasonalPattern,
        customerLifetimeValue: totalLifetimeValue,
        productPreferences,
        winBackProbability,
        segment,
        locationData: customer.locationData,
        orderHistory: {
          firstOrderDate,
          totalOrders: allCustomerOrders.length,
          totalLifetimeValue,
          averageOrderGap,
          orderTrend
        }
      })
    }
  })

  // Sort by value at risk
  enhancedDormantCustomers.sort((a, b) => b.total6MonthValue - a.total6MonthValue)

  // Create enhanced salesperson summaries
  const salespersonMap = new Map<string, any>()
  
  enhancedDormantCustomers.forEach((customer) => {
    const rep = customer.salesperson
    
    if (!salespersonMap.has(rep)) {
      salespersonMap.set(rep, {
        salesperson: rep,
        dormantCustomerCount: 0,
        totalValueAtRisk: 0,
        highValueDormantCount: 0,
        quickWinCount: 0,
        averageChurnRisk: 0,
        averageWinBackProbability: 0,
        potentialRecovery: 0,
        customers: [],
        topProducts: new Map(),
        segments: { VIP: 0, Regular: 0, Occasional: 0, 'At-Risk': 0, Lost: 0 }
      })
    }
    
    const summary = salespersonMap.get(rep)!
    summary.dormantCustomerCount++
    summary.totalValueAtRisk += customer.total6MonthValue
    summary.customers.push(customer)
    // Calculate potential recovery with error handling
    const estimatedRevenue = customer.winBackProbability.estimatedRevenue || 0
    const winBackScore = customer.winBackProbability.score || 0
    const potentialRevenue = estimatedRevenue * winBackScore
    
    if (!isNaN(potentialRevenue) && isFinite(potentialRevenue)) {
      summary.potentialRecovery += potentialRevenue
    }
    summary.segments[customer.segment.segment]++
    
    if (customer.total6MonthValue > 2000) {
      summary.highValueDormantCount++
    }
    
    if (customer.winBackProbability.score > 0.7) {
      summary.quickWinCount++
    }
    
    // Track products (only wine products)
    customer.productPreferences.forEach(pref => {
      if (!isWineProduct(pref.product)) return
      
      if (!summary.topProducts.has(pref.product)) {
        summary.topProducts.set(pref.product, 0)
      }
      summary.topProducts.set(pref.product, summary.topProducts.get(pref.product) + pref.totalValue)
    })
  })

  // Calculate averages and finalize summaries
  salespersonMap.forEach((summary) => {
    const totalRisk = summary.customers.reduce((sum: number, c: EnhancedCustomerData) => sum + c.churnRiskScore, 0)
    const totalWinBack = summary.customers.reduce((sum: number, c: EnhancedCustomerData) => sum + c.winBackProbability.score, 0)
    
    summary.averageChurnRisk = summary.customers.length > 0 ? totalRisk / summary.customers.length : 0
    summary.averageWinBackProbability = summary.customers.length > 0 ? totalWinBack / summary.customers.length : 0
    
    // Convert product map to sorted array
    const productEntries: [string, number][] = Array.from(summary.topProducts.entries())
    summary.topProducts = productEntries
      .map(([product, value]) => ({ product, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    
    delete summary.customers
  })

  const salespersonSummaries = Array.from(salespersonMap.values())
    .sort((a, b) => b.totalValueAtRisk - a.totalValueAtRisk)

  // Revenue forecasts
  const revenueForecasts = forecastRevenueRecovery(enhancedDormantCustomers)

  // Customer segments summary
  const customerSegments = enhancedDormantCustomers.reduce((acc, customer) => {
    acc[customer.segment.segment] = (acc[customer.segment.segment] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Geographic distribution
  const geographicDistribution = enhancedDormantCustomers.reduce((acc, customer) => {
    const state = customer.locationData.state || 'Unknown'
    if (!acc[state]) {
      acc[state] = { count: 0, value: 0 }
    }
    acc[state].count++
    acc[state].value += customer.total6MonthValue
    return acc
  }, {} as Record<string, { count: number; value: number }>)

  // Product insights
  const productMap = new Map<string, { customers: Set<string>; revenue: number }>()
  const productTrends = { up: new Set<string>(), down: new Set<string>() }
  
  enhancedDormantCustomers.forEach(customer => {
    customer.productPreferences.forEach(pref => {
      // Only include wine products in insights
      if (!isWineProduct(pref.product)) return
      
      if (!productMap.has(pref.product)) {
        productMap.set(pref.product, { customers: new Set(), revenue: 0 })
      }
      const data = productMap.get(pref.product)!
      data.customers.add(customer.customer)
      data.revenue += pref.totalValue
      
      if (pref.trend === 'increasing') productTrends.up.add(pref.product)
      if (pref.trend === 'decreasing') productTrends.down.add(pref.product)
    })
  })

  const topProducts = Array.from(productMap.entries())
    .map(([product, data]) => ({
      product,
      customers: data.customers.size,
      revenue: data.revenue
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Enhanced insights
  const totalValueAtRisk = enhancedDormantCustomers.reduce((sum, c) => sum + c.total6MonthValue, 0)
  const avgChurnRisk = enhancedDormantCustomers.length > 0 
    ? enhancedDormantCustomers.reduce((sum, c) => sum + c.churnRiskScore, 0) / enhancedDormantCustomers.length 
    : 0
  const avgWinBack = enhancedDormantCustomers.length > 0
    ? enhancedDormantCustomers.reduce((sum, c) => sum + c.winBackProbability.score, 0) / enhancedDormantCustomers.length
    : 0

  const topRep = salespersonSummaries[0]
  const topCustomer = enhancedDormantCustomers[0]
  const vipCount = customerSegments['VIP'] || 0
  const quickWins = enhancedDormantCustomers.filter(c => c.winBackProbability.score > 0.7).length

  const insights = {
    topPriorityRep: topRep 
      ? `Focus on ${topRep.salesperson}, who has $${topRep.totalValueAtRisk.toFixed(2)} at risk with ${topRep.quickWinCount} quick-win opportunities.`
      : 'No dormant customers found.',
    
    topPriorityCustomer: topCustomer 
      ? `${topCustomer.customer} is your top priority (${topCustomer.segment.segment}). ${topCustomer.winBackProbability.recommendation}`
      : 'No dormant customers found.',
    
    quickWins: `${quickWins} customers have >70% win-back probability. Focus on these for immediate revenue recovery.`,
    
    vipAlert: vipCount > 0 
      ? `⚠️ ${vipCount} VIP customers are dormant! These require immediate personal attention.`
      : 'No VIP customers in dormant list.',
    
    revenueOpportunity: `Potential revenue recovery: $${(revenueForecasts.realistic || 0).toFixed(2)} (realistic scenario) over next 6 months.`,
    
    geographicInsight: (() => {
      const topState = Object.entries(geographicDistribution)
        .filter(([state]) => state !== 'Unknown' && state.trim() !== '')
        .sort((a, b) => b[1].value - a[1].value)[0]
      return topState 
        ? `${topState[0]} has the highest value at risk with ${topState[1].count} dormant customers worth $${topState[1].value.toFixed(2)}.`
        : 'Geographic data not available.'
    })()
  }

  return {
    dormantCustomers: enhancedDormantCustomers,
    salespersonSummaries,
    insights,
    summary: {
      totalDormantCustomers: enhancedDormantCustomers.length,
      totalValueAtRisk,
      averageChurnRisk: avgChurnRisk,
      dataQualityScore: validRecords / salesData.length,
      averageWinBackProbability: avgWinBack,
      topProducts: topProducts.slice(0, 5)
    },
    dataQualityReport: {
      totalRecords: salesData.length,
      validRecords,
      recordsInWindow,
      dataCompleteness: `${validRecords}/${salesData.length} records have valid data`,
      windowCoverage: `${recordsInWindow}/${validRecords} valid records are within 6-month window`,
      issues: issues.slice(0, 10)
    },
    revenueForecasts,
    customerSegments,
    geographicDistribution,
    productInsights: {
      topProducts,
      trendingUp: Array.from(productTrends.up),
      trendingDown: Array.from(productTrends.down)
    }
  }
}