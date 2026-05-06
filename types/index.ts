export interface ProjectType {
  id: string
  name: string
  description: string
  deliverables: string[]
  inclusions: string[]
  exclusions: string[]
  assumptions: string[]
}

export interface TeamMember {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  hourlyRate: number
}
