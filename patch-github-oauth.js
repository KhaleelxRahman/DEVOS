const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const githubAuthCode = `
// ---------------------------------------------------------------------------
// GITHUB OAUTH (Phase 8.1)
// ---------------------------------------------------------------------------
apiRouter.get('/auth/github', (req, res) => {
  const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/github/callback';
  const clientId = process.env.GITHUB_CLIENT_ID || 'mock_client_id';
  const scope = 'repo user';
  const authUrl = \`https://github.com/login/oauth/authorize?client_id=\${clientId}&redirect_uri=\${encodeURIComponent(redirectUri)}&scope=\${encodeURIComponent(scope)}\`;
  res.redirect(authUrl);
});

apiRouter.get('/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const reqUser = getUserFromRequest(req);
  if (reqUser) {
    reqUser.github_username = 'devos-github-user'; // Mock username for now
    reqUser.github_connected = true;
    users.set(reqUser.id, reqUser);
  }
  res.redirect('/app/dashboard');
});

apiRouter.post('/auth/github/disconnect', (req, res) => {
  const reqUser = getUserFromRequest(req);
  if (reqUser) {
    reqUser.github_username = undefined;
    reqUser.github_connected = false;
    users.set(reqUser.id, reqUser);
  }
  res.json({ success: true, message: 'Disconnected from GitHub' });
});

apiRouter.get('/auth/github/status', (req, res) => {
  const reqUser = getUserFromRequest(req);
  res.json({ 
    success: true, 
    data: { 
      connected: !!reqUser?.github_connected, 
      username: reqUser?.github_username || null 
    } 
  });
});
`;

code = code.replace(
  "apiRouter.post('/auth/logout',",
  githubAuthCode + "\napiRouter.post('/auth/logout',"
);

fs.writeFileSync('server.ts', code);
