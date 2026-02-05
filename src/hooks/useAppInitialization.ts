/**
 * Custom Hook für die App-Initialisierung
 * 
 * Kapselt die gesamte Bootstrap-Logik und Datenbank-Initialisierung.
 * Folgt dem Single Responsibility Principle.
 */

import { useEffect, useState } from 'react'
import { ApiClient } from '@/lib/api-client'

interface UseAppInitializationResult {
  isInitializing: boolean
  initError: string | null
}

/**
 * Hook für die App-Initialisierung
 * 
 * Verantwortlichkeiten:
 * - Prüfung, ob Datenbank initialisiert ist
 * - Kein automatisches Laden von Seed-Daten
 */
export function useAppInitialization(): UseAppInitializationResult {
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        console.log('🚀 Starte App-Initialisierung...')
        
        // Prüfe Backend-Status über Stats Endpoint
        try {
          // Versuche Stats zu laden, um zu sehen ob Daten da sind
          // Wenn der Endpoint 404 liefert (weil noch nicht deployed?), fangen wir das ab.
          // Wir nehmen an /stats gibt { participants: number, ... } zurück
          const stats = await ApiClient.get('/stats') as { participants: number }
          const isEmpty = !stats || stats.participants === 0
          
          if (isEmpty) {
            console.log('📭 Datenbank ist leer')
          } else {
            console.log('✅ Datenbank bereits initialisiert')
          }
        } catch (e) {
          console.warn('Backend nicht erreichbar oder Fehler beim Check:', e)
          // Wir lassen die App trotzdem starten, vielleicht ist das Backend down
          // aber wir wollen nicht komplett blockieren (oder doch?)
          // Fürs erste loggen wir nur.
        }
        
        console.log('✅ App-Initialisierung abgeschlossen')
      } catch (err: unknown) {
        console.error('❌ Bootstrap-Fehler:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler beim Initialisieren'
        setInitError(errorMessage)
      } finally {
        setIsInitializing(false)
      }
    }

    bootstrap()
  }, [])

  return { isInitializing, initError }
}

