import { 
  FileText, 
  Globe, 
  Building, 
  Users, 
  ExternalLink, 
  Linkedin,
  MessageCircle,
  Code,
  Newspaper,
  Video,
  BookOpen,
  Star,
  TrendingUp,
  UserCheck,
  Briefcase,
  Award
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export interface Source {
  id: string
  title: string
  url: string
  snippet: string
  type: 'web' | 'memory' | 'rag' | 'linkedin' | 'company' | 'reddit' | 'twitter' | 'github' | 'news' | 'youtube' | 'blog' | 'review' | 'social' | 'forum' | 'wiki' | 'crunchbase' | 'glassdoor'
  score?: number
  favicon?: string
  image?: string
  metadata?: {
    domain?: string
    publishedDate?: string
    author?: string
    company?: string
    position?: string
    platform?: string
    subreddit?: string
    username?: string
    votes?: number
    comments?: number
    rating?: number
  }
}

interface SourceCitationProps {
  source?: Source
  sources?: Source[]
  index?: number
  showIndex?: boolean
  compact?: boolean
}

function detectSourceType(url: string): Source['type'] {
  const domain = new URL(url).hostname.toLowerCase()
  
  if (domain.includes('linkedin.com')) return 'linkedin'
  if (domain.includes('reddit.com')) return 'reddit'
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter'
  if (domain.includes('github.com')) return 'github'
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'youtube'
  if (domain.includes('crunchbase.com')) return 'crunchbase'
  if (domain.includes('glassdoor.com')) return 'glassdoor'
  if (domain.includes('medium.com') || domain.includes('blog') || domain.includes('substack.com')) return 'blog'
  if (domain.includes('wikipedia.org') || domain.includes('wiki')) return 'wiki'
  if (domain.includes('news') || domain.includes('techcrunch') || domain.includes('forbes') || domain.includes('reuters') || domain.includes('bloomberg')) return 'news'
  if (domain.includes('trustpilot') || domain.includes('review') || domain.includes('yelp')) return 'review'
  if (domain.includes('facebook') || domain.includes('instagram') || domain.includes('tiktok')) return 'social'
  if (domain.includes('forum') || domain.includes('discourse') || domain.includes('stack')) return 'forum'
  
  return 'web'
}

function getSourceIcon(source: Source) {
  const type = source.type || detectSourceType(source.url)
  
  switch (type) {
    case 'linkedin':
      return <Linkedin className="w-4 h-4 text-blue-600" />
    case 'reddit':
      return <MessageCircle className="w-4 h-4 text-orange-500" />
    case 'twitter':
      return <MessageCircle className="w-4 h-4 text-blue-400" />
    case 'github':
      return <Code className="w-4 h-4 text-gray-800 dark:text-gray-200" />
    case 'youtube':
      return <Video className="w-4 h-4 text-red-600" />
    case 'news':
      return <Newspaper className="w-4 h-4 text-blue-700" />
    case 'blog':
      return <BookOpen className="w-4 h-4 text-purple-600" />
    case 'wiki':
      return <BookOpen className="w-4 h-4 text-gray-600" />
    case 'review':
      return <Star className="w-4 h-4 text-yellow-500" />
    case 'crunchbase':
      return <TrendingUp className="w-4 h-4 text-blue-500" />
    case 'glassdoor':
      return <Briefcase className="w-4 h-4 text-green-600" />
    case 'company':
      return <Building className="w-4 h-4 text-primary" />
    case 'rag':
      return <FileText className="w-4 h-4 text-green-600" />
    case 'memory':
      return <Users className="w-4 h-4 text-purple-600" />
    case 'social':
      return <Users className="w-4 h-4 text-pink-500" />
    case 'forum':
      return <MessageCircle className="w-4 h-4 text-indigo-500" />
    default:
      return <Globe className="w-4 h-4 text-muted-foreground" />
  }
}

function getSourceTypeLabel(type: Source['type'], url?: string) {
  const detectedType = type || (url ? detectSourceType(url) : 'web')
  
  switch (detectedType) {
    case 'linkedin':
      return 'LinkedIn'
    case 'reddit':
      return 'Reddit'
    case 'twitter':
      return 'Twitter/X'
    case 'github':
      return 'GitHub'
    case 'youtube':
      return 'YouTube'
    case 'news':
      return 'News'
    case 'blog':
      return 'Blog'
    case 'wiki':
      return 'Wikipedia'
    case 'review':
      return 'Review'
    case 'crunchbase':
      return 'Crunchbase'
    case 'glassdoor':
      return 'Glassdoor'
    case 'company':
      return 'Company'
    case 'rag':
      return 'Document'
    case 'memory':
      return 'Memory'
    case 'social':
      return 'Social'
    case 'forum':
      return 'Forum'
    default:
      return 'Web'
  }
}

function getSourceBadgeColor(type: Source['type'], url?: string) {
  const detectedType = type || (url ? detectSourceType(url) : 'web')
  
  switch (detectedType) {
    case 'linkedin':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'reddit':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'twitter':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'github':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    case 'youtube':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'news':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'crunchbase':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'glassdoor':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'rag':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'memory':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
}

function SingleSourceCitation({ 
  source, 
  index, 
  showIndex = true, 
  compact = false 
}: { 
  source: Source
  index?: number
  showIndex?: boolean
  compact?: boolean
}) {
  const sourceType = source.type || detectSourceType(source.url)
  const domain = new URL(source.url).hostname
  
  // Enhanced title display based on source type
  let displayTitle = source.title
  if (source.metadata?.author && source.metadata?.position) {
    displayTitle = `${source.metadata.author} - ${source.metadata.position}`
  } else if (source.metadata?.author && sourceType === 'reddit') {
    displayTitle = `u/${source.metadata.author} on r/${source.metadata.subreddit || 'reddit'}`
  } else if (source.metadata?.author && sourceType === 'twitter') {
    displayTitle = `@${source.metadata.author} on Twitter`
  } else if (source.metadata?.author) {
    displayTitle = `${source.metadata.author} - ${source.title}`
  }

  return (
    <Card className={`transition-colors hover:bg-accent/50 ${compact ? 'text-xs' : 'text-sm'}`}>
      <CardContent className={compact ? 'p-2' : 'p-3'}>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="flex items-start gap-2">
            {showIndex && index && (
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {index}
              </Badge>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getSourceIcon(source)}
                <Badge 
                  className={`text-xs border-0 ${getSourceBadgeColor(sourceType, source.url)}`}
                >
                  {getSourceTypeLabel(sourceType, source.url)}
                </Badge>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <h4 className={`font-medium line-clamp-2 group-hover:text-primary transition-colors ${compact ? 'text-xs' : 'text-sm'}`}>
                {displayTitle}
              </h4>
              
              {source.snippet && (
                <p className={`text-muted-foreground mt-1 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {source.snippet}
                </p>
              )}
              
              {/* Platform-specific metadata */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {source.metadata?.company && (
                  <div className="flex items-center gap-1">
                    <Building className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {source.metadata.company}
                    </span>
                  </div>
                )}
                
                {source.metadata?.subreddit && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-muted-foreground">
                      r/{source.metadata.subreddit}
                    </span>
                  </div>
                )}
                
                {source.metadata?.votes && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {source.metadata.votes} votes
                    </span>
                  </div>
                )}
                
                {source.metadata?.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">
                      {source.metadata.rating}/5
                    </span>
                  </div>
                )}
                
                {source.metadata?.comments && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {source.metadata.comments} comments
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {domain}
                  </span>
                </div>
                
                {source.metadata?.publishedDate && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(source.metadata.publishedDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </a>
      </CardContent>
    </Card>
  )
}

export function SourceCitation({ 
  source, 
  sources, 
  index, 
  showIndex = true, 
  compact = false 
}: SourceCitationProps) {
  // Handle single source
  if (source) {
    return (
      <SingleSourceCitation 
        source={source} 
        index={index} 
        showIndex={showIndex}
        compact={compact}
      />
    )
  }

  // Handle multiple sources (legacy support)
  if (sources && sources.length > 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Sources</h3>
        </div>
        <div className="grid gap-2">
          {sources.map((src, idx) => (
            <SingleSourceCitation
              key={src.id}
              source={src}
              index={idx + 1}
              showIndex={showIndex}
              compact={compact}
            />
          ))}
        </div>
      </div>
    )
  }

  return null
} 