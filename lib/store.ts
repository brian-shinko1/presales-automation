import type { ProjectType, TeamMember } from "@/types"

const KEYS = {
  projectTypes: (userId: string) => `presales_project_types_${userId}`,
  teamMembers: (userId: string) => `presales_team_members_${userId}`,
}

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : []
  } catch {
    return []
  }
}

function persist<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export const store = {
  projectTypes: {
    get: (userId: string): ProjectType[] => load<ProjectType>(KEYS.projectTypes(userId)),
    set: (userId: string, data: ProjectType[]) => persist(KEYS.projectTypes(userId), data),
  },
  teamMembers: {
    get: (userId: string): TeamMember[] => load<TeamMember>(KEYS.teamMembers(userId)),
    set: (userId: string, data: TeamMember[]) => persist(KEYS.teamMembers(userId), data),
  },
}
