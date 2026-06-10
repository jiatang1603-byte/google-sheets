/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  RotateCw,
  Database,
  Sparkles,
  Users,
  CheckCircle,
  MessageSquare,
  Calendar,
  ChevronRight,
  Search,
  Building2,
  ExternalLink,
  Layers,
  Settings,
  Star,
  Plus,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { SurveyResponse, CATEGORIES, CategoryKey, CategorySpec } from "./types";
import {
  RadialProgress,
  TrendLineChart,
  CategoryMetricList,
  HighlightSummaryCard,
  calculateCategoryAverages
} from "./components/CustomChart";

export default function App() {
  const [sheetUrl, setSheetUrl] = useState<string>(
    "https://docs.google.com/spreadsheets/d/16oig2iLL7HKXoOm9q5bcI696G-JZIeN-7N-AGImonk8/edit?usp=sharing"
  );
  const [data, setData] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Tab filter for detail lists
  const [activeTab, setActiveTab] = useState<"all" | "quality" | "logistic" | "service">("all");
  
  // Search state for survey response lists
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  // Gemini state
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // For testing/playground, allow adding local mock response safely
  const [addedMockCount, setAddedMockCount] = useState<number>(0);

  // Process and load spreadsheet data
  const fetchData = async (targetUrl: string = sheetUrl) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/survey-data?sheetUrl=${encodeURIComponent(targetUrl)}`);
      if (!response.ok) {
        throw new Error(`伺服器回應錯誤: ${response.statusText}`);
      }
      const resData = await response.json();
      if (resData.success) {
        setData(resData.responses);
        // Automatically request Gemini analysis if there's data and no analysis yet
        if (resData.responses.length > 0 && !aiSummary) {
          generateGeminiAnalysis(resData.responses);
        }
      } else {
        throw new Error(resData.error || "未能成功讀取問卷數據");
      }
    } catch (err: any) {
      console.error("Fetch survey failing:", err);
      setErrorMsg(err.message || "發生未知連線錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate trend summary with server-side Gemini endpoint
  const generateGeminiAnalysis = async (surveyList: SurveyResponse[] = data) => {
    if (surveyList.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: surveyList }),
      });
      if (!response.ok) {
        throw new Error("智慧分析連線中斷");
      }
      const resData = await response.json();
      if (resData.success) {
        setAiSummary(resData.summary);
      } else {
        throw new Error(resData.error || "分析生成異常");
      }
    } catch (err: any) {
      setAnalysisError(err.message || "Gemini 智慧模組連線失敗");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats on the fly
  const averages = useMemo(() => calculateCategoryAverages(data), [data]);

  const globalAverage = useMemo(() => {
    let scoreSum = 0;
    let count = 0;
    data.forEach((r) => {
      Object.values(r.ratings).forEach((v) => {
        if (v !== null && typeof v === "number" && v > 0) {
          scoreSum += v as number;
          count++;
        }
      });
    });
    return count > 0 ? scoreSum / count : 0;
  }, [data]);

  // Support local mock simulation to preview interactive capabilities immediately
  const handleAddLiveSample = (scoreSet: "high" | "low" | "critical") => {
    const nextId = data.length + 1;
    const now = new Date();
    const mockResponse: SurveyResponse = {
      id: nextId,
      timestamp: `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${scoreSet === "high" ? "上午 10:15" : "下午 3:45"}`,
      customerName: scoreSet === "high" ? "大統烘焙有限公司" : scoreSet === "low" ? "好鄰居便利烘焙坊" : "佳和餐飲集團",
      contact: "09" + Math.floor(10000000 + Math.random() * 90000000),
      frequency: "每週2~3次",
      ratings: {
        taste: scoreSet === "high" ? 5 : scoreSet === "low" ? 3 : 2,
        stability: scoreSet === "high" ? 5 : scoreSet === "low" ? 2 : 1,
        freshness: scoreSet === "high" ? 4 : scoreSet === "low" ? 3 : 2,
        packaging: scoreSet === "high" ? 5 : scoreSet === "low" ? 4 : 2,
        delivery: scoreSet === "high" ? 5 : scoreSet === "low" ? 2 : 1,
        fulfillment: scoreSet === "high" ? 5 : scoreSet === "low" ? 3 : 1,
        responseSpeed: scoreSet === "high" ? 5 : scoreSet === "low" ? 3 : 2,
        serviceEfficiency: scoreSet === "high" ? 4 : scoreSet === "low" ? 2 : 1,
        pricing: scoreSet === "high" ? 4 : scoreSet === "low" ? 3 : 2,
      },
      comments:
        scoreSet === "high"
          ? "長期合作的好夥伴，特別是口感Q彈度非常好，品質非常穩定，期待未來繼續合作！"
          : scoreSet === "low"
          ? "最近幾批出貨感覺包裝封口稍有不夠緊密，運送偶爾略有延遲，希望能微調改善"
          : "希望品質與交貨能再加強，特別是客服人員的回覆，偶有缺貨漏單，望請主管督導！",
    };

    const updatedData = [mockResponse, ...data];
    setData(updatedData);
    setAddedMockCount((prev) => prev + 1);
    // Trigger fresh analysis automatically with real updated data
    generateGeminiAnalysis(updatedData);
  };

  // Reset to static remote source and download again
  const handleResetData = () => {
    setSheetUrl("https://docs.google.com/spreadsheets/d/16oig2iLL7HKXoOm9q5bcI696G-JZIeN-7N-AGImonk8/edit?usp=sharing");
    setAddedMockCount(0);
    fetchData("https://docs.google.com/spreadsheets/d/16oig2iLL7HKXoOm9q5bcI696G-JZIeN-7N-AGImonk8/edit?usp=sharing");
  };

  // Active query filters
  const filteredResponses = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.comments.toLowerCase().includes(searchQuery.toLowerCase());

      const matchFreq =
        frequencyFilter === "all" ||
        item.frequency === frequencyFilter ||
        (frequencyFilter === "empty" && !item.frequency);

      return matchSearch && matchFreq;
    });
  }, [data, searchQuery, frequencyFilter]);

  // Unique frequencies for filter select
  const frequencyOptions = useMemo(() => {
    const list = data.map((d) => d.frequency).filter((f) => f && f.trim() !== "");
    return Array.from(new Set(list));
  }, [data]);

  // Helper custom renderer for Markdown report
  const renderMarkdownText = (content: string) => {
    if (!content) return null;
    const lines = content.split("\n");
    return (
      <div className="space-y-4 text-slate-700 leading-relaxed text-sm">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Main Header
          if (trimmed.startsWith("###")) {
            return (
              <h4 key={idx} className="text-sm font-bold text-indigo-950 mt-5 border-l-4 border-indigo-500 pl-3 uppercase tracking-wider flex items-center gap-1.5 bg-indigo-50/40 py-1 pr-2 rounded">
                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                {trimmed.replace(/^###\s*/, "")}
              </h4>
            );
          }
          if (trimmed.startsWith("##")) {
            return (
              <h3 key={idx} className="text-base font-bold text-slate-800 mt-6 border-b border-indigo-100 pb-1.5">
                {trimmed.replace(/^##\s*/, "")}
              </h3>
            );
          }
          if (trimmed.startsWith("#")) {
            return (
              <h2 key={idx} className="text-lg font-extrabold text-indigo-950 tracking-tight mt-6">
                {trimmed.replace(/^#\s*/, "")}
              </h2>
            );
          }

          // Bullet point lists
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            const rawText = trimmed.substring(2);
            return (
              <li key={idx} className="ml-5 list-disc text-slate-600 my-1">
                {parseBoldText(rawText)}
              </li>
            );
          }

          // Numbered process lists
          const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
          if (numMatch) {
            const num = numMatch[1];
            const text = numMatch[2];
            return (
              <div key={idx} className="flex gap-2.5 items-start bg-white p-3.5 rounded-xl border border-slate-100 hover:border-indigo-100 shadow-[0_2px_4px_rgba(0,0,0,0.01)] transition-all my-2 group">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold font-mono group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                  {num}
                </span>
                <div className="text-slate-700 text-xs sm:text-sm leading-relaxed">{parseBoldText(text)}</div>
              </div>
            );
          }

          // Quote blocks or high priority advice
          if (trimmed.startsWith(">")) {
            return (
              <blockquote key={idx} className="p-3.5 pl-4 border-l-4 border-amber-500 bg-amber-50/40 rounded-r-xl italic text-slate-700 text-xs sm:text-sm my-3 shadow-xs">
                {parseBoldText(trimmed.substring(1).trim())}
              </blockquote>
            );
          }

          return <p key={idx} className="my-1.5 leading-relaxed">{parseBoldText(trimmed)}</p>;
        })}
      </div>
    );
  };

  const parseBoldText = (text: string) => {
    // Regex matches **bold text**
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="font-bold text-slate-900 bg-amber-50/85 px-1 rounded-sm border-b border-amber-200">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const sheetIdMini = useMemo(() => {
    try {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return match[1].substring(0, 9) + "..." + match[1].slice(-4);
      }
    } catch (e) {}
    return "16oig2iLL...onk8";
  }, [sheetUrl]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none antialiased">
      {/* 1. Sleek Interface Header with crisp brand styling */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 flex-shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-800">
                問卷數據分析中心 <span className="text-slate-400 font-normal text-xs ml-1 hidden sm:inline">| 佳堂實業股份有限公司</span>
              </h1>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-mono font-bold px-1.5 py-0.5 rounded uppercase hidden md:inline">
                Survey Insight Engine
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            數據即時串接中: <span className="font-mono text-indigo-600 font-bold">{sheetIdMini}</span>
          </div>
          
          <button 
            onClick={() => {
              const csvData = data.map(item => {
                const qualityAvg = [item.ratings.taste, item.ratings.stability, item.ratings.freshness, item.ratings.packaging].filter(v => v !== null).reduce((a: any, b: any) => a + b, 0) / 4 || 0;
                const serviceAvg = [item.ratings.delivery, item.ratings.fulfillment, item.ratings.responseSpeed, item.ratings.serviceEfficiency, item.ratings.pricing].filter(v => v !== null).reduce((a: any, b: any) => a + b, 0) / 5 || 0;
                return `"${item.customerName}","${item.contact}","${item.frequency}",${qualityAvg.toFixed(2)},${serviceAvg.toFixed(2)},"${item.comments || ""}"`;
              }).join("\n");
              const blob = new Blob([`\ufeff"客戶名稱","聯絡電話","消費頻率","品質指數","服務與售後指數","其他備註"\n${csvData}`], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `佳堂實業_滿意度分析報告_${new Date().toISOString().substring(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm hover:shadow-indigo-100 active:scale-95 transition-all"
          >
            匯出完整報告
          </button>
        </div>
      </header>

      {/* 2. Top control panel for dynamic URL fetching */}
      <section className="bg-white border-b border-slate-100 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider flex-shrink-0">
                <Database className="w-4 h-4 text-indigo-500" />
                <span>數據來源：</span>
              </div>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="輸入 Google 試算表連結..."
                className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => fetchData()}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>重新擷取試算表</span>
              </button>
              {addedMockCount > 0 && (
                <button
                  onClick={handleResetData}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all border border-slate-200"
                >
                  重設為雲端預設
                </button>
              )}
              <a
                href="https://docs.google.com/spreadsheets/d/16oig2iLL7HKXoOm9q5bcI696G-JZIeN-7N-AGImonk8/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
                title="在外部視窗打開試算表"
              >
                <ExternalLink className="w-4.5 h-4.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Error Callout */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-rose-800">讀取試算表失敗</h3>
              <p className="text-xs text-rose-600 mt-1">{errorMsg}</p>
              <button
                onClick={() => fetchData()}
                className="text-xs font-bold text-rose-800 underline mt-2 hover:text-rose-900 block"
              >
                點此重試
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Sandbox Simulator Controls */}
        <div className="bg-amber-50/45 border border-amber-200/60 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-2.5 items-start">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700">
              <Plus className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xxs font-bold text-amber-800 uppercase tracking-widest block">互動沙盒模擬器</span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                可立即模擬新增顧客問卷，體驗儀表板變動與 Gemini 智慧重算：
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAddLiveSample("high")}
              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              模擬新增「極佳回饋」
            </button>
            <button
              onClick={() => handleAddLiveSample("low")}
              className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              模擬新增「中庸微恙」
            </button>
            <button
              onClick={() => handleAddLiveSample("critical")}
              className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <Flame className="w-3.5 h-3.5" />
              模擬新增「警訊抱怨」
            </button>
          </div>
        </div>

        {/* 4. Executive KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total volume */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">總回覆件數</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  {isLoading ? "..." : data.length}
                </span>
                <span className="text-xs text-slate-400">位顧客</span>
              </div>
              <div className="text-xxs text-slate-500 mt-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>雲端與本地累計樣本</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Satisfaction score */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">整體平均滿意度</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-extrabold tracking-tight ${
                  globalAverage >= 4.0 ? "text-emerald-600" : globalAverage >= 3.0 ? "text-amber-500" : "text-rose-500"
                }`}>
                  {isLoading ? "..." : globalAverage > 0 ? globalAverage.toFixed(2) : "N/A"}
                </span>
                <span className="text-xs text-slate-400">/ 5.00</span>
              </div>
              <div className="text-xxs text-slate-500 mt-2 flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        s <= Math.round(globalAverage) ? "fill-amber-400 text-amber-400" : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <span>全體加權評價</span>
              </div>
            </div>
            <div className="p-2">
              <RadialProgress value={globalAverage} size={62} strokeWidth={6} />
            </div>
          </div>

          {/* Card 3: Quality Segment */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">產品品質均分</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-800">
                  {isLoading ? "..." : averages.taste ? ((averages.taste.average + averages.stability.average + averages.freshness.average + averages.packaging.average) / 4).toFixed(2) : "N/A"}
                </span>
                <span className="text-xs text-slate-400">分</span>
              </div>
              <p className="text-xxs text-slate-400 mt-2">口感、批次穩定、新鮮與包裝</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-mono">
              品質類
            </span>
          </div>

          {/* Card 4: Service Segment */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest block">客服與售後均分</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-800">
                  {isLoading ? "..." : averages.responseSpeed ? ((averages.responseSpeed.average + averages.serviceEfficiency.average + averages.pricing.average) / 3).toFixed(2) : "N/A"}
                </span>
                <span className="text-xs text-slate-400">分</span>
              </div>
              <p className="text-xxs text-slate-400 mt-2">客服諮詢速度、異常處理與定價</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-mono">
              客服類
            </span>
          </div>
        </div>

        {/* 5. Highlight & Lowlight alert block */}
        {!isLoading && data.length > 0 && (
          <HighlightSummaryCard data={data} />
        )}

        {/* 6. Layout grid with Charts vs Detailed Ratings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Detailed Rating Breakdown */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-5 lg:col-span-1">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">滿意度細項表現</h3>
              </div>
              <span className="text-xxs text-slate-400 tracking-wide font-bold">1 ~ 5 分級評價</span>
            </div>

            {/* Categorization tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(["all", "quality", "logistic", "service"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 text-center py-1.5 text-xxs font-bold rounded-md transition-all ${
                    activeTab === tab
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "all" ? "全部" : tab === "quality" ? "品質" : tab === "logistic" ? "交期" : "客服"}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-slate-400 text-sm">數據讀取中...</div>
            ) : data.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm">尚未載入數據</div>
            ) : (
              <CategoryMetricList data={data} groupFilter={activeTab} />
            )}
          </div>

          {/* Right panel: Trend Chart and Gemini Analytical Box */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Timeline Sparkline Chart */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">問卷滿意度長程趨勢軌跡</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">反應時間軸上不同客戶對服務滿意度的動態波動</p>
                </div>
                <span className="p-1 px-2.0 bg-indigo-50 text-[10px] rounded-md font-bold text-indigo-700 font-mono">
                  長程分析
                </span>
              </div>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">載入中...</div>
              ) : (
                <TrendLineChart data={data} />
              )}
            </div>

            {/* Gemini Live Wisdom Summary Report (The core value of this request!) */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-indigo-950 relative overflow-hidden">
              {/* Background ambient effect */}
              <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-800/40 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Gemini 智慧趨勢分析與營運摘記</h3>
                    <p className="text-cyan-200/70 text-[11px]">AI 運算模型結合了品質、效率、客服進行的加權診斷報告</p>
                  </div>
                </div>
                <button
                  onClick={() => generateGeminiAnalysis()}
                  disabled={isAnalyzing || data.length === 0}
                  className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>{isAnalyzing ? "正在生成中..." : "重新產生 AI 報告"}</span>
                </button>
              </div>

              {/* Gemini Report Body */}
              <div className="mt-5 relative z-10">
                {isAnalyzing ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                      <Sparkles className="w-4 h-4 text-indigo-300 absolute top-3 right-3 animate-ping" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-300 text-sm font-semibold">Gemini 正在讀取佳堂實業客戶回覆細節...</p>
                      <p className="text-slate-400 text-xxs">正進行多維度統計、交叉解析反饋、建立長短期營運優化對策</p>
                    </div>
                  </div>
                ) : analysisError ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>智慧解析服務不可用</span>
                    </div>
                    <p className="text-rose-300/80">{analysisError}</p>
                    <button
                      onClick={() => generateGeminiAnalysis()}
                      className="mt-3 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 rounded transition-all text-xxs font-bold"
                    >
                      再次嘗試重新召喚
                    </button>
                  </div>
                ) : aiSummary ? (
                  <div className="bg-white/95 text-slate-800 p-5 rounded-xl border border-slate-200 h-[480px] overflow-y-auto shadow-inner custom-scrollbar">
                    {renderMarkdownText(aiSummary)}
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center gap-2">
                    <p>尚無可用的智慧摘要。</p>
                    <p className="text-slate-500 text-xxs">請確認試算表已有填答回覆，並點擊下方按鈕或右上角「重新產生 AI 報告」觸找大腦分析。</p>
                    <button
                      onClick={() => generateGeminiAnalysis()}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-xs tracking-wider"
                    >
                      立即呼叫 Gemini 進行運算
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 7. Detailed Review Table and feedback searcher */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
          {/* Header & filters */}
          <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <MessageSquare className="w-4.5 h-4.5 text-indigo-500" />
                  <span>顧客滿意度填答原始名單與回饋詳情</span>
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">即時過濾並搜尋目標客戶的細項分數、消費頻率與附加建議</p>
              </div>
              <span className="text-xs bg-slate-50 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full font-mono font-medium">
                已篩選出 <strong className="text-indigo-600">{filteredResponses.length}</strong> 筆
              </span>
            </div>

            {/* Inputs & search filter layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Query filter input */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="搜尋客戶名稱、電話或精確評論內容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                />
              </div>

              {/* Dropdown filter */}
              <div>
                <select
                  value={frequencyFilter}
                  onChange={(e) => setFrequencyFilter(e.target.value)}
                  className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">所有消費頻率 ({data.length})</option>
                  <option value="empty">未指定 / 未填寫頻率</option>
                  {frequencyOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} (
                      {data.filter((d) => d.frequency === opt).length} 筆)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table display */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-24 text-center text-slate-400 text-sm">數據加載中，請稍候...</div>
            ) : filteredResponses.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm space-y-2">
                <p>沒有找到符合該篩選條件的問卷紀錄。</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFrequencyFilter("all");
                  }}
                  className="text-xs text-indigo-600 font-bold underline"
                >
                  清除所有篩選條件
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">填答時間</th>
                    <th className="py-3 px-4">客戶資訊</th>
                    <th className="py-3 px-4">消費頻率</th>
                    <th className="py-3 px-4 text-center">產品品質均分</th>
                    <th className="py-3 px-4 text-center">服務客服均分</th>
                    <th className="py-3 px-4">其他具體建議與意見</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResponses.map((item) => {
                    // Compute local record averages
                    const qualityScores = [item.ratings.taste, item.ratings.stability, item.ratings.freshness, item.ratings.packaging].filter(
                      (v) => v !== null
                    ) as number[];
                    const qualityAvg = qualityScores.length > 0 ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;

                    const serviceScores = [item.ratings.delivery, item.ratings.fulfillment, item.ratings.responseSpeed, item.ratings.serviceEfficiency, item.ratings.pricing].filter(
                      (v) => v !== null
                    ) as number[];
                    const serviceAvg = serviceScores.length > 0 ? serviceScores.reduce((a, b) => a + b, 0) / serviceScores.length : 0;

                    const totalScores = [...qualityScores, ...serviceScores];
                    const overallAvg = totalScores.length > 0 ? totalScores.reduce((a, b) => a + b, 0) / totalScores.length : 0;

                    let rowHighlight = "hover:bg-slate-50/50";
                    if (overallAvg > 0 && overallAvg <= 2.2) {
                      rowHighlight = "bg-rose-50/20 hover:bg-rose-50/40";
                    } else if (overallAvg >= 4.5) {
                      rowHighlight = "bg-emerald-50/10 hover:bg-emerald-50/20";
                    }

                    return (
                      <tr key={item.id} className={`transition-colors ${rowHighlight}`}>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {item.timestamp || "未指定"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 text-xs sm:text-sm">
                            {item.customerName || "未知客戶"}
                          </div>
                          {item.contact && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              聯絡: {item.contact}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {item.frequency ? (
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 inline-block">
                              {item.frequency}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">未填寫</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                              qualityAvg >= 4.0 ? "text-emerald-700 bg-emerald-50" : qualityAvg >= 2.5 ? "text-slate-700 bg-slate-50" : "text-rose-700 bg-rose-50"
                            }`}>
                              {qualityAvg > 0 ? qualityAvg.toFixed(1) : "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                              serviceAvg >= 4.0 ? "text-indigo-700 bg-indigo-50" : serviceAvg >= 2.5 ? "text-slate-700 bg-slate-50" : "text-rose-700 bg-rose-50"
                            }`}>
                              {serviceAvg > 0 ? serviceAvg.toFixed(1) : "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-sm">
                          {item.comments ? (
                            <p className="text-slate-600 text-xs line-clamp-2 hover:line-clamp-none transition-all duration-300 pointer-events-auto">
                              {item.comments}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-300 italic">無具體建議描述</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      {/* 8. Professional Footer details */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xxs text-slate-400 font-sans tracking-wide">
            佳堂實業股份有限公司 版權所有 © {new Date().getFullYear()} Jiatang Enterprise Co., Ltd. All Rights Reserved.
          </div>
          <div className="flex gap-4 text-xxs text-slate-400 font-mono">
            <span>Powered by Gemini 3.5 AI Engine</span>
            <span>|</span>
            <span>系統狀態：運作正常</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
