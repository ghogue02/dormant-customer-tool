// Data validation utilities for auditing calculation accuracy

import { EnhancedCustomerData } from './enhanced-analytics'

export interface ValidationResult {
  field: string
  value: any
  expected?: any
  status: 'valid' | 'warning' | 'error'
  message: string
}

export function validateCustomerData(customer: EnhancedCustomerData): ValidationResult[] {
  const results: ValidationResult[] = []
  
  // Validate days since order
  const daysSinceOrder = Math.floor(
    (new Date().getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (Math.abs(daysSinceOrder - customer.daysSinceOrder) > 1) {
    results.push({
      field: 'daysSinceOrder',
      value: customer.daysSinceOrder,
      expected: daysSinceOrder,
      status: 'error',
      message: `Days since order mismatch. Calculated: ${daysSinceOrder}, Stored: ${customer.daysSinceOrder}`
    })
  }
  
  // Validate average order value
  if (customer.orderCount6Months > 0) {
    const calculatedAvg = customer.total6MonthValue / customer.orderCount6Months
    if (Math.abs(calculatedAvg - customer.averageOrderValue) > 0.01) {
      results.push({
        field: 'averageOrderValue',
        value: customer.averageOrderValue,
        expected: calculatedAvg,
        status: 'warning',
        message: `Average order value mismatch. Expected: $${calculatedAvg.toFixed(2)}, Got: $${customer.averageOrderValue.toFixed(2)}`
      })
    }
  }
  
  // Validate churn risk score ranges
  if (customer.churnRiskScore < 0 || customer.churnRiskScore > 1) {
    results.push({
      field: 'churnRiskScore',
      value: customer.churnRiskScore,
      status: 'error',
      message: `Churn risk score out of range (0-1): ${customer.churnRiskScore}`
    })
  }
  
  // Validate win-back probability
  if (customer.winBackProbability.score < 0 || customer.winBackProbability.score > 1) {
    results.push({
      field: 'winBackProbability.score',
      value: customer.winBackProbability.score,
      status: 'error',
      message: `Win-back probability out of range (0-1): ${customer.winBackProbability.score}`
    })
  }
  
  // Validate win-back factors sum to correct score
  const factors = customer.winBackProbability.factors
  const calculatedScore = 
    factors.recency * 0.3 +
    factors.frequency * 0.25 +
    factors.value * 0.25 +
    factors.seasonal * 0.1 +
    factors.diversity * 0.1
  
  if (Math.abs(calculatedScore - customer.winBackProbability.score) > 0.01) {
    results.push({
      field: 'winBackProbability.calculation',
      value: customer.winBackProbability.score,
      expected: calculatedScore,
      status: 'warning',
      message: `Win-back score calculation mismatch. Factors sum: ${calculatedScore.toFixed(3)}, Stored: ${customer.winBackProbability.score.toFixed(3)}`
    })
  }
  
  // Validate order history consistency
  if (customer.daysSinceOrder < 45) {
    results.push({
      field: 'dormantStatus',
      value: customer.daysSinceOrder,
      status: 'error',
      message: `Customer marked as dormant but last order was only ${customer.daysSinceOrder} days ago (threshold: 45 days)`
    })
  }
  
  // Validate average order gap logic
  if (customer.orderHistory.averageOrderGap > 0 && customer.daysSinceOrder > 0) {
    const gapRatio = customer.daysSinceOrder / customer.orderHistory.averageOrderGap
    if (gapRatio < 1) {
      results.push({
        field: 'orderGapLogic',
        value: gapRatio,
        status: 'warning',
        message: `Current gap (${customer.daysSinceOrder} days) is less than average gap (${Math.round(customer.orderHistory.averageOrderGap)} days)`
      })
    }
  }
  
  // Validate lifetime value
  if (customer.orderHistory.totalLifetimeValue < customer.total6MonthValue) {
    results.push({
      field: 'lifetimeValue',
      value: customer.orderHistory.totalLifetimeValue,
      status: 'error',
      message: `Lifetime value ($${customer.orderHistory.totalLifetimeValue}) is less than 6-month value ($${customer.total6MonthValue})`
    })
  }
  
  // If no issues found, add success message
  if (results.length === 0) {
    results.push({
      field: 'overall',
      value: 'valid',
      status: 'valid',
      message: 'All calculations validated successfully'
    })
  }
  
  return results
}

// Validate aggregate statistics
export function validateAggregateData(results: any): ValidationResult[] {
  const validationResults: ValidationResult[] = []
  
  // Validate total value at risk
  const calculatedTotal = results.dormantCustomers.reduce(
    (sum: number, c: EnhancedCustomerData) => sum + c.total6MonthValue, 
    0
  )
  
  if (Math.abs(calculatedTotal - results.summary.totalValueAtRisk) > 0.01) {
    validationResults.push({
      field: 'totalValueAtRisk',
      value: results.summary.totalValueAtRisk,
      expected: calculatedTotal,
      status: 'error',
      message: `Total value mismatch. Sum: $${calculatedTotal.toFixed(2)}, Reported: $${results.summary.totalValueAtRisk.toFixed(2)}`
    })
  }
  
  // Validate customer count
  if (results.dormantCustomers.length !== results.summary.totalDormantCustomers) {
    validationResults.push({
      field: 'totalDormantCustomers',
      value: results.summary.totalDormantCustomers,
      expected: results.dormantCustomers.length,
      status: 'error',
      message: `Customer count mismatch. Array length: ${results.dormantCustomers.length}, Reported: ${results.summary.totalDormantCustomers}`
    })
  }
  
  return validationResults
}

// Export validation report
export function generateValidationReport(results: any): string {
  const customerValidations = results.dormantCustomers
    .slice(0, 5) // Sample first 5 customers
    .map((c: EnhancedCustomerData) => ({
      customer: c.customer,
      validations: validateCustomerData(c)
    }))
  
  const aggregateValidations = validateAggregateData(results)
  
  let report = '# Data Validation Report\n\n'
  report += `Generated: ${new Date().toISOString()}\n\n`
  
  report += '## Aggregate Data Validation\n'
  aggregateValidations.forEach(v => {
    const icon = v.status === 'valid' ? '✅' : v.status === 'warning' ? '⚠️' : '❌'
    report += `${icon} ${v.field}: ${v.message}\n`
  })
  
  report += '\n## Sample Customer Validations\n'
  customerValidations.forEach(({ customer, validations }) => {
    report += `\n### ${customer}\n`
    validations.forEach(v => {
      const icon = v.status === 'valid' ? '✅' : v.status === 'warning' ? '⚠️' : '❌'
      report += `${icon} ${v.field}: ${v.message}\n`
    })
  })
  
  return report
}