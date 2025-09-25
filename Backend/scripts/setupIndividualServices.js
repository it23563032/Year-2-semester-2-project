const mongoose = require('mongoose');
const IndividualService = require('../Model/IndividualService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/legalaid', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const setupIndividualServices = async () => {
  try {
    console.log('🔄 Setting up individual services...');
    
    // Clear existing services
    await IndividualService.deleteMany({});
    console.log('✅ Cleared existing individual services');
    
    // Create individual services
    const services = [
      // CONSULTATION & ADVICE SERVICES
      {
        name: 'Extended Video Consultation',
        category: 'consultation',
        description: 'One-hour video call with a specialist lawyer (corporate, family, property, etc.) for in-depth legal advice and guidance.',
        price: 2500,
        duration: '1 hour',
        deliverable: 'Video consultation session',
        requirements: ['Brief description of your legal issue', 'Any relevant documents (optional)'],
        specialization: ['corporate', 'family', 'property', 'general'],
        complexity: 'standard',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: '24-48 hours to schedule',
        features: [
          { name: 'One-on-one video call', description: 'Direct access to specialist lawyer', included: true },
          { name: 'Session recording', description: 'Recording provided for your records', included: true },
          { name: 'Follow-up summary', description: 'Written summary of key points discussed', included: true },
          { name: 'Action items list', description: 'Clear next steps and recommendations', included: true }
        ]
      },
      {
        name: 'Quick Question',
        category: 'consultation',
        description: 'Text-based "ask a lawyer" service for 1-2 simple legal questions with guaranteed response within 1 hour.',
        price: 500,
        duration: '1 hour response time',
        deliverable: 'Written legal advice',
        requirements: ['Clear, specific legal questions (max 2)', 'Brief context if needed'],
        specialization: ['general'],
        complexity: 'simple',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: '1 hour',
        features: [
          { name: 'Fast response', description: 'Guaranteed response within 1 hour', included: true },
          { name: 'Written advice', description: 'Clear, actionable legal guidance', included: true },
          { name: 'Follow-up question', description: 'One clarification question included', included: true }
        ]
      },
      {
        name: 'Legal Health Check',
        category: 'consultation',
        description: 'Comprehensive review of your legal situation (startup, business, personal) with detailed report and recommendations.',
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
          { name: 'Action plan', description: 'Prioritized recommendations', included: true },
          { name: '30-min follow-up call', description: 'Discussion of findings and next steps', included: true }
        ]
      },

      // DOCUMENT SERVICES
      {
        name: 'Custom Document Drafting - Simple',
        category: 'documents',
        description: 'Draft a custom legal document from scratch (NDA, Service Agreement, Rental Agreement).',
        price: 3000,
        duration: '2-3 business days',
        deliverable: 'Custom legal document',
        requirements: ['Document type needed', 'Specific terms and conditions', 'Party details'],
        specialization: ['contract', 'general'],
        complexity: 'simple',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: '2-3 business days',
        features: [
          { name: 'Custom drafting', description: 'Document tailored to your needs', included: true },
          { name: 'Legal review', description: 'Reviewed by qualified lawyer', included: true },
          { name: 'Revision included', description: 'One round of revisions', included: true },
          { name: 'Explanation notes', description: 'Key clauses explained', included: true }
        ]
      },
      {
        name: 'Custom Document Drafting - Complex',
        category: 'documents',
        description: 'Draft complex legal documents (Employment Contracts, Partnership Agreements, Comprehensive Service Contracts).',
        price: 8000,
        duration: '5-7 business days',
        deliverable: 'Complex custom legal document',
        requirements: ['Detailed requirements', 'All party information', 'Specific clauses needed'],
        specialization: ['corporate', 'employment', 'partnership'],
        complexity: 'complex',
        isActive: true,
        isPopular: false,
        estimatedTurnaround: '5-7 business days',
        features: [
          { name: 'Complex drafting', description: 'Multi-clause, comprehensive documents', included: true },
          { name: 'Senior lawyer review', description: 'Reviewed by senior specialist', included: true },
          { name: 'Multiple revisions', description: 'Up to 3 rounds of revisions', included: true },
          { name: 'Detailed explanations', description: 'Comprehensive clause explanations', included: true }
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
        isPopular: true,
        estimatedTurnaround: '3-4 business days',
        features: [
          { name: 'Comprehensive will', description: 'Covers all legal requirements', included: true },
          { name: 'Asset distribution', description: 'Clear asset allocation clauses', included: true },
          { name: 'Witness guidance', description: 'Instructions for proper execution', included: true },
          { name: 'Storage advice', description: 'Guidance on safe document storage', included: true }
        ]
      },
      {
        name: 'Document Review & Redlining',
        category: 'documents',
        description: 'Professional review of contracts with detailed comments, suggestions, and risk analysis.',
        price: 2500,
        duration: '1-2 business days',
        deliverable: 'Reviewed document with comments',
        requirements: ['Document to be reviewed', 'Specific concerns (if any)', 'Your role in the agreement'],
        specialization: ['contract', 'general'],
        complexity: 'standard',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: '1-2 business days',
        features: [
          { name: 'Detailed review', description: 'Line-by-line analysis', included: true },
          { name: 'Risk assessment', description: 'Identification of potential issues', included: true },
          { name: 'Suggested changes', description: 'Specific revision recommendations', included: true },
          { name: 'Summary report', description: 'Key findings and recommendations', included: true }
        ]
      },
      {
        name: 'Complex Document Review',
        category: 'documents',
        description: 'In-depth review of complex agreements (M&A, Joint Ventures, Major Contracts) with comprehensive analysis.',
        price: 5000,
        duration: '3-5 business days',
        deliverable: 'Comprehensive review report',
        requirements: ['Complex document', 'Background information', 'Specific objectives'],
        specialization: ['corporate', 'mergers', 'complex contracts'],
        complexity: 'complex',
        isActive: true,
        isPopular: false,
        estimatedTurnaround: '3-5 business days',
        features: [
          { name: 'Expert analysis', description: 'Senior lawyer comprehensive review', included: true },
          { name: 'Risk matrix', description: 'Detailed risk assessment', included: true },
          { name: 'Negotiation strategy', description: 'Recommendations for negotiations', included: true },
          { name: 'Follow-up consultation', description: '30-minute discussion included', included: true }
        ]
      },
      {
        name: 'Document Customization',
        category: 'documents',
        description: 'Customize pre-existing legal templates with your specific details and requirements.',
        price: 1000,
        duration: '1 business day',
        deliverable: 'Customized legal document',
        requirements: ['Template selection', 'Your specific details', 'Any special requirements'],
        specialization: ['general'],
        complexity: 'simple',
        isActive: true,
        isPopular: true,
        estimatedTurnaround: '1 business day',
        features: [
          { name: 'Template customization', description: 'Professional template adaptation', included: true },
          { name: 'Detail integration', description: 'Your information properly integrated', included: true },
          { name: 'Legal compliance', description: 'Ensures legal requirements met', included: true },
          { name: 'Quick turnaround', description: 'Same or next business day delivery', included: true }
        ]
      },

      // REPRESENTATION & LIAISON SERVICES
      {
        name: 'Legal Notice/Demand Letter',
        category: 'representation',
        description: 'Professional legal notice or demand letter sent on official lawyer letterhead to resolve disputes.',
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
          { name: 'Official letterhead', description: 'Sent on lawyer\'s official letterhead', included: true },
          { name: 'Legal weight', description: 'Carries full legal authority', included: true },
          { name: 'Professional language', description: 'Proper legal terminology', included: true },
          { name: 'Delivery confirmation', description: 'Proof of delivery included', included: true }
        ]
      },
      {
        name: 'Complex Legal Notice',
        category: 'representation',
        description: 'Comprehensive legal notice for complex disputes with detailed legal analysis and multiple claims.',
        price: 7000,
        duration: '3-5 business days',
        deliverable: 'Comprehensive legal notice',
        requirements: ['Detailed case information', 'All relevant documents', 'Specific legal claims'],
        specialization: ['litigation', 'corporate disputes'],
        complexity: 'complex',
        isActive: true,
        isPopular: false,
        estimatedTurnaround: '3-5 business days',
        features: [
          { name: 'Comprehensive analysis', description: 'Detailed legal research included', included: true },
          { name: 'Multiple claims', description: 'Can address various legal issues', included: true },
          { name: 'Strategic approach', description: 'Tactical legal positioning', included: true },
          { name: 'Follow-up strategy', description: 'Next steps clearly outlined', included: true }
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
          { name: 'Document collection', description: 'Retrieval of court documents', included: true },
          { name: 'Progress reports', description: 'Regular updates on proceedings', included: true }
        ]
      },
      {
        name: 'Court Date Representation - Simple',
        category: 'representation',
        description: 'Lawyer representation for simple, procedural court matters and routine appearances.',
        price: 8000,
        duration: 'Court date',
        deliverable: 'Court representation',
        requirements: ['Case details', 'Court information', 'Specific instructions'],
        specialization: ['court representation', 'litigation'],
        complexity: 'standard',
        isActive: true,
        isPopular: false,
        estimatedTurnaround: 'Scheduled court date',
        features: [
          { name: 'Professional representation', description: 'Qualified lawyer appears for you', included: true },
          { name: 'Procedural handling', description: 'All court procedures managed', included: true },
          { name: 'Post-hearing report', description: 'Detailed report of proceedings', included: true },
          { name: 'Next steps guidance', description: 'Clear instructions for follow-up', included: true }
        ]
      }
    ];
    
    // Insert services
    const createdServices = await IndividualService.insertMany(services);
    console.log(`✅ Created ${createdServices.length} individual services:`);
    
    // Group by category for display
    const categories = {
      consultation: createdServices.filter(s => s.category === 'consultation'),
      documents: createdServices.filter(s => s.category === 'documents'),
      representation: createdServices.filter(s => s.category === 'representation')
    };
    
    Object.keys(categories).forEach(category => {
      console.log(`\n📋 ${category.toUpperCase()} SERVICES:`);
      categories[category].forEach(service => {
        console.log(`   - ${service.name}: LKR ${service.price.toLocaleString()} (${service.estimatedTurnaround})`);
      });
    });
    
    console.log('\n🎉 Individual services setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up individual services:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the setup
setupIndividualServices();
