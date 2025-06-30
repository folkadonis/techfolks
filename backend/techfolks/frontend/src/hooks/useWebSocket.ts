import { useEffect, useCallback } from 'react'
import { wsService } from '@services/websocket'

export function useWebSocket() {
  useEffect(() => {
    wsService.connect()

    return () => {
      // Don't disconnect on cleanup, as other components might be using it
      // wsService.disconnect()
    }
  }, [])

  const subscribe = useCallback((event: string, callback: Function) => {
    return wsService.on(event, callback)
  }, [])

  const send = useCallback((event: string, data: any) => {
    wsService.send(event, data)
  }, [])

  const unsubscribe = useCallback((event: string, callback?: Function) => {
    wsService.off(event, callback)
  }, [])

  return {
    subscribe,
    send,
    unsubscribe,
  }
}