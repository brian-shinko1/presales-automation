export const runtime = "edge"

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { listDriveItems, searchDriveFiles } from "@/lib/google-drive"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parentId = searchParams.get("parentId") || "root"
  const search = searchParams.get("search") || ""

  try {
    const items = search
      ? await searchDriveFiles(session.accessToken, search)
      : await listDriveItems(session.accessToken, parentId)
    return NextResponse.json({ items })
  } catch (error) {
    console.error("Error listing items:", error)
    return NextResponse.json({ error: "Failed to list items" }, { status: 500 })
  }
}
