import fs from 'fs'
import path from 'path'

async function testUpload() {
  try {
    // Read the test files
    const salesPath = path.join(process.cwd(), 'reference/Sales report 2024-07-01 to 2025-06-30.csv')
    const planningPath = path.join(process.cwd(), 'reference/Updated_Planning_Q3_2025_with_Realistic_Targets_AF.xlsx')
    
    const salesFile = new File([fs.readFileSync(salesPath)], 'sales.csv', { type: 'text/csv' })
    const planningFile = new File([fs.readFileSync(planningPath)], 'planning.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    console.log(`Sales file size: ${(salesFile.size / 1024 / 1024).toFixed(2)}MB`)
    console.log(`Planning file size: ${(planningFile.size / 1024).toFixed(2)}KB`)
    
    // Create form data
    const formData = new FormData()
    formData.append('salesFile', salesFile)
    formData.append('planningFile', planningFile)
    
    // Test against local server
    console.log('\nTesting against local server...')
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: formData
    })
    
    console.log(`Response status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('\nSuccess! Results:')
      console.log(`- Found ${data.results.summary.totalDormantCustomers} dormant customers`)
      console.log(`- Total value at risk: $${data.results.summary.totalValueAtRisk.toFixed(2)}`)
      console.log(`- Analysis ID: ${data.analysisId}`)
    } else {
      const errorText = await response.text()
      console.error('Error response:', errorText)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testUpload()