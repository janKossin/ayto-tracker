import { ApiClient } from '@/lib/api-client';
import { ParticipantService } from '@/services/participantService';
import { MatchingNightService } from '@/services/matchingNightService';
import { MatchboxService } from '@/services/matchboxService';
import { PenaltyService } from '@/services/penaltyService';
import { BroadcastNoteService } from '@/services/broadcastNoteService';
import type { Participant, Matchbox, MatchingNight, Penalty, BroadcastNote } from '@/types';

// Interface für die JSON-Import-Daten
export interface JsonImportData {
  participants: Participant[]
  matchboxes: (Matchbox | { womanId: string; manId: string; [key: string]: any })[]
  matchingNights: MatchingNight[]
  penalties: Penalty[]
  broadcastNotes?: BroadcastNote[]
}

/**
 * Lädt eine spezifische JSON-Datei und importiert die Daten in die Datenbank via API
 * @param fileName - Der Name der JSON-Datei (z.B. "ayto-complete-export-2025-09-08.json")
 * @param version - Die Version für die neue JSON-Datei (z.B. "0.2.1")
 * @returns Promise<boolean> - true wenn erfolgreich, false bei Fehler
 */
export async function importJsonDataForVersion(fileName: string, version: string): Promise<boolean> {
  try {
    // Lade die spezifische JSON-Datei (ohne Cache) und mit Cache-Busting
    const response = await fetch(`/json/${fileName}?t=${Date.now()}`, { cache: 'no-store' })
    
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der JSON-Datei ${fileName}: ${response.statusText}`)
    }
    
    const rawData: unknown = await response.json()
    
    let jsonData: JsonImportData
    
    if (Array.isArray(rawData)) {
      console.log(`📥 JSON-Datei im Array-Format erkannt (${rawData.length} Teilnehmer)`)
      jsonData = {
        participants: rawData as Participant[],
        matchboxes: [],
        matchingNights: [],
        penalties: []
      }
    } else if (rawData && typeof rawData === 'object' && 'participants' in rawData) {
      console.log(`📥 JSON-Datei im Objekt-Format erkannt`)
      jsonData = rawData as JsonImportData
    } else {
      throw new Error('Ungültiges JSON-Format: Erwartet wird entweder ein Array von Teilnehmern oder ein Objekt mit participants, matchboxes, etc.')
    }
    
    // Normalisiere Daten bevor sie an die API gesendet werden
    const normalizedData: JsonImportData = {
      participants: [],
      matchboxes: [],
      matchingNights: [],
      penalties: [],
      broadcastNotes: []
    };

    if (jsonData.participants && jsonData.participants.length > 0) {
      normalizedData.participants = jsonData.participants.map((participant: any) => {
        let gender = participant.gender;
        if (gender === 'w' || gender === 'weiblich' || gender === 'female') {
          gender = 'F';
        } else if (gender === 'm' || gender === 'männlich' || gender === 'male') {
          gender = 'M';
        }
        
        let status = participant.status || 'Aktiv';
        if (typeof status === 'string') {
          const statusLower = status.toLowerCase();
          if (statusLower === 'aktiv' || statusLower === 'active') {
             status = 'Aktiv';
          } else if (statusLower === 'inaktiv' || statusLower === 'inactive') {
             status = 'Inaktiv';
          } else if (statusLower === 'perfekt match' || statusLower === 'perfect match') {
             status = 'Perfekt Match';
          }
        }
        
        return {
          id: participant.id,
          name: participant.name || 'Unbekannt',
          knownFrom: participant.knownFrom || '',
          age: participant.age ? parseInt(participant.age.toString(), 10) : undefined,
          status: status,
          active: participant.active !== false,
          photoUrl: participant.photoUrl || '',
          source: participant.source || '',
          bio: participant.bio || '',
          gender: gender || 'F',
          socialMediaAccount: participant.socialMediaAccount || '',
          freeProfilePhotoUrl: participant.freeProfilePhotoUrl || ''
        };
      });
    }

    if (jsonData.matchingNights && jsonData.matchingNights.length > 0) {
      normalizedData.matchingNights = jsonData.matchingNights.map((night: any) => ({
        ...night,
        // Ensure date is present (backend requires it). Fallback to ausstrahlungsdatum or current date.
        date: night.date || night.ausstrahlungsdatum || new Date().toISOString().split('T')[0],
        createdAt: night.createdAt ? new Date(night.createdAt) : new Date()
      }));
    }

    if (jsonData.matchboxes && jsonData.matchboxes.length > 0) {
      normalizedData.matchboxes = jsonData.matchboxes.map((box: any) => ({
        ...box,
        woman: box.womanId || box.woman,
        man: box.manId || box.man,
        womanId: undefined, // Remove old fields
        manId: undefined,
        createdAt: box.createdAt ? new Date(box.createdAt) : new Date(),
        updatedAt: box.updatedAt ? new Date(box.updatedAt) : new Date()
      }));
    }

    if (jsonData.penalties && jsonData.penalties.length > 0) {
      normalizedData.penalties = jsonData.penalties.map((penalty: any) => ({
        ...penalty,
        createdAt: penalty.createdAt ? new Date(penalty.createdAt) : new Date()
      }));
    }

    if (jsonData.broadcastNotes && jsonData.broadcastNotes.length > 0) {
      normalizedData.broadcastNotes = jsonData.broadcastNotes.map((note: any) => ({
        ...note,
        createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
        updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date()
      }));
    }

    // Sende Daten an Backend API mit clearBeforeImport Flag
    await ApiClient.post('/import', {
      ...normalizedData,
      clearBeforeImport: true
    });
    
    console.log(`✅ JSON-Daten erfolgreich für Version ${version} via API importiert`);
    console.log(`   📊 ${normalizedData.participants.length} Teilnehmer`);
    console.log(`   📊 ${normalizedData.matchboxes.length} Matchboxes`);
    console.log(`   📊 ${normalizedData.matchingNights.length} Matching Nights`);
    console.log(`   📊 ${normalizedData.penalties.length} Strafen`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Fehler beim Importieren der JSON-Daten:', error)
    console.error('Fehler-Details:', error instanceof Error ? error.message : String(error))
    return false
  }
}

export async function createVersionWithJsonImport(fileName: string, version: string): Promise<boolean> {
  try {
    const importSuccess = await importJsonDataForVersion(fileName, version)
    
    if (!importSuccess) {
      throw new Error('JSON-Import fehlgeschlagen')
    }
    
    console.log(`✅ Version ${version} mit JSON-Import aus ${fileName} erfolgreich erstellt`)
    return true
    
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen der Version ${version} mit ${fileName}:`, error)
    return false
  }
}

