const express = require('express');
const router = express.Router();
const ServicePackage = require('../Model/ServicePackage');
const IndividualService = require('../Model/IndividualService');

// Setup service packages
router.post('/service-packages', async (req, res) => {
  try {
    console.log('🔄 Setting up service packages...');
    
    // Clear existing packages
    await ServicePackage.deleteMany({});
    
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
          { name: 'Video Calls', description: 'Unlimited video consultations', included: false }
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
          { name: 'Video Calls', description: '5 video calls per month', included: true }
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
          { name: 'Video Calls', description: 'Unlimited video consultations', included: true }
        ]
      }
    ];
    
    const createdPackages = await ServicePackage.insertMany(packages);
    
    res.json({
      success: true,
      message: `Created ${createdPackages.length} service packages`,
      packages: createdPackages
    });
    
  } catch (error) {
    console.error('❌ Error setting up service packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up service packages',
      error: error.message
    });
  }
});

// Setup individual services
router.post('/individual-services', async (req, res) => {
  try {
    console.log('🔄 Setting up individual services...');
    
    // Clear existing services
    await IndividualService.deleteMany({});
    
    // Create individual services
    const services = [
      // CONSULTATION SERVICES
      {
        name: 'Video Call with Lawyer',
        category: 'consultation',
        description: 'Get personalized legal advice through a one-hour video consultation with an expert lawyer.',
        price: 2500,
        duration: '1 hour',
        deliverable: 'Video consultation session',
        requirements: ['Brief description of your legal issue', 'Any relevant documents (optional)'],
        specialization: ['corporate', 'family', 'property', 'general'],
        complexity: 'standard',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: 'Within 2 days',
        features: [
          { name: 'Personal video consultation', description: 'Direct access to specialist lawyer', included: true },
          { name: 'Session recording for review', description: 'Recording provided for your records', included: true },
          { name: 'Written summary provided', description: 'Written summary of key points discussed', included: true }
        ]
      },
      {
        name: 'Ask a Quick Question',
        category: 'consultation',
        description: 'Get fast answers to simple legal questions via text message - perfect for quick clarifications.',
        price: 500,
        duration: '1 hour response time',
        deliverable: 'Written legal advice',
        requirements: ['Clear, specific legal questions (max 2)', 'Brief context if needed'],
        specialization: ['general'],
        complexity: 'simple',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: 'Within 1 hour',
        features: [
          { name: 'Quick response guaranteed', description: 'Guaranteed response within 1 hour', included: true },
          { name: 'Clear written explanation', description: 'Clear, actionable legal guidance', included: true },
          { name: 'One follow-up question', description: 'One clarification question included', included: true }
        ]
      },
      {
        name: 'Legal Health Check',
        category: 'consultation',
        description: 'Comprehensive review of your legal situation with detailed report and recommendations.',
        price: 5000,
        duration: '3-5 business days',
        deliverable: 'Detailed legal health report',
        requirements: ['Business/personal details', 'Current legal documents', 'Specific areas of concern'],
        specialization: ['corporate', 'business', 'startup'],
        complexity: 'complex',
        isActive: true,
        isPopular: false,
        estimatedTurnaround: '3-5 business days',
        features: [
          { name: 'Comprehensive analysis', description: 'Full review of your legal position', included: true },
          { name: 'Risk assessment', description: 'Identification of potential legal risks', included: true },
          { name: 'Action plan', description: 'Prioritized recommendations', included: true }
        ]
      },

      // DOCUMENT SERVICES
      {
        name: 'Review My Contract',
        category: 'documents',
        description: 'Have a lawyer carefully review your contract and highlight any issues or risks you should know about.',
        price: 2500,
        duration: '1-2 business days',
        deliverable: 'Reviewed document with comments',
        requirements: ['Document to be reviewed', 'Specific concerns (if any)', 'Your role in the agreement'],
        specialization: ['contract', 'general'],
        complexity: 'standard',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: 'Next business day',
        features: [
          { name: 'Line-by-line review', description: 'Line-by-line analysis', included: true },
          { name: 'Risk highlights', description: 'Identification of potential issues', included: true },
          { name: 'Improvement suggestions', description: 'Specific revision recommendations', included: true }
        ]
      },
      {
        name: 'Create Legal Document',
        category: 'documents',
        description: 'Get a custom legal document written specifically for your needs - contracts, agreements, and more.',
        price: 3000,
        duration: '2-3 business days',
        deliverable: 'Custom legal document',
        requirements: ['Document type needed', 'Specific terms and conditions', 'Party details'],
        specialization: ['contract', 'general'],
        complexity: 'standard',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: '2-3 business days',
        features: [
          { name: 'Written just for you', description: 'Document tailored to your needs', included: true },
          { name: 'Lawyer reviewed', description: 'Reviewed by qualified lawyer', included: true },
          { name: 'Free revision included', description: 'One round of revisions', included: true }
        ]
      },
      {
        name: 'Will Drafting',
        category: 'documents',
        description: 'Draft a comprehensive Last Will and Testament with proper legal formalities.',
        price: 5000,
        duration: '3-4 business days',
        deliverable: 'Legal Will document',
        requirements: ['Asset details', 'Beneficiary information', 'Executor preferences'],
        specialization: ['estate', 'family'],
        complexity: 'standard',
        isActive: true,
        isPopular: false,
        estimatedTurnaround: '3-4 business days',
        features: [
          { name: 'Comprehensive will', description: 'Covers all legal requirements', included: true },
          { name: 'Asset distribution', description: 'Clear asset allocation clauses', included: true },
          { name: 'Witness guidance', description: 'Instructions for proper execution', included: true }
        ]
      },

      // REPRESENTATION SERVICES
      {
        name: 'Send Legal Notice',
        category: 'representation',
        description: 'Have a lawyer send an official legal notice on your behalf - often resolves disputes without going to court.',
        price: 4000,
        duration: '2-3 business days',
        deliverable: 'Official legal notice',
        requirements: ['Details of the issue', 'Desired outcome', 'Recipient information'],
        specialization: ['litigation', 'general'],
        complexity: 'standard',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: '2-3 business days',
        features: [
          { name: 'Official lawyer letterhead', description: 'Sent on lawyer\'s official letterhead', included: true },
          { name: 'Full legal authority', description: 'Carries full legal authority', included: true },
          { name: 'Professional delivery', description: 'Proper legal terminology', included: true }
        ]
      },
      {
        name: 'Court Liaison Service',
        category: 'representation',
        description: 'Lawyer or paralegal handles court filings, status checks, and document collection on your behalf.',
        price: 3000,
        duration: 'Same day service',
        deliverable: 'Court filing service',
        requirements: ['Documents to be filed', 'Court information', 'Specific requirements'],
        specialization: ['court procedures', 'litigation support'],
        complexity: 'standard',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: 'Same day',
        features: [
          { name: 'Court filing', description: 'Professional filing of your documents', included: true },
          { name: 'Status updates', description: 'Real-time case status monitoring', included: true },
          { name: 'Document collection', description: 'Retrieval of court documents', included: true }
        ]
      }
    ];
    
    const createdServices = await IndividualService.insertMany(services);
    
    res.json({
      success: true,
      message: `Created ${createdServices.length} individual services`,
      services: createdServices
    });
    
  } catch (error) {
    console.error('❌ Error setting up individual services:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up individual services',
      error: error.message
    });
  }
});

module.exports = router;
