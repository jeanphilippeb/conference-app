import { Priority } from './types'

export type SortKey = 'priority' | 'name' | 'company' | 'recent'
export type PriorityFilter = 'all' | Priority
export type StatusFilter = 'all' | 'met' | 'not_met' | 'contacted'

export interface FilterState {
  searchQuery: string
  searchOpen: boolean
  priorityFilter: PriorityFilter
  statusFilter: StatusFilter
  companyFilter: string | null
  sort: SortKey
  showSortMenu: boolean
}

export const DEFAULT_FILTER_STATE: FilterState = {
  searchQuery: '',
  searchOpen: false,
  priorityFilter: 'all',
  statusFilter: 'all',
  companyFilter: null,
  sort: 'priority',
  showSortMenu: false,
}
