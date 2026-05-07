export const runtime = "edge"

import { auth } from "@/auth"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"
const DRIVE_API = "https://www.googleapis.com/drive/v3"

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

  const headers = { Authorization: `Bearer ${session.accessToken}` }

  try {
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const range = tab || "A:ZZ"
      const res = await fetch(`${SHEETS_API}/${fileId}/values/${encodeURIComponent(range)}`, { headers })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      return NextResponse.json({ rows: data.values ?? [] })
    }

    // Excel / CSV
    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media&supportsAllDrives=true`, { headers })
    if (!res.ok) throw new Error(await res.text())
    const buffer = new Uint8Array(await res.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "array" })

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
