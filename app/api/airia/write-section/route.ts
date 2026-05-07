export const runtime = "edge"

import { auth } from "@/auth"
import { NextResponse } from "next/server"

const AIRIA_API_KEY = process.env.AIRIA_API_KEY ?? ""
const AIRIA_PIPELINE_ID = process.env.AIRIA_WRITE_SECTION_PIPELINE_ID ?? ""
const AIRIA_ENDPOINT = `https://prodaus.api.airia.ai/v2/PipelineExecution/${AIRIA_PIPELINE_ID}`

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!AIRIA_API_KEY) {
    return NextResponse.json({ error: "AIRIA_API_KEY not configured" }, { status: 500 })
  }
  if (!AIRIA_PIPELINE_ID) {
    return NextResponse.json({ error: "AIRIA_WRITE_SECTION_PIPELINE_ID not configured" }, { status: 500 })
  }

  const { sectionTitle, customer, projectType, software, existingContent } =
    await request.json() as {
      sectionTitle: string
      customer: string
      projectType: string
      software: string
      existingContent?: string
    }

  const userInput = [
    `Please write the "${sectionTitle}" section for a Statement of Work document.`,
    customer ? `Customer: ${customer}` : "",
    projectType ? `Project type: ${projectType}` : "",
    software ? `Software / platform: ${software}` : "",
    existingContent ? `Existing draft to refine:\n${existingContent}` : "",
    `Write only the section body text — no heading, no preamble. Use professional, concise language suitable for an enterprise SOW. Return plain text paragraphs (no markdown).`,
  ].filter(Boolean).join("\n")

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
