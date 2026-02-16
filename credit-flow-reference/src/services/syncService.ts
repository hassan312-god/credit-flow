/**
 * Service de synchronisation bidirectionnelle
 * Synchronise les données entre le stockage local et Supabase
 */

import { supabase } from '@/integrations/supabase/client'
import {
  getMetadata,
  getUnsyncedData,
  initLocalDB,
  markAsSynced,
  saveMetadata,
  saveToLocal,
  STORES,
} from './localStorage'

export interface SyncResult {
  success: boolean
  synced: number
  errors: number
  message?: string
}

/**
 * Synchronise les données d'une table spécifique
 */
export async function syncTable(tableName: string): Promise<SyncResult> {
  // S'assurer que la base de données est initialisée
  const database = await initLocalDB()

  const storeName = STORES[tableName as keyof typeof STORES]
  if (!storeName) {
    return {
      success: false,
      synced: 0,
      errors: 0,
      message: `Table ${tableName} non supportée`,
    }
  }

  // Vérifier que le store existe
  if (!database.objectStoreNames.contains(storeName)) {
    return {
      success: false,
      synced: 0,
      errors: 0,
      message: `Store ${storeName} n'existe pas. Veuillez rafraîchir la page.`,
    }
  }

  let synced = 0
  let errors = 0

  try {
    // 1. Récupérer les données non synchronisées du local
    const unsyncedLocal = await getUnsyncedData(storeName)

    // 2. Synchroniser les données locales vers Supabase
    for (const item of unsyncedLocal) {
      try {
        // Vérifier si l'item existe déjà (pour les updates)
        const { data: existing } = await supabase
          .from(tableName as any)
          .select('id')
          .eq('id', item.id)
          .maybeSingle()

        if (existing) {
          // Update
          const { error } = await supabase
            .from(tableName as any)
            .update(item)
            .eq('id', item.id)

          if (error)
            throw error
        }
        else {
          // Insert
          const { error } = await supabase
            .from(tableName as any)
            .insert(item)

          if (error)
            throw error
        }

        // Marquer comme synchronisé
        await markAsSynced(storeName, item.id)
        synced++
      }
      catch (error: any) {
        console.error(`Error syncing item ${item.id}:`, error)
        errors++
      }
    }

    // 3. Récupérer les dernières données de Supabase
    const lastSync = await getMetadata(`last_sync_${tableName}`) || 0

    const { data: remoteData, error: fetchError } = await supabase
      .from(tableName as any)
      .select('*')
      .gt('updated_at', new Date(lastSync).toISOString())
      .order('updated_at', { ascending: false })
      .limit(100)

    if (fetchError) {
      console.error(`Error fetching remote data for ${tableName}:`, fetchError)
    }
    else if (remoteData) {
      // Sauvegarder les nouvelles données dans le local
      await saveToLocal(storeName, remoteData as unknown as { id: string }[], true)

      // Mettre à jour le timestamp de dernière synchronisation
      await saveMetadata(`last_sync_${tableName}`, Date.now())
    }

    return {
      success: errors === 0,
      synced: synced + (remoteData?.length || 0),
      errors,
    }
  }
  catch (error: any) {
    return {
      success: false,
      synced,
      errors,
      message: error.message,
    }
  }
}

/**
 * Synchronise toutes les tables
 */
export async function syncAll(): Promise<SyncResult> {
  // S'assurer que la base de données est initialisée
  await initLocalDB()

  let totalSynced = 0
  let totalErrors = 0
  const errors: string[] = []

  const tables = ['clients', 'loans', 'payments', 'payment_schedule']

  for (const table of tables) {
    try {
      const result = await syncTable(table)
      totalSynced += result.synced
      totalErrors += result.errors
      if (result.message) {
        errors.push(`${table}: ${result.message}`)
      }
    }
    catch (error: any) {
      totalErrors++
      errors.push(`${table}: ${error.message}`)
    }
  }

  return {
    success: totalErrors === 0,
    synced: totalSynced,
    errors: totalErrors,
    message: errors.length > 0 ? errors.join('; ') : undefined,
  }
}

/**
 * Télécharge toutes les données depuis Supabase et les sauvegarde localement
 */
export async function downloadAllData(): Promise<SyncResult> {
  // S'assurer que la base de données est initialisée
  const database = await initLocalDB()

  // Vérifier que tous les stores existent
  const missingStores = Object.values(STORES).filter(
    storeName => !database.objectStoreNames.contains(storeName),
  )

  if (missingStores.length > 0) {
    return {
      success: false,
      synced: 0,
      errors: 1,
      message: `Stores manquants: ${missingStores.join(', ')}. Veuillez rafraîchir la page.`,
    }
  }

  let totalSynced = 0
  const totalErrors = 0

  try {
    // Télécharger les clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (clientsError)
      throw clientsError
    if (clients) {
      await saveToLocal(STORES.clients, clients, true)
      totalSynced += clients.length
      await saveMetadata('last_sync_clients', Date.now())
    }

    // Télécharger les prêts
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (loansError)
      throw loansError
    if (loans) {
      await saveToLocal(STORES.loans, loans, true)
      totalSynced += loans.length
      await saveMetadata('last_sync_loans', Date.now())
    }

    // Télécharger les paiements
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (paymentsError)
      throw paymentsError
    if (payments) {
      await saveToLocal(STORES.payments, payments, true)
      totalSynced += payments.length
      await saveMetadata('last_sync_payments', Date.now())
    }

    // Télécharger les échéanciers
    const { data: schedules, error: schedulesError } = await supabase
      .from('payment_schedule')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5000)

    if (schedulesError)
      throw schedulesError
    if (schedules) {
      await saveToLocal(STORES.payment_schedule, schedules, true)
      totalSynced += schedules.length
      await saveMetadata('last_sync_payment_schedule', Date.now())
    }

    return {
      success: true,
      synced: totalSynced,
      errors: totalErrors,
    }
  }
  catch (error: any) {
    return {
      success: false,
      synced: totalSynced,
      errors: totalErrors + 1,
      message: error.message,
    }
  }
}

/**
 * Vérifie si une opération nécessite une connexion
 */
export function requiresOnline(operation: string): boolean {
  const onlineOnlyOperations = [
    'validate_loan',
    'reject_loan',
    'create_user',
    'update_user',
    'delete_user',
    'update_settings',
  ]

  return onlineOnlyOperations.includes(operation)
}
