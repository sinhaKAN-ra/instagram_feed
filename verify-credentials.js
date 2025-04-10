// Simple script to verify Facebook App credentials
const axios = require('axios');
require('dotenv').config();

const FB_APP_ID = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

console.log('Verifying Facebook App credentials...');
console.log(`App ID: ${FB_APP_ID}`);
console.log(`App Secret: ${FB_APP_SECRET ? '[SET]' : '[NOT SET]'}`);

async function verifyCredentials() {
  try {
    // Try to get app info using the credentials
    const response = await axios.get(`https://graph.facebook.com/v17.0/${FB_APP_ID}`, {
      params: {
        access_token: `${FB_APP_ID}|${FB_APP_SECRET}`
      }
    });
    
    console.log('Credentials are valid!');
    console.log('App info:', response.data);
  } catch (error) {
    console.error('Error verifying credentials:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    console.log('\nPossible solutions:');
    console.log('1. Check if your App ID is correct');
    console.log('2. Verify your App Secret is correct');
    console.log('3. Try regenerating your App Secret in the Facebook Developer Console');
    console.log('4. Make sure your app is properly configured for Instagram Basic Display API');
  }
}

verifyCredentials(); 