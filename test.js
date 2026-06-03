const xmlrpc = require('xmlrpc');

const url = 'https://axizstudios1.odoo.com';
const db = 'axizstudios1';
const username = 'ro.zavala14@gmail.com';
const password = process.env.ODOO_API_KEY || 'a88ed40d88059c4033b9148dceeafe51ec787d5b'; // Assuming this might be in env, or I'll just see if it fails auth. Wait, I don't know the password!
