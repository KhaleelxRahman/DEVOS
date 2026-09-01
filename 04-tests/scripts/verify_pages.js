const https = require('https');
const pages = ['', '/login', '/register', '/waitlist', '/contact', '/faq', '/privacy', '/terms'];
let pending = pages.length;
pages.forEach(p => {
  const path = p || '/';
  const options = {
    method: 'HEAD',
    hostname: 'devos-dboq362bj-khaleelxrahmans-projects.vercel.app',
    path: path,
  };
  const req = https.request(options, res => {
    console.log(`${p || '/'} : ${res.statusCode}`);
    console.log(`CSP${p || '/'} : ${res.headers['content-security-policy'] || 'none'}`);
    if (--pending === 0) {}
  });
  req.on('error', err => {
    console.log(`${p || '/'} : ERROR ${err.message}`);
    console.log(`CSP${p || '/'} : none`);
    if (--pending === 0) {}
  });
  req.end();
});
// Ensure the script exits after a short delay
setTimeout(() => process.exit(0), 10000);

