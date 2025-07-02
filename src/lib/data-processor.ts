import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface CustomerData {
  customer: string
  salesperson: string
  lastOrderDate: Date
  daysSinceOrder: number
  total6MonthValue: number
  orderCount6Months: number
  averageOrderValue: number
  items: string[]
}

export interface DormantCustomer extends CustomerData {
  churnRiskScore: number
  preferredProducts: string[]
  seasonalPattern: string
  customerLifetimeValue: number
}

export interface ProcessingResult {
  dormantCustomers: DormantCustomer[]
  salespersonSummaries: any[]
  insights: Record<string, string>
  summary: {
    totalDormantCustomers: number
    totalValueAtRisk: number
    averageChurnRisk: number
    dataQualityScore: number
  }
  dataQualityReport: {
    totalRecords: number
    validRecords: number
    issues: string[]
  }
}

export async function processFiles(
  salesCsvContent: string,
  planningExcelBuffer: ArrayBuffer
): Promise<ProcessingResult> {
  // Parse CSV
  const salesData = Papa.parse(salesCsvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  }).data

  // Parse Excel
  const workbook = XLSX.read(planningExcelBuffer, { type: 'array' })
  const planningSheet = workbook.Sheets[workbook.SheetNames[0]]
  const planningData = XLSX.utils.sheet_to_json(planningSheet)

  // Create customer mapping from planning sheet
  const customerToRep = new Map<string, string>()
  planningData.forEach((row: any) => {
    if (row.Customer && row['Assigned Rep']) {
      customerToRep.set(
        row.Customer.toString().toLowerCase().trim(),
        row['Assigned Rep'].toString().trim()
      )
    }
  })

  // Process sales data
  const customerMap = new Map<string, CustomerData>()
  
  // Find the most recent date in the data to use as "today"
  let maxDate = new Date(0)
  salesData.forEach((row: any) => {
    const postedDate = new Date(row['Posted date'])
    if (!isNaN(postedDate.getTime()) && postedDate > maxDate) {
      maxDate = postedDate
    }
  })
  
  console.log('Latest date in data:', maxDate.toDateString())
  
  // Calculate date ranges based on the latest date in the data
  const analysisDate = new Date(maxDate)
  const sixMonthsAgo = new Date(analysisDate)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const fortyFiveDaysAgo = new Date(analysisDate)
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)
  
  console.log('Analysis date:', analysisDate.toDateString())
  console.log('Six months ago:', sixMonthsAgo.toDateString())
  console.log('45 days ago:', fortyFiveDaysAgo.toDateString())

  let validRecords = 0  // Records with valid data format
  let recordsInWindow = 0  // Records within 6-month analysis window
  const issues: string[] = []

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

      const netPrice = parseFloat(row['Net price']) || 0
      // Handle 'Qty.' or 'Qty' column
      // const quantity = parseInt(row['Qty.'] || row.Qty) || 0
      const item = row.Item || 'Unknown'

      // This is a valid record (has date, customer, and can be parsed)
      validRecords++

      // Only process orders from last 6 months for dormant analysis
      if (postedDate >= sixMonthsAgo) {
        recordsInWindow++
        
        if (!customerMap.has(customer)) {
          // Get correct salesperson from planning sheet
          const correctRep = customerToRep.get(customer.toLowerCase()) || row.Salesperson || 'Unassigned'
          
          customerMap.set(customer, {
            customer,
            salesperson: correctRep,
            lastOrderDate: postedDate,
            daysSinceOrder: 0,
            total6MonthValue: 0,
            orderCount6Months: 0,
            averageOrderValue: 0,
            items: []
          })
        }

        const customerData = customerMap.get(customer)!
        
        // Update customer data
        if (postedDate > customerData.lastOrderDate) {
          customerData.lastOrderDate = postedDate
        }
        
        customerData.total6MonthValue += netPrice
        customerData.orderCount6Months += 1
        
        if (!customerData.items.includes(item)) {
          customerData.items.push(item)
        }
      }
    } catch (error) {
      issues.push(`Error processing row: ${error}`)
    }
  })

  // Calculate days since last order and identify dormant customers
  // Use the analysis date (latest date in data) as reference
  const today = analysisDate
  const dormantCustomers: DormantCustomer[] = []

  customerMap.forEach((customer) => {
    customer.daysSinceOrder = Math.floor(
      (today.getTime() - customer.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    customer.averageOrderValue = customer.orderCount6Months > 0 
      ? customer.total6MonthValue / customer.orderCount6Months 
      : 0

    // Customer is dormant if they ordered in last 6 months but not in last 45 days
    if (customer.lastOrderDate >= sixMonthsAgo && customer.lastOrderDate < fortyFiveDaysAgo) {
      // Calculate churn risk score (0-1)
      // Risk factors:
      // 1. Days since last order (50% weight): More days = higher risk
      const daysSinceOrderScore = Math.min(customer.daysSinceOrder / 180, 1) // 180 days = max risk
      
      // 2. Order frequency (30% weight): Fewer orders = higher risk
      const orderFrequencyScore = 1 - Math.min(customer.orderCount6Months / 12, 1) // 12+ orders = min risk
      
      // 3. Customer value (20% weight): Lower value = higher risk
      const valueScore = customer.total6MonthValue < 1000 ? 0.8 : 
                        customer.total6MonthValue < 5000 ? 0.5 : 0.2
      
      const churnRiskScore = (daysSinceOrderScore * 0.5 + orderFrequencyScore * 0.3 + valueScore * 0.2)

      // Determine seasonal pattern
      const orderMonth = customer.lastOrderDate.getMonth()
      const season = orderMonth >= 2 && orderMonth <= 4 ? 'Spring' :
                    orderMonth >= 5 && orderMonth <= 7 ? 'Summer' :
                    orderMonth >= 8 && orderMonth <= 10 ? 'Fall' : 'Winter'

      dormantCustomers.push({
        ...customer,
        churnRiskScore,
        preferredProducts: customer.items.slice(0, 5),
        seasonalPattern: `${season} buyer`,
        customerLifetimeValue: customer.total6MonthValue * 2.4 // Simple CLV estimate
      })
    }
  })

  // Sort dormant customers by value at risk
  dormantCustomers.sort((a, b) => b.total6MonthValue - a.total6MonthValue)

  // Create salesperson summaries
  const salespersonMap = new Map<string, any>()
  
  dormantCustomers.forEach((customer) => {
    const rep = customer.salesperson
    
    if (!salespersonMap.has(rep)) {
      salespersonMap.set(rep, {
        salesperson: rep,
        dormantCustomerCount: 0,
        totalValueAtRisk: 0,
        highValueDormantCount: 0,
        quickWinCount: 0,
        averageChurnRisk: 0,
        customers: []
      })
    }
    
    const summary = salespersonMap.get(rep)!
    summary.dormantCustomerCount++
    summary.totalValueAtRisk += customer.total6MonthValue
    summary.customers.push(customer)
    
    if (customer.total6MonthValue > 2000) {
      summary.highValueDormantCount++
    }
    
    if (customer.churnRiskScore < 0.5 && customer.total6MonthValue > 500) {
      summary.quickWinCount++
    }
  })

  // Calculate average churn risk per salesperson
  salespersonMap.forEach((summary) => {
    const totalRisk = summary.customers.reduce((sum: number, c: DormantCustomer) => sum + c.churnRiskScore, 0)
    summary.averageChurnRisk = summary.customers.length > 0 ? totalRisk / summary.customers.length : 0
    delete summary.customers // Remove customer list from summary
  })

  const salespersonSummaries = Array.from(salespersonMap.values())
    .sort((a, b) => b.totalValueAtRisk - a.totalValueAtRisk)

  // Log processing summary
  console.log(`Data Processing Summary:
    - Total records: ${salesData.length}
    - Valid records: ${validRecords} (${(validRecords/salesData.length*100).toFixed(1)}%)
    - Records in 6-month window: ${recordsInWindow}
    - Unique customers in window: ${customerMap.size}
    - Dormant customers found: ${dormantCustomers.length}
  `)

  // Generate insights
  const totalValueAtRisk = dormantCustomers.reduce((sum, c) => sum + c.total6MonthValue, 0)
  const avgChurnRisk = dormantCustomers.length > 0 
    ? dormantCustomers.reduce((sum, c) => sum + c.churnRiskScore, 0) / dormantCustomers.length 
    : 0

  const topRep = salespersonSummaries[0]
  const topCustomer = dormantCustomers[0]

  const insights = {
    topPriorityRep: topRep 
      ? `Focus on ${topRep.salesperson}, who has $${topRep.totalValueAtRisk.toFixed(2)} in sales at risk across ${topRep.dormantCustomerCount} dormant customers.`
      : 'No dormant customers found.',
    
    topPriorityCustomer: topCustomer 
      ? `Prioritize outreach to ${topCustomer.customer}. They represent $${topCustomer.total6MonthValue.toFixed(2)} in potential lost revenue.`
      : 'No dormant customers found.',
    
    quickWins: `${dormantCustomers.filter(c => c.churnRiskScore < 0.5).length} customers have low churn risk and could be quick wins for re-engagement.`,
    
    riskAlert: avgChurnRisk > 0.7 
      ? '⚠️ High average churn risk detected. Immediate action recommended.'
      : avgChurnRisk > 0.5 
      ? '📊 Moderate churn risk across dormant customers. Plan targeted outreach.'
      : '✅ Churn risk is manageable. Focus on high-value customers first.'
  }

  return {
    dormantCustomers,
    salespersonSummaries,
    insights,
    summary: {
      totalDormantCustomers: dormantCustomers.length,
      totalValueAtRisk,
      averageChurnRisk: avgChurnRisk,
      dataQualityScore: validRecords / salesData.length
    },
    dataQualityReport: {
      totalRecords: salesData.length,
      validRecords,
      recordsInWindow: recordsInWindow,
      dataCompleteness: `${validRecords}/${salesData.length} records have valid data`,
      windowCoverage: `${recordsInWindow}/${validRecords} valid records are within 6-month window`,
      issues: issues.slice(0, 10) // Limit issues to first 10
    }
  }
}