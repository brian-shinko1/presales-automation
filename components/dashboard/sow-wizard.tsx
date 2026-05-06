"use client"

import { useState, useEffect } from "react"
import {
  Check, ChevronRight, Building2, FolderKanban, Users, DollarSign, FileCheck,
  Plus, Trash2, RefreshCw, FileText, Link2, Copy, RotateCcw, ChevronUp, ChevronDown, Table2,
  IndentIncrease, IndentDecrease, Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { store } from "@/lib/store"
import type { ProjectType, TeamMember } from "@/types"
import { DriveFilePicker, type DriveFile } from "@/components/drive-file-picker"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const STORAGE_FOLDER_ID = "presales_customers_folder_id"

interface DriveCustomer { id: string; name: string }
interface CustomerContact { name: string; role: string; phone: string; email: string }
interface PricingRow { item: string; quantity: string; cost: string; total: string }
interface EffortRow { task: string; effort: string; resource: string; notes: string }

type SpecialKind = "contact-table" | "version-table" | "pricing-table" | "tm-rates" | "change-of-scope" | "acceptance-criteria" | "effort-table"

interface DocSection {
  id: string
  title: string
  enabled: boolean
  special?: SpecialKind
  mode: "text" | "file"
  content: string
  file?: DriveFile
  fileTab?: string        // Drive sheet tab name (for file mode)
  renderAs?: "paragraph" | "list" | "deliverables-table"
  indent?: number         // 0 = h2, 1 = h3, 2 = h4
}

const steps = [
  { id: 1, name: "Header", icon: FileCheck },
  { id: 2, name: "Sections", icon: FolderKanban },
  { id: 3, name: "Contacts", icon: Users },
  { id: 4, name: "Pricing", icon: DollarSign },
  { id: 5, name: "Output", icon: Check },
]

let _ctr = 0
const uid = () => `s-${++_ctr}-${Date.now()}`

const OVERVIEW_TEXT =
  `This Scope of Work ("SOW") describes the services to be provided by Katana1 Pty Ltd, ABN: 86 150 538 257 (hereby known as "Katana1" or "K1"), and with offices located at Level 7, 65 Clarence St, Sydney NSW 2000; to [Customer] (hereby known as "Customer"), with office located at [Customer Location].`

const TM_RATES_TEXT =
  `In the event Katana1 is required to perform services in addition to the Services set forth in this Statement of Work, then the Katana1 current time and materials rates shall apply. The daily T&M rate is currently AU$2,100 ex GST.`

const CHANGE_OF_SCOPE_TEXT = [
  `It may become necessary to amend this Statement of Work Service for reasons including, but not limited to, the following:`,
  `- Changes to the scope of work and/or specifications for the Services\n- Changes to the base configuration\n- Changes to the project schedule\n- Unavailability of resources which are beyond either party's control, and/or\n- Environmental or architectural conditions not previously identified`,
  `A change request may be initiated by either party for any changes to the Service. In the event it is necessary to change the Services and/or deliverables, the following procedure will be followed:`,
  `The party requesting the change will deliver a Change Request to the other party via email. The Change Request will describe the nature of the change, the reason for the change, and the effect the change will have on the scope of work.`,
  `A Change Request may be initiated either by the Customer or by Katana1 for any changes to the Service. The parties will evaluate the Change Request and negotiate in good faith the changes to the Services and additional fees, if any, required to implement the Change Request.`,
  `If both parties agree to implement the Change Request, both parties will sign off the Change Request, indicating the acceptance of the changes by the parties.`,
  `Upon execution of the Change Request, said Change Request will be incorporated into, and made part of, this Service.`,
  `Katana1 is under no obligation to proceed with the Change Request until such time as the Change Request has been agreed upon in writing and signed off by both parties.`,
  `Whenever there is a conflict between the terms and conditions set forth in a fully executed Change Request and those set forth in the original Service, or previous fully executed Change Request, the terms and conditions of the most recent fully executed Change Request shall prevail.`,
].join("\n\n")

const ACCEPTANCE_CRITERIA_TEXT =
  `Upon completion of the deliverables; as-well-as fulfilling the functional & non-functional requirements specified in this document, the customer will confirm the completion of this project in writing via email. By signing below, [Customer] agrees to engage with Katana1 to deliver the services specified in this Statement of Work.`

function makeDefaultSections(pt: ProjectType): DocSection[] {
  const sections: DocSection[] = [
    { id: uid(), title: "Overview", enabled: true, mode: "text", content: OVERVIEW_TEXT, renderAs: "paragraph", indent: 0 },
    { id: uid(), title: "Contact Information", enabled: true, mode: "text", content: "", special: "contact-table", indent: 0 },
    { id: uid(), title: "Document Version Control", enabled: true, mode: "text", content: "", special: "version-table", indent: 0 },
    { id: uid(), title: "Executive Summary", enabled: true, mode: "text", content: "", renderAs: "paragraph", indent: 0 },
    { id: uid(), title: "Scope", enabled: true, mode: "file", content: "", indent: 1 },
  ]
  if ((pt.deliverables ?? []).length > 0)
    sections.push({ id: uid(), title: "Deliverables", enabled: true, mode: "text", content: pt.deliverables.join("\n"), renderAs: "deliverables-table", indent: 2 })
  if ((pt.inclusions ?? []).length > 0)
    sections.push({ id: uid(), title: "Inclusions", enabled: true, mode: "text", content: pt.inclusions.join("\n"), renderAs: "list", indent: 2 })
  if ((pt.exclusions ?? []).length > 0)
    sections.push({ id: uid(), title: "Exclusions", enabled: true, mode: "text", content: pt.exclusions.join("\n"), renderAs: "list", indent: 2 })
  if ((pt.assumptions ?? []).length > 0)
    sections.push({ id: uid(), title: "Assumptions", enabled: true, mode: "text", content: pt.assumptions.join("\n"), renderAs: "list", indent: 2 })
  sections.push(
    { id: uid(), title: "Pricing", enabled: true, mode: "text", content: "", special: "pricing-table", indent: 0 },
    { id: uid(), title: "Time and Material Rates", enabled: true, mode: "text", content: TM_RATES_TEXT, renderAs: "paragraph", indent: 0 },
    { id: uid(), title: "Change of Scope", enabled: true, mode: "text", content: CHANGE_OF_SCOPE_TEXT, renderAs: "paragraph", indent: 0 },
    { id: uid(), title: "Appendix A – Acceptance Criteria", enabled: true, mode: "text", content: "", special: "acceptance-criteria", indent: 0 },
    { id: uid(), title: "Appendix B – Estimation of Effort", enabled: true, mode: "text", content: "", special: "effort-table", indent: 0 },
  )
  return sections
}

const initialForm = {
  title: "", customer: "", customerLocation: "", version: "1.0", projectTypeId: "",
  authorIds: [] as string[],
  customerContacts: [] as CustomerContact[],
  pricingRows: [] as PricingRow[],
}

const SPECIAL_LABELS: Record<SpecialKind, string> = {
  "contact-table": "Contact table (from Contacts step)",
  "version-table": "Auto-generated",
  "pricing-table": "Pricing table (from Pricing step)",
  "tm-rates": "T&M rates (boilerplate)",
  "change-of-scope": "Change of scope (boilerplate)",
  "acceptance-criteria": "Acceptance criteria + signature blocks (boilerplate)",
  "effort-table": "Estimation of effort table (managed in Pricing step)",
}

function PreviewTable({ rows }: { rows: unknown[][] }) {
  if (rows.length === 0) return null
  const headers = rows[0] as string[]
  const body = rows.slice(1)
  return (
    <div className="overflow-x-auto rounded border border-border max-h-64 overflow-y-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-muted">
          <tr>{headers.map((h, i) => <th key={i} className="border border-border px-2 py-1.5 text-left font-medium whitespace-nowrap">{String(h)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="even:bg-muted/30">
              {(row as unknown[]).map((cell, j) => <td key={j} className="border border-border px-2 py-1.5 whitespace-nowrap">{String(cell ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SOWWizard() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [docSections, setDocSections] = useState<DocSection[]>([])
  const [effortRows, setEffortRows] = useState<EffortRow[]>([])
  const [customers, setCustomers] = useState<DriveCustomer[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [filePickerForId, setFilePickerForId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [outputType, setOutputType] = useState<"document" | "presentation">("document")
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ status: "success" | "error"; message: string; data?: unknown } | null>(null)
  const [writingForId, setWritingForId] = useState<string | null>(null)

  // Pricing source
  const [pricingSource, setPricingSource] = useState<"manual" | "file">("manual")
  const [pricingFile, setPricingFile] = useState<DriveFile | null>(null)
  const [pricingFileTab, setPricingFileTab] = useState("")
  const [pricingPreview, setPricingPreview] = useState<unknown[][]>([])
  const [pricingPreviewLoading, setPricingPreviewLoading] = useState(false)

  // Effort source
  const [effortSource, setEffortSource] = useState<"manual" | "file">("manual")
  const [effortFile, setEffortFile] = useState<DriveFile | null>(null)
  const [effortFileTab, setEffortFileTab] = useState("")
  const [effortPreview, setEffortPreview] = useState<unknown[][]>([])
  const [effortPreviewLoading, setEffortPreviewLoading] = useState(false)

  useEffect(() => {
    setProjectTypes(store.projectTypes.get())
    setTeamMembers(store.teamMembers.get())
    const folderId = localStorage.getItem(STORAGE_FOLDER_ID)
    if (!folderId) return
    setCustomersLoading(true)
    fetch(`/api/drive/folders?parentId=${folderId}`)
      .then((r) => r.json())
      .then((data) => setCustomers(data.folders || []))
      .catch(() => {})
      .finally(() => setCustomersLoading(false))
  }, [])

  const set = (key: keyof typeof initialForm, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const selectedAuthors = teamMembers.filter((m) => form.authorIds.includes(m.id))
  const selectedProjectType = projectTypes.find((p) => p.id === form.projectTypeId)

  // ── Project type ─────────────────────────────────────────────────────────────
  const handleProjectTypeSelect = (typeId: string) => {
    const pt = projectTypes.find((p) => p.id === typeId)
    if (!pt) return
    set("projectTypeId", typeId)
    setDocSections(makeDefaultSections(pt))
  }

  // ── Section helpers ──────────────────────────────────────────────────────────
  const updateSection = (id: string, updates: Partial<DocSection>) =>
    setDocSections((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s))

  const moveSection = (id: string, dir: -1 | 1) => {
    setDocSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  const indentSection = (id: string, dir: -1 | 1) =>
    setDocSections((prev) => prev.map((s) => s.id === id ? { ...s, indent: Math.max(0, Math.min(2, (s.indent ?? 0) + dir)) } : s))

  const addSection = () =>
    setDocSections((prev) => [...prev, { id: uid(), title: "New Section", enabled: true, mode: "text", content: "", renderAs: "list", indent: 0 }])

  const removeSection = (id: string) =>
    setDocSections((prev) => prev.filter((s) => s.id !== id))

  const handleFileSelect = (file: DriveFile) => {
    if (!filePickerForId) return
    if (filePickerForId === "__pricing__") {
      setPricingFile(file)
      setPricingPreview([])
    } else if (filePickerForId === "__effort__") {
      setEffortFile(file)
      setEffortPreview([])
    } else {
      updateSection(filePickerForId, { mode: "file", file })
    }
    setFilePickerForId(null)
  }

  // ── AI Write section ──────────────────────────────────────────────────────────
  const handleAIWrite = async (sectionId: string) => {
    const section = docSections.find((s) => s.id === sectionId)
    if (!section) return
    setWritingForId(sectionId)
    try {
      const res = await fetch("/api/airia/write-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionTitle: section.title,
          customer: form.customer,
          projectType: selectedProjectType?.name ?? "",
          software: selectedProjectType?.description ?? "",
          existingContent: section.content,
        }),
      })
      const data = await res.json()
      const text = typeof data?.result === "string" ? data.result : data?.text ?? ""
      if (text) updateSection(sectionId, { content: text })
    } catch { /* silent */ } finally {
      setWritingForId(null)
    }
  }

  // ── Contacts ─────────────────────────────────────────────────────────────────
  const toggleAuthor = (id: string) =>
    set("authorIds", form.authorIds.includes(id) ? form.authorIds.filter((a) => a !== id) : [...form.authorIds, id])

  const addContact = () => set("customerContacts", [...form.customerContacts, { name: "", role: "", phone: "", email: "" }])
  const updateContact = (i: number, key: keyof CustomerContact, v: string) =>
    set("customerContacts", form.customerContacts.map((c, idx) => idx === i ? { ...c, [key]: v } : c))
  const removeContact = (i: number) => set("customerContacts", form.customerContacts.filter((_, idx) => idx !== i))

  // ── Pricing ──────────────────────────────────────────────────────────────────
  const addPricingRow = () => set("pricingRows", [...form.pricingRows, { item: "", quantity: "", cost: "", total: "" }])
  const updatePricing = (i: number, key: keyof PricingRow, v: string) =>
    set("pricingRows", form.pricingRows.map((r, idx) => idx === i ? { ...r, [key]: v } : r))
  const removePricing = (i: number) => set("pricingRows", form.pricingRows.filter((_, idx) => idx !== i))

  // ── Effort ───────────────────────────────────────────────────────────────────
  const addEffortRow = () => setEffortRows((prev) => [...prev, { task: "", effort: "", resource: "", notes: "" }])
  const updateEffort = (i: number, key: keyof EffortRow, v: string) =>
    setEffortRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [key]: v } : r))
  const removeEffort = (i: number) => setEffortRows((prev) => prev.filter((_, idx) => idx !== i))

  const canProceed = () => {
    switch (step) {
      case 1: return !!form.title && !!form.customer
      case 2: return docSections.length > 0
      case 3: return form.authorIds.length > 0
      default: return true
    }
  }

  const fetchPreview = async (
    file: DriveFile,
    tab: string,
    setLoading: (v: boolean) => void,
    setRows: (r: unknown[][]) => void
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ fileId: file.id, mimeType: file.mimeType })
      if (tab) params.set("tab", tab)
      const res = await fetch(`/api/drive/preview-sheet?${params}`)
      const data = await res.json()
      setRows(data.rows ?? [])
    } catch { setRows([]) } finally { setLoading(false) }
  }

  const handleReset = () => {
    setForm(initialForm)
    setDocSections([])
    setEffortRows([])
    setPricingSource("manual")
    setPricingFile(null)
    setPricingFileTab("")
    setPricingPreview([])
    setEffortSource("manual")
    setEffortFile(null)
    setEffortFileTab("")
    setEffortPreview([])
    setStep(1)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateResult(null)
    try {
      const res = await fetch("/api/airia/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sowJson: buildOutput(), outputType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generation failed")
      setGenerateResult({ status: "success", message: "Document generated successfully.", data })
    } catch (err) {
      setGenerateResult({ status: "error", message: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setGenerating(false)
    }
  }

  // ── Output JSON ──────────────────────────────────────────────────────────────
  const splitLines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean)

  const buildOutput = () => ({
    document_type: "Statement of Work",
    metadata: {
      title: form.title,
      prepared_for: form.customer,
      customer_location: form.customerLocation || null,
      software_platform: selectedProjectType?.description || null,
      version: form.version,
      date: format(new Date(), "yyyy-MM-dd"),
      authors: selectedAuthors.map((a) => ({ name: a.name, role: a.role, organisation: "Katana1", email: a.email, phone: a.phone || null })),
    },
    contacts: {
      customer: form.customerContacts,
      katana1: selectedAuthors.map((a) => ({ name: a.name, role: a.role, organisation: "Katana1", email: a.email, phone: a.phone || null })),
    },
    sections: (() => {
      const enabled = docSections.filter((s) => s.enabled)
      const counters = [0, 0, 0]
      return enabled.map((s) => {
        const level = s.indent ?? 0
        counters[level]++
        for (let i = level + 1; i < counters.length; i++) counters[i] = 0
        const number = counters.slice(0, level + 1).join(".")
        const base = { number, title: s.title, level }
        if (s.special) return { ...base, type: s.special }
        if (s.mode === "file") return { ...base, type: "file", fileName: s.file?.name, fileUrl: s.file?.webViewLink, fileTab: s.fileTab || null }
        return { ...base, type: "text", renderAs: s.renderAs ?? "list", content: s.content, items: splitLines(s.content) }
      })
    })(),
    pricing: pricingSource === "file"
      ? { source: "file", fileName: pricingFile?.name, fileUrl: pricingFile?.webViewLink, fileTab: pricingFileTab || null }
      : { source: "manual", rows: form.pricingRows },
    effort: effortSource === "file"
      ? { source: "file", fileName: effortFile?.name, fileUrl: effortFile?.webViewLink, fileTab: effortFileTab || null }
      : { source: "manual", rows: effortRows },
  })

  // ── Step 5: Output ───────────────────────────────────────────────────────────
  if (step === 5) {
    const output = buildOutput()
    const json = JSON.stringify(output, null, 2)
    const customer = form.customer || "[Customer]"
    const customerLocation = form.customerLocation || "[Customer Location]"
    const today = format(new Date(), "dd/MM/yyyy")

    const enabledSections = docSections.filter((s) => s.enabled)

    const sectionNumbers: Record<string, string> = (() => {
      const counters = [0, 0, 0]
      const map: Record<string, string> = {}
      for (const s of enabledSections) {
        const level = s.indent ?? 0
        counters[level]++
        for (let i = level + 1; i < counters.length; i++) counters[i] = 0
        map[s.id] = counters.slice(0, level + 1).join(".")
      }
      return map
    })()

    const renderSection = (s: DocSection) => {
      if (!s.enabled) return null
      const num = sectionNumbers[s.id]
      const level = s.indent ?? 0
      const introText: Record<string, string> = {
        "Exclusions": "The following items are outside the scope of this Statement of Work. Other items that may become apparent during the exercise that will need addressing. These items will be addressed on a case by case basis, in consultation with the Customer sponsor:",
        "Assumptions": "The following assumptions have been made, the list is not exhaustive but outlines specific key items that may impact the project:",
        "Pricing": `Katana1 has developed this effort based on limited discussions with ${customer}. Katana1 is amenable to fine tune the effort based on feedback provided by the customer.`,
      }

      const headingCls = level === 0 ? "font-bold border-b pb-1 text-base" : level === 1 ? "font-semibold text-sm mt-2" : "font-medium text-sm text-muted-foreground mt-1"
      const HeadingTag = (level === 0 ? "h2" : level === 1 ? "h3" : "h4") as "h2" | "h3" | "h4"

      return (
        <div key={s.id} className="space-y-2" style={{ paddingLeft: `${level * 16}px` }}>
          <HeadingTag className={headingCls}>{num}. {s.title}</HeadingTag>

          {introText[s.title] && <p className="text-muted-foreground">{introText[s.title]}</p>}

          {s.special === "contact-table" && (
            <table className="w-full text-xs border-collapse border border-border">
              <thead><tr className="bg-muted">{["Name", "Role", "Organisation", "Phone", "Email"].map((h) => <th key={h} className="border border-border px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {form.customerContacts.map((c, i) => (
                  <tr key={i}>
                    <td className="border border-border px-3 py-2">{c.name || "[Name]"}</td>
                    <td className="border border-border px-3 py-2">{c.role || "[Role]"}</td>
                    <td className="border border-border px-3 py-2">{customer}</td>
                    <td className="border border-border px-3 py-2">{c.phone}</td>
                    <td className="border border-border px-3 py-2">{c.email}</td>
                  </tr>
                ))}
                {selectedAuthors.map((a) => (
                  <tr key={a.id}>
                    <td className="border border-border px-3 py-2">{a.name}</td>
                    <td className="border border-border px-3 py-2">{a.role}</td>
                    <td className="border border-border px-3 py-2">Katana1</td>
                    <td className="border border-border px-3 py-2">{a.phone || ""}</td>
                    <td className="border border-border px-3 py-2">{a.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {s.special === "version-table" && (
            <table className="w-full text-xs border-collapse border border-border">
              <thead><tr className="bg-muted">{["Date", "Version", "Description", "Author", "Reviewer"].map((h) => <th key={h} className="border border-border px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                <tr>
                  <td className="border border-border px-3 py-2">{today}</td>
                  <td className="border border-border px-3 py-2">{form.version}</td>
                  <td className="border border-border px-3 py-2">Initial version</td>
                  <td className="border border-border px-3 py-2">{selectedAuthors[0]?.name ?? ""}</td>
                  <td className="border border-border px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          )}

          {s.special === "pricing-table" && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">The following pricing is based on a Time and Materials effort (T&M). <strong>{customer}</strong> will be invoiced for the services upon completion of work.</p>
              {pricingSource === "file" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <a href={pricingFile?.webViewLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{pricingFile?.name ?? "—"}</a>
                    {pricingFileTab && <span className="text-muted-foreground text-xs">(tab: <strong>{pricingFileTab}</strong>)</span>}
                  </div>
                  {pricingPreview.length > 0 && <PreviewTable rows={pricingPreview} />}
                </div>
              ) : (
                <table className="w-full text-xs border-collapse border border-border">
                  <thead><tr className="bg-muted">{["Item", "Quantity", "Cost (AUD ex GST)", "Total (AUD ex GST)"].map((h) => <th key={h} className="border border-border px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {form.pricingRows.length > 0 ? form.pricingRows.map((r, i) => (
                      <tr key={i}>
                        <td className="border border-border px-3 py-2">{r.item}</td>
                        <td className="border border-border px-3 py-2">{r.quantity}</td>
                        <td className="border border-border px-3 py-2">{r.cost ? `$${r.cost}` : ""}</td>
                        <td className="border border-border px-3 py-2">{r.total ? `$${r.total}` : ""}</td>
                      </tr>
                    )) : <tr><td colSpan={4} className="border border-border px-3 py-2 text-muted-foreground">No pricing rows added</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {s.special === "effort-table" && (
            effortSource === "file" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <a href={effortFile?.webViewLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{effortFile?.name ?? "—"}</a>
                  {effortFileTab && <span className="text-muted-foreground text-xs">(tab: <strong>{effortFileTab}</strong>)</span>}
                </div>
                {effortPreview.length > 0 && <PreviewTable rows={effortPreview} />}
              </div>
            ) : (
              <table className="w-full text-xs border-collapse border border-border">
                <thead><tr className="bg-muted">{["Task / Activity", "Effort (days)", "Resource", "Notes"].map((h) => <th key={h} className="border border-border px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {effortRows.length > 0 ? effortRows.map((r, i) => (
                    <tr key={i}>
                      <td className="border border-border px-3 py-2">{r.task}</td>
                      <td className="border border-border px-3 py-2">{r.effort}</td>
                      <td className="border border-border px-3 py-2">{r.resource}</td>
                      <td className="border border-border px-3 py-2">{r.notes}</td>
                    </tr>
                  )) : <tr><td colSpan={4} className="border border-border px-3 py-2 text-muted-foreground">No effort rows added</td></tr>}
                </tbody>
              </table>
            )
          )}

          {s.special === "acceptance-criteria" && (
            <div className="space-y-6">
              <p className="text-muted-foreground">{ACCEPTANCE_CRITERIA_TEXT.replace(/\[Customer\]/g, customer)}</p>
              {[{ party: customer, label: "Customer" }, { party: "Katana1 Pty Ltd", label: "Katana1" }].map(({ party, label }) => (
                <div key={label} className="space-y-3">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">{label} — {party}</p>
                  <div className="grid grid-cols-2 gap-6">
                    {["Name", "Title", "Signature", "Date"].map((f) => (
                      <div key={f} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{f}</p>
                        <div className="border-b border-border h-7" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!s.special && s.mode === "file" && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-muted-foreground">Source file:</span>
              <a href={s.file?.webViewLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">{s.file?.name ?? "—"}</a>
              {s.fileTab && <span className="text-muted-foreground text-xs">(tab: <strong>{s.fileTab}</strong>)</span>}
            </div>
          )}

          {!s.special && s.mode === "text" && s.renderAs === "deliverables-table" && (() => {
            const items = splitLines(s.content)
            return (
              <table className="w-full text-xs border-collapse border border-border">
                <thead><tr className="bg-muted"><th className="border border-border px-3 py-2 text-left font-medium w-16">ID</th><th className="border border-border px-3 py-2 text-left font-medium">Deliverable</th></tr></thead>
                <tbody>
                  {items.length > 0 ? items.map((d, j) => (
                    <tr key={j}><td className="border border-border px-3 py-2">D{j + 1}</td><td className="border border-border px-3 py-2">{d}</td></tr>
                  )) : <tr><td colSpan={2} className="border border-border px-3 py-2 text-muted-foreground">No deliverables defined</td></tr>}
                </tbody>
              </table>
            )
          })()}

          {!s.special && s.mode === "text" && s.renderAs === "paragraph" && (
            <div className="space-y-3">
              {s.content
                .replace(/\[Customer\]/g, customer)
                .replace(/\[Customer Location\]/g, customerLocation)
                .split("\n\n")
                .map((para, i) => (
                  para.startsWith("- ") ? (
                    <ul key={i} className="list-disc list-inside text-muted-foreground space-y-1">
                      {para.split("\n").filter(l => l.startsWith("- ")).map((l, j) => <li key={j}>{l.slice(2)}</li>)}
                    </ul>
                  ) : <p key={i} className="text-muted-foreground">{para}</p>
                ))}
            </div>
          )}

          {!s.special && s.mode === "text" && (s.renderAs === "list" || !s.renderAs) && (() => {
            const items = splitLines(s.content)
            return items.length > 0
              ? <ul className="list-disc list-inside space-y-1">{items.map((item, j) => <li key={j}>{item}</li>)}</ul>
              : <p className="text-muted-foreground">None specified.</p>
          })()}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw className="h-4 w-4" /> New SOW</Button>
          </div>
        </div>

        <div className="border rounded-lg bg-card p-8 space-y-8 text-sm leading-relaxed max-w-4xl mx-auto">
          {/* Cover */}
          <div className="text-center space-y-2 pb-6 border-b">
            <h1 className="text-2xl font-bold">{form.title || "Untitled SOW"}</h1>
            <p>Prepared for: <strong>{customer}</strong></p>
            {selectedProjectType?.description && <p className="text-muted-foreground text-xs">Platform: {selectedProjectType.description}</p>}
            <p>Version: {form.version}</p>
            <p>Author(s): <strong>{selectedAuthors.map((a) => a.name).join(", ") || "[Authors]"}</strong></p>
          </div>

          {/* TOC */}
          <div>
            <h2 className="font-bold mb-2">Table of Contents</h2>
            <div className="space-y-1 text-muted-foreground">
              {enabledSections.map((s) => (
                <p key={s.id} style={{ paddingLeft: `${(s.indent ?? 0) * 16}px` }} className="text-sm">
                  {sectionNumbers[s.id]}. {s.title}
                </p>
              ))}
            </div>
          </div>

          {/* Sections */}
          {enabledSections.map((s) => renderSection(s))}
        </div>

        <div className="space-y-2 max-w-4xl mx-auto">
          <h3 className="font-semibold text-sm">Structured Output for AI Agent</h3>
          <p className="text-xs text-muted-foreground">All section content and file URLs — copy and pass to your AI agent.</p>
          <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto max-h-72 overflow-y-auto leading-relaxed">{json}</pre>
        </div>

        <div className="max-w-4xl mx-auto border rounded-lg p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Generate with Airia</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Send this SOW to Airia to generate a polished output file.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Output type:</span>
            <div className="flex rounded border overflow-hidden">
              {(["document", "presentation"] as const).map((type) => (
                <button key={type} onClick={() => setOutputType(type)} className={cn("px-3 py-1.5 text-sm capitalize transition-colors", outputType === type ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {type === "document" ? "📄 Document" : "📊 Presentation"}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
            {generating ? "Generating..." : `Generate ${outputType === "document" ? "Document" : "Presentation"}`}
          </Button>
          {generateResult && (
            <div className={cn("rounded-md p-3 text-sm space-y-2", generateResult.status === "success" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive")}>
              {generateResult.status === "error" ? (
                <p className="font-medium">{generateResult.message}</p>
              ) : (() => {
                const d = generateResult.data as Record<string, unknown>
                const resultText = typeof d?.result === "string" ? d.result : ""
                const urlMatches = resultText.match(/https?:\/\/[^\s)\]"*]+/g) ?? []
                const urls = [...new Set(urlMatches)]
                return (
                  <>
                    {urls.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="font-medium">Generation complete. Open your file:</p>
                        {urls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 underline font-medium break-all text-xs">
                            <Link2 className="h-3.5 w-3.5 shrink-0" />{url}
                          </a>
                        ))}
                      </div>
                    ) : <p className="font-medium">Generation complete.</p>}
                    {resultText && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show full response</summary>
                        <div className="mt-2 bg-black/10 rounded p-2 whitespace-pre-wrap max-h-48 overflow-y-auto text-foreground">{resultText}</div>
                      </details>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Wizard form ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Step progress */}
      <div className="flex items-center justify-between">
        {steps.map((s, index) => (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                step > s.id ? "bg-primary border-primary text-primary-foreground"
                  : step === s.id ? "border-primary text-primary"
                  : "border-muted text-muted-foreground"
              )}>
                {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={cn("text-xs mt-1 hidden sm:block", step >= s.id ? "text-foreground" : "text-muted-foreground")}>{s.name}</span>
            </div>
            {index < steps.length - 1 && <div className={cn("w-12 sm:w-16 h-0.5 mx-2", step > s.id ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      <div className="min-h-[400px]">

        {/* Step 1: Header */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>SOW Title</Label>
              <Input placeholder="e.g. Tenable.sc Deployment — Acme Corp" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              {customersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading customers...</div>
              ) : customers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No customers found. Configure a Drive folder in Resources first.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {customers.map((c) => (
                    <Card key={c.id} className={cn("cursor-pointer transition-colors", form.customer === c.name ? "border-primary bg-primary/5" : "hover:bg-muted/50")} onClick={() => set("customer", c.name)}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground shrink-0" /><span className="font-medium text-sm truncate">{c.name}</span></div>
                        {form.customer === c.name && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer Location</Label>
                <Input placeholder="123 Main St, Sydney NSW 2000" value={form.customerLocation} onChange={(e) => set("customerLocation", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={form.version} onChange={(e) => set("version", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Document Sections */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Type <span className="text-muted-foreground text-xs font-normal">(loads default sections)</span></Label>
              {projectTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No project types found. Add them in Resources → Project Types first.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {projectTypes.map((pt) => (
                    <Card key={pt.id} className={cn("cursor-pointer transition-colors", form.projectTypeId === pt.id ? "border-primary bg-primary/5" : "hover:bg-muted/50")} onClick={() => handleProjectTypeSelect(pt.id)}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0"><FolderKanban className="w-4 h-4 text-muted-foreground shrink-0" /><p className="font-medium text-sm truncate">{pt.name}</p></div>
                          {form.projectTypeId === pt.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        {pt.description && <p className="text-xs text-muted-foreground mt-1 truncate">{pt.description}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Document Sections</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Move, indent, or edit any section. Use ✨ to AI-write text sections.</p>
                </div>
                <Button variant="outline" size="sm" onClick={addSection} className="gap-1 shrink-0"><Plus className="h-3 w-3" /> Add Section</Button>
              </div>

              {docSections.length === 0 ? (
                <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
                  {form.projectTypeId ? "No sections." : "Select a project type to load defaults."} Use the button to add sections manually.
                </div>
              ) : (
                <div className="space-y-2">
                  {docSections.map((s, idx) => (
                    <div key={s.id} className={cn("border rounded-md overflow-hidden transition-opacity", !s.enabled && "opacity-50")}
                      style={{ marginLeft: `${(s.indent ?? 0) * 20}px` }}>
                      <div className="flex items-center gap-2 p-2 bg-muted/30">
                        <Checkbox checked={s.enabled} onCheckedChange={(v) => updateSection(s.id, { enabled: !!v })} />
                        <Input
                          value={s.title}
                          onChange={(e) => updateSection(s.id, { title: e.target.value })}
                          className="h-7 text-sm font-medium flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 px-1"
                          disabled={!s.enabled}
                        />
                        {s.special && <Badge variant="secondary" className="text-xs shrink-0 hidden sm:flex gap-1"><Table2 className="h-3 w-3" />Auto</Badge>}
                        {!s.special && (
                          <div className="flex rounded border overflow-hidden shrink-0">
                            <button onClick={() => updateSection(s.id, { mode: "text" })} disabled={!s.enabled} className={cn("px-2 py-1 text-xs flex items-center gap-1 transition-colors", s.mode === "text" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                              <FileText className="h-3 w-3" /><span className="hidden sm:inline">Text</span>
                            </button>
                            <button onClick={() => { updateSection(s.id, { mode: "file" }); setFilePickerForId(s.id) }} disabled={!s.enabled} className={cn("px-2 py-1 text-xs flex items-center gap-1 transition-colors", s.mode === "file" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                              <Link2 className="h-3 w-3" /><span className="hidden sm:inline">File</span>
                            </button>
                          </div>
                        )}
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Outdent" onClick={() => indentSection(s.id, -1)} disabled={(s.indent ?? 0) === 0}><IndentDecrease className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Indent" onClick={() => indentSection(s.id, 1)} disabled={(s.indent ?? 0) === 2}><IndentIncrease className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(s.id, -1)} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(s.id, 1)} disabled={idx === docSections.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeSection(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>

                      {s.enabled && (
                        <div className="p-3 pt-2">
                          {s.special ? (
                            <p className="text-xs text-muted-foreground italic">{SPECIAL_LABELS[s.special]}</p>
                          ) : s.mode === "file" ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                {s.file ? (
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
                                    <a href={s.file.webViewLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">{s.file.name}</a>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground flex-1">No file selected</p>
                                )}
                                <Button variant="outline" size="sm" onClick={() => setFilePickerForId(s.id)} className="shrink-0">{s.file ? "Change" : "Browse Drive"}</Button>
                              </div>
                              {s.file && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs whitespace-nowrap">Tab / Sheet name</Label>
                                  <Input
                                    className="h-7 text-xs"
                                    placeholder="e.g. Scope Details"
                                    value={s.fileTab ?? ""}
                                    onChange={(e) => updateSection(s.id, { fileTab: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Textarea
                                value={s.content}
                                onChange={(e) => updateSection(s.id, { content: e.target.value })}
                                placeholder={s.renderAs === "paragraph" ? "Enter paragraph text..." : "One item per line..."}
                                rows={3}
                                className="text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                disabled={writingForId === s.id}
                                onClick={() => handleAIWrite(s.id)}
                              >
                                {writingForId === s.id
                                  ? <><RefreshCw className="h-3 w-3 animate-spin" /> Writing...</>
                                  : <><Sparkles className="h-3 w-3" /> AI Write</>}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Contacts */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Authors (Katana1 team)</Label>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members found. Add them in Resources → Team first.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => toggleAuthor(m.id)}>
                      <Checkbox checked={form.authorIds.includes(m.id)} onCheckedChange={() => toggleAuthor(m.id)} />
                      <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.role}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Customer Contacts</Label>
                <Button variant="outline" size="sm" onClick={addContact} className="gap-1"><Plus className="h-3 w-3" /> Add Contact</Button>
              </div>
              {form.customerContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No customer contacts added.</p>
              ) : form.customerContacts.map((c, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1fr_32px] gap-2 items-end p-3 border rounded-md">
                  {(["name", "role", "phone", "email"] as const).map((f) => (
                    <div key={f} className="space-y-1">
                      <Label className="text-xs capitalize">{f}</Label>
                      <Input className="h-8 text-xs" value={c[f]} onChange={(e) => updateContact(i, f, e.target.value)} />
                    </div>
                  ))}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeContact(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Pricing & Effort */}
        {step === 4 && (
          <div className="space-y-8">

            {/* Pricing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div><Label>Pricing Table</Label><p className="text-xs text-muted-foreground mt-1">Standard T&M: AU$2,100/day ex GST</p></div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded border overflow-hidden text-xs">
                    {(["manual", "file"] as const).map((m) => (
                      <button key={m} onClick={() => setPricingSource(m)} className={cn("px-3 py-1.5 capitalize transition-colors", pricingSource === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        {m === "manual" ? "Manual" : "From Drive"}
                      </button>
                    ))}
                  </div>
                  {pricingSource === "manual" && <Button variant="outline" size="sm" onClick={addPricingRow} className="gap-1"><Plus className="h-3 w-3" /> Add Row</Button>}
                </div>
              </div>

              {pricingSource === "file" ? (
                <div className="border rounded-md p-4 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {pricingFile ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
                        <a href={pricingFile.webViewLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">{pricingFile.name}</a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground flex-1">No file selected</p>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setFilePickerForId("__pricing__")} className="shrink-0">
                      {pricingFile ? "Change" : "Browse Drive"}
                    </Button>
                  </div>
                  {pricingFile && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Tab / Sheet name</Label>
                      <Input className="h-7 text-xs flex-1" placeholder="e.g. Pricing" value={pricingFileTab} onChange={(e) => setPricingFileTab(e.target.value)} />
                      <Button variant="outline" size="sm" className="shrink-0 gap-1" disabled={pricingPreviewLoading}
                        onClick={() => fetchPreview(pricingFile, pricingFileTab, setPricingPreviewLoading, setPricingPreview)}>
                        {pricingPreviewLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                        {pricingPreviewLoading ? "Loading..." : "Preview"}
                      </Button>
                    </div>
                  )}
                  {pricingPreview.length > 0 && <PreviewTable rows={pricingPreview} />}
                </div>
              ) : form.pricingRows.length === 0 ? (
                <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">No pricing rows yet. Click Add Row.</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_80px_110px_110px_32px] gap-2 px-1">
                    {["Item", "Qty", "Cost (AUD)", "Total (AUD)", ""].map((h, i) => (
                      <span key={i} className="text-xs text-muted-foreground font-medium">{h}</span>
                    ))}
                  </div>
                  {form.pricingRows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_110px_110px_32px] gap-2 items-center">
                      <Input className="h-8 text-sm" value={r.item} onChange={(e) => updatePricing(i, "item", e.target.value)} placeholder="e.g. Tenable.sc Deployment" />
                      <Input className="h-8 text-sm" type="number" min={0} value={r.quantity} onChange={(e) => updatePricing(i, "quantity", e.target.value)} />
                      <Input className="h-8 text-sm" value={r.cost} onChange={(e) => updatePricing(i, "cost", e.target.value)} placeholder="2,100" />
                      <Input className="h-8 text-sm" value={r.total} onChange={(e) => updatePricing(i, "total", e.target.value)} placeholder="10,500" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePricing(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estimation of Effort (Appendix B) */}
            {docSections.some((s) => s.special === "effort-table" && s.enabled) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div><Label>Appendix B — Estimation of Effort</Label><p className="text-xs text-muted-foreground mt-1">Breakdown of tasks, effort, and resourcing.</p></div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded border overflow-hidden text-xs">
                      {(["manual", "file"] as const).map((m) => (
                        <button key={m} onClick={() => setEffortSource(m)} className={cn("px-3 py-1.5 capitalize transition-colors", effortSource === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                          {m === "manual" ? "Manual" : "From Drive"}
                        </button>
                      ))}
                    </div>
                    {effortSource === "manual" && <Button variant="outline" size="sm" onClick={addEffortRow} className="gap-1"><Plus className="h-3 w-3" /> Add Row</Button>}
                  </div>
                </div>

                {effortSource === "file" ? (
                  <div className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {effortFile ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
                          <a href={effortFile.webViewLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">{effortFile.name}</a>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground flex-1">No file selected</p>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setFilePickerForId("__effort__")} className="shrink-0">
                        {effortFile ? "Change" : "Browse Drive"}
                      </Button>
                    </div>
                    {effortFile && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Tab / Sheet name</Label>
                        <Input className="h-7 text-xs flex-1" placeholder="e.g. Effort Estimate" value={effortFileTab} onChange={(e) => setEffortFileTab(e.target.value)} />
                        <Button variant="outline" size="sm" className="shrink-0 gap-1" disabled={effortPreviewLoading}
                          onClick={() => fetchPreview(effortFile, effortFileTab, setEffortPreviewLoading, setEffortPreview)}>
                          {effortPreviewLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                          {effortPreviewLoading ? "Loading..." : "Preview"}
                        </Button>
                      </div>
                    )}
                    {effortPreview.length > 0 && <PreviewTable rows={effortPreview} />}
                  </div>
                ) : effortRows.length === 0 ? (
                  <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">No effort rows yet. Click Add Row.</div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_80px_1fr_1fr_32px] gap-2 px-1">
                      {["Task / Activity", "Effort (days)", "Resource", "Notes", ""].map((h, i) => (
                        <span key={i} className="text-xs text-muted-foreground font-medium">{h}</span>
                      ))}
                    </div>
                    {effortRows.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_1fr_1fr_32px] gap-2 items-center">
                        <Input className="h-8 text-sm" value={r.task} onChange={(e) => updateEffort(i, "task", e.target.value)} placeholder="e.g. Scanner deployment" />
                        <Input className="h-8 text-sm" type="number" min={0} value={r.effort} onChange={(e) => updateEffort(i, "effort", e.target.value)} />
                        <Input className="h-8 text-sm" value={r.resource} onChange={(e) => updateEffort(i, "resource", e.target.value)} placeholder="e.g. Solutions Architect" />
                        <Input className="h-8 text-sm" value={r.notes} onChange={(e) => updateEffort(i, "notes", e.target.value)} placeholder="Optional notes" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeEffort(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>Back</Button>
        <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="gap-2">
          {step === 4 ? "Generate Output" : "Continue"}<ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <DriveFilePicker open={filePickerForId !== null} onClose={() => setFilePickerForId(null)} onSelect={handleFileSelect} />
    </div>
  )
}
