// src/services/customerService.js
class CustomerService {
  async getAll() {
    try {
      const response = await fetch('/api/customers');
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }

  async create(customerData) {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    
    if (!response.ok) throw new Error('Failed to create customer');
    return await response.json();
  }

  async update(customerId, customerData) {
    const response = await fetch(`/api/customers?id=${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    
    if (!response.ok) throw new Error('Failed to update customer');
    return await response.json();
  }

  async delete(customerId) {
    const response = await fetch(`/api/customers?id=${customerId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete customer');
    return await response.json();
  }
}

export const customerService = new CustomerService();