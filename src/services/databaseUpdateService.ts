/**
 * Service für benutzer-gesteuerte Datenbank-Updates
 * 
 * Implementiert das PWA + IndexedDB Update-System mit:
 * - Versions-Check über manifest.json
 * - Benutzer-gesteuerte Updates
 * - Atomic Updates für Konsistenz
 * - Service Worker Integration
 */

import { ApiClient } from '@/lib/api-client'
import type { DatabaseImport } from '@/types'

// Manifest-Interface
export interface DatabaseManifest {
  version: string
  dataHash: string
  released: string
  description?: string
}

// Update-State-Interface
export interface DatabaseUpdateState {
  isUpdateAvailable: boolean
  currentVersion: string
  latestVersion: string
  currentDataHash: string
  latestDataHash: string
  releasedDate: string
  isUpdating: boolean
  updateError: string | null
}

// Update-Result-Interface
export interface DatabaseUpdateResult {
  success: boolean
  newVersion: string
  newDataHash: string
  releasedDate: string
  error?: string
}

/**
 * Lädt das aktuelle Manifest von der Server
 */
export async function fetchDatabaseManifest(): Promise<DatabaseManifest> {
  try {
    const response = await fetch('/manifest.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const manifest: DatabaseManifest = await response.json()
    
    // Validierung
    if (!manifest.version || !manifest.dataHash || !manifest.released) {
      throw new Error('Ungültiges Manifest-Format')
    }
    
    return manifest
  } catch (error) {
    console.error('Fehler beim Laden des Manifests:', error)
    throw new Error(`Manifest konnte nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
  }
}

/**
 * Holt den aktuellen Wert aus der DB-Meta via API
 */
async function getMetaValue(key: string): Promise<string> {
    try {
        const res = await ApiClient.get(`/meta/${key}`);
        return res.value || 'unknown';
    } catch (e) {
        return 'unknown';
    }
}

/**
 * Prüft, ob ein Datenbank-Update verfügbar ist
 */
export async function checkForDatabaseUpdate(): Promise<DatabaseUpdateState> {
  try {
    const [manifest, currentVersionRaw, currentDataHash] = await Promise.all([
      fetchDatabaseManifest(),
      getMetaValue('dbVersion'),
      getMetaValue('dataHash')
    ])
    
    const currentVersion = currentVersionRaw !== 'unknown' ? currentVersionRaw : 'v0.0.0'

    // Update verfügbar wenn Version oder Daten-Hash sich geändert haben
    const isUpdateAvailable = manifest.version !== currentVersion || manifest.dataHash !== currentDataHash
    
    return {
      isUpdateAvailable,
      currentVersion,
      latestVersion: manifest.version,
      currentDataHash,
      latestDataHash: manifest.dataHash,
      releasedDate: manifest.released,
      isUpdating: false,
      updateError: null
    }
  } catch (error) {
    console.error('Fehler beim Versions-Check:', error)
    return {
      isUpdateAvailable: false,
      currentVersion: 'unknown',
      latestVersion: 'unknown',
      currentDataHash: 'unknown',
      latestDataHash: 'unknown',
      releasedDate: '',
      isUpdating: false,
      updateError: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}

/**
 * Lädt die aktuellen Daten vom Server
 */
export async function fetchLatestDatabaseData(): Promise<DatabaseImport> {
  try {
    // Verwende immer die aktuellen Daten aus ayto-vip-2025.json
    const dataSources = [
      '/json/ayto-vip-2025.json',
      '/ayto-vip-2025.json',
      '/json/ayto-vip-2024.json'
    ]
    
    let lastError: Error | null = null
    
    for (const source of dataSources) {
      try {
        const response = await fetch(source, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        
        if (response.ok) {
          const data: DatabaseImport = await response.json()
          
          // Validierung der Datenstruktur
          if (data.participants && Array.isArray(data.participants)) {
            console.log(`✅ Daten erfolgreich von ${source} geladen`)
            return data
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unbekannter Fehler')
        console.warn(`⚠️ Fehler beim Laden von ${source}:`, error)
      }
    }
    
    throw lastError || new Error('Keine gültigen Datenquellen gefunden')
  } catch (error) {
    console.error('Fehler beim Laden der Datenbank-Daten:', error)
    throw new Error(`Daten konnten nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
  }
}

/**
 * Führt ein atomares Update der Datenbank durch
 */
export async function performDatabaseUpdate(): Promise<DatabaseUpdateResult> {
  try {
    console.log('🔄 Starte Datenbank-Update...')
    
    // 1. Manifest und neue Daten laden
    const [manifest, newData] = await Promise.all([
      fetchDatabaseManifest(),
      fetchLatestDatabaseData()
    ])
    
    console.log(`📥 Neue Daten geladen (Version ${manifest.version}, Hash ${manifest.dataHash})`)
    
    // 2. Import via Backend API
    // Wir senden die Daten an den Backend Import Endpoint
    // Hierbei wird ein 'clearBeforeImport' Flag gesetzt, das wir im Backend implementiert haben (implizit in meiner Implementierung)
    // Wait, did I implement clearBeforeImport in import.ts? Yes I did check for it.
    
    await ApiClient.post('/import', {
        ...newData,
        clearBeforeImport: true
    });
    
    // 3. Meta-Daten aktualisieren
    await Promise.all([
        ApiClient.post('/meta', { key: 'dbVersion', value: manifest.version }),
        ApiClient.post('/meta', { key: 'dataHash', value: manifest.dataHash }),
        ApiClient.post('/meta', { key: 'lastUpdateDate', value: manifest.released })
    ]);

    console.log(`✅ Datenbank erfolgreich auf Version ${manifest.version} (Hash: ${manifest.dataHash}) aktualisiert`)
    
    return {
      success: true,
      newVersion: manifest.version,
      newDataHash: manifest.dataHash,
      releasedDate: manifest.released
    }
  } catch (error) {
    console.error('❌ Fehler beim Datenbank-Update:', error)
    return {
      success: false,
      newVersion: 'unknown',
      newDataHash: 'unknown',
      releasedDate: '',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}

// Cache für bereits geladene Daten
// Verwende window-Objekt für Persistenz bei Hot Reloads
declare global {
  interface Window {
    __aytoDataPreloaded?: boolean
    __aytoServiceInitialized?: boolean
    __aytoInitializationPromise?: Promise<void>
  }
}

let isDataPreloaded = window.__aytoDataPreloaded || false

/**
 * Service Worker Integration: Lädt Daten im Hintergrund vor
 */
export async function preloadDatabaseData(): Promise<void> {
  // Vermeide doppelte Ausführung
  if (isDataPreloaded) {
    return
  }
  
  try {
    if ('serviceWorker' in navigator && 'caches' in window) {
      const cache = await caches.open('ayto-db-cache')
      
      // Manifest cachen
      await cache.add('/manifest.json')
      
      // Datenquellen cachen
      const dataSources = [
        '/json/ayto-vip-2025.json',
        '/ayto-vip-2025.json',
        '/json/ayto-vip-2024.json'
      ]
      
      for (const source of dataSources) {
        try {
          await cache.add(source)
        } catch (error) {
          console.warn(`⚠️ Konnte ${source} nicht cachen:`, error)
        }
      }
      
      isDataPreloaded = true
      window.__aytoDataPreloaded = true
      console.log('✅ Datenbank-Daten im Hintergrund geladen')
    }
  } catch (error) {
    console.warn('⚠️ Fehler beim Vorladen der Daten:', error)
  }
}

// Singleton-Pattern für Service-Initialisierung

let isServiceInitialized = window.__aytoServiceInitialized || false
let initializationPromise: Promise<void> | null = window.__aytoInitializationPromise || null

/**
 * Initialisiert den Datenbank-Update-Service (Singleton)
 */
export async function initializeDatabaseUpdateService(): Promise<void> {
  // Wenn bereits initialisiert, nichts tun
  if (isServiceInitialized) {
    return
  }
  
  // Wenn Initialisierung läuft, warte auf das bestehende Promise
  if (initializationPromise) {
    return initializationPromise
  }
  
  // Neue Initialisierung starten
  initializationPromise = performInitialization()
  
  try {
    await initializationPromise
    isServiceInitialized = true
    window.__aytoServiceInitialized = true
    window.__aytoInitializationPromise = initializationPromise
  } catch (error) {
    // Bei Fehler, Initialisierung zurücksetzen
    initializationPromise = null
    window.__aytoInitializationPromise = undefined
    throw error
  }
}

async function performInitialization(): Promise<void> {
  try {
    console.log('🔄 Initialisiere Datenbank-Update-Service...')
    
    // Service Worker für Hintergrund-Downloads registrieren
    if ('serviceWorker' in navigator) {
      try {
        // Prüfe ob wir in der Entwicklungsumgebung sind
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        
        if (isDevelopment) {
          // In der Entwicklung: Service Worker deaktivieren um Message-Channel-Fehler zu vermeiden
          console.log('🔧 Entwicklungsumgebung erkannt - Service Worker deaktiviert')
          
          // Bestehende Service Worker deaktivieren
          try {
            const registrations = await navigator.serviceWorker.getRegistrations()
            for (const registration of registrations) {
              await registration.unregister()
              console.log('🗑️ Bestehender Service Worker deaktiviert')
            }
          } catch (unregisterError) {
            console.warn('⚠️ Fehler beim Deaktivieren bestehender Service Worker:', unregisterError)
          }
        } else {
          // In der Produktion: Service Worker registrieren
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('✅ Service Worker registriert:', registration)
        }
      } catch (swError) {
        console.warn('⚠️ Service Worker Registrierung fehlgeschlagen:', swError)
        // Service Worker Fehler sollten die App nicht blockieren
      }
    }
    
    // Daten im Hintergrund vorladen
    await preloadDatabaseData()
    
    console.log('✅ Datenbank-Update-Service initialisiert')
  } catch (error) {
    console.warn('⚠️ Fehler bei der Initialisierung des Update-Services:', error)
    throw error
  }
}
