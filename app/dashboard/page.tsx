"use client"

export const runtime = "edge"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, FolderKanban, Users, Lock } from "lucide-react"
import { SOWTab } from "@/components/dashboard/sow-tab"
import { ResourcesTab } from "@/components/dashboard/resources-tab"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("sow")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your statements of work, customers, and team resources
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3 h-12">
          <TabsTrigger value="rfp" disabled className="gap-2 data-[state=active]:bg-background">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">RFP</span>
            <Badge variant="secondary" className="ml-1 text-xs">Soon</Badge>
          </TabsTrigger>
          <TabsTrigger value="sow" className="gap-2 data-[state=active]:bg-background">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">SOW</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2 data-[state=active]:bg-background">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Resources</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rfp" className="space-y-4">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">RFP Management Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              Track and respond to RFPs with AI-assisted proposal generation. Stay tuned for updates.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="sow" className="space-y-4">
          <SOWTab />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourcesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