export async function exportCurrentDatabaseState(): Promise<{success: boolean, fileName?: string, error?: string}> {
  try {
    const [participantsData, matchingNightsData, matchboxesData, penaltiesData, broadcastNotesData] = await Promise.all([
      ParticipantService.getAllParticipants(),
      MatchingNightService.getAllMatchingNights(),
      MatchboxService.getAllMatchboxes(),
      PenaltyService.getAllPenalties(),
      BroadcastNoteService.getAllBroadcastNotes()
    ])
    
    const transformedMatchboxes = matchboxesData.map(m => ({
      id: m.id,
      woman: m.woman,
      man: m.man,
      matchType: m.matchType,
      price: m.price,
      buyer: m.buyer,
      ausstrahlungsdatum: m.ausstrahlungsdatum,
      ausstrahlungszeit: m.ausstrahlungszeit,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }))
    
    const allData: JsonImportData = {
      participants: participantsData,
      matchingNights: matchingNightsData,
      matchboxes: transformedMatchboxes,
      penalties: penaltiesData,
      broadcastNotes: broadcastNotesData
    }
    
    const today = new Date().toISOString().split('T')[0]
    const fileName = `ayto-complete-export-${today}.json`
    const jsonString = JSON.stringify(allData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    
    await updateIndexJson(fileName)
    
    return { success: true, fileName }
    
  } catch (error) {
    console.error('❌ Fehler beim Exportieren des Datenbankstands:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    }
  }
}

async function updateIndexJson(fileName: string): Promise<void> {
  try {
    const response = await fetch('/json/index.json')
    let currentFiles: string[] = []
    
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        currentFiles = data
      }
    }
    
    if (!currentFiles.includes(fileName)) {
      currentFiles.unshift(fileName)
      currentFiles = currentFiles.slice(0, 5)
      console.log(`📝 Index.json würde aktualisiert werden mit:`, currentFiles)
    }
  } catch (error) {
    console.warn('⚠️ Konnte index.json nicht aktualisieren:', error)
  }
}

export async function getAvailableJsonFiles(): Promise<string[]> {
  try {
    const manifestResponse = await fetch('/json/index.json', { cache: 'no-store' })
    if (manifestResponse.ok) {
      const manifestType = manifestResponse.headers.get('content-type') || ''
      if (!manifestType.includes('application/json')) {
        console.warn('Manifest /json/index.json hat unerwarteten Content-Type:', manifestType)
      } else {
        const files: unknown = await manifestResponse.json()
        if (Array.isArray(files)) {
          const checks = await Promise.all(files.map(async (name) => {
            try {
              if (typeof name !== 'string') return null
              const url = `/json/${name}`
              const res = await fetch(url, { cache: 'no-store' })
              if (!res.ok) return null
              const type = res.headers.get('content-type') || ''
              return type.includes('application/json') ? name : null
            } catch {
              return null
            }
          }))
          return checks.filter((n): n is string => Boolean(n))
        }
      }
    }
    return []
  } catch (error) {
    console.error('Fehler beim Laden der verfügbaren JSON-Dateien:', error)
    return []
  }
}
