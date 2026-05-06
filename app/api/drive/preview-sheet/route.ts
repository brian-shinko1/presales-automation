import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { google } from "googleapis"
import * as XLSX from "xlsx"

function getAuth(accessToken: string) {
  const oauth2 = new google.auth.OAuth2()
  oauth2.setCredentials({ access_token: accessToken })
  return oauth2
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get("fileId")
  const mimeType = searchParams.get("mimeType") ?? ""
  const tab = searchParams.get("tab") ?? ""

  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

  try {
    const authClient = getAuth(session.accessToken)

    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const sheets = google.sheets({ version: "v4", auth: authClient })
      const range = tab ? `${tab}` : undefined
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: range ?? "A:ZZ",
      })
      return NextResponse.json({ rows: res.data.values ?? [] })
    }

    // Excel / CSV
    const drive = google.drive({ version: "v3", auth: authClient })
    const fileRes = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    )
    const buffer = Buffer.from(fileRes.data as ArrayBuffer)
    const workbook = XLSX.read(buffer, { type: "buffer" })

    const sheetName = tab && workbook.SheetNames.includes(tab)
      ? tab
      : workbook.SheetNames[0]

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
    return NextResponse.json({ rows })
  } catch (err) {
    console.error("preview-sheet error:", err)
    return NextResponse.json({ error: "Failed to read sheet" }, { status: 500 })
  }
}
