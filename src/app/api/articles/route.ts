import { NextRequest, NextResponse } from "next/server";
import {
  getStoredArticles,
  saveOrUpdateArticles,
  deleteStoredArticle,
  clearAllStoredArticles,
  exportArticlesToCsv,
} from "@/lib/serverDb";
import { NewsArticle } from "@/types/scraper";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format");
    const stock = searchParams.get("stock") || undefined;
    const sentiment = searchParams.get("sentiment") || undefined;
    const eventType = searchParams.get("eventType") || undefined;
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
  try {
    const body = await request.json();
    let newArticles: NewsArticle[] = [];

    if (Array.isArray(body)) {
      newArticles = body;
    } else if (body && body.articles && Array.isArray(body.articles)) {
      newArticles = body.articles;
    } else if (body && body.id && body.title) {
      newArticles = [body];
    }

    if (newArticles.length === 0) {
      return NextResponse.json({ message: "No articles to save", savedCount: 0, totalCount: 0 });
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
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (id) {
      const deleted = deleteStoredArticle(id);
      return NextResponse.json({ success: deleted, deletedId: id });
    }

    // Clear all if no ID specified
    const cleared = clearAllStoredArticles();
    return NextResponse.json({ success: cleared, clearedAll: true });
  } catch (error) {
    console.error("Error in DELETE /api/articles:", error);
    return NextResponse.json(
      { error: "Failed to delete articles" },
      { status: 500 }
    );
  }
}
