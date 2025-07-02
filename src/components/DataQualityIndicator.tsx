interface DataQualityIndicatorProps {
  accuracy: number
  customerCount: number
  valueAtRisk: number
}

export function DataQualityIndicator({ accuracy, customerCount, valueAtRisk }: DataQualityIndicatorProps) {
  const getAccuracyColor = () => {
    if (accuracy >= 0.9) return 'text-green-600'
    if (accuracy >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAccuracyBgColor = () => {
    if (accuracy >= 0.9) return 'bg-green-100 border-green-200'
    if (accuracy >= 0.7) return 'bg-yellow-100 border-yellow-200'
    return 'bg-red-100 border-red-200'
  }

  const getAccuracyIcon = () => {
    if (accuracy >= 0.9) {
      return (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (accuracy >= 0.7) {
      return (
        <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const getAccuracyMessage = () => {
    if (accuracy >= 0.9) return 'Excellent data quality'
    if (accuracy >= 0.7) return 'Good data quality'
    return 'Data quality needs attention'
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Processing Summary
      </h3>
      
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Data Quality Score */}
        <div className={`p-4 rounded-lg border ${getAccuracyBgColor()}`}>
          <div className="flex items-center space-x-3 mb-2">
            {getAccuracyIcon()}
            <div>
              <p className="text-sm font-medium text-gray-700">Data Quality</p>
              <p className={`text-xl font-bold ${getAccuracyColor()}`}>
                {(accuracy * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className={`text-sm ${getAccuracyColor()}`}>
            {getAccuracyMessage()}
          </p>
        </div>

        {/* Dormant Customers */}
        <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700">Dormant Customers</p>
              <p className="text-xl font-bold text-blue-600">
                {customerCount.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-sm text-blue-600">
            Require immediate attention
          </p>
        </div>

        {/* Value at Risk */}
        <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
          <div className="flex items-center space-x-3 mb-2">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700">Value at Risk</p>
              <p className="text-xl font-bold text-orange-600">
                ${valueAtRisk.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-sm text-orange-600">
            Potential revenue loss
          </p>
        </div>
      </div>

      {/* Quality Details */}
      {accuracy < 0.9 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Quality Notes:</strong> {accuracy < 0.7 ? 
              'Some data issues were detected. Review the detailed report for more information.' :
              'Minor data quality issues detected. The analysis remains reliable.'
            }
          </p>
        </div>
      )}
    </div>
  )
}