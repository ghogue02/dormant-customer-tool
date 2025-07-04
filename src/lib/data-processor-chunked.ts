import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { DormantCustomer, ProcessingResult } from './data-processor'

// Process CSV in chunks to handle large files
export async function processLargeFiles(
  salesCsvContent: string,
  planningExcelBuffer: ArrayBuffer
): Promise<ProcessingResult> {
  // Parse Excel (this is small, so no issues)
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

  // For large files, we'll process in a streaming manner
  const customerMap = new Map<string, any>()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const fortyFiveDaysAgo = new Date()
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)

  let validRecords = 0
  let totalRecords = 0
  const issues: string[] = []

  // Parse CSV with streaming to handle large files
  return new Promise((resolve, reject) => {
    Papa.parse(salesCsvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      chunk: (results: any) => {
        // Process each chunk of data
        results.data.forEach((row: any) => {
          totalRecords++
          
          try {
            const postedDate = new Date(row['Posted date'])
            if (isNaN(postedDate.getTime())) {
              if (issues.length < 10) issues.push(`Invalid date: ${row['Posted date']}`)
              return
            }

            const customer = row.Customer?.trim()
            if (!customer) return

            const netPrice = parseFloat(row['Net price']) || 0
            const item = row.Item || 'Unknown'

            // Only process orders from last 6 months
            if (postedDate >= sixMonthsAgo) {
              validRecords++
              
              if (!customerMap.has(customer)) {
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
              
              if (postedDate > customerData.lastOrderDate) {
                customerData.lastOrderDate = postedDate
              }
              
              customerData.total6MonthValue += netPrice
              customerData.orderCount6Months += 1
              
              if (!customerData.items.includes(item) && customerData.items.length < 10) {
                customerData.items.push(item)
              }
            }
          } catch (error) {
            if (issues.length < 10) issues.push(`Error processing row: ${error}`)
          }
        })
      },
      complete: () => {
        // Process dormant customers
        const today = new Date()
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
            // Calculate churn risk score
            const daysSinceOrderScore = Math.min(customer.daysSinceOrder / 180, 1)
            const orderFrequencyScore = 1 - Math.min(customer.orderCount6Months / 12, 1)
            const valueScore = customer.total6MonthValue < 1000 ? 0.8 : 0.3
            
            const churnRiskScore = (daysSinceOrderScore * 0.5 + orderFrequencyScore * 0.3 + valueScore * 0.2)

            const orderMonth = customer.lastOrderDate.getMonth()
            const season = orderMonth >= 2 && orderMonth <= 4 ? 'Spring' :
                          orderMonth >= 5 && orderMonth <= 7 ? 'Summer' :
                          orderMonth >= 8 && orderMonth <= 10 ? 'Fall' : 'Winter'

            dormantCustomers.push({
              ...customer,
              churnRiskScore,
              preferredProducts: customer.items.slice(0, 5),
              seasonalPattern: `${season} buyer`,
              customerLifetimeValue: customer.total6MonthValue * 2.4
            })
          }
        })

        // Sort and create summaries
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
          delete summary.customers
        })

        const salespersonSummaries = Array.from(salespersonMap.values())
          .sort((a, b) => b.totalValueAtRisk - a.totalValueAtRisk)

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

        resolve({
          dormantCustomers: dormantCustomers.slice(0, 100), // Limit to 100 for performance
          salespersonSummaries,
          insights,
          summary: {
            totalDormantCustomers: dormantCustomers.length,
            totalValueAtRisk,
            averageChurnRisk: avgChurnRisk,
            dataQualityScore: validRecords / totalRecords
          },
          dataQualityReport: {
            totalRecords,
            validRecords,
            issues: issues.slice(0, 10)
          }
        })
      },
      error: (error: any) => {
        reject(error)
      }
    })
  })
}