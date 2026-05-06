import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { google } from "googleapis"
import * as XLSX from "xlsx"

function getAuth(accessToken: string) {
  const oauth2 = new google.auth.OAuth2()
  oauth2.setCredentials({ access_token: accessToken })
  return oauth2
}

function splitCell(value: unknown): string[] {
  if (!value) return []
  return String(value)
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function rowsToProjectTypes(rows: unknown[][]) {
  // Skip header row (first row)
  return rows.slice(1).map((row, i) => ({
    id: Date.now().toString() + i,
    name: String(row[1] ?? "").trim(),
    description: String(row[2] ?? "").trim(),
    deliverables: splitCell(row[3]),
    inclusions: splitCell(row[4]),
    exclusions: splitCell(row[5]),
    assumptions: splitCell(row[6]),
  })).filter((pt) => pt.name)
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

    // Google Sheets
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const sheets = google.sheets({ version: "v4", auth: authClient })
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: "A:G",
      })
      const rows = (res.data.values ?? []) as unknown[][]
      return NextResponse.json({ projectTypes: rowsToProjectTypes(rows) })
    }

    // Excel / CSV — download and parse with xlsx
    const drive = google.drive({ version: "v3", auth: authClient })
    const fileRes = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    )
    const buffer = Buffer.from(fileRes.data as ArrayBuffer)
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
    return NextResponse.json({ projectTypes: rowsToProjectTypes(rows) })
  } catch (err) {
    console.error("import-project-types error:", err)
    return NextResponse.json({ error: "Failed to read spreadsheet" }, { status: 500 })
  }
}
