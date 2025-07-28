import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function simpleOxylabsTest() {
  console.log('🧪 Simple Oxylabs API Test...');
  
  const username = process.env.OXYLABS_USERNAME;
  const password = process.env.OXYLABS_PASSWORD;
  
  console.log(`Username: ${username}`);
  console.log(`Password: ${password ? '***' + password.slice(-4) : 'NOT SET'}`);
  
  if (!username || !password) {
    console.error('❌ Missing credentials');
    return;
  }
  
  try {
    // Test 1: Simple universal scraping
    console.log('\n1️⃣ Testing universal scraping...');
    
    const requestBody = {
      source: 'universal',
      url: 'https://httpbin.org/html',
      geo_location: 'United States',
      user_agent_type: 'desktop',
      render: 'html',
      parse: false
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(
      'https://realtime.oxylabs.io/v1/queries',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(response.data));
    
    if (response.data.results && response.data.results[0]) {
      const result = response.data.results[0];
      console.log('Content length:', result.content?.length || 'No content');
      console.log('Title:', result.title || 'No title');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

simpleOxylabsTest().catch(console.error); 