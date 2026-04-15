import { useState, useEffect, useCallback, useRef } from 'react'
import { FilterState, DEFAULT_FILTER_STATE } from '@/lib/filterTypes'

const STORAGE_KEY_PREFIX = 'conference_filters'

function getStorageKey(conferenceId: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}_${conferenceId || 'unknown'}`
}

export function useFilterPersistence(conferenceId: string | undefined) {
  // Initialize from Session Storage or defaults
  const [filterState, setFilterState] = useState<FilterState>(() => {
    if (!conferenceId) return DEFAULT_FILTER_STATE

    try {
      const stored = sessionStorage.getItem(getStorageKey(conferenceId))
      if (stored) {
        return { ...DEFAULT_FILTER_STATE, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to restore filters from Session Storage:', error)
    }

    return DEFAULT_FILTER_STATE
  })

  // Track initial mount to prevent unnecessary saves
  const isInitialMount = useRef(true)

  // Save to Session Storage on state change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!conferenceId) return

    try {
      sessionStorage.setItem(
        getStorageKey(conferenceId),
        JSON.stringify(filterState)
      )
    } catch (error) {
      console.error('Failed to save filters to Session Storage:', error)
    }
  }, [filterState, conferenceId])

  // Return individual setters for convenience
  return {
    ...filterState,
    setSearchQuery: useCallback((searchQuery: string) => {
      setFilterState(prev => ({ ...prev, searchQuery }))
    }, []),
    setSearchOpen: useCallback((searchOpen: boolean) => {
      setFilterState(prev => ({ ...prev, searchOpen }))
    }, []),
    setPriorityFilter: useCallback((priorityFilter: FilterState['priorityFilter']) => {
      setFilterState(prev => ({ ...prev, priorityFilter }))
    }, []),
    setStatusFilter: useCallback((statusFilter: FilterState['statusFilter']) => {
      setFilterState(prev => ({ ...prev, statusFilter }))
    }, []),
    setCompanyFilter: useCallback((companyFilter: string | null) => {
      setFilterState(prev => ({ ...prev, companyFilter }))
    }, []),
    setSort: useCallback((sort: FilterState['sort']) => {
      setFilterState(prev => ({ ...prev, sort }))
    }, []),
    setShowSortMenu: useCallback((showSortMenu: boolean) => {
      setFilterState(prev => ({ ...prev, showSortMenu }))
    }, []),
    clearFilters: useCallback(() => {
      setFilterState(DEFAULT_FILTER_STATE)
    }, []),
  }
}
