import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { google } from "googleapis"
import * as XLSX from "xlsx"

function getAuth(accessToken: string) {
  const oauth2 = new google.auth.OAuth2()
  oauth2.setCredentials({ access_token: accessToken })
  return oauth2
}

function rowsToTeamMembers(rows: unknown[][]) {
  // Skip header row; columns: Name, Role, Phone, Email
  return rows.slice(1).map((row, i) => ({
    id: Date.now().toString() + i,
    name: String(row[0] ?? "").trim(),
    role: String(row[1] ?? "").trim(),
    phone: String(row[2] ?? "").trim(),
    email: String(row[3] ?? "").trim(),
    hourlyRate: 0,
  })).filter((m) => m.name && m.email)
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get("fileId")
  const mimeType = searchParams.get("mimeType") ?? ""

  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 })
  }

  try {
    const authClient = getAuth(session.accessToken)

    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const sheets = google.sheets({ version: "v4", auth: authClient })
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "A:D",
      })
      const rows = (res.data.values ?? []) as unknown[][]
      return NextResponse.json({ teamMembers: rowsToTeamMembers(rows) })
    }

    // Excel / CSV
    const drive = google.drive({ version: "v3", auth: authClient })
    const fileRes = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    )
    const buffer = Buffer.from(fileRes.data as ArrayBuffer)
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
    return NextResponse.json({ teamMembers: rowsToTeamMembers(rows) })
  } catch (err) {
    console.error("import-team error:", err)
    return NextResponse.json({ error: "Failed to read spreadsheet" }, { status: 500 })
  }
}
