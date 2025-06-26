# Database Setup Guide

This guide will help you set up the Appwrite database collections for the Tavily Chatbot app.

## Prerequisites

1. **Appwrite Project**: You must have an Appwrite project created
2. **Environment Variables**: Set up the required environment variables
3. **Server API Key**: You need a Server API key from Appwrite

## Step 1: Environment Variables

Make sure you have the following environment variables in your `.env.local` file:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-endpoint
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_DATABASE_ID=tavily-chatbot
APPWRITE_API_KEY=your-server-api-key

# Other required variables
TAVILY_API_KEY=your-tavily-api-key
# ... other API keys
```

## Step 2: Get Server API Key

1. Go to your Appwrite Console
2. Navigate to **Overview > Integrations > API Keys**
3. Click **Create API Key**
4. Set the following:
   - **Name**: `Tavily Chatbot Server`
   - **Expiration**: Never (or set a long expiration)
   - **Scopes**: Select all Database scopes:
     - `databases.read`
     - `databases.write`
     - `collections.read`
     - `collections.write`
     - `attributes.read`
     - `attributes.write`
     - `indexes.read`
     - `indexes.write`
     - `documents.read`
     - `documents.write`
5. Copy the generated API key and add it to your `.env.local` as `APPWRITE_API_KEY`

## Step 3: Run Database Setup

Once you have the API key configured, run the setup script:

```bash
cd tavily-chatbot-app
npm run setup:db
```

This script will:
- Create the database (if it doesn't exist)
- Create all required collections with proper attributes
- Set up indexes for optimal performance
- Configure permissions

## Expected Output

You should see output like this:

```
🚀 Setting up Appwrite database...
✅ Database 'tavily-chatbot' already exists (or created)
📝 Creating users collection...
✅ Users collection created successfully
📝 Creating chatbots collection...
✅ Chatbots collection created successfully
📝 Creating conversations collection...
✅ Conversations collection created successfully
📝 Creating messages collection...
✅ Messages collection created successfully
🎉 Database setup completed successfully!
📊 Collections created:
  - users
  - chatbots
  - conversations
  - messages
```

## Database Schema

### Collections Created:

#### 1. `users`
- Stores user account information
- **Attributes**: email, name, preferences, createdAt, updatedAt
- **Indexes**: Unique email index

#### 2. `chatbots`  
- Stores chatbot configurations
- **Attributes**: userId, namespace, name, description, url, favicon, status, pagesCrawled, createdAt, updatedAt
- **Indexes**: userId (key), namespace (unique)

#### 3. `conversations`
- Stores chat conversation metadata
- **Attributes**: userId, chatbotId, title, lastMessage, messageCount, createdAt, updatedAt
- **Indexes**: userId (key), chatbotId (key)

#### 4. `messages`
- Stores individual chat messages
- **Attributes**: conversationId, role, content, sources, createdAt
- **Indexes**: conversationId (key), createdAt (key, DESC)

## Troubleshooting

### Error: "Collection with the requested ID could not be found"
- This means the database collections haven't been created yet
- Run `npm run setup:db` to create them

### Error: "401 Unauthorized"
- Check that your `APPWRITE_API_KEY` is correct
- Ensure the API key has all necessary database permissions
- Verify your project ID and endpoint are correct

### Error: "409 Conflict"
- This is normal - it means collections already exist
- The script will skip existing collections and continue

### Error: "404 Not Found"
- Check your Appwrite endpoint and project ID
- Ensure your Appwrite project exists and is accessible

## Verification

After running the setup script, you can verify the collections were created by:

1. Going to your Appwrite Console
2. Navigate to **Databases**
3. Click on your database (default: `tavily-chatbot`)
4. You should see all 4 collections listed

## Next Steps

Once the database is set up:

1. Start your development server: `npm run dev`
2. Try registering a new user account
3. Create a chatbot to test the full flow
4. Check your Appwrite console to see data being stored

The app should now work with full authentication and database storage! 