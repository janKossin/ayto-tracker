const API_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiClient {
  static async get(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  }

  static async post(endpoint: string, data: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  }

  static async put(endpoint: string, data: any) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  }

  static async delete(endpoint: string) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }
}
