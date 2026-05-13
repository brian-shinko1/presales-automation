"use client"

import { useState, useEffect } from "react"
import { useUserId } from "@/components/user-context"
import { Plus, Search, FolderKanban, MoreHorizontal, Pencil, Trash2, FileSpreadsheet, RefreshCw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { store } from "@/lib/store"
import type { ProjectType } from "@/types"
import { DriveFilePicker, type DriveFile } from "@/components/drive-file-picker"

const emptyForm = {
  name: "", description: "",
  deliverables: "", inclusions: "", exclusions: "", assumptions: "",
}

export function ProjectTypesSection() {
  const userId = useUserId()
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<ProjectType | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  useEffect(() => {
    if (userId) setProjectTypes(store.projectTypes.get(userId))
  }, [userId])

  const persist = (updated: ProjectType[]) => {
    setProjectTypes(updated)
    store.projectTypes.set(userId, updated)
  }

  const splitLines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean)
  const field = (key: keyof typeof emptyForm, value: string) => setForm((p) => ({ ...p, [key]: value }))

  const handleOpenDialog = (type?: ProjectType) => {
    if (type) {
      setEditingType(type)
      setForm({
        name: type.name,
        description: type.description,
        deliverables: (type.deliverables ?? []).join("\n"),
        inclusions: (type.inclusions ?? []).join("\n"),
        exclusions: (type.exclusions ?? []).join("\n"),
        assumptions: (type.assumptions ?? []).join("\n"),
      })
    } else {
      setForm(emptyForm)
      setEditingType(null)
    }
    setDialogOpen(true)
  }

  const handleImport = async (file: DriveFile) => {
    setPickerOpen(false)
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch(`/api/drive/import-project-types?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}`)
      const data = await res.json()
      if (!res.ok || !data.projectTypes) throw new Error(data.error || "Import failed")
      const imported: ProjectType[] = data.projectTypes
      const merged = [...projectTypes]
      let added = 0, updated = 0
      for (const pt of imported) {
        const idx = merged.findIndex((e) =>
          e.name.toLowerCase() === pt.name.toLowerCase() &&
          e.description.toLowerCase() === pt.description.toLowerCase()
        )
        if (idx === -1) {
          merged.push(pt)
          added++
        } else {
          merged[idx] = { ...merged[idx], ...pt, id: merged[idx].id }
          updated++
        }
      }
      persist(merged)
      const parts = []
      if (added) parts.push(`${added} added`)
      if (updated) parts.push(`${updated} updated`)
      setImportResult(`Import complete: ${parts.join(", ")}`)
    } catch (err) {
      setImportResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setImporting(false)
    }
  }

  const handleSave = () => {
    const entry: ProjectType = {
      id: editingType?.id ?? Date.now().toString(),
      name: form.name,
      description: form.description,
      deliverables: splitLines(form.deliverables),
      inclusions: splitLines(form.inclusions),
      exclusions: splitLines(form.exclusions),
      assumptions: splitLines(form.assumptions),
    }
    persist(editingType
      ? projectTypes.map((t) => t.id === editingType.id ? entry : t)
      : [...projectTypes, entry]
    )
    setDialogOpen(false)
    setForm(emptyForm)
    setEditingType(null)
  }

  const filtered = projectTypes.filter(
    (t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search project types..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={importing} className="gap-2">
            {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {importing ? "Importing..." : "Import from Spreadsheet"}
          </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Project Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit Project Type" : "Add Project Type"}</DialogTitle>
              <DialogDescription>Define the default deliverables, inclusions, exclusions, and assumptions for this project type. Each can be overridden or replaced with a file link in the SOW wizard.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="e.g. Tenable Deployment" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => field("description", e.target.value)} placeholder="Brief description" />
                </div>
              </div>
              {(["deliverables", "inclusions", "exclusions", "assumptions"] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key} <span className="text-muted-foreground text-xs font-normal">(one per line)</span></Label>
                  <Textarea
                    value={form[key]}
                    onChange={(e) => field(key, e.target.value)}
                    rows={4}
                    className="text-sm"
                    placeholder={
                      key === "deliverables" ? "Tenable.sc deployment\nPolicy configuration\nHandover documentation"
                        : key === "inclusions" ? "Remote delivery\nConfiguration of up to 2 scanners"
                        : key === "exclusions" ? "Procurement of licenses\nThird-party integrations"
                        : "Customer provides environment access\nWork performed during business hours"
                    }
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name}>{editingType ? "Save Changes" : "Add Project Type"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {importResult && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${importResult.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"}`}>
          {!importResult.startsWith("Error") && <Check className="h-4 w-4 shrink-0" />}
          {importResult}
        </div>
      )}

      <DriveFilePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleImport} />

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <Card className="bg-card/50 sm:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No project types found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchQuery ? "Try adjusting your search" : "Create your first project type template"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((type) => (
            <Card key={type.id} className="bg-card/50 hover:bg-card/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-5 h-5 text-chart-2" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{type.name}</h3>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(type)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => persist(projectTypes.filter((t) => t.id !== type.id))}>
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                  {(["deliverables", "inclusions", "exclusions", "assumptions"] as const).map((key) => (
                    (type[key]?.length ?? 0) > 0 && (
                      <span key={key}>{type[key].length} {key}</span>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
