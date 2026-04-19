export type EquipmentStatus = 'OK' | 'WARNING' | 'ALARM' | 'OFFLINE' | 'UNKNOWN'
export type ChatMode = 'ASK' | 'DIAGNOSE' | 'ALARM' | 'MAINTENANCE'
export type SourceType = 'UPLOAD' | 'WEB' | 'SYSTEM'
export type DocStatus = 'PROCESSING' | 'READY' | 'FAILED'
export type AlarmLevel = 'INFO' | 'WARNING' | 'CRITICAL'
export type UserRole = 'admin' | 'manager' | 'journeyman' | 'apprentice'
export type UserStatus = 'pending' | 'active' | 'suspended'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  mentor_id: string | null
  created_at: string
}

export interface Equipment {
  id: string
  store_id: string
  name: string
  manufacturer: string
  model: string
  serial_number?: string | null
  refrigerant?: string | null
  installed_at?: string | null
  location?: string | null
  status: EquipmentStatus
  notes?: string | null
  created_at: string
  // Joined
  active_alarms?: AlarmEvent[]
  latest_readings?: SensorReading[]
  maintenance_logs?: MaintenanceLog[]
}

export interface SensorReading {
  id: string
  equipment_id: string
  reading_type: string
  value: number
  unit: string
  recorded_at: string
}

export interface SensorSnapshot {
  case_temp?: { value: number; unit: string }
  setpoint?: { value: number; unit: string }
  suction_pressure?: { value: number; unit: string }
  superheat?: { value: number; unit: string }
  discharge_temp?: { value: number; unit: string }
  recorded_at?: string
}

export interface AlarmEvent {
  id: string
  equipment_id: string
  code: string
  description?: string | null
  severity: AlarmLevel
  triggered_at: string
  resolved_at?: string | null
}

export interface Document {
  id: string
  equipment_id?: string | null
  store_id?: string | null
  title: string
  source_type: SourceType
  file_name?: string | null
  file_size?: number | null
  page_count?: number | null
  status: DocStatus
  created_at: string
}

export interface MaintenanceLog {
  id: string
  equipment_id: string
  technician_id: string
  title: string
  notes: string | null
  work_done?: string | null
  next_action?: string | null
  performed_at: string
  created_at: string
}

export interface CitationSource {
  documentId: string
  chunkId: string
  pageNumber?: number | null
  title: string
  sourceType: string
  relevanceScore: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: CitationSource[]
  isStreaming?: boolean
}
