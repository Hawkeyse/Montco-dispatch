require('dotenv').config();
const http = require('node:http');
const { google } = require('googleapis');

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}`;
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const auth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
const url = auth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
});

const server = http.createServer(async (req, res) => {
  const params = new URL(req.url, REDIRECT).searchParams;
  if (params.get('error')) {
    res.end('Authorization failed: ' + params.get('error'));
    console.error('Authorization failed:', params.get('error'));
    return server.close();
  }
  const code = params.get('code');
  if (!code) return res.end('Waiting for Google...');

  try {
    const { tokens } = await auth.getToken(code);
    res.end('Done. You can close this tab and go back to the terminal.');
    if (!tokens.refresh_token) {
      console.error('\nNo refresh token returned. Remove the app at https://myaccount.google.com/permissions and run this again.');
    } else {
      console.log('\nAdd this to .env:\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    }
  } catch (err) {
    res.end('Token exchange failed, check the terminal.');
    console.error('Token exchange failed:', err.message);
  }
  server.close();
});

server.listen(PORT, () => {
  console.log('Open this link in your browser and sign in with the dedicated Gmail:\n');
  console.log(url + '\n');
});