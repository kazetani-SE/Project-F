export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  errorCode: string | null
  timestamp: string
}

export interface PageResponse<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  isFirst: boolean
  isLast: boolean
  hasNext: boolean
}

export type Row = Record<string, unknown> & { id: string }

export interface ClubMember extends Row {
  studentId: string
  fullName: string
  email: string
  department: 'HR' | 'PLAN' | 'MEDIA' | 'ACADEMIC'
  clubRole: 'PRESIDENT' | 'VICEPRESIDENT' | 'MEMBER'
  batch: string
  isActive: boolean
}

export interface EventSeason extends Row {
  seriesId: string | null
  seasonName: string
  title: string
  status: 'PLANNING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  allocatedFund: number
  expectedStartDate: string
  expectedEndDate: string
}
