import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getGoogleDriveClient } from "@/lib/google-drive"

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
    const drive = await getGoogleDriveClient(session.accessToken)
    const res = await drive.files.get({
      fileId: id,
      fields: "id, name",
      supportsAllDrives: true,
    })
    return NextResponse.json({ id: res.data.id, name: res.data.name })
  } catch (error) {
    console.error("Error fetching folder name:", error)
    return NextResponse.json({ error: "Folder not found" }, { status: 404 })
  }
}
