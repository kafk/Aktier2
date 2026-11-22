import { NextRequest, NextResponse } from "next/server";
import {
  getStoredArticles,
  saveOrUpdateArticles,
  deleteStoredArticle,
  deleteMultipleStoredArticles,
  clearAllStoredArticles,
  exportArticlesToCsv,
} from "@/lib/serverDb";
import { isWriteProtectionConfigured, verifyWriteAccess } from "@/lib/apiAuth";
import { NewsArticle } from "@/types/scraper";

const MAX_BATCH_SIZE = 2000;

function isValidNewsArticle(item: unknown): item is NewsArticle {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    typeof candidate.matchedStock === "string" &&
    typeof candidate.publishedAt === "string"
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format");
    const stock = searchParams.get("stock") || undefined;
    const sentiment = searchParams.get("sentiment") || undefined;
    const eventType = searchParams.get("eventType") || undefined;
    const classification = searchParams.get("classification") || undefined;
    const search = searchParams.get("search") || undefined;
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offsetParam = searchParams.get("offset");
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    const { articles, total } = getStoredArticles({
      stock,
      sentiment,
      eventType,
      classification,
      search,
      days,
      limit,
      offset,
    });

    // Handle CSV export request
    if (format === "csv") {
      const csv = exportArticlesToCsv(articles);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="scraped_reports_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      articles,
      total,
      limit: limit || total,
      offset,
      authRequired: isWriteProtectionConfigured(),
    });
  } catch (error) {
    console.error("Error in GET /api/articles:", error);
    return NextResponse.json(
      { error: "Failed to load stored articles", articles: [], total: 0 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyWriteAccess(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    let rawArticles: unknown[] = [];

    if (Array.isArray(body)) {
      rawArticles = body;
    } else if (body && Array.isArray(body.articles)) {
      rawArticles = body.articles;
    } else if (body && typeof body === "object" && "id" in body && "title" in body) {
      rawArticles = [body];
    }

    const newArticles = rawArticles.filter(isValidNewsArticle).slice(0, MAX_BATCH_SIZE);

    if (newArticles.length === 0) {
      return NextResponse.json({ message: "No valid articles to save", savedCount: 0, totalCount: 0 });
    }

    const result = saveOrUpdateArticles(newArticles);
    return NextResponse.json({
      success: true,
      savedCount: result.savedCount,
      totalCount: result.totalCount,
    });
  } catch (error) {
    console.error("Error in POST /api/articles:", error);
    return NextResponse.json(
      { error: "Failed to save articles" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = verifyWriteAccess(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const singleId = searchParams.get("id");
    const commaIds = searchParams.get("ids");
    const clearAll = searchParams.get("all") === "true";

    // 1. Check body for array of IDs
    let bodyIds: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body)) {
        bodyIds = body.filter((id): id is string => typeof id === "string");
      } else if (body && Array.isArray(body.ids)) {
        bodyIds = body.ids.filter((id: unknown): id is string => typeof id === "string");
      }
    } catch {
      // Body might be empty, that's fine
    }

    const allTargetIds = Array.from(
      new Set([
        ...(singleId ? [singleId] : []),
        ...(commaIds ? commaIds.split(",").map((s) => s.trim()).filter(Boolean) : []),
        ...bodyIds,
      ])
    );

    if (allTargetIds.length === 1) {
      const deleted = deleteStoredArticle(allTargetIds[0]);
      return NextResponse.json({ success: deleted, deletedCount: deleted ? 1 : 0 });
    }

    if (allTargetIds.length > 1) {
      const result = deleteMultipleStoredArticles(allTargetIds);
      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        remainingCount: result.remainingCount,
      });
    }

    if (clearAll) {
      const cleared = clearAllStoredArticles();
      return NextResponse.json({ success: cleared, clearedAll: true });
    }

    return NextResponse.json({ error: "No ID(s) provided to delete" }, { status: 400 });
  } catch (error) {
    console.error("Error in DELETE /api/articles:", error);
    return NextResponse.json(
      { error: "Failed to delete articles" },
      { status: 500 }
    );
  }
}
