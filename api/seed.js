import { kv } from '@vercel/kv';

const sampleInvoices = [
  {
    id: 'INV-2024-001',
    sender: 'Musterfirma GmbH',
    receiver: 'Kunde AG',
    amount: 1250.00,
    currency: 'EUR',
    date: '2024-08-21',
    status: 'sent',
    format: 'XRechnung',
    receivedAt: '2024-08-21T10:30:00Z',
    processedAt: '2024-08-21T10:35:00Z',
    sentAt: '2024-08-21T10:40:00Z'
  },
  {
    id: 'INV-2024-002',
    sender: 'Tech Solutions Ltd',
    receiver: 'Beispiel GmbH',
    amount: 890.50,
    currency: 'EUR',
    date: '2024-08-21',
    status: 'sent',
    format: 'ZUGFeRD',
    receivedAt: '2024-08-21T11:15:00Z',
    processedAt: '2024-08-21T11:25:00Z',
    sentAt: '2024-08-21T11:30:00Z'
  }
];

export default async function handler(req, res) {
  try {
    await kv.set('e-invoices', sampleInvoices);
    res.status(200).json({ 
      success: true, 
      message: 'Sample data loaded',
      count: sampleInvoices.length 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}