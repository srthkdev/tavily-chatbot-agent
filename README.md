# Tavily Chatbot

A modern AI chatbot platform that leverages **Tavily Search API** for real-time web content retrieval, integrated with **Appwrite** for backend services, **Mem0** for memory management, and supporting multiple AI providers including **Gemini**, **Grok**, **OpenAI**, and **Anthropic**.

## 🚀 Features

- **Real-time Web Search**: Powered by Tavily Search API optimized for AI agents
- **Multiple AI Providers**: OpenAI GPT-4o, Anthropic Claude 3.5, Google Gemini 2.0, and Grok
- **Persistent Memory**: Mem0 integration for personalized conversation memory
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Backend Services**: Appwrite for authentication, database, and real-time features
- **Streaming Responses**: Real-time AI responses with source attribution
- **Rate Limiting**: Built-in protection against API abuse

## 🛠️ Tech Stack

### Core Technologies
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui components  
- **Package Manager**: Bun
- **Deployment**: Vercel

### AI & Search
- **Search Engine**: [Tavily Search API](https://docs.tavily.com/)
- **Memory Management**: [Mem0](https://github.com/mem0ai/mem0)
- **AI SDK**: Vercel AI SDK for streaming responses
- **LLM Providers**:
  - Google Gemini (via @ai-sdk/google)
  - Grok (via @ai-sdk/openai-compatible)
  - OpenAI GPT-4o
  - Anthropic Claude 3.5 Sonnet

### Backend Services
- **Authentication**: Appwrite user management
- **Database**: Appwrite document storage
- **Storage**: Appwrite file handling
- **Functions**: Appwrite server-side logic
- **Rate Limiting**: Upstash Redis

## 📋 Prerequisites

- **Node.js** 18+ or **Bun**
- **Tavily API Key** - Get from [Tavily](https://tavily.com)
- **AI Provider API Keys** - OpenAI, Anthropic, Google, and/or Grok
- **Appwrite Instance** - [Appwrite Cloud](https://cloud.appwrite.io) or self-hosted
- **Mem0 API Key** - Get from [Mem0](https://mem0.ai)
- **Upstash Redis** (optional) - For rate limiting

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tavily-chatbot-app
```

### 2. Install Dependencies

```bash
bun install
# or
npm install
```

### 3. Environment Setup

Copy the environment template:

```bash
cp .env.example .env.local
```

Configure your environment variables:

```env
# Tavily Search API
TAVILY_API_KEY=your_tavily_api_key

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key

# Mem0 Configuration
MEM0_API_KEY=your_mem0_api_key

# AI Providers (at least one required)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_gemini_key
GROK_API_KEY=your_grok_key

# Optional: Rate Limiting
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 4. Appwrite Setup

1. Create a new project in [Appwrite Cloud](https://cloud.appwrite.io)
2. Note your Project ID and Endpoint
3. Create a database with these collections:
   - `users` - User profiles
   - `chatbots` - Chatbot configurations  
   - `conversations` - Chat history
4. Configure authentication providers as needed

### 5. Run Development Server

```bash
bun dev
# or
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Project Structure

```
tavily-chatbot-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # Chat endpoints
│   │   │   └── tavily/        # Tavily integration
│   │   ├── chat/              # Chat interface
│   │   ├── dashboard/         # Management dashboard
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn/ui components
│   │   ├── chat/             # Chat-specific components
│   │   └── dashboard/        # Dashboard components
│   ├── lib/                  # Utility libraries
│   │   ├── appwrite.ts       # Appwrite client
│   │   ├── tavily.ts         # Tavily integration
│   │   ├── mem0.ts           # Mem0 memory management
│   │   └── utils.ts          # Helper functions
│   ├── config/               # Configuration files
│   │   └── tavily.config.ts  # Main configuration
│   └── types/                # TypeScript type definitions
│       └── index.ts          # Shared interfaces
├── public/                   # Static assets
├── .env.example             # Environment template
├── package.json             # Dependencies
└── README.md               # This file
```

## 🔧 Configuration

The main configuration is in `src/config/tavily.config.ts`:

```typescript
export const config = {
  app: {
    name: "Tavily Chatbot",
    description: "AI-powered search and conversation"
  },
  ai: {
    providers: {
      openai: { model: "gpt-4o", enabled: true },
      anthropic: { model: "claude-3-5-sonnet-20241022", enabled: true },
      gemini: { model: "gemini-2.0-flash-exp", enabled: true },
      grok: { model: "grok-beta", enabled: true }
    },
    temperature: 0.7,
    maxTokens: 2000
  },
  tavily: {
    maxResults: 5,
    searchDepth: "advanced",
    includeImages: false,
    includeRawContent: true
  },
  mem0: {
    enableUserMemory: true,
    memoryRetentionDays: 30,
    maxMemoriesPerUser: 1000
  }
}
```

## 📚 API Reference

### Chat Endpoint

**POST** `/api/chat`

Stream AI responses with web search integration.

```typescript
// Request
{
  "messages": [
    { "role": "user", "content": "What's happening in AI today?" }
  ],
  "query": "What's happening in AI today?",
  "chatbotId": "optional-chatbot-id"
}

// Response (Server-Sent Events)
data: {"type": "sources", "sources": [...]}
data: {"type": "content", "content": "Based on recent news..."}
data: [DONE]
```

### Tavily Search

**POST** `/api/tavily/search`

Direct access to Tavily search results.

```typescript
// Request
{
  "query": "latest AI developments",
  "maxResults": 5
}

// Response
{
  "results": [...],
  "query": "latest AI developments",
  "searchTime": 1.23
}
```

### Create Chatbot

**POST** `/api/tavily/create-bot`

Create a new specialized chatbot from a URL.

```typescript
// Request
{
  "url": "https://example.com",
  "name": "Example Assistant",
  "description": "Helps with example.com content"
}

// Response
{
  "success": true,
  "chatbot": { ... }
}
```

## 🚢 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy automatically on git push

### Manual Deployment

```bash
# Build the application
bun run build

# Start production server
bun start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Tavily API Documentation](https://docs.tavily.com/)
- [Appwrite Documentation](https://appwrite.io/docs)
- [Mem0 Documentation](https://docs.mem0.ai/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## 🐛 Issues & Support

- Report bugs via [GitHub Issues](<repository-url>/issues)
- Join our [Discord Community](<discord-link>) for support
- Check the [FAQ](<faq-link>) for common questions

## 🌟 Acknowledgments

- [Tavily](https://tavily.com) for the powerful search API
- [Mem0](https://mem0.ai) for memory management
- [Appwrite](https://appwrite.io) for backend services
- [Vercel](https://vercel.com) for the AI SDK and hosting
- [Shadcn/ui](https://ui.shadcn.com) for the component library

---

**Built with ❤️ using Tavily, Mem0, Appwrite, and Next.js**
