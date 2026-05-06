import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { uploadToGoogleDrive, listDriveFiles, createFolder } from "@/lib/google-drive"

export async function GET() {
  const session = await auth()
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const files = await listDriveFiles(
      session.accessToken,
      "mimeType='application/json' or mimeType='application/vnd.google-apps.folder'"
    )
    
    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error listing files:", error)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, fileName, content, folderName, parentFolderId } = body

    if (action === "upload") {
      const file = await uploadToGoogleDrive(
        session.accessToken,
        fileName,
        JSON.stringify(content, null, 2)
      )
      return NextResponse.json({ file })
    }

    if (action === "createFolder") {
      const folder = await createFolder(
        session.accessToken,
        folderName,
        parentFolderId
      )
      return NextResponse.json({ folder })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
