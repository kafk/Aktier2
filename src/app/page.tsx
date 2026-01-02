"use client";

import { useState } from "react";
import Link from "next/link";
import { Newspaper, Bell, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
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
      <Header
        title="Keyword Management"
        subtitle="Configure keywords and scoring rules for news scraping"
      >
        <Link href="/companies">
          <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <Building2 className="h-4 w-4 mr-2" />
            Companies
          </Button>
        </Link>
        <Link href="/news-scraping">
          <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
            <Bell className="h-4 w-4 mr-2" />
            News Scraping
          </Button>
        </Link>
        <Link href="/scraper">
          <Button>
            <Newspaper className="h-4 w-4 mr-2" />
            History Scraping
          </Button>
        </Link>
      </Header>

      <div className="container mx-auto px-4">

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
