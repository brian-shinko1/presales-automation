"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Building2, Settings, RefreshCw, ChevronRight, Home, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STORAGE_FOLDER_ID = "presales_customers_folder_id"
const STORAGE_FOLDER_NAME = "presales_customers_folder_name"

interface DriveFolder {
  id: string
  name: string
}

interface BreadcrumbItem {
  id: string
  name: string
}

export function CustomersSection() {
  const [configuredFolderId, setConfiguredFolderId] = useState<string | null>(null)
  const [configuredFolderName, setConfiguredFolderName] = useState<string | null>(null)
  const [customers, setCustomers] = useState<DriveFolder[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Folder browser state
  const [configOpen, setConfigOpen] = useState(false)
  const [browserFolders, setBrowserFolders] = useState<DriveFolder[]>([])
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: "root", name: "My Drive" }])
  const [browserLoading, setBrowserLoading] = useState(false)
  const [browserSearch, setBrowserSearch] = useState("")
  const [folderUrl, setFolderUrl] = useState("")
  const [folderUrlName, setFolderUrlName] = useState("")
  const [folderUrlError, setFolderUrlError] = useState("")
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_FOLDER_ID)
    const storedName = localStorage.getItem(STORAGE_FOLDER_NAME)
    if (storedId) {
      setConfiguredFolderId(storedId)
      setConfiguredFolderName(storedName)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    if (!configuredFolderId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/drive/folders?parentId=${configuredFolderId}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCustomers(data.folders)
    } catch {
      setError("Failed to load folders from Drive")
    } finally {
      setLoading(false)
    }
  }, [configuredFolderId])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const browseFolders = async (parentId: string) => {
    setBrowserLoading(true)
    try {
      const res = await fetch(`/api/drive/folders?parentId=${parentId}`)
      const data = await res.json()
      setBrowserFolders(data.folders || [])
    } catch {
      setBrowserFolders([])
    } finally {
      setBrowserLoading(false)
    }
  }

  const openConfigDialog = () => {
    setBreadcrumb([{ id: "root", name: "My Drive" }])
    setBrowserSearch("")
    setFolderUrl("")
    setFolderUrlName("")
    setFolderUrlError("")
    browseFolders("root")
    setConfigOpen(true)
  }

  const handleFolderUrlSubmit = () => {
    setFolderUrlError("")
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/)
    if (!match) {
      setFolderUrlError("Couldn't find a folder ID in that URL. Copy the URL directly from Google Drive.")
      return
    }
    const folderId = match[1]
    selectFolder({ id: folderId, name: folderUrlName.trim() || "Drive Folder" })
  }

  const handleBrowserSearch = (value: string) => {
    setBrowserSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.trim() === "") {
      const current = breadcrumb[breadcrumb.length - 1]
      browseFolders(current.id)
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setBrowserLoading(true)
      try {
        const res = await fetch(`/api/drive/folders?search=${encodeURIComponent(value)}`)
        const data = await res.json()
        setBrowserFolders(data.folders || [])
      } catch {
        setBrowserFolders([])
      } finally {
        setBrowserLoading(false)
      }
    }, 400)
  }

  const navigateInto = (folder: DriveFolder) => {
    const newBreadcrumb = [...breadcrumb, { id: folder.id, name: folder.name }]
    setBreadcrumb(newBreadcrumb)
    browseFolders(folder.id)
  }

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)
    browseFolders(newBreadcrumb[newBreadcrumb.length - 1].id)
  }

  const selectFolder = (folder: DriveFolder) => {
    localStorage.setItem(STORAGE_FOLDER_ID, folder.id)
    localStorage.setItem(STORAGE_FOLDER_NAME, folder.name)
    setConfiguredFolderId(folder.id)
    setConfiguredFolderName(folder.name)
    setConfigOpen(false)
  }

  const filteredCustomers = customers.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {configuredFolderId && (
            <Button variant="ghost" size="icon" onClick={fetchCustomers} disabled={loading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button variant="outline" onClick={openConfigDialog} className="gap-2">
            <Settings className="h-4 w-4" />
            {configuredFolderName ? "Change Folder" : "Configure Folder"}
          </Button>
        </div>
      </div>

      {/* Configured folder indicator */}
      {configuredFolderName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4" />
          <span>Showing subfolders of</span>
          <Badge variant="secondary" className="font-normal">{configuredFolderName}</Badge>
        </div>
      )}

      {/* Customer list */}
      <div className="grid gap-4">
        {!configuredFolderId ? (
          <Card className="bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No folder configured</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Select a Google Drive folder — its subfolders will appear as customers
              </p>
              <Button onClick={openConfigDialog} className="gap-2">
                <Settings className="h-4 w-4" />
                Configure Folder
              </Button>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading customers...
          </div>
        ) : error ? (
          <Card className="bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" onClick={fetchCustomers} className="mt-4 gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredCustomers.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No customers found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchQuery ? "Try adjusting your search" : "No subfolders found in the configured folder"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="bg-card/50 hover:bg-card/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-chart-1" />
                  </div>
                  <h3 className="font-semibold">{customer.name}</h3>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Folder browser dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select a folder</DialogTitle>
          </DialogHeader>

          {/* Paste URL */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Paste a Google Drive folder URL to select it directly:</p>
            <Input
              placeholder="https://drive.google.com/drive/folders/..."
              value={folderUrl}
              onChange={(e) => { setFolderUrl(e.target.value); setFolderUrlError("") }}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Display name (e.g. Customers)"
                value={folderUrlName}
                onChange={(e) => setFolderUrlName(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={handleFolderUrlSubmit} disabled={!folderUrl.trim()}>
                Use
              </Button>
            </div>
            {folderUrlError && <p className="text-xs text-destructive">{folderUrlError}</p>}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or browse
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all folders..."
              value={browserSearch}
              onChange={(e) => handleBrowserSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Breadcrumb — hidden while searching */}
          {!browserSearch && <div className="flex items-center gap-1 flex-wrap text-sm">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i === 0 ? (
                  <button
                    onClick={() => navigateToBreadcrumb(i)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Home className="h-3.5 w-3.5" />
                    {crumb.name}
                  </button>
                ) : (
                  <button
                    onClick={() => navigateToBreadcrumb(i)}
                    className={i === breadcrumb.length - 1 ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                  >
                    {crumb.name}
                  </button>
                )}
                {i < breadcrumb.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            ))}
          </div>}

          {/* Folder list */}
          <div className="min-h-[200px] max-h-[360px] overflow-y-auto border rounded-md divide-y">
            {browserLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : browserFolders.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                No subfolders found
              </div>
            ) : (
              browserFolders.map((folder) => (
                <div key={folder.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-sm">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => selectFolder(folder)}>
                      Select
                    </Button>
                    {!browserSearch && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigateInto(folder)} title="Open folder">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
