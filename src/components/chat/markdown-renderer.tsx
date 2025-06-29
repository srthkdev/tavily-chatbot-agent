'use client'

import React from 'react'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    let html = text
    
    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-800 mb-2 mt-4">$1</h3>')
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-gray-900 mb-3 mt-6">$1</h2>')
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-6">$1</h1>')
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    
    // Lists
    html = html.replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
    html = html.replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 mb-1">$1. $2</li>')
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
    
    // Code blocks (basic)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p class="mb-3">')
    html = html.replace(/\n/g, '<br>')
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p class="mb-3">' + html + '</p>'
    }
    
    return html
  }

  const renderTable = (content: string) => {
    const lines = content.split('\n')
    const tableLines: string[] = []
    const otherLines: string[] = []
    let inTable = false
    
    for (const line of lines) {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) {
          inTable = true
        }
        tableLines.push(line)
      } else if (inTable && line.trim() === '') {
        // Empty line after table - end table
        inTable = false
        otherLines.push(renderTableHTML(tableLines))
        tableLines.length = 0
        otherLines.push(line)
      } else if (inTable && !line.trim().startsWith('|')) {
        // Non-table line after starting table - end table
        inTable = false
        otherLines.push(renderTableHTML(tableLines))
        tableLines.length = 0
        otherLines.push(line)
      } else {
        if (inTable) {
          // Continue table
          tableLines.push(line)
        } else {
          otherLines.push(line)
        }
      }
    }
    
    // Handle table at end of content
    if (tableLines.length > 0) {
      otherLines.push(renderTableHTML(tableLines))
    }
    
    return otherLines.join('\n')
  }

  const renderTableHTML = (tableLines: string[]) => {
    if (tableLines.length < 2) return tableLines.join('\n')
    
    const header = tableLines[0]
    // const _separator = tableLines[1] // Table separator line (not used in rendering but needed for structure)
    const rows = tableLines.slice(2)
    
    // Parse header
    const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    
    // Parse rows
    const dataRows = rows.map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    )
    
    // Note: separator is used for table structure validation but not directly used in rendering
    
    let tableHTML = '<div class="overflow-x-auto my-4">'
    tableHTML += '<table class="min-w-full border-collapse border border-gray-300 bg-white rounded-lg shadow-sm">'
    
    // Header
    tableHTML += '<thead class="bg-gray-50">'
    tableHTML += '<tr>'
    headerCells.forEach(cell => {
      tableHTML += `<th class="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">${cell}</th>`
    })
    tableHTML += '</tr>'
    tableHTML += '</thead>'
    
    // Body
    tableHTML += '<tbody>'
    dataRows.forEach((row, index) => {
      tableHTML += `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`
      row.forEach(cell => {
        tableHTML += `<td class="border border-gray-300 px-4 py-2 text-gray-700">${cell}</td>`
      })
      tableHTML += '</tr>'
    })
    tableHTML += '</tbody>'
    
    tableHTML += '</table>'
    tableHTML += '</div>'
    
    return tableHTML
  }

  const processContent = (content: string) => {
    // First handle tables
    const withTables = renderTable(content)
    
    // Then handle other markdown
    const withMarkdown = parseMarkdown(withTables)
    
    return withMarkdown
  }

  return (
    <div 
      className="prose prose-sm max-w-none text-gray-900"
      dangerouslySetInnerHTML={{ 
        __html: processContent(content)
      }}
    />
  )
} 