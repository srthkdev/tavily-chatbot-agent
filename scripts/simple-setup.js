#!/usr/bin/env node

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
    return false;
  }
  return true;
}

// Check if required environment variables are present
function checkEnvVars() {
  const required = [
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'TAVILY_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key] || process.env[key].includes('your_'));
  
  if (missing.length > 0) {
    console.log('❌ Missing or incomplete environment variables:');
    missing.forEach(key => console.log(`  - ${key}`));
    console.log('\nPlease update your .env.local file with real API keys');
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🚀 Tavily Chatbot Setup Check\n');
  
  // Load environment variables
  if (!loadEnvFile()) {
    process.exit(1);
  }
  
  // Check environment variables
  if (!checkEnvVars()) {
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env.local file with real API keys');
    console.log('2. Set up your Appwrite project at https://cloud.appwrite.io');
    console.log('3. Create a database manually in the Appwrite console');
    console.log('4. Run: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Environment configuration looks good!');
  console.log('\n📋 Manual Appwrite Setup Instructions:');
  console.log('1. Go to your Appwrite console: https://cloud.appwrite.io');
  console.log('2. Navigate to Databases and create a new database called "tavily-chatbot"');
  console.log('3. Create these collections:');
  console.log('   - users');
  console.log('   - chatbots');
  console.log('   - conversations');
  console.log('   - messages');
  console.log('4. Set permissions to allow users to read/write their own data');
  console.log('5. Run: npm run dev');
  
  console.log('\n✨ Your Tavily Chatbot app will be ready to use!');
}

main().catch(console.error); 