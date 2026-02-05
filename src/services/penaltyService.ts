/**
 * Service für Penalty Management
 * 
 * Kapselt alle Business Logic für Penalty-Operationen.
 * Trennt UI von Business Logic.
 */

import { ApiClient } from '@/lib/api-client'
import type { Penalty, PenaltyDTO } from '@/types'

export class PenaltyService {
  /**
   * Lädt alle Penalties aus der Datenbank
   */
  static async getAllPenalties(): Promise<Penalty[]> {
    const dtos = await ApiClient.get('/penalties') as PenaltyDTO[]
    return dtos.map(dto => this.fromDTO(dto))
  }

  /**
   * Lädt Penalties nach Teilnehmer
   */
  static async getPenaltiesByParticipant(participantName: string): Promise<Penalty[]> {
    const all = await this.getAllPenalties()
    return all.filter(p => p.participantName === participantName)
  }

  /**
   * Erstellt eine neue Penalty
   */
  static async createPenalty(penalty: Omit<Penalty, 'id' | 'createdAt'>): Promise<number> {
    const newPenalty = {
      ...penalty,
      createdAt: new Date()
    }
    const result = await ApiClient.post('/penalties', newPenalty)
    return result.id
  }

  /**
   * Aktualisiert eine Penalty
   */
  static async updatePenalty(id: number, updates: Partial<Penalty>): Promise<void> {
    await ApiClient.put(`/penalties/${id}`, updates)
  }

  /**
   * Löscht eine Penalty
   */
  static async deletePenalty(id: number): Promise<void> {
    await ApiClient.delete(`/penalties/${id}`)
  }

  /**
   * Validiert Penalty-Daten
   */
  static validatePenalty(penalty: Partial<Penalty>): string[] {
    const errors: string[] = []

    if (!penalty.participantName?.trim()) {
      errors.push('Teilnehmer-Name ist erforderlich')
    }

    if (!penalty.reason?.trim()) {
      errors.push('Grund ist erforderlich')
    }

    if (!penalty.amount || penalty.amount <= 0) {
      errors.push('Betrag muss größer als 0 sein')
    }

    if (!penalty.date?.trim()) {
      errors.push('Datum ist erforderlich')
    } else {
      // Validiere Datumsformat
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(penalty.date)) {
        errors.push('Datum muss im Format YYYY-MM-DD sein')
      }
    }

    return errors
  }

  /**
   * Konvertiert DTO zu Domain-Objekt
   */
  static fromDTO(dto: PenaltyDTO): Penalty {
    return {
      ...dto,
      createdAt: new Date(dto.createdAt)
    }
  }

  /**
   * Konvertiert Domain-Objekt zu DTO
   */
  static toDTO(penalty: Penalty): PenaltyDTO {
    return {
      ...penalty,
      createdAt: penalty.createdAt.toISOString()
    }
  }

  /**
   * Berechnet die Gesamtsumme aller Penalties für einen Teilnehmer
   */
  static async getTotalPenaltiesForParticipant(participantName: string): Promise<number> {
    const penalties = await this.getPenaltiesByParticipant(participantName)
    return penalties.reduce((total, penalty) => total + penalty.amount, 0)
  }

  /**
   * Berechnet die Gesamtsumme aller Penalties
   */
  static async getTotalPenalties(): Promise<number> {
    const penalties = await this.getAllPenalties()
    return penalties.reduce((total, penalty) => total + penalty.amount, 0)
  }

  /**
   * Lädt Penalties nach Zeitraum
   */
  static async getPenaltiesByDateRange(startDate: string, endDate: string): Promise<Penalty[]> {
    const allPenalties = await this.getAllPenalties()
    return allPenalties.filter(penalty => 
      penalty.date >= startDate && penalty.date <= endDate
    )
  }

  /**
   * Lädt Penalties nach Grund
   */
  static async getPenaltiesByReason(reason: string): Promise<Penalty[]> {
    const all = await this.getAllPenalties()
    return all.filter(p => p.reason === reason)
  }

  /**
   * Berechnet die durchschnittliche Penalty pro Teilnehmer
   */
  static async getAveragePenaltyPerParticipant(): Promise<number> {
    const penalties = await this.getAllPenalties()
    const uniqueParticipants = new Set(penalties.map(p => p.participantName))
    
    if (uniqueParticipants.size === 0) return 0
    
    const totalAmount = penalties.reduce((sum, penalty) => sum + penalty.amount, 0)
    return totalAmount / uniqueParticipants.size
  }
}

