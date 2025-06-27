'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          p: ({ node: _, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
          ol: ({ node: _, ...props }) => <ol {...props} className="list-decimal list-inside" />,
          ul: ({ node: _, ...props }) => <ul {...props} className="list-disc list-inside" />,
          li: ({ node: _, ...props }) => <li {...props} className="pb-1" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
} 