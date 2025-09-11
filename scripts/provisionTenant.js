#!/usr/bin/env node
const { createClient } = require('@vercel/kv');

const companyId = process.argv[2];
if (!companyId) {
  console.error('Usage: node scripts/provisionTenant.js <companyId>');
  process.exit(1);
}

const namespace = `e-company-${companyId}`;
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

async function provision() {
  if (!url || !token) {
    throw new Error('Missing KV credentials in environment variables');
  }
  const client = createClient({ url, token, namespace });
  await client.set('e-invoices', []);
  await client.set('e-customers', []);
  await client.set('e-config', {});
  console.log(`Provisioned tenant namespace ${namespace}`);
  console.log('Please set the following environment variables:');
  console.log(`DB_HOST_${companyId}=${url}`);
  console.log(`DB_NAME_${companyId}=${namespace}`);
}

provision().catch(err => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});