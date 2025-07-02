import Papa from 'papaparse'

export async function preprocessSalesData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileContent = file.text()
    
    fileContent.then(content => {
      // Remove title rows if present (first two lines if they don't contain proper headers)
      const lines = content.split('\n')
      let startIndex = 0
      
      // Check if first line is a title (contains "Sales report")
      if (lines[0] && lines[0].includes('Sales report')) {
        startIndex = 2 // Skip title and empty line
      }
      
      const cleanedContent = lines.slice(startIndex).join('\n')
      
      const allRows: any[] = []
      let totalRows = 0
      let skippedRows = 0
      
      Papa.parse(cleanedContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        step: (row: any) => {
          totalRows++
          const data = row.data
          
          // Skip empty rows
          const customer = data.Customer?.trim()
          if (!customer || customer === '') {
            skippedRows++
            return
          }
          
          // Parse and validate date
          const postedDate = data['Posted date']
          if (!postedDate || postedDate === '') {
            skippedRows++
            return
          }
          
          // Validate it's a proper date format
          const dateTest = new Date(postedDate)
          if (isNaN(dateTest.getTime())) {
            skippedRows++
            return
          }
          
          // Store only essential fields to reduce size
          allRows.push({
            'Posted date': postedDate,
            'Customer': customer,
            'Salesperson': data.Salesperson || '',
            'Item': data.Item || '',
            'Qty': data['Qty.'] || data.Qty || '0', // Note: might be 'Qty.' with period
            'Net price': data['Net price'] || '0'
          })
        },
        complete: () => {
          console.log(`Total rows processed: ${totalRows}`)
          console.log(`Skipped rows (empty/invalid): ${skippedRows}`)
          console.log(`Valid rows to send: ${allRows.length}`)
          
          if (allRows.length === 0) {
            reject(new Error('No valid data found in file. Please check the file format.'))
            return
          }
          
          // If file is still too large, we need to aggregate
          const csv = Papa.unparse(allRows, {
            header: true
          })
          
          const csvSize = csv.length / 1024 / 1024 // Size in MB
          console.log(`CSV size after processing: ${csvSize.toFixed(2)}MB`)
          
          if (csvSize > 4) {
            // If still too large, aggregate by customer
            console.log('File still too large, aggregating by customer...')
            const aggregated = aggregateByCustomer(allRows)
            const aggregatedCsv = Papa.unparse(aggregated, {
              header: true
            })
            console.log(`Aggregated size: ${(aggregatedCsv.length / 1024 / 1024).toFixed(2)}MB`)
            console.log(`Customers after aggregation: ${aggregated.length}`)
            resolve(aggregatedCsv)
          } else {
            resolve(csv)
          }
        },
        error: (error: any) => {
          console.error('Parse error:', error)
          reject(error)
        }
      })
    }).catch(error => {
      reject(error)
    })
  })
}

function aggregateByCustomer(rows: any[]): any[] {
  const customerMap = new Map<string, any>()
  
  rows.forEach(row => {
    const key = row.Customer // Group by customer only for better aggregation
    
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        'Posted date': row['Posted date'], // Will be updated to latest
        'Customer': row.Customer,
        'Salesperson': row.Salesperson,
        'Item': row.Item,
        'Qty': 0,
        'Net price': 0,
        'Order count': 0,
        'First order': row['Posted date'],
        'Last order': row['Posted date'],
        'Items': new Set()
      })
    }
    
    const agg = customerMap.get(key)!
    const currentDate = new Date(row['Posted date'])
    const aggDate = new Date(agg['Last order'])
    
    // Update to latest order date
    if (currentDate > aggDate) {
      agg['Posted date'] = row['Posted date']
      agg['Last order'] = row['Posted date']
      agg['Salesperson'] = row.Salesperson // Use most recent salesperson
    }
    
    // Update earliest order date
    const firstDate = new Date(agg['First order'])
    if (currentDate < firstDate) {
      agg['First order'] = row['Posted date']
    }
    
    // Track unique items
    if (row.Item) {
      agg.Items.add(row.Item)
    }
    
    // Sum quantities and prices
    agg['Qty'] += parseFloat(row.Qty) || 0
    agg['Net price'] += parseFloat(row['Net price']) || 0
    agg['Order count'] += 1
  })
  
  // Convert aggregated data back to array format
  return Array.from(customerMap.values()).map(agg => ({
    'Posted date': agg['Posted date'],
    'Customer': agg.Customer,
    'Salesperson': agg.Salesperson,
    'Item': Array.from(agg.Items).slice(0, 3).join('; ') || 'Various',
    'Qty': agg['Qty'].toString(),
    'Net price': agg['Net price'].toFixed(2)
  }))
}