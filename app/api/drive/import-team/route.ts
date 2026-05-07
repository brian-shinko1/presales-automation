export const runtime = "edge"

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
const DRIVE_API = "https://www.googleapis.com/drive/v3"

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

  const headers = { Authorization: `Bearer ${session.accessToken}` }

  try {
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await fetch(`${SHEETS_API}/${fileId}/values/A:D`, { headers })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const rows = (data.values ?? []) as unknown[][]
      return NextResponse.json({ teamMembers: rowsToTeamMembers(rows) })
    }

    // Excel / CSV
    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media&supportsAllDrives=true`, { headers })
    if (!res.ok) throw new Error(await res.text())
    const buffer = new Uint8Array(await res.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
    return NextResponse.json({ teamMembers: rowsToTeamMembers(rows) })
  } catch (err) {
    console.error("import-team error:", err)
    return NextResponse.json({ error: "Failed to read spreadsheet" }, { status: 500 })
  }
}
