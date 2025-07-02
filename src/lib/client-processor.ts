import Papa from 'papaparse'

export interface ProcessedData {
  customerOrders: Map<string, any[]>
  totalRows: number
  validRows: number
  dateRange: { start: Date; end: Date }
}

export async function preprocessSalesData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const customerMap = new Map<string, any[]>()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    let totalRows = 0
    let validRows = 0
    let minDate = new Date()
    let maxDate = new Date(0)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      step: (row: any) => {
        totalRows++
        const data = row.data
        
        // Parse date
        const postedDate = new Date(data['Posted date'])
        if (isNaN(postedDate.getTime())) return
        
        // Only keep recent orders (last 6 months)
        if (postedDate < sixMonthsAgo) return
        
        const customer = data.Customer?.trim()
        if (!customer) return
        
        validRows++
        
        // Update date range
        if (postedDate < minDate) minDate = postedDate
        if (postedDate > maxDate) maxDate = postedDate
        
        // Group by customer to reduce data size
        if (!customerMap.has(customer)) {
          customerMap.set(customer, [])
        }
        
        // Store only essential fields
        customerMap.get(customer)!.push({
          'Posted date': data['Posted date'],
          'Customer': customer,
          'Salesperson': data.Salesperson,
          'Item': data.Item,
          'Qty': data.Qty,
          'Net price': data['Net price']
        })
      },
      complete: () => {
        // Convert map to array format
        const consolidatedData: any[] = []
        
        customerMap.forEach((orders, customer) => {
          // For customers with many orders, keep only recent ones
          const sortedOrders = orders.sort((a, b) => 
            new Date(b['Posted date']).getTime() - new Date(a['Posted date']).getTime()
          )
          
          // Keep up to 50 most recent orders per customer
          const recentOrders = sortedOrders.slice(0, 50)
          consolidatedData.push(...recentOrders)
        })
        
        // Convert back to CSV
        const csv = Papa.unparse(consolidatedData, {
          header: true
        })
        
        console.log(`Preprocessed data: ${totalRows} rows → ${consolidatedData.length} rows`)
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        console.log(`Processed size: ${(csv.length / 1024 / 1024).toFixed(2)}MB`)
        
        resolve(csv)
      },
      error: (error: any) => {
        reject(error)
      }
    })
  })
}