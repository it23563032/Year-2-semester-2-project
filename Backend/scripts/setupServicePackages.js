const mongoose = require('mongoose');
const ServicePackage = require('../Model/ServicePackage');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/legalaid', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const setupServicePackages = async () => {
  try {
    console.log('🔄 Setting up service packages...');
    
    // Clear existing packages
    await ServicePackage.deleteMany({});
    console.log('✅ Cleared existing packages');
    
    // Create sample packages
    const packages = [
      {
        name: 'Basic',
        price: 5000,
        currency: 'LKR',
        duration: 'monthly',
        description: 'Essential legal aid services for individuals',
        isActive: true,
        isPopular: false,
        features: [
          { name: 'Legal Consultation', description: '1 consultation per month', included: true },
          { name: 'Document Review', description: 'Basic document review', included: true },
          { name: 'Email Support', description: 'Standard email support', included: true },
          { name: 'Priority Support', description: '24/7 priority support', included: false },
          { name: 'Video Calls', description: 'Unlimited video consultations', included: false },
          { name: 'Legal Research', description: 'Advanced legal research', included: false }
        ]
      },
      {
        name: 'Standard',
        price: 10000,
        currency: 'LKR',
        duration: 'monthly',
        description: 'Comprehensive legal services for regular needs',
        isActive: true,
        isPopular: true,
        features: [
          { name: 'Legal Consultation', description: '3 consultations per month', included: true },
          { name: 'Document Review', description: 'Detailed document review', included: true },
          { name: 'Email Support', description: 'Priority email support', included: true },
          { name: 'Priority Support', description: '24/7 priority support', included: true },
          { name: 'Video Calls', description: '5 video calls per month', included: true },
          { name: 'Legal Research', description: 'Basic legal research', included: true }
        ]
      },
      {
        name: 'Premium',
        price: 20000,
        currency: 'LKR',
        duration: 'monthly',
        description: 'Full-service legal aid with unlimited access',
        isActive: true,
        isPopular: false,
        features: [
          { name: 'Legal Consultation', description: 'Unlimited consultations', included: true },
          { name: 'Document Review', description: 'Comprehensive document review', included: true },
          { name: 'Email Support', description: 'Dedicated support agent', included: true },
          { name: 'Priority Support', description: '24/7 VIP priority support', included: true },
          { name: 'Video Calls', description: 'Unlimited video consultations', included: true },
          { name: 'Legal Research', description: 'Advanced legal research', included: true }
        ]
      }
    ];
    
    // Insert packages
    const createdPackages = await ServicePackage.insertMany(packages);
    console.log(`✅ Created ${createdPackages.length} service packages:`);
    
    createdPackages.forEach(pkg => {
      console.log(`   - ${pkg.name}: LKR ${pkg.price}/month (${pkg.features.length} features)`);
    });
    
    console.log('🎉 Service packages setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up service packages:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the setup
setupServicePackages();
