const fetch = require('node-fetch');
const fs = require('fs');

async function testPDF() {
    try {
        console.log('Testing simple PDF endpoint...');
        const response = await fetch('http://localhost:5000/cases/test-pdf');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);
        
        if (contentType && contentType.includes('application/pdf')) {
            const buffer = await response.buffer();
            console.log('PDF buffer size:', buffer.length);
            fs.writeFileSync('./test-output.pdf', buffer);
            console.log('✅ PDF test successful! File saved as test-output.pdf');
        } else {
            const text = await response.text();
            console.log('❌ Expected PDF but got:', contentType);
            console.log('Response:', text);
        }
    } catch (error) {
        console.error('❌ PDF test failed:', error.message);
    }
}

testPDF();