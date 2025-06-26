import { useState, useEffect, useCallback } from 'react'
import { ChatbotIndex, saveIndex as saveIndexToStorage, getIndexes as getIndexesFromStorage, deleteIndex as deleteIndexFromStorage } from '@/lib/storage'

export function useStorage() {
  const [indexes, setIndexes] = useState<ChatbotIndex[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load indexes on mount
  const loadIndexes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const loadedIndexes = await getIndexesFromStorage()
      setIndexes(loadedIndexes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load indexes')
    } finally {
      setLoading(false)
    }
  }, [])

  // Save a new index
  const saveIndex = useCallback(async (index: ChatbotIndex) => {
    try {
      await saveIndexToStorage(index)
      // Reload indexes to reflect changes
      await loadIndexes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save index')
      throw err
    }
  }, [loadIndexes])

  // Delete an index
  const deleteIndex = useCallback(async (namespace: string) => {
    try {
      await deleteIndexFromStorage(namespace)
      // Remove from local state immediately for better UX
      setIndexes(prev => prev.filter(idx => idx.namespace !== namespace))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete index')
      throw err
    }
  }, [])

  // Clear all indexes
  const clearAllIndexes = useCallback(async () => {
    try {
      // Delete each index individually
      for (const index of indexes) {
        await deleteIndexFromStorage(index.namespace)
      }
      setIndexes([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear indexes')
      throw err
    }
  }, [indexes])

  // Get index by namespace
  const getIndex = useCallback((namespace: string): ChatbotIndex | undefined => {
    return indexes.find(idx => idx.namespace === namespace)
  }, [indexes])

  // Refresh indexes
  const refresh = useCallback(() => {
    loadIndexes()
  }, [loadIndexes])

  useEffect(() => {
    loadIndexes()
  }, [loadIndexes])

  return {
    indexes,
    loading,
    error,
    saveIndex,
    deleteIndex,
    clearAllIndexes,
    getIndex,
    refresh,
  }
} 