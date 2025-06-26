const { Client, Databases, Permission, Role, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

// Initialize Appwrite client
const client = new Client();
const databases = new Databases(client);

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // Server API key needed for database operations

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'tavily-chatbot';

async function setupDatabase() {
  try {
    console.log('🚀 Setting up Appwrite database...');
    
    // Try to get the database first, create if it doesn't exist
    try {
      await databases.get(DATABASE_ID);
      console.log(`✅ Database '${DATABASE_ID}' already exists`);
    } catch (error) {
      if (error.code === 404) {
        console.log(`📦 Creating database '${DATABASE_ID}'...`);
        await databases.create(DATABASE_ID, 'Tavily Chatbot Database');
        console.log(`✅ Database '${DATABASE_ID}' created successfully`);
      } else {
        throw error;
      }
    }

    // Define permissions for all collections
    const permissions = [
      Permission.read(Role.users()),
      Permission.write(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ];

    // Collection 1: users
    console.log('📝 Creating users collection...');
    try {
      await databases.createCollection(DATABASE_ID, 'users', 'Users', permissions);
      
      // Create attributes
      await databases.createStringAttribute(DATABASE_ID, 'users', 'email', 320, true);
      await databases.createStringAttribute(DATABASE_ID, 'users', 'name', 255, true);
      await databases.createStringAttribute(DATABASE_ID, 'users', 'preferences', 8192, false, '{}');
      await databases.createStringAttribute(DATABASE_ID, 'users', 'createdAt', 50, true);
      await databases.createStringAttribute(DATABASE_ID, 'users', 'updatedAt', 50, true);
      
      // Wait a moment for attributes to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create indexes
      await databases.createIndex(DATABASE_ID, 'users', 'email_index', 'unique', ['email']);
      
      console.log('✅ Users collection created successfully');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️ Users collection already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Collection 2: chatbots
    console.log('📝 Creating chatbots collection...');
    try {
      await databases.createCollection(DATABASE_ID, 'chatbots', 'Chatbots', permissions);
      
      // Create attributes
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'userId', 50, true);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'namespace', 255, true);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'name', 255, true);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'description', 1024, false);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'url', 2048, false);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'favicon', 2048, false);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'status', 20, true);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'pagesCrawled', 10, true);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'createdAt', 50, true);
      await databases.createStringAttribute(DATABASE_ID, 'chatbots', 'updatedAt', 50, true);
      
      // Wait a moment for attributes to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create indexes
      await databases.createIndex(DATABASE_ID, 'chatbots', 'userId_index', 'key', ['userId']);
      await databases.createIndex(DATABASE_ID, 'chatbots', 'namespace_index', 'unique', ['namespace']);
      
      console.log('✅ Chatbots collection created successfully');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️ Chatbots collection already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Collection 3: conversations
    console.log('📝 Creating conversations collection...');
    try {
      await databases.createCollection(DATABASE_ID, 'conversations', 'Conversations', permissions);
      
      // Create attributes
      await databases.createStringAttribute(DATABASE_ID, 'conversations', 'userId', 50, true);
      await databases.createStringAttribute(DATABASE_ID, 'conversations', 'chatbotId', 50, true);
      await databases.createStringAttribute(DATABASE_ID, 'conversations', 'title', 255, true);
      await databases.createStringAttribute(DATABASE_ID, 'conversations', 'lastMessage', 1024, false);
      await databases.createStringAttribute(DATABASE_ID, 'conversations', 'messageCount', 10, true);
      await databases.createStringAttribute(DATABASE_ID, 'conversations', 'createdAt', 50, true);
      await databases.createStringAttribute(DATABASE_ID, 'conversations', 'updatedAt', 50, true);
      
      // Wait a moment for attributes to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create indexes
      await databases.createIndex(DATABASE_ID, 'conversations', 'userId_index', 'key', ['userId']);
      await databases.createIndex(DATABASE_ID, 'conversations', 'chatbotId_index', 'key', ['chatbotId']);
      
      console.log('✅ Conversations collection created successfully');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️ Conversations collection already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Collection 4: messages
    console.log('📝 Creating messages collection...');
    try {
      await databases.createCollection(DATABASE_ID, 'messages', 'Messages', permissions);
      
      // Create attributes
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'conversationId', 50, true);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'role', 20, true);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'content', 65535, true);
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'sources', 16384, false, '[]');
      await databases.createStringAttribute(DATABASE_ID, 'messages', 'createdAt', 50, true);
      
      // Wait a moment for attributes to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create indexes
      await databases.createIndex(DATABASE_ID, 'messages', 'conversationId_index', 'key', ['conversationId']);
      await databases.createIndex(DATABASE_ID, 'messages', 'createdAt_index', 'key', ['createdAt']);
      
      console.log('✅ Messages collection created successfully');
    } catch (error) {
      if (error.code === 409) {
        console.log('⚠️ Messages collection already exists, skipping...');
      } else {
        throw error;
      }
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('📊 Collections created:');
    console.log('  - users');
    console.log('  - chatbots'); 
    console.log('  - conversations');
    console.log('  - messages');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    
    if (error.code === 401) {
      console.error('💡 Make sure you have set the APPWRITE_API_KEY environment variable with a valid Server API key');
    } else if (error.code === 404) {
      console.error('💡 Make sure your Appwrite project ID and endpoint are correct');
    }
    
    process.exit(1);
  }
}

// Run the setup
setupDatabase(); 