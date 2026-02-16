import type { Update } from '@tauri-apps/plugin-updater'
import { getVersion } from '@tauri-apps/api/app'
import { check } from '@tauri-apps/plugin-updater'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion?: string
  update?: Update
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    available: false,
    currentVersion: '0.0.0',
  })
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Récupérer la version actuelle au chargement
    getVersion().then((version) => {
      setUpdateInfo(prev => ({ ...prev, currentVersion: version }))
    })
  }, [])

  const checkForUpdates = async (silent = false) => {
    setChecking(true)
    try {
      const update = await check()

      // Si update est null, aucune mise à jour disponible
      // Si update existe, une mise à jour est disponible
      if (update) {
        const latestVersion = update.version
        setUpdateInfo({
          available: true,
          currentVersion: updateInfo.currentVersion,
          latestVersion,
          update,
        })

        if (!silent) {
          toast.success(`Une mise à jour est disponible: v${latestVersion}`)
        }
        return { available: true, update }
      }
      else {
        setUpdateInfo(prev => ({ ...prev, available: false }))
        if (!silent) {
          toast.info('Vous utilisez la dernière version disponible')
        }
        return { available: false, update: null }
      }
    }
    catch (error: any) {
      console.error('Error checking for updates:', error)
      if (!silent) {
        toast.error(
          error.message || 'Erreur lors de la vérification des mises à jour',
        )
      }
      return { available: false, update: null, error }
    }
    finally {
      setChecking(false)
    }
  }

  const downloadUpdate = async () => {
    if (!updateInfo.update) {
      toast.error('Aucune mise à jour disponible')
      return { success: false }
    }

    setDownloading(true)
    try {
      await updateInfo.update.download()
      toast.success('Mise à jour téléchargée avec succès')
      return { success: true }
    }
    catch (error: any) {
      console.error('Error downloading update:', error)
      toast.error(
        error.message || 'Erreur lors du téléchargement de la mise à jour',
      )
      return { success: false, error }
    }
    finally {
      setDownloading(false)
    }
  }

  const installUpdate = async () => {
    if (!updateInfo.update) {
      toast.error('Aucune mise à jour disponible')
      return { success: false }
    }

    setInstalling(true)
    try {
      await updateInfo.update.install()
      toast.success('Mise à jour installée. L\'application va redémarrer...')
      return { success: true }
    }
    catch (error: any) {
      console.error('Error installing update:', error)
      toast.error(
        error.message || 'Erreur lors de l\'installation de la mise à jour',
      )
      return { success: false, error }
    }
    finally {
      setInstalling(false)
    }
  }

  const downloadAndInstall = async () => {
    const downloadResult = await downloadUpdate()
    if (downloadResult.success) {
      return await installUpdate()
    }
    return downloadResult
  }

  return {
    updateInfo,
    checking,
    downloading,
    installing,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    downloadAndInstall,
  }
}
