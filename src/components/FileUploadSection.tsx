'use client'

import { useState, useRef } from 'react'
import type { ProcessingResult } from '@/types'

interface FileUploadSectionProps {
  onFilesUploaded: (result: ProcessingResult) => void
}

export function FileUploadSection({ onFilesUploaded }: FileUploadSectionProps) {
  const [salesFile, setSalesFile] = useState<File | null>(null)
  const [planningFile, setPlanningFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState<'sales' | 'planning' | null>(null)
  
  const salesInputRef = useRef<HTMLInputElement>(null)
  const planningInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (type: 'sales' | 'planning', file: File | null) => {
    if (type === 'sales') {
      setSalesFile(file)
    } else {
      setPlanningFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent, type: 'sales' | 'planning') => {
    e.preventDefault()
    setDragOver(null)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      
      // Validate file type
      if (type === 'sales' && !file.name.endsWith('.csv')) {
        alert('Sales file must be a CSV file')
        return
      }
      
      if (type === 'planning' && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Planning file must be an Excel file')
        return
      }
      
      handleFileChange(type, file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!salesFile || !planningFile) {
      alert('Please select both files')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('sales_file', salesFile)
      formData.append('planning_file', planningFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      onFilesUploaded(result)
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Your Files
        </h2>
        <p className="text-gray-600">
          Upload your sales report and planning file to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sales File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Sales Report (CSV)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver === 'sales'
                  ? 'border-blue-400 bg-blue-50'
                  : salesFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={(e) => handleDrop(e, 'sales')}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver('sales')
              }}
              onDragLeave={() => setDragOver(null)}
              onClick={() => salesInputRef.current?.click()}
            >
              <input
                ref={salesInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleFileChange('sales', e.target.files?.[0] || null)}
                className="hidden"
              />
              
              {salesFile ? (
                <div className="space-y-2">
                  <svg className="w-8 h-8 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-700">{salesFile.name}</p>
                  <p className="text-xs text-green-600">Ready to upload</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Drop CSV file here or <span className="text-blue-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-500">Sales transaction data</p>
                </div>
              )}
            </div>
          </div>

          {/* Planning File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Planning Sheet (Excel)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver === 'planning'
                  ? 'border-blue-400 bg-blue-50'
                  : planningFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={(e) => handleDrop(e, 'planning')}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver('planning')
              }}
              onDragLeave={() => setDragOver(null)}
              onClick={() => planningInputRef.current?.click()}
            >
              <input
                ref={planningInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileChange('planning', e.target.files?.[0] || null)}
                className="hidden"
              />
              
              {planningFile ? (
                <div className="space-y-2">
                  <svg className="w-8 h-8 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-700">{planningFile.name}</p>
                  <p className="text-xs text-green-600">Ready to upload</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Drop Excel file here or <span className="text-blue-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-500">Customer-rep assignments</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={!salesFile || !planningFile || isUploading}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              !salesFile || !planningFile || isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing Files...</span>
              </div>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">File Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Sales Report: CSV format with transaction history</li>
                <li>Planning Sheet: Excel file with customer-to-salesperson mappings</li>
                <li>All data is processed securely and never stored permanently</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}