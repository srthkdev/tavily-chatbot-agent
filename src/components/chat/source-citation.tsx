import { FileText, Globe } from 'lucide-react'
import Image from 'next/image'

export interface Source {
  url: string
  title: string
  snippet?: string
  favicon?: string
  image?: string
  score?: number
  id: string
  index: number
}

interface SourceCitationProps {
  sources: Source[]
}

export function SourceCitation({ sources }: SourceCitationProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">Sources</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sources.map((source, index) => (
          <a
            key={source.id || index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-2 border bg-card rounded-lg hover:bg-accent hover:border-accent-foreground/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {source.favicon ? (
                  <Image
                    src={source.favicon}
                    alt={`${source.title} favicon`}
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                ) : (
                  <Globe className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm truncate font-medium text-foreground group-hover:text-accent-foreground">
                {source.title}
              </p>
            </div>
            {source.snippet && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {source.snippet}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
} 