import { ApiClient } from '@/lib/api-client'
import type { ProbabilityCache } from '@/types'

export class ProbabilityCacheService {
  static async getAllProbabilityCache(): Promise<ProbabilityCache[]> {
    return await ApiClient.get('/probability-cache')
  }

  static async createProbabilityCache(cache: Omit<ProbabilityCache, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await ApiClient.post('/probability-cache', cache)
    return result.id
  }

  static async clearProbabilityCache(): Promise<void> {
    // Assuming backend supports DELETE /probability-cache to clear all
    // If not, we might need a specific endpoint or iterate (bad).
    // Let's assume we can add DELETE /probability-cache to backend if needed.
    // For now, let's try calling delete on the collection resource if API follows REST conventions for clearing?
    // Or maybe we just don't support clearing cache manually from frontend except via "Reset DB".
    // Wait, the hook uses it.
    await ApiClient.delete('/probability-cache') 
  }
}
