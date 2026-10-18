require('dotenv').config();
const { google } = require('googleapis');

const REDIRECT = 'http://localhost:53682';
const input = (process.argv[2] || '').trim();

if (!input) {
  console.error('Usage: node src/exchange-code.js "<the URL the browser ended up on>"');
  process.exit(1);
}
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.');
  process.exit(1);
}

let code = input;
try {
  const params = new URL(input).searchParams;
  if (params.get('error')) {
    console.error('Google reported an error:', params.get('error'));
    process.exit(1);
  }
  code = params.get('code') || '';
} catch {
}
if (!code) {
  console.error('No code= found in that text. Make sure you copied the whole address.');
  process.exit(1);
}

const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, REDIRECT);

auth
  .getToken(code)
  .then(({ tokens }) => {
    if (!tokens.refresh_token) {
      console.error(
        'No refresh token returned. Have the client remove the app at https://myaccount.google.com/permissions and approve again.'
      );
      process.exit(1);
    }
    console.log('\nPut this in .env:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  })
  .catch((err) => {
    console.error('Exchange failed:', err.response?.data?.error_description || err.message);
    console.error('Codes expire within minutes and work once. Generate a fresh link and try again.');
    process.exit(1);
  });