export const runtime = "edge"

import { auth } from "@/auth"
import { NextResponse } from "next/server"

const AIRIA_API_KEY = process.env.AIRIA_API_KEY ?? ""
const AIRIA_PIPELINE_ID = process.env.AIRIA_PIPELINE_ID ?? "5cadf44f-3077-4b34-b3fc-3dd36190686e"
const AIRIA_ENDPOINT = `https://prodaus.api.airia.ai/v2/PipelineExecution/${AIRIA_PIPELINE_ID}`

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!AIRIA_API_KEY) {
    return NextResponse.json({ error: "AIRIA_API_KEY not configured" }, { status: 500 })
  }

  const body = await request.json()
  const { sowJson, outputType } = body as { sowJson: object; outputType: "document" | "presentation" }

  const userInput = JSON.stringify({
    output_type: outputType,
    sow: sowJson,
  })

  const res = await fetch(AIRIA_ENDPOINT, {
    method: "POST",
    headers: {
      "X-API-KEY": AIRIA_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userInput, asyncOutput: false }),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data?.message ?? "Airia request failed" }, { status: res.status })
  }

  return NextResponse.json(data)
}
