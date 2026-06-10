import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to convert Google Sheets view URL to CSV export URL
function convertToCsvUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`;
  }
  return url;
}

// Custom RFC-4180 compliant CSV parser
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        i++; // skip the double quote escape
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n" || char === "\r") {
        row.push(cell);
        cell = "";
        if (row.length > 0 && row.some((c) => c.trim() !== "")) {
          lines.push(row);
        }
        row = [];
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip LF after CR
        }
      } else {
        cell += char;
      }
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim() !== "")) {
      lines.push(row);
    }
  }

  return lines;
}

// Safe conversion to rating or null
function parseRating(val: string): number | null {
  if (!val || val.trim() === "") return null;
  const num = parseInt(val.trim(), 10);
  return isNaN(num) ? null : num;
}

// Survey mapping helper
function mapRowsToSurveyData(rows: string[][]) {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row, idx) => {
    return {
      id: idx + 1,
      timestamp: row[0] || "",
      customerName: row[1] || "",
      contact: row[2] || "",
      frequency: row[3] || "",
      ratings: {
        taste: parseRating(row[4]),             // 1. 口感與風味
        stability: parseRating(row[5]),         // 2. 品質穩定度
        freshness: parseRating(row[6]),         // 3. 新鮮度表現
        packaging: parseRating(row[7]),         // 4. 外包裝完整性
        delivery: parseRating(row[8]),          // 1. 交貨準時性
        fulfillment: parseRating(row[9]),       // 2. 訂單達成率
        responseSpeed: parseRating(row[10]),     // 1. 業務/客服回應速度
        serviceEfficiency: parseRating(row[11]), // 2. 售後問題處理
        pricing: parseRating(row[12]),           // 3. 價格合理性
      },
      comments: row[13] || "",
    };
  });
}

// 1. Fetch and Parse survey data endpoint
app.get("/api/survey-data", async (req, res) => {
  try {
    const rawUrl = (req.query.sheetUrl as string) || "https://docs.google.com/spreadsheets/d/16oig2iLL7HKXoOm9q5bcI696G-JZIeN-7N-AGImonk8/edit?usp=sharing";
    const csvUrl = convertToCsvUrl(rawUrl);

    console.log(`[BACKEND] Fetching CSV from: ${csvUrl}`);
    const response = await fetch(csvUrl);
    if (!response.ok) {
      return res.status(response.status).json({
        error: `無法從 Google 試算表擷取資料，伺服器回應: ${response.statusText}`,
      });
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const mapped = mapRowsToSurveyData(rows);

    res.json({
      success: true,
      headers: rows[0] || [],
      responses: mapped,
      rawCount: mapped.length,
    });
  } catch (error: any) {
    console.error("Error fetching sheet:", error);
    res.status(500).json({ error: error.message || "讀取試算表時發生未知錯誤" });
  }
});

// 2. Server-side Gemini intelligence analyzer endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const { responses } = req.body;
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: "無效的問卷資料內容" });
    }

    if (responses.length === 0) {
      return res.json({
        summary: "目前尚未有有效的顧客問卷回覆資料，無法產生分析與調整建議。",
      });
    }

    // Format survey state for Gemini ingestion
    const validRatings = responses.filter((r: any) =>
      Object.values(r.ratings).some((v) => v !== null)
    );

    // Prepare a descriptive digest
    let totalScoreCount = 0;
    let scoreSum = 0;
    const categorySums: Record<string, { sum: number; count: number }> = {};

    validRatings.forEach((r: any) => {
      Object.entries(r.ratings).forEach(([key, val]: [string, any]) => {
        if (typeof val === "number") {
          scoreSum += val;
          totalScoreCount++;
          if (!categorySums[key]) {
            categorySums[key] = { sum: 0, count: 0 };
          }
          categorySums[key].sum += val;
          categorySums[key].count++;
        }
      });
    });

    const categoriesMap: Record<string, string> = {
      taste: "口感與風味 (Q彈度/穩定度)",
      stability: "品質穩定度 (批次一致性)",
      freshness: "新鮮度表現 (色澤/氣味/保存)",
      packaging: "外包裝完整性 (封口/標示/破損)",
      delivery: "交貨準時性 (按時送達)",
      fulfillment: "訂單達成率 (零缺貨/漏單)",
      responseSpeed: "業務/客服回應速度 (諮詢/訂貨)",
      serviceEfficiency: "售後問題處理 (異常處理效率)",
      pricing: "價格合理性 (性價比)",
    };

    const averagesList = Object.entries(categorySums).map(([key, data]) => {
      const avg = data.sum / data.count;
      return `${categoriesMap[key] || key}: 平均 ${avg.toFixed(2)} 分 (共 ${data.count} 筆評價)`;
    });

    const suggestions = responses
      .map((r: any) => r.comments)
      .filter((c: any) => c && c.trim() !== "")
      .map((c: any, idx: number) => `${idx + 1}. "${c}"`)
      .join("\n");

    const prompt = `
你是一位資深的食品/包裝產品供應商營運總監與顧客滿意度顧問，請針對以下顧客問卷滿意度調查結果做深度的「趨勢分析與改善策略摘要」。
請使用專業、親切且具體可行（客觀、有洞見）的台灣繁體中文（zh-TW）撰寫，語氣要富有建設性與商業敏感度。

【基本問卷數據】
- 總回覆件數：${responses.length} 筆
- 有效評分回覆件數：${validRatings.length} 筆
- 整體平均得分（1-5分制）：${
      totalScoreCount > 0 ? (scoreSum / totalScoreCount).toFixed(2) : "無"
    } 分

【各細項指標平均分數】
${averagesList.join("\n") || "暫無評分數據"}

【顧客其他具體建議與反饋】
${suggestions || "無具體建議"}

請產生一篇結構完整的「滿意度洞察與趨勢分析報告」，報告中必須包含：
1. 【整體滿意度總結】：用 100-150 字統括當前的表現定位（例如是滿意度高、還是有明顯警訊）。
2. 【核心亮點強項分析】：挑選表現最優秀的 1-2 個指標，分析維持此核心優勢的價值與做法。
3. 【關鍵痛點與警訊改善】：挑選分數最低或退步最明顯、或顧客反饋強烈的前 1-2 個關鍵環節，提供 2 項字面具體、極具執行力的具體整頓方案。
4. 【顧客聲音精選摘錄與解析】：針對顧客留下的建議，解讀背後隱含的需求（即便目前資料筆數少，仍應解構或模擬未來的反饋趨勢）。
5. 【短期與中長期營運建議】：
   - 短期（1個月內）：可立即改善、見效快的動作
   - 中長程（半年內）：更系統性、穩定品質或效率的營運轉型規劃

請以漂亮、組織清晰、有標題、條列式且帶有重點加粗的 Markdown 格式回傳，方便在管理後台儀表板直接顯示。
不要出現任何亂碼或無意義、誇大的詞彙。
`;

    console.log("[BACKEND] Querying Gemini for trend summary...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      summary: response.text,
    });
  } catch (error: any) {
    console.error("Gemini analytical fail:", error);
    res.status(500).json({ error: error.message || "Gemini 智慧分析失效" });
  }
});

async function startServer() {
  // Vite dev server or static middleware integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Survey dashboard engine running at http://localhost:${PORT}`);
  });
}

startServer();
