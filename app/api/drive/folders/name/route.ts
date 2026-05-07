export const runtime = "edge"

import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } }
    )
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    return NextResponse.json({ id: data.id, name: data.name })
  } catch (error) {
    console.error("Error fetching folder name:", error)
    return NextResponse.json({ error: "Folder not found" }, { status: 404 })
  }
}
