/**
 * Service für Teilnehmer-Management
 * 
 * Kapselt alle Business Logic für Teilnehmer-Operationen.
 * Trennt UI von Business Logic.
 */

import { ApiClient } from '@/lib/api-client'
import type { Participant, ParticipantDTO } from '@/types'
import { withErrorHandling, validateRequired, validateStringLength, validateNumberRange } from '@/utils/errorHandling'

export class ParticipantService {
  /**
   * Lädt alle Teilnehmer aus der Datenbank
   */
  static async getAllParticipants(): Promise<Participant[]> {
    return await withErrorHandling(
      () => ApiClient.get('/participants'),
      'Fehler beim Laden der Teilnehmer'
    )
  }

  /**
   * Lädt Teilnehmer nach Geschlecht
   */
  static async getParticipantsByGender(gender: 'F' | 'M'): Promise<Participant[]> {
    const participants = await this.getAllParticipants()
    return participants.filter(p => p.gender === gender)
  }

  /**
   * Lädt aktive Teilnehmer
   */
  static async getActiveParticipants(): Promise<Participant[]> {
    const participants = await this.getAllParticipants()
    return participants.filter(p => p.active)
  }

  /**
   * Sucht Teilnehmer nach Name oder Show
   */
  static async searchParticipants(query: string): Promise<Participant[]> {
    const allParticipants = await this.getAllParticipants()
    const lowerQuery = query.toLowerCase()
    
    return allParticipants.filter(participant => 
      participant.name.toLowerCase().includes(lowerQuery) ||
      (participant.knownFrom && participant.knownFrom.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Erstellt einen neuen Teilnehmer
   */
  static async createParticipant(participant: Omit<Participant, 'id'>): Promise<number> {
    const result = await ApiClient.post('/participants', participant)
    return result.id
  }

  /**
   * Aktualisiert einen Teilnehmer
   */
  static async updateParticipant(id: number, updates: Partial<Participant>): Promise<void> {
    await ApiClient.put(`/participants/${id}`, updates)
  }

  /**
   * Löscht einen Teilnehmer
   */
  static async deleteParticipant(id: number): Promise<void> {
    await ApiClient.delete(`/participants/${id}`)
  }

  /**
   * Konvertiert DTO zu Domain-Objekt
   */
  static fromDTO(dto: ParticipantDTO): Participant {
    return {
      ...dto,
      status: dto.status as Participant['status'],
      // Zusätzliche Validierung/Transformation falls nötig
    }
  }

  /**
   * Konvertiert Domain-Objekt zu DTO
   */
  static toDTO(participant: Participant): ParticipantDTO {
    return {
      ...participant,
      // Zusätzliche Transformation falls nötig
    }
  }

  /**
   * Validiert Teilnehmer-Daten
   */
  static validateParticipant(participant: Partial<Participant>): string[] {
    const errors: string[] = []

    try {
      validateRequired(participant.name, 'Name')
      if (participant.name) {
        validateStringLength(participant.name, 'Name', 1, 100)
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        errors.push((error as { message: string }).message)
      }
    }

    if (!participant.gender || !['F', 'M'].includes(participant.gender)) {
      errors.push('Geschlecht muss F oder M sein')
    }

    if (participant.age !== undefined) {
      try {
        validateNumberRange(participant.age, 'Alter', 18, 100)
      } catch (error) {
        if (error && typeof error === 'object' && 'message' in error) {
          errors.push((error as { message: string }).message)
        }
      }
    }

    return errors
  }
}
