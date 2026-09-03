const fs = require('fs');

const adminUrl = `postgresql://${process.env.SQL_ADMIN_USER}:${encodeURIComponent(process.env.SQL_ADMIN_PASSWORD)}@localhost/${process.env.SQL_DB_NAME}?host=${process.env.SQL_HOST}`;
const appUrl = `postgresql://${process.env.SQL_USER}:${encodeURIComponent(process.env.SQL_PASSWORD)}@localhost/${process.env.SQL_DB_NAME}?host=${process.env.SQL_HOST}`;

let envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
envContent = envContent.replace(/^DATABASE_URL=.*$/m, '');
envContent += `\nDATABASE_URL="${adminUrl}"\nAPP_DATABASE_URL="${appUrl}"\n`;
fs.writeFileSync('.env', envContent);

console.log("Admin URL:", adminUrl);
