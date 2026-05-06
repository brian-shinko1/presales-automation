"use client"

import { useState, useRef } from "react"
import { Search, Folder, File, FileSpreadsheet, FileText, ChevronRight, Home, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
}

interface BreadcrumbItem {
  id: string
  name: string
}

const FOLDER_MIME = "application/vnd.google-apps.folder"

function fileIcon(mimeType: string) {
  if (mimeType === FOLDER_MIME) return <Folder className="h-4 w-4 text-yellow-500" />
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("pdf"))
    return <FileText className="h-4 w-4 text-blue-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

interface DriveFilePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (file: DriveFile) => void
}

export function DriveFilePicker({ open, onClose, onSelect }: DriveFilePickerProps) {
  const [items, setItems] = useState<DriveFile[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: "root", name: "My Drive" }])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async (parentId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/drive/items?parentId=${parentId}`)
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setBreadcrumb([{ id: "root", name: "My Drive" }])
      setSearch("")
      load("root")
    } else {
      onClose()
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!value.trim()) {
      load(breadcrumb[breadcrumb.length - 1].id)
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/drive/items?search=${encodeURIComponent(value)}`)
        const data = await res.json()
        setItems(data.items || [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  const navigateInto = (item: DriveFile) => {
    const newCrumb = [...breadcrumb, { id: item.id, name: item.name }]
    setBreadcrumb(newCrumb)
    setSearch("")
    load(item.id)
  }

  const navigateTo = (index: number) => {
    const newCrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newCrumb)
    setSearch("")
    load(newCrumb[newCrumb.length - 1].id)
  }

  const handleSelect = (item: DriveFile) => {
    onSelect(item)
    onClose()
  }

  const folders = items.filter((i) => i.mimeType === FOLDER_MIME)
  const files = items.filter((i) => i.mimeType !== FOLDER_MIME)

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select a file</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {!search && (
          <div className="flex items-center gap-1 flex-wrap text-sm">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i === 0 ? (
                  <button onClick={() => navigateTo(i)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Home className="h-3.5 w-3.5" />
                    {crumb.name}
                  </button>
                ) : (
                  <button
                    onClick={() => navigateTo(i)}
                    className={i === breadcrumb.length - 1 ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                  >
                    {crumb.name}
                  </button>
                )}
                {i < breadcrumb.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            ))}
          </div>
        )}

        <div className="min-h-[220px] max-h-[360px] overflow-y-auto border rounded-md divide-y">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
              {search ? "No files found" : "Folder is empty"}
            </div>
          ) : (
            <>
              {folders.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    {fileIcon(item.mimeType)}
                    <span className="truncate text-sm">{item.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => navigateInto(item)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {files.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    {fileIcon(item.mimeType)}
                    <span className="truncate text-sm">{item.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs shrink-0" onClick={() => handleSelect(item)}>
                    Select
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
