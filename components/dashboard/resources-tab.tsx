"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, FolderKanban, Users } from "lucide-react"
import { CustomersSection } from "@/components/dashboard/resources/customers-section"
import { ProjectTypesSection } from "@/components/dashboard/resources/project-types-section"
import { TeamSection } from "@/components/dashboard/resources/team-section"

export function ResourcesTab() {
  const [activeSection, setActiveSection] = useState("customers")

  return (
    <div className="space-y-6">
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full max-w-md grid-cols-3 h-10">
          <TabsTrigger value="customers" className="gap-2 text-sm">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2 text-sm">
            <FolderKanban className="h-4 w-4" />
            <span className="hidden sm:inline">Project Types</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-6">
          <CustomersSection />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectTypesSection />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
