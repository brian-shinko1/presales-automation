"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Users, MoreHorizontal, Pencil, Trash2, Mail, Phone, FileSpreadsheet, RefreshCw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { store } from "@/lib/store"
import type { TeamMember } from "@/types"
import { DriveFilePicker, type DriveFile } from "@/components/drive-file-picker"

const roles = [
  "Solutions Architect",
  "Senior Developer",
  "Junior Developer",
  "Project Manager",
  "UX Designer",
  "UI Designer",
  "DevOps Engineer",
  "QA Engineer",
  "Business Analyst",
  "Technical Writer",
  "Security Consultant",
  "Account Executive",
]

const roleColors: Record<string, string> = {
  "Solutions Architect": "bg-chart-1/10 text-chart-1",
  "Senior Developer": "bg-chart-2/10 text-chart-2",
  "Junior Developer": "bg-chart-3/10 text-chart-3",
  "Project Manager": "bg-chart-4/10 text-chart-4",
  "UX Designer": "bg-chart-5/10 text-chart-5",
  "Security Consultant": "bg-chart-1/10 text-chart-1",
  "Account Executive": "bg-chart-2/10 text-chart-2",
}

const emptyForm = { name: "", email: "", phone: "", role: "", hourlyRate: 150 }

export function TeamSection() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  useEffect(() => {
    setTeamMembers(store.teamMembers.get())
  }, [])

  const save = (updated: TeamMember[]) => {
    setTeamMembers(updated)
    store.teamMembers.set(updated)
  }

  const filteredMembers = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingMember(null)
  }

  const handleOpenDialog = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member)
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone || "",
        role: member.role,
        hourlyRate: member.hourlyRate,
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (editingMember) {
      save(teamMembers.map((m) => m.id === editingMember.id ? { ...m, ...formData } : m))
    } else {
      save([...teamMembers, { id: Date.now().toString(), ...formData }])
    }
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    save(teamMembers.filter((m) => m.id !== id))
  }

  const handleImport = async (file: DriveFile) => {
    setPickerOpen(false)
    setImporting(true)
    setImportResult(null)
    try {
      const res = await fetch(`/api/drive/import-team?fileId=${file.id}&mimeType=${encodeURIComponent(file.mimeType)}`)
      const data = await res.json()
      if (!res.ok || !data.teamMembers) throw new Error(data.error || "Import failed")
      const imported: TeamMember[] = data.teamMembers
      const merged = [...teamMembers]
      let added = 0
      for (const m of imported) {
        if (!merged.find((e) => e.email.toLowerCase() === m.email.toLowerCase())) {
          merged.push(m)
          added++
        }
      }
      save(merged)
      setImportResult(`Imported ${added} member${added !== 1 ? "s" : ""} (${imported.length - added} skipped — already exist)`)
    } catch (err) {
      setImportResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setImporting(false)
    }
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase()

  const field = (key: keyof typeof formData, value: string | number) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={importing} className="gap-2">
            {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {importing ? "Importing..." : "Import from Spreadsheet"}
          </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
              <DialogDescription>
                {editingMember ? "Update the team member details below" : "Add a new member to your presales team"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={formData.name} onChange={(e) => field("name", e.target.value)} placeholder="John Doe" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => field("email", e.target.value)} placeholder="john@katana1.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={formData.phone} onChange={(e) => field("phone", e.target.value)} placeholder="+61 4xx xxx xxx" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v) => field("role", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Daily Rate (AUD ex GST)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.hourlyRate}
                  onChange={(e) => field("hourlyRate", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formData.name || !formData.email || !formData.role}>
                {editingMember ? "Save Changes" : "Add Member"}
              </Button>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.length === 0 ? (
          <Card className="bg-card/50 sm:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No team members found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchQuery ? "Try adjusting your search" : "Add your first team member"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member) => (
            <Card key={member.id} className="bg-card/50 hover:bg-card/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <Badge variant="secondary" className={`text-xs ${roleColors[member.role] || ""}`}>
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(member)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(member.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
