"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassificationsTab } from "@/components/keywords/ClassificationsTab";
import { ScoringConfigTab } from "@/components/keywords/ScoringConfigTab";
import { ImpactBandsTab } from "@/components/keywords/ImpactBandsTab";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Classification,
  ScoringConfig,
  defaultClassifications,
  defaultScoringConfig,
} from "@/types/keywords";

export default function KeywordManagement() {
  const [classifications, setClassifications] = useLocalStorage<Classification[]>(
    "classifications",
    defaultClassifications
  );
  const [scoringConfig, setScoringConfig] = useLocalStorage<ScoringConfig>(
    "scoringConfig",
    defaultScoringConfig
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Keyword Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure keywords and scoring rules for news scraping
          </p>
        </div>

        <Tabs defaultValue="classifications" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="classifications">Classifications</TabsTrigger>
            <TabsTrigger value="scoring">Scoring Config</TabsTrigger>
            <TabsTrigger value="bands">Impact Bands</TabsTrigger>
          </TabsList>

          <TabsContent value="classifications">
            <ClassificationsTab
              classifications={classifications}
              setClassifications={setClassifications}
            />
          </TabsContent>

          <TabsContent value="scoring">
            <ScoringConfigTab
              scoringConfig={scoringConfig}
              setScoringConfig={setScoringConfig}
            />
          </TabsContent>

          <TabsContent value="bands">
            <ImpactBandsTab
              impactBands={scoringConfig.impactScoreBands}
              setImpactBands={(bands) =>
                setScoringConfig({ ...scoringConfig, impactScoreBands: bands })
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
