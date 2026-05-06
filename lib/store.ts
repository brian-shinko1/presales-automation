import type { ProjectType, TeamMember } from "@/types"

const KEYS = {
  projectTypes: "presales_project_types",
  teamMembers: "presales_team_members",
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
    get: (): ProjectType[] => load<ProjectType>(KEYS.projectTypes),
    set: (data: ProjectType[]) => persist(KEYS.projectTypes, data),
  },
  teamMembers: {
    get: (): TeamMember[] => load<TeamMember>(KEYS.teamMembers),
    set: (data: TeamMember[]) => persist(KEYS.teamMembers, data),
  },
}
