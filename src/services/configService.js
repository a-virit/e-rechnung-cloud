// src/services/configService.js
class ConfigService {
  async get() {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();
      return result.success ? result.data : {};
    } catch (error) {
      console.error('Error fetching config:', error);
      return {};
    }
  }

  async update(configData) {
    const response = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });
    
    if (!response.ok) throw new Error('Failed to update config');
    return await response.json();
  }
}

export const configService = new ConfigService();