import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { listSubfolders, searchFolders } from "@/lib/google-drive"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parentId = searchParams.get("parentId") || "root"
  const search = searchParams.get("search") || ""

  try {
    const folders = search
      ? await searchFolders(session.accessToken, search)
      : await listSubfolders(session.accessToken, parentId)
    return NextResponse.json({ folders })
  } catch (error) {
    console.error("Error listing folders:", error)
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 })
  }
}
