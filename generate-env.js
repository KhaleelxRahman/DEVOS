const fs = require('fs');

const adminUrl = `postgresql://${process.env.SQL_ADMIN_USER}:${encodeURIComponent(process.env.SQL_ADMIN_PASSWORD)}@localhost/${process.env.SQL_DB_NAME}?host=${process.env.SQL_HOST}`;
const appUrl = `postgresql://${process.env.SQL_USER}:${encodeURIComponent(process.env.SQL_PASSWORD)}@localhost/${process.env.SQL_DB_NAME}?host=${process.env.SQL_HOST}`;

fs.writeFileSync('.env.prisma', `DATABASE_URL="${adminUrl}"\n`);
fs.writeFileSync('.env.app', `DATABASE_URL="${appUrl}"\n`);
console.log("Admin URL:", adminUrl);
