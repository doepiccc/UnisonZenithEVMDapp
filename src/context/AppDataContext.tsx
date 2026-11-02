import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORAGE_KEYS } from '../lib/constants'
import { readStorage, writeStorage } from '../lib/storage'
import type { SettlementRecord, SettlementRequest } from '../types'

interface AppDataContextValue {
  requests: SettlementRequest[]
  activity: SettlementRecord[]
  addRequest: (request: SettlementRequest) => void
  removeRequest: (id: string) => void
  addActivity: (record: SettlementRecord) => void
  updateActivity: (id: string, patch: Partial<SettlementRecord>) => void
  clearActivity: () => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<SettlementRequest[]>(() =>
    readStorage<SettlementRequest[]>(STORAGE_KEYS.requests, []),
  )
  const [activity, setActivity] = useState<SettlementRecord[]>(() =>
    readStorage<SettlementRecord[]>(STORAGE_KEYS.activity, []),
  )

  useEffect(() => writeStorage(STORAGE_KEYS.requests, requests), [requests])
  useEffect(() => writeStorage(STORAGE_KEYS.activity, activity), [activity])

  const addRequest = useCallback((request: SettlementRequest) => {
    setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)].slice(0, 50))
  }, [])

  const removeRequest = useCallback((id: string) => {
    setRequests((current) => current.filter((item) => item.id !== id))
  }, [])

  const addActivity = useCallback((record: SettlementRecord) => {
    setActivity((current) => [record, ...current.filter((item) => item.id !== record.id)].slice(0, 100))
  }, [])

  const updateActivity = useCallback((id: string, patch: Partial<SettlementRecord>) => {
    setActivity((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const clearActivity = useCallback(() => setActivity([]), [])

  const value = useMemo(
    () => ({
      requests,
      activity,
      addRequest,
      removeRequest,
      addActivity,
      updateActivity,
      clearActivity,
    }),
    [requests, activity, addRequest, removeRequest, addActivity, updateActivity, clearActivity],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used inside AppDataProvider')
  return context
}
