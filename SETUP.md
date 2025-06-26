# Tavily Chatbot Setup Guide

## Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Tavily API Key (required for search functionality)
TAVILY_API_KEY=your_tavily_api_key_here

# Appwrite Configuration (required for database)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id_here
APPWRITE_API_KEY=your_appwrite_api_key_here
APPWRITE_DATABASE_ID=tavily-chatbot

# Mem0 Configuration (optional - for memory management)
MEM0_API_KEY=your_mem0_api_key_here

# AI Providers (at least one required)
OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# GOOGLE_API_KEY=your_google_api_key_here
# GROQ_API_KEY=your_groq_api_key_here

# Optional: Rate Limiting and Storage (Redis)
# IMPORTANT: Use the HTTPS REST URL, NOT the CLI command!
# Format: https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here

# Optional: Vector Search
UPSTASH_SEARCH_REST_URL=https://your-search-endpoint.upstash.io
UPSTASH_SEARCH_REST_TOKEN=your_upstash_search_token_here

# Application Settings
NEXT_PUBLIC_URL=http://localhost:3000
DISABLE_CHATBOT_CREATION=false
```

## Redis URL Fix

The error you're encountering is because the Redis URL is incorrectly formatted. You have:
```
redis-cli --tls -u redis://default:Ac8zAAIjcDE0YzhkYjU0MjY5MDQ0ZWFiYWFlM2U5MWEyZjRhYjRmZXAxMA@settled-robin-53043.upstash.io:6379
```

But you need the **HTTPS REST API URL**, which should look like:
```
https://settled-robin-53043.upstash.io
```

## Appwrite Database Structure

The application requires the following database structure in Appwrite:

### Database: `tavily-chatbot`

#### Collection 1: `users`
**Collection ID**: `users`

**Attributes**:
- `email` (String, 320 chars, Required, Unique)
- `name` (String, 255 chars, Required)
- `preferences` (String, 8192 chars, Optional, Default: '{}')
- `createdAt` (String, 50 chars, Required)
- `updatedAt` (String, 50 chars, Required)

**Indexes**:
- `email_index` (Unique, ASC on email)

**Permissions**:
- Read: Users
- Write: Users
- Create: Users
- Update: Users
- Delete: Users

#### Collection 2: `chatbots`
**Collection ID**: `chatbots`

**Attributes**:
- `userId` (String, 50 chars, Required)
- `namespace` (String, 255 chars, Required, Unique)
- `name` (String, 255 chars, Required)
- `description` (String, 1024 chars, Optional)
- `url` (String, 2048 chars, Optional)
- `favicon` (String, 2048 chars, Optional)
- `status` (String, 20 chars, Required, Default: 'active')
- `pagesCrawled` (String, 10 chars, Required, Default: '0')
- `createdAt` (String, 50 chars, Required)
- `updatedAt` (String, 50 chars, Required)

**Indexes**:
- `userId_index` (Key, ASC on userId)
- `namespace_index` (Unique, ASC on namespace)

**Permissions**: Same as users

#### Collection 3: `conversations`
**Collection ID**: `conversations`

**Attributes**:
- `userId` (String, 50 chars, Required)
- `chatbotId` (String, 50 chars, Required)
- `title` (String, 255 chars, Required)
- `lastMessage` (String, 1024 chars, Optional)
- `messageCount` (String, 10 chars, Required, Default: '0')
- `createdAt` (String, 50 chars, Required)
- `updatedAt` (String, 50 chars, Required)

**Indexes**:
- `userId_index` (Key, ASC on userId)
- `chatbotId_index` (Key, ASC on chatbotId)

**Permissions**: Same as users

#### Collection 4: `messages`
**Collection ID**: `messages`

**Attributes**:
- `conversationId` (String, 50 chars, Required)
- `role` (String, 20 chars, Required)
- `content` (String, 65535 chars, Required)
- `sources` (String, 16384 chars, Optional, Default: '[]')
- `createdAt` (String, 50 chars, Required)

**Indexes**:
- `conversationId_index` (Key, ASC on conversationId)
- `createdAt_index` (Key, DESC on createdAt)

**Permissions**: Same as users

## Setup Steps

1. **Create environment file**:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your actual values.

2. **Set up Appwrite**:
   - Create a new project at https://cloud.appwrite.io
   - Generate an API key with database permissions
   - Update your `.env.local` with the project details

3. **Run database setup**:
   ```bash
   npm run setup:appwrite
   ```

4. **Start the application**:
   ```bash
   npm run dev
   ```

## Common Issues

### Redis Error Fix
If you see: "Upstash Redis client was passed an invalid URL"
- Make sure you're using the HTTPS REST URL, not the CLI command
- The URL should start with `https://`

### JSON Parse Error Fix
If you see: "Unexpected token '<', '<!DOCTYPE'..."
- This usually means the API endpoint is returning HTML instead of JSON
- Check your Appwrite endpoint URL is correct
- Ensure your API key has proper permissions

### Missing Environment Variables
- At minimum, you need: `TAVILY_API_KEY`, Appwrite config, and one AI provider key
- Redis is optional but recommended for production 