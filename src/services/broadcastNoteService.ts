import { ApiClient } from '@/lib/api-client'
import type { BroadcastNote } from '@/types'

export class BroadcastNoteService {
  static async getAllBroadcastNotes(): Promise<BroadcastNote[]> {
    return await ApiClient.get('/broadcast-notes')
  }

  static async createBroadcastNote(note: Omit<BroadcastNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const result = await ApiClient.post('/broadcast-notes', note)
    return result.id
  }

  static async updateBroadcastNote(id: number, note: Partial<BroadcastNote>): Promise<void> {
    await ApiClient.put(`/broadcast-notes/${id}`, note)
  }

  static async deleteBroadcastNote(id: number): Promise<void> {
    await ApiClient.delete(`/broadcast-notes/${id}`)
  }
}
