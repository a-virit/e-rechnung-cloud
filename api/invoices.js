// Vercel Serverless Function
let invoices = []; // In Produktion: echte DB verwenden

export default function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    return res.status(200).json(invoices);
  }
  
  if (req.method === 'POST') {
    const newInvoice = {
      id: `INV-${Date.now()}`,
      ...req.body,
      receivedAt: new Date().toISOString(),
      status: 'processing'
    };
    
    invoices.push(newInvoice);
    
    // Simuliere Verarbeitung nach 3 Sekunden
    setTimeout(() => {
      const index = invoices.findIndex(inv => inv.id === newInvoice.id);
      if (index !== -1) {
        invoices[index] = {
          ...invoices[index],
          status: 'sent',
          processedAt: new Date().toISOString(),
          sentAt: new Date().toISOString()
        };
      }
    }, 3000);
    
    return res.status(201).json(newInvoice);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}