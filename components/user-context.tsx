"use client"

import { createContext, useContext } from "react"

const UserContext = createContext<string>("")

export function UserProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  return <UserContext.Provider value={userId}>{children}</UserContext.Provider>
}

export function useUserId(): string {
  return useContext(UserContext)
}
