"use client"

import { useEffect, useRef } from "react"
import { config } from "@/lib/config"

interface RealTimeUpdaterProps {
  onDataUpdate?: () => void
}

export function RealTimeUpdater({ onDataUpdate }: RealTimeUpdaterProps) {
  const intervalRef = useRef<NodeJS.Timeout>()
  const isRunningRef = useRef(false)

  useEffect(() => {
    // Start background sync
    startBackgroundSync()

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const startBackgroundSync = () => {
    // Initial sync
    performSync()

    // Set up periodic sync
    intervalRef.current = setInterval(() => {
      performSync()
    }, config.scraping.stockUpdateInterval)
  }

  const performSync = async () => {
    // Prevent multiple concurrent syncs
    if (isRunningRef.current) {
      console.log('Sync already in progress, skipping...')
      return
    }

    isRunningRef.current = true

    try {
      console.log('🔄 Starting background data sync...')
      
      const response = await fetch('/api/sync-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Background sync completed:', result.message)
        
        // Notify parent component of data update
        if (onDataUpdate) {
          onDataUpdate()
        }
      } else {
        console.error('❌ Background sync failed:', response.statusText)
      }
    } catch (error) {
      console.error('❌ Background sync error:', error)
    } finally {
      isRunningRef.current = false
    }
  }

  // This component doesn't render anything visible
  return null
}
