// ===================================================
// src/services/invoiceService.js - API Abstraction
// ===================================================

class InvoiceService {
  async getAll() {
    try {
      const response = await fetch('/api/invoices-db');
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async create(invoiceData) {
    const response = await fetch('/api/invoices-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });
    
    if (!response.ok) throw new Error('Failed to create invoice');
    return await response.json();
  }

  async sendEmail(invoiceId) {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, attachXML: true })
    });
    
    if (!response.ok) throw new Error('Failed to send email');
    return await response.json();
  }

  async downloadPDF(invoiceId, invoiceNumber) {
    const response = await fetch(`/api/generate-pdf?invoiceId=${invoiceId}`);
    if (!response.ok) throw new Error('Failed to generate PDF');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rechnung_${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async delete(invoiceId) {
    const response = await fetch(`/api/invoices-db?id=${invoiceId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete invoice');
    return await response.json();
  }
}