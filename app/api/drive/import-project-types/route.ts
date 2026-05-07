export const runtime = "edge"

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
const DRIVE_API = "https://www.googleapis.com/drive/v3"

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

  const headers = { Authorization: `Bearer ${session.accessToken}` }

  try {
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await fetch(`${SHEETS_API}/${fileId}/values/A:G`, { headers })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const rows = (data.values ?? []) as unknown[][]
      return NextResponse.json({ projectTypes: rowsToProjectTypes(rows) })
    }

    // Excel / CSV
    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media&supportsAllDrives=true`, { headers })
    if (!res.ok) throw new Error(await res.text())
    const buffer = new Uint8Array(await res.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
    return NextResponse.json({ projectTypes: rowsToProjectTypes(rows) })
  } catch (err) {
    console.error("import-project-types error:", err)
    return NextResponse.json({ error: "Failed to read spreadsheet" }, { status: 500 })
  }
}
