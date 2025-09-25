/**
 * Test script for Document API endpoints
 * This script demonstrates how to test the document management functionality
 * 
 * Prerequisites:
 * 1. Backend server running on localhost:5000
 * 2. Valid authentication token
 * 3. A case ID for testing document uploads
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual token
const CASE_ID = 'your-case-id-here'; // Replace with actual case ID

// Helper function to make authenticated requests
async function makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const defaultHeaders = {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: defaultHeaders
        });
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: data
        };
    } catch (error) {
        console.error(`Request failed for ${endpoint}:`, error.message);
        return {
            ok: false,
            status: 0,
            statusText: error.message,
            data: null
        };
    }
}

// Test 1: Check document service status
async function testDocumentServiceStatus() {
    console.log('\n=== Testing Document Service Status ===');
    
    const result = await makeRequest('/api/documents/test');
    
    if (result.ok) {
        console.log('✅ Document service is running');
        console.log('Available endpoints:', result.data.endpoints);
    } else {
        console.log('❌ Document service not available:', result.statusText);
    }
    
    return result.ok;
}

// Test 2: Create a test file for upload
function createTestFile() {
    const testDir = path.join(__dirname, 'test-uploads');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-document.txt');
    const testContent = `Test Document for Legal Case
Created: ${new Date().toISOString()}
Description: This is a test document for demonstrating document upload functionality.

Case Details:
- This document is being uploaded as part of case filing process
- It demonstrates the integration between case creation and document management
- All documents are properly linked to their respective cases

Document Management Features:
✓ Secure file upload with authentication
✓ File type validation (PDF, Word, Images, Text)
✓ File size limits (10MB per file)
✓ Case-specific document organization
✓ Document categorization and descriptions
✓ Access control (only case owner and assigned lawyer)
✓ Document sharing capabilities
✓ File integrity verification with checksums
✓ Version control support
✓ OCR processing capability (for images)

This test file can be safely deleted after testing.
`;
    
    fs.writeFileSync(testFilePath, testContent);
    console.log(`✅ Test file created: ${testFilePath}`);
    
    return testFilePath;
}

// Test 3: Upload a document
async function testDocumentUpload(filePath, caseId = null) {
    console.log('\n=== Testing Document Upload ===');
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ Test file not found:', filePath);
        return false;
    }
    
    try {
        const form = new FormData();
        form.append('document', fs.createReadStream(filePath));
        form.append('category', 'Evidence');
        form.append('description', 'Test document uploaded via API test script');
        
        if (caseId) {
            form.append('caseId', caseId);
        }
        
        const result = await makeRequest('/api/documents/upload', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });
        
        if (result.ok) {
            console.log('✅ Document uploaded successfully');
            console.log('Document details:', JSON.stringify(result.data, null, 2));
            return result.data.document;
        } else {
            console.log('❌ Document upload failed:', result.data);
            return false;
        }
    } catch (error) {
        console.log('❌ Upload error:', error.message);
        return false;
    }
}

// Test 4: Get user's documents
async function testGetMyDocuments() {
    console.log('\n=== Testing Get My Documents ===');
    
    const result = await makeRequest('/api/documents/my-documents');
    
    if (result.ok) {
        console.log('✅ Retrieved user documents');
        console.log(`Total documents: ${result.data.total}`);
        
        if (result.data.documents.length > 0) {
            console.log('Recent documents:');
            result.data.documents.slice(0, 3).forEach((doc, index) => {
                console.log(`  ${index + 1}. ${doc.originalName} (${doc.category}) - ${doc.fileSize} bytes`);
            });
        }
        
        return result.data.documents;
    } else {
        console.log('❌ Failed to get documents:', result.data);
        return [];
    }
}

// Test 5: Get documents for a specific case
async function testGetCaseDocuments(caseId) {
    console.log('\n=== Testing Get Case Documents ===');
    
    if (!caseId) {
        console.log('⚠️ No case ID provided, skipping case document test');
        return [];
    }
    
    const result = await makeRequest(`/api/documents/case/${caseId}`);
    
    if (result.ok) {
        console.log('✅ Retrieved case documents');
        console.log(`Documents for case ${caseId}: ${result.data.documents.length}`);
        
        if (result.data.documents.length > 0) {
            result.data.documents.forEach((doc, index) => {
                console.log(`  ${index + 1}. ${doc.originalName} (${doc.category})`);
            });
        }
        
        return result.data.documents;
    } else {
        console.log('❌ Failed to get case documents:', result.data);
        return [];
    }
}

// Test 6: Get document statistics
async function testDocumentStats() {
    console.log('\n=== Testing Document Statistics ===');
    
    const result = await makeRequest('/api/documents/stats');
    
    if (result.ok) {
        console.log('✅ Retrieved document statistics');
        const stats = result.data.stats;
        
        console.log(`Total documents: ${stats.total}`);
        console.log(`Documents this week: ${stats.thisWeek}`);
        console.log(`Documents this month: ${stats.thisMonth}`);
        console.log(`Shared documents: ${stats.shared}`);
        
        if (Object.keys(stats.byCategory).length > 0) {
            console.log('Documents by category:');
            Object.entries(stats.byCategory).forEach(([category, count]) => {
                console.log(`  ${category}: ${count}`);
            });
        }
        
        return stats;
    } else {
        console.log('❌ Failed to get statistics:', result.data);
        return null;
    }
}

// Test 7: Test case creation with documents
async function testCaseWithDocuments(testFilePath) {
    console.log('\n=== Testing Case Creation with Documents ===');
    
    try {
        const form = new FormData();
        
        // Add case data
        form.append('caseType', 'Contract Dispute');
        form.append('plaintiffName', 'John Doe');
        form.append('defendantName', 'Jane Smith');
        form.append('caseDescription', 'Test case created via API with document upload');
        form.append('reliefSought', 'Monetary compensation for breach of contract');
        form.append('caseValue', '50000');
        
        // Add document
        form.append('caseDocuments', fs.createReadStream(testFilePath));
        form.append('documentCategories', 'Contract');
        form.append('documentDescriptions', 'Test contract document uploaded with case creation');
        
        const result = await makeRequest('/cases/with-documents', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });
        
        if (result.ok) {
            console.log('✅ Case created with documents successfully');
            console.log('Case details:', JSON.stringify(result.data.case, null, 2));
            console.log(`Documents uploaded: ${result.data.documentsUploaded}`);
            
            return result.data.case;
        } else {
            console.log('❌ Case creation with documents failed:', result.data);
            return false;
        }
    } catch (error) {
        console.log('❌ Case creation error:', error.message);
        return false;
    }
}

// Test 8: Download a document (test endpoint only)
async function testDocumentDownload(documentId) {
    console.log('\n=== Testing Document Download ===');
    
    if (!documentId) {
        console.log('⚠️ No document ID provided, skipping download test');
        return false;
    }
    
    const result = await makeRequest(`/api/documents/${documentId}/download`);
    
    if (result.ok) {
        console.log('✅ Document download successful');
        console.log(`Downloaded ${result.data.length || 'unknown'} bytes`);
        return true;
    } else {
        console.log('❌ Document download failed:', result.data);
        return false;
    }
}

// Cleanup function
function cleanup() {
    const testDir = path.join(__dirname, 'test-uploads');
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
        console.log('\n✅ Cleanup completed - test files removed');
    }
}

// Main test runner
async function runDocumentApiTests() {
    console.log('🚀 Starting Document API Tests');
    console.log('================================');
    
    // Check if server is running
    const healthResult = await makeRequest('/health');
    if (!healthResult.ok) {
        console.log('❌ Backend server not running on localhost:3000');
        console.log('Please start the server before running tests');
        return;
    }
    
    console.log('✅ Backend server is running');
    
    try {
        // Test 1: Service status
        const serviceOk = await testDocumentServiceStatus();
        if (!serviceOk) {
            console.log('❌ Document service not available, aborting tests');
            return;
        }
        
        // Create test file
        const testFilePath = createTestFile();
        
        // Test 2: Document upload
        const uploadedDoc = await testDocumentUpload(testFilePath);
        
        // Test 3: Get my documents
        const myDocs = await testGetMyDocuments();
        
        // Test 4: Get case documents (if case ID provided)
        if (CASE_ID && CASE_ID !== 'your-case-id-here') {
            await testGetCaseDocuments(CASE_ID);
        }
        
        // Test 5: Document statistics
        await testDocumentStats();
        
        // Test 6: Case creation with documents
        const newCase = await testCaseWithDocuments(testFilePath);
        
        // Test 7: Download test (if document was uploaded)
        if (uploadedDoc && uploadedDoc.id) {
            await testDocumentDownload(uploadedDoc.id);
        }
        
        console.log('\n🎉 Document API tests completed!');
        console.log('================================');
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    } finally {
        // Cleanup
        cleanup();
    }
}

// Instructions for running the tests
function showInstructions() {
    console.log(`
📋 Document API Test Instructions:
==================================

Before running these tests, please:

1. Make sure your backend server is running on localhost:3000
2. Update the AUTH_TOKEN variable with a valid JWT token
3. (Optional) Update CASE_ID with a valid case ID for case-specific tests

To get a valid JWT token:
- Login through your frontend application
- Check browser's localStorage for 'token' value
- Or make a POST request to /auth/login with valid credentials

To run the tests:
node test-document-api.js

Available test endpoints:
- GET  /api/documents/test           - Service status
- POST /api/documents/upload        - Upload document  
- GET  /api/documents/my-documents  - Get user documents
- GET  /api/documents/case/:caseId  - Get case documents
- GET  /api/documents/stats         - Get document stats
- POST /cases/with-documents        - Create case with documents
- GET  /api/documents/:id/download  - Download document
- POST /api/documents/:id/process-ocr - Process OCR on document
- GET  /api/documents/ocr/status    - Get OCR service status
- GET  /api/documents/search        - Search documents by content
- POST /api/documents/:id/share     - Share document with user

Note: Update the AUTH_TOKEN and CASE_ID variables at the top of this file.
`);
}

// Run tests if called directly
if (require.main === module) {
    if (AUTH_TOKEN === 'your-jwt-token-here') {
        showInstructions();
    } else {
        runDocumentApiTests();
    }
}

module.exports = {
    runDocumentApiTests,
    testDocumentServiceStatus,
    testDocumentUpload,
    testGetMyDocuments,
    testGetCaseDocuments,
    testDocumentStats,
    testCaseWithDocuments,
    showInstructions
};