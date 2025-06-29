const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

async function updateCollections() {
    try {
        console.log('🚀 Starting Enhanced AI Platform collections update...');

        // 1. Users Collection (Enhanced)
        try {
            await databases.createCollection(
                DATABASE_ID,
                'users',
                'Users',
                [
                    Permission.create(Role.any()),
                    Permission.read(Role.any()),
                    Permission.update(Role.any()),
                    Permission.delete(Role.any())
                ]
            );
            console.log('✅ Users collection created');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️ Users collection already exists, updating...');
            } else {
                throw error;
            }
        }

        // Users attributes
        const userAttributes = [
            { key: 'accountId', type: 'string', size: 255, required: true },
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'email', type: 'string', size: 320, required: true },
            { key: 'avatar', type: 'string', size: 500, required: false },
            { key: 'plan', type: 'string', size: 50, required: false, default: 'free' },
            { key: 'preferences', type: 'string', size: 2000, required: false },
            { key: 'lastActive', type: 'datetime', required: false },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'updatedAt', type: 'datetime', required: false }
        ];

        for (const attr of userAttributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        'users',
                        attr.key,
                        attr.size,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        'users',
                        attr.key,
                        attr.required,
                        attr.default
                    );
                }
                console.log(`✅ User attribute ${attr.key} created`);
            } catch (error) {
                if (error.code !== 409) {
                    console.log(`⚠️ User attribute ${attr.key}: ${error.message}`);
                }
            }
        }

        // 2. Chatbots Collection (Enhanced for AI Platform)
        try {
            await databases.createCollection(
                DATABASE_ID,
                'chatbots',
                'Chatbots',
                [
                    Permission.create(Role.any()),
                    Permission.read(Role.any()),
                    Permission.update(Role.any()),
                    Permission.delete(Role.any())
                ]
            );
            console.log('✅ Chatbots collection created');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️ Chatbots collection already exists, updating...');
            } else {
                throw error;
            }
        }

        // Chatbots attributes (enhanced)
        const chatbotAttributes = [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'description', type: 'string', size: 1000, required: false },
            { key: 'type', type: 'string', size: 50, required: false, default: 'company_research' },
            { key: 'url', type: 'string', size: 500, required: false },
            { key: 'namespace', type: 'string', size: 255, required: true },
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'status', type: 'string', size: 50, required: false, default: 'active' },
            { key: 'published', type: 'boolean', required: false, default: false },
            { key: 'publicUrl', type: 'string', size: 500, required: false },
            { key: 'favicon', type: 'string', size: 500, required: false },
            { key: 'pagesCrawled', type: 'string', size: 20, required: false, default: '0' },
            { key: 'documentsStored', type: 'integer', required: false, default: 0 },
            { key: 'companyData', type: 'string', size: 15000, required: false },
            { key: 'settings', type: 'string', size: 3000, required: false },
            { key: 'capabilities', type: 'string', size: 1000, required: false },
            { key: 'lastCrawled', type: 'datetime', required: false },
            { key: 'crawlSettings', type: 'string', size: 2000, required: false },
            { key: 'aiModel', type: 'string', size: 50, required: false, default: 'gpt-4' },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'updatedAt', type: 'datetime', required: false }
        ];

        for (const attr of chatbotAttributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        'chatbots',
                        attr.key,
                        attr.size,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(
                        DATABASE_ID,
                        'chatbots',
                        attr.key,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        DATABASE_ID,
                        'chatbots',
                        attr.key,
                        attr.required,
                        null,
                        null,
                        attr.default
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        'chatbots',
                        attr.key,
                        attr.required,
                        attr.default
                    );
                }
                console.log(`✅ Chatbot attribute ${attr.key} created`);
            } catch (error) {
                if (error.code !== 409) {
                    console.log(`⚠️ Chatbot attribute ${attr.key}: ${error.message}`);
                }
            }
        }

        // 3. Chat Messages Collection (NEW)
        try {
            await databases.createCollection(
                DATABASE_ID,
                'messages',
                'Chat Messages',
                [
                    Permission.create(Role.any()),
                    Permission.read(Role.any()),
                    Permission.update(Role.any()),
                    Permission.delete(Role.any())
                ]
            );
            console.log('✅ Messages collection created');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️ Messages collection already exists, updating...');
            } else {
                throw error;
            }
        }

        // Messages attributes
        const messageAttributes = [
            { key: 'chatbotId', type: 'string', size: 255, required: true },
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'messageId', type: 'string', size: 255, required: true },
            { key: 'role', type: 'string', size: 20, required: true },
            { key: 'content', type: 'string', size: 10000, required: true },
            { key: 'sources', type: 'string', size: 5000, required: false },
            { key: 'capabilities', type: 'string', size: 1000, required: false },
            { key: 'timestamp', type: 'datetime', required: true },
            { key: 'createdAt', type: 'datetime', required: true }
        ];

        for (const attr of messageAttributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        'messages',
                        attr.key,
                        attr.size,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        'messages',
                        attr.key,
                        attr.required,
                        attr.default
                    );
                }
                console.log(`✅ Message attribute ${attr.key} created`);
            } catch (error) {
                if (error.code !== 409) {
                    console.log(`⚠️ Message attribute ${attr.key}: ${error.message}`);
                }
            }
        }

        // 4. Research Reports Collection (NEW)
        try {
            await databases.createCollection(
                DATABASE_ID,
                'research_reports',
                'Research Reports',
                [
                    Permission.create(Role.any()),
                    Permission.read(Role.any()),
                    Permission.update(Role.any()),
                    Permission.delete(Role.any())
                ]
            );
            console.log('✅ Research Reports collection created');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️ Research Reports collection already exists, updating...');
            } else {
                throw error;
            }
        }

        // Research Reports attributes
        const researchAttributes = [
            { key: 'chatbotId', type: 'string', size: 255, required: true },
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'companyName', type: 'string', size: 255, required: true },
            { key: 'companyUrl', type: 'string', size: 500, required: false },
            { key: 'industry', type: 'string', size: 255, required: false },
            { key: 'hqLocation', type: 'string', size: 255, required: false },
            { key: 'researchReport', type: 'string', size: 50000, required: true },
            { key: 'companyInfo', type: 'string', size: 10000, required: false },
            { key: 'references', type: 'string', size: 5000, required: false },
            { key: 'status', type: 'string', size: 50, required: false, default: 'completed' },
            { key: 'generatedAt', type: 'datetime', required: true },
            { key: 'createdAt', type: 'datetime', required: true }
        ];

        for (const attr of researchAttributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        'research_reports',
                        attr.key,
                        attr.size,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        'research_reports',
                        attr.key,
                        attr.required,
                        attr.default
                    );
                }
                console.log(`✅ Research attribute ${attr.key} created`);
            } catch (error) {
                if (error.code !== 409) {
                    console.log(`⚠️ Research attribute ${attr.key}: ${error.message}`);
                }
            }
        }

        // 5. User Settings Collection (Enhanced)
        try {
            await databases.createCollection(
                DATABASE_ID,
                'user_settings',
                'User Settings',
                [
                    Permission.create(Role.any()),
                    Permission.read(Role.any()),
                    Permission.update(Role.any()),
                    Permission.delete(Role.any())
                ]
            );
            console.log('✅ User Settings collection created');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️ User Settings collection already exists, updating...');
            } else {
                throw error;
            }
        }

        // User Settings attributes
        const settingsAttributes = [
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'theme', type: 'string', size: 20, required: false, default: 'light' },
            { key: 'notifications', type: 'boolean', required: false, default: true },
            { key: 'language', type: 'string', size: 10, required: false, default: 'en' },
            { key: 'timezone', type: 'string', size: 50, required: false },
            { key: 'defaultCrawlPages', type: 'integer', required: false, default: 10 },
            { key: 'aiPreferences', type: 'string', size: 2000, required: false },
            { key: 'preferences', type: 'string', size: 3000, required: false },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'updatedAt', type: 'datetime', required: false }
        ];

        for (const attr of settingsAttributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        'user_settings',
                        attr.key,
                        attr.size,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(
                        DATABASE_ID,
                        'user_settings',
                        attr.key,
                        attr.required,
                        attr.default
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        DATABASE_ID,
                        'user_settings',
                        attr.key,
                        attr.required,
                        null,
                        null,
                        attr.default
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        DATABASE_ID,
                        'user_settings',
                        attr.key,
                        attr.required,
                        attr.default
                    );
                }
                console.log(`✅ Settings attribute ${attr.key} created`);
            } catch (error) {
                if (error.code !== 409) {
                    console.log(`⚠️ Settings attribute ${attr.key}: ${error.message}`);
                }
            }
        }

        // Create indexes for better performance
        const indexes = [
            { collection: 'users', key: 'accountId', type: 'unique' },
            { collection: 'users', key: 'email', type: 'unique' },
            { collection: 'chatbots', key: 'userId', type: 'key' },
            { collection: 'chatbots', key: 'namespace', type: 'unique' },
            { collection: 'chatbots', key: 'status', type: 'key' },
            { collection: 'messages', key: 'chatbotId', type: 'key' },
            { collection: 'messages', key: 'userId', type: 'key' },
            { collection: 'messages', key: 'timestamp', type: 'key' },
            { collection: 'research_reports', key: 'chatbotId', type: 'key' },
            { collection: 'research_reports', key: 'userId', type: 'key' },
            { collection: 'user_settings', key: 'userId', type: 'unique' }
        ];

        for (const index of indexes) {
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    index.collection,
                    `${index.key}_idx`,
                    index.type,
                    [index.key]
                );
                console.log(`✅ Index created for ${index.collection}.${index.key}`);
            } catch (error) {
                if (error.code !== 409) {
                    console.log(`⚠️ Index ${index.collection}.${index.key}: ${error.message}`);
                }
            }
        }

        console.log('🎉 Enhanced AI Platform collections update completed successfully!');
        console.log('\n📋 Collections created/updated:');
        console.log('  - users (enhanced with account ID and preferences)');
        console.log('  - chatbots (enhanced with AI capabilities and crawl settings)');
        console.log('  - messages (NEW: persistent chat history)');
        console.log('  - research_reports (NEW: company research storage)');
        console.log('  - user_settings (enhanced with AI preferences and crawl settings)');
        console.log('\n🔧 Key Features Added:');
        console.log('  ✅ Persistent chat history across sessions');
        console.log('  ✅ Enhanced crawl page settings (default 10, configurable)');
        console.log('  ✅ Research report storage and retrieval');
        console.log('  ✅ AI model preferences and capabilities');
        console.log('  ✅ Improved indexing for better performance');
        console.log('\n🚀 Next steps:');
        console.log('  1. Chat messages now persist across tab changes and refreshes');
        console.log('  2. Users can configure default crawl page limits');
        console.log('  3. Research reports are stored in dedicated collection');
        console.log('  4. Enhanced AI capabilities tracking');

    } catch (error) {
        console.error('❌ Error updating collections:', error);
        process.exit(1);
    }
}

// Run the update
if (require.main === module) {
    updateCollections();
}

module.exports = { updateCollections }; 