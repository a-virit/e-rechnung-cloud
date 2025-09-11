import { createClient } from '@vercel/kv';

export function getCompanyKV(companyId) {
  const host = process.env[`DB_HOST_${companyId}`] || process.env.KV_REST_API_URL;
  const namespace = process.env[`DB_NAME_${companyId}`] || `e-company-${companyId}`;
  const token = process.env.KV_REST_API_TOKEN;
  if (!token) {
    throw new Error('Missing KV_REST_API_TOKEN');
  }
  return createClient({ url: host, token, namespace });
}