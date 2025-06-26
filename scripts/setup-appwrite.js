#!/usr/bin/env node

const { Client, Databases, Permission, Role, ID } = require('appwrite');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    console.log('✅ Loaded environment variables from .env.local');
  } else {
    console.log('⚠️ .env.local file not found. Please create it with your environment variables.');
  }
}

// Load environment variables
loadEnvFile();

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'tavily-chatbot';

if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  console.error('  - APPWRITE_API_KEY');
  console.error('\nPlease set these in your .env.local file');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client();

if (APPWRITE_ENDPOINT) {
  client.setEndpoint(APPWRITE_ENDPOINT);
}

if (APPWRITE_PROJECT_ID) {
  client.setProject(APPWRITE_PROJECT_ID);
}

// For server-side operations, we need to set the API key
if (APPWRITE_API_KEY) {
  try {
    client.setKey(APPWRITE_API_KEY);
  } catch (error) {
    console.log('Note: Using alternative authentication method');
    // Alternative: set headers manually if setKey doesn't exist
    client.headers = {
      ...client.headers,
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-Key': APPWRITE_API_KEY
    };
  }
}

const databases = new Databases(client);

async function createDatabase() {
  try {
    console.log('🔄 Creating database...');
    await databases.create(DATABASE_ID, 'Tavily Chatbot Database');
    console.log('✅ Database created successfully');
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️ Database already exists, continuing...');
    } else {
      console.error('❌ Failed to create database:', error.message);
      process.exit(1);
    }
  }
}

async function createCollection(collectionId, name, attributes, indexes = []) {
  try {
    console.log(`🔄 Creating collection: ${name}...`);
    
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      collectionId,
      name,
      [
        Permission.read(Role.user(ID.unique())),
        Permission.write(Role.user(ID.unique())),
        Permission.create(Role.users()),
        Permission.update(Role.user(ID.unique())),
        Permission.delete(Role.user(ID.unique()))
      ]
    );
    
    // Add attributes
    for (const attr of attributes) {
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.size,
          attr.required || false,
          attr.default,
          attr.array || false
        );
        
        console.log(`  ✓ Added attribute: ${attr.key}`);
        
        // Wait a bit between attribute creation
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ℹ️ Attribute "${attr.key}" already exists`);
        } else {
          console.error(`  ❌ Failed to create attribute "${attr.key}":`, error.message);
        }
      }
    }
    
    // Add indexes
    for (const index of indexes) {
      await databases.createIndex(
        DATABASE_ID,
        collectionId,
        index.key,
        index.type,
        index.attributes,
        index.orders
      );
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Collection "${name}" created successfully`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`ℹ️ Collection "${name}" already exists, skipping...`);
    } else {
      console.error(`❌ Failed to create collection "${name}":`, error.message);
    }
  }
}

async function setupCollections() {
  // Users collection
  await createCollection('users', 'Users', [
    { key: 'email', size: 320, required: true },
    { key: 'name', size: 255, required: true },
    { key: 'preferences', size: 8192, required: false, default: '{}' },
    { key: 'createdAt', size: 50, required: true },
    { key: 'updatedAt', size: 50, required: true }
  ], [
    { key: 'email_index', type: 'unique', attributes: ['email'], orders: ['ASC'] }
  ]);

  // Chatbots collection
  await createCollection('chatbots', 'Chatbots', [
    { key: 'userId', size: 50, required: true },
    { key: 'namespace', size: 255, required: true },
    { key: 'name', size: 255, required: true },
    { key: 'description', size: 1024, required: false },
    { key: 'url', size: 2048, required: false },
    { key: 'favicon', size: 2048, required: false },
    { key: 'status', size: 20, required: true, default: 'active' },
    { key: 'pagesCrawled', size: 10, required: true, default: '0' },
    { key: 'createdAt', size: 50, required: true },
    { key: 'updatedAt', size: 50, required: true }
  ], [
    { key: 'userId_index', type: 'key', attributes: ['userId'], orders: ['ASC'] },
    { key: 'namespace_index', type: 'unique', attributes: ['namespace'], orders: ['ASC'] }
  ]);

  // Conversations collection
  await createCollection('conversations', 'Conversations', [
    { key: 'userId', size: 50, required: true },
    { key: 'chatbotId', size: 50, required: true },
    { key: 'title', size: 255, required: true },
    { key: 'lastMessage', size: 1024, required: false },
    { key: 'messageCount', size: 10, required: true, default: '0' },
    { key: 'createdAt', size: 50, required: true },
    { key: 'updatedAt', size: 50, required: true }
  ], [
    { key: 'userId_index', type: 'key', attributes: ['userId'], orders: ['ASC'] },
    { key: 'chatbotId_index', type: 'key', attributes: ['chatbotId'], orders: ['ASC'] }
  ]);

  // Messages collection
  await createCollection('messages', 'Messages', [
    { key: 'conversationId', size: 50, required: true },
    { key: 'role', size: 20, required: true },
    { key: 'content', size: 65535, required: true },
    { key: 'sources', size: 16384, required: false, default: '[]' },
    { key: 'createdAt', size: 50, required: true }
  ], [
    { key: 'conversationId_index', type: 'key', attributes: ['conversationId'], orders: ['ASC'] },
    { key: 'createdAt_index', type: 'key', attributes: ['createdAt'], orders: ['DESC'] }
  ]);
}

async function main() {
  console.log('🚀 Setting up Tavily Chatbot Appwrite Database...\n');
  
  try {
    await createDatabase();
    await setupCollections();
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up authentication providers in your Appwrite console');
    console.log('2. Configure your environment variables');
    console.log('3. Run your application with: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main(); 