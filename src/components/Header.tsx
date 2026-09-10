"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// App version - increment for each update: v1.02 -> v1.03 -> v1.04
export const APP_VERSION = "1.41";

interface HeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  children?: ReactNode; // For action buttons
  titleClassName?: string; // Custom styling for title
}

export function Header({ title, subtitle, backHref, children, titleClassName }: HeaderProps) {
  return (
    <header className="border-b bg-white mb-6">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            {backHref && (
              <Link href={backHref} className="inline-block mb-2">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-3">
              <h1 className={`text-2xl font-bold tracking-tight ${titleClassName || ""}`}>{title}</h1>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                v{APP_VERSION}
              </span>
            </div>
            {subtitle && (
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
            )}
          </div>
          {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
      </div>
    </header>
  );
}
