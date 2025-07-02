const fs = require('fs')
const path = require('path')

// Test data processing logic directly
const Papa = require('papaparse')

const csvPath = path.join(__dirname, 'reference/Sales report 2024-07-01 to 2025-06-30.csv')
const csvContent = fs.readFileSync(csvPath, 'utf8')

// Remove title rows
const lines = csvContent.split('\n')
let startIndex = 0

if (lines[0].includes('Sales report')) {
  startIndex = 2
}

const cleanedContent = lines.slice(startIndex).join('\n')

let rowCount = 0
let validRows = 0
let customers = new Set()
let dates = []

Papa.parse(cleanedContent, {
  header: true,
  skipEmptyLines: true,
  step: (row) => {
    rowCount++
    const data = row.data
    
    if (data.Customer && data['Posted date']) {
      validRows++
      customers.add(data.Customer)
      dates.push(new Date(data['Posted date']))
    }
  },
  complete: () => {
    console.log('Total rows:', rowCount)
    console.log('Valid rows:', validRows)
    console.log('Unique customers:', customers.size)
    
    // Find date range
    const sortedDates = dates.filter(d => !isNaN(d.getTime())).sort((a, b) => a - b)
    console.log('Date range:', sortedDates[0]?.toDateString(), 'to', sortedDates[sortedDates.length - 1]?.toDateString())
    
    // Calculate dormant based on last date
    const lastDate = sortedDates[sortedDates.length - 1]
    const fortyFiveDaysAgo = new Date(lastDate)
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)
    
    console.log('Analysis date:', lastDate.toDateString())
    console.log('45 days before:', fortyFiveDaysAgo.toDateString())
  }
})