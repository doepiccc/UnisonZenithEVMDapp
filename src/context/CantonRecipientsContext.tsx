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
import type { CantonRecipient } from '../types'

interface CantonRecipientsContextValue {
  recipients: CantonRecipient[]
  activeRecipient: CantonRecipient | null
  saveRecipient: (recipient: CantonRecipient, makeActive?: boolean) => void
  removeRecipient: (id: string) => void
  setActiveRecipient: (id: string) => void
}

const CantonRecipientsContext = createContext<CantonRecipientsContextValue | null>(null)

export function CantonRecipientsProvider({ children }: { children: ReactNode }) {
  const [recipients, setRecipients] = useState<CantonRecipient[]>(() =>
    readStorage<CantonRecipient[]>(STORAGE_KEYS.cantonRecipients, []),
  )
  const [activeId, setActiveId] = useState<string>(() =>
    readStorage<string>(STORAGE_KEYS.activeCantonRecipient, ''),
  )

  useEffect(() => writeStorage(STORAGE_KEYS.cantonRecipients, recipients), [recipients])
  useEffect(() => writeStorage(STORAGE_KEYS.activeCantonRecipient, activeId), [activeId])

  const saveRecipient = useCallback((recipient: CantonRecipient, makeActive = true) => {
    setRecipients((current) => [
      recipient,
      ...current.filter((item) => item.id !== recipient.id && item.partyId !== recipient.partyId),
    ].slice(0, 25))
    if (makeActive) setActiveId(recipient.id)
  }, [])

  const removeRecipient = useCallback((id: string) => {
    setRecipients((current) => current.filter((item) => item.id !== id))
    setActiveId((current) => (current === id ? '' : current))
  }, [])

  const setActiveRecipient = useCallback((id: string) => setActiveId(id), [])
  const activeRecipient = useMemo(
    () => recipients.find((item) => item.id === activeId) ?? recipients[0] ?? null,
    [recipients, activeId],
  )

  const value = useMemo(
    () => ({ recipients, activeRecipient, saveRecipient, removeRecipient, setActiveRecipient }),
    [recipients, activeRecipient, saveRecipient, removeRecipient, setActiveRecipient],
  )

  return <CantonRecipientsContext.Provider value={value}>{children}</CantonRecipientsContext.Provider>
}

export function useCantonRecipients(): CantonRecipientsContextValue {
  const context = useContext(CantonRecipientsContext)
  if (!context) throw new Error('useCantonRecipients must be used inside CantonRecipientsProvider')
  return context
}
