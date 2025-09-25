const mongoose = require('mongoose');
require('dotenv').config();

async function dropRatingIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/legal-management-system');
    console.log('Connected to MongoDB');

    // Get the database
    const db = mongoose.connection.db;
    
    // Drop the unique index on ratings collection
    const ratingsCollection = db.collection('ratings');
    
    try {
      await ratingsCollection.dropIndex('case_1_client_1');
      console.log('✅ Successfully dropped unique index case_1_client_1');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ Index case_1_client_1 does not exist (already dropped)');
      } else {
        console.log('❌ Error dropping index:', error.message);
      }
    }
    
    // List all indexes to verify
    const indexes = await ratingsCollection.indexes();
    console.log('📋 Current indexes on ratings collection:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

dropRatingIndex();
