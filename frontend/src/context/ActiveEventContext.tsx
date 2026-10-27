import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getData } from '../services/apiClient'
import type { EventSeason, PageResponse } from '../types/api'

interface ActiveEventState {
  currentEvent: EventSeason | null
  events: EventSeason[]
  isLoading: boolean
  setCurrentEvent: (event: EventSeason) => void
  reload: () => Promise<void>
}

const ActiveEventContext = createContext<ActiveEventState | null>(null)

export function ActiveEventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventSeason[]>([])
  const [currentEvent, setEvent] = useState<EventSeason | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function reload() {
    setIsLoading(true)
    try {
      const page = await getData<PageResponse<EventSeason>>('/events?size=100')
      setEvents(page.items)
      const saved = localStorage.getItem('project-f-active-event')
      setEvent(page.items.find((item) => item.id === saved) || page.items[0] || null)
    } finally { setIsLoading(false) }
  }

  function setCurrentEvent(event: EventSeason) {
    setEvent(event)
    localStorage.setItem('project-f-active-event', event.id)
  }

  useEffect(() => { void reload().catch(() => setIsLoading(false)) }, [])

  return <ActiveEventContext.Provider value={{ currentEvent, events, isLoading, setCurrentEvent, reload }}>
    {children}
  </ActiveEventContext.Provider>
}

export function useActiveEvent() {
  const context = useContext(ActiveEventContext)
  if (!context) throw new Error('ActiveEventProvider missing')
  return context
}
