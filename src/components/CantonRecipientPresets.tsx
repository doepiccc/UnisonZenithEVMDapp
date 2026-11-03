import { Check, Settings2, UserRoundPlus } from 'lucide-react'
import { useMemo } from 'react'
import { useCantonRecipients } from '../context/CantonRecipientsContext'

interface CantonRecipientPresetsProps {
  value: string
  onChange: (partyId: string) => void
  onManage?: () => void
}

export function CantonRecipientPresets({ value, onChange, onManage }: CantonRecipientPresetsProps) {
  const { recipients, activeRecipient, setActiveRecipient } = useCantonRecipients()
  const ordered = useMemo(() => {
    if (!activeRecipient) return recipients
    return [activeRecipient, ...recipients.filter((item) => item.id !== activeRecipient.id)]
  }, [recipients, activeRecipient])

  if (recipients.length === 0) {
    return (
      <button className="recipient-empty-action" type="button" onClick={onManage}>
        <UserRoundPlus size={15} />
        <span><strong>No saved Canton recipient</strong><small>Create a real Party ID or connect a Canton wallet</small></span>
      </button>
    )
  }

  return (
    <div className="recipient-presets">
      <div>
        {ordered.slice(0, 4).map((recipient) => {
          const selected = recipient.partyId === value
          return (
            <button
              type="button"
              className={selected ? 'is-selected' : ''}
              key={recipient.id}
              title={recipient.partyId}
              onClick={() => {
                onChange(recipient.partyId)
                setActiveRecipient(recipient.id)
              }}
            >
              <span>{recipient.name.slice(0, 1).toUpperCase()}</span>
              {recipient.name}
              {selected && <Check size={12} />}
            </button>
          )
        })}
      </div>
      <button className="recipient-presets__manage" type="button" onClick={onManage}>
        <Settings2 size={13} /> Manage
      </button>
    </div>
  )
}
