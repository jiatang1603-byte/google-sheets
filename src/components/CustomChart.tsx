import React, { useState } from "react";
import { SurveyResponse, CATEGORIES, CategorySpec, CategoryKey } from "../types";
import { Star, ShieldAlert, BadgeCheck, Flame } from "lucide-react";

interface CustomChartProps {
  data: SurveyResponse[];
}

// Helper to convert rating fields to group sets
export function calculateCategoryAverages(data: SurveyResponse[]) {
  const averages: Record<CategoryKey, { average: number; count: number }> = {} as any;

  CATEGORIES.forEach((cat) => {
    let sum = 0;
    let count = 0;
    data.forEach((item) => {
      const val = item.ratings[cat.key];
      if (val !== null && typeof val === "number") {
        sum += val;
        count++;
      }
    });
    averages[cat.key] = {
      average: count > 0 ? sum / count : 0,
      count,
    };
  });

  return averages;
}

// 1. Radial Score Indicator
export const RadialProgress: React.FC<{ value: number; size?: number; strokeWidth?: number }> = ({
  value,
  size = 120,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = value > 0 ? (value / 5) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let color = "stroke-rose-500";
  let bgFillColor = "fill-rose-50";
  if (value >= 4.0) {
    color = "stroke-emerald-500";
    bgFillColor = "fill-emerald-50";
  } else if (value >= 3.0) {
    color = "stroke-amber-500";
    bgFillColor = "fill-amber-50";
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-100 fill-none"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`fill-none transition-all duration-1000 ease-out ${color}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold text-slate-800">
          {value > 0 ? value.toFixed(2) : "N/A"}
        </span>
        <span className="text-xxs font-semibold text-slate-400 tracking-wide uppercase">分數</span>
      </div>
    </div>
  );
};

// 2. Beautiful SVG Line Chart for Satisfaction Over Time
export const TrendLineChart: React.FC<CustomChartProps> = ({ data }) => {
  // Sort responses chronologically based on Timestamp
  const sorted = [...data]
    .filter((d) => Object.values(d.ratings).some((v) => v !== null))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (sorted.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-sm">
        需要至少兩筆已評分的數據以渲染時間軸趨勢
      </div>
    );
  }

  const scores = sorted.map((item) => {
    const ratings = Object.values(item.ratings).filter((v) => v !== null) as number[];
    const avg = ratings.length > 0 ? ratings.reduce((sum, v) => sum + v, 0) / ratings.length : 3;
    return {
      name: item.customerName || `匿名#${item.id}`,
      dateStr: item.timestamp.split(" ")[0] || "",
      score: avg,
    };
  });

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const getX = (index: number) => {
    return paddingX + (index / (scores.length - 1)) * (width - paddingX * 2);
  };

  const getY = (score: number) => {
    // Score range 1 to 5 maps to (height - paddingY) to paddingY
    return height - paddingY - ((score - 1) / 4) * (height - paddingY * 2);
  };

  const points = scores.map((s, index) => `${getX(index)},${getY(s.score)}`).join(" ");

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-semibold text-slate-700">滿意度時間發展軌跡 (1.0 ~ 5.0)</div>
        <div className="flex gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> 平均分數
          </span>
        </div>
      </div>
      <div className="relative overflow-visible">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Y-Axis Gridlines */}
          {[1, 2, 3, 4, 5].map((scoreValue) => {
            const y = getY(scoreValue);
            return (
              <g key={scoreValue}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  className="stroke-slate-100"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  className="text-[10px] fill-slate-400 font-mono text-right"
                  textAnchor="end"
                >
                  {scoreValue}.0
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          <path
            d={`M ${getX(0)} ${height - paddingY} L ${points} L ${getX(scores.length - 1)} ${height - paddingY} Z`}
            className="fill-indigo-50/30"
          />

          {/* SparkLine Path */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="drop-shadow-sm"
          />

          {/* Scatter Data Dots */}
          {scores.map((s, index) => {
            const cx = getX(index);
            const cy = getY(s.score);
            return (
              <g key={index} className="group cursor-pointer">
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  className="fill-white stroke-indigo-600 hover:stroke-indigo-800"
                  strokeWidth="2.5"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  className="fill-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity"
                />
                {/* Tooltip on SVG */}
                <title>{`${s.name}\n${s.dateStr}\n均分: ${s.score.toFixed(2)}`}</title>
              </g>
            );
          })}

          {/* X Axis label for extreme nodes */}
          <text
            x={getX(0)}
            y={height - 2}
            className="text-[9px] fill-slate-400 font-mono"
            textAnchor="start"
          >
            {scores[0].dateStr}
          </text>
          <text
            x={getX(scores.length - 1)}
            y={height - 2}
            className="text-[9px] fill-slate-400 font-mono"
            textAnchor="end"
          >
            {scores[scores.length - 1].dateStr}
          </text>
        </svg>
      </div>
    </div>
  );
};

// 3. Score Breakdown list - Horizontal Progress Bars
export const CategoryMetricList: React.FC<{
  data: SurveyResponse[];
  groupFilter?: "quality" | "logistic" | "service" | "all";
}> = ({ data, groupFilter = "all" }) => {
  const averages = calculateCategoryAverages(data);

  const filteredCategories = CATEGORIES.filter((cat) => {
    if (groupFilter === "all") return true;
    return cat.group === groupFilter;
  });

  return (
    <div className="space-y-4">
      {filteredCategories.map((cat) => {
        const stats = averages[cat.key] || { average: 0, count: 0 };
        const score = stats.average;
        const percent = (score / 5) * 100;

        let scoreColorClass = "text-rose-600 bg-rose-50";
        let barColorClass = "bg-rose-500";
        if (score >= 4.0) {
          scoreColorClass = "text-emerald-700 bg-emerald-50";
          barColorClass = "bg-emerald-500";
        } else if (score >= 3.0) {
          scoreColorClass = "text-amber-700 bg-amber-50";
          barColorClass = "bg-amber-500";
        }

        return (
          <div key={cat.key} className="p-4 bg-white border border-slate-50 rounded-xl hover:shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-sm font-semibold text-slate-800">{cat.label}</span>
                <p className="text-xxs text-slate-400 mt-0.5">{cat.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColorClass}`}>
                  {score > 0 ? score.toFixed(2) : "暫無"} 分
                </span>
                <span className="text-[10px] text-slate-400 font-mono">({stats.count}筆)</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColorClass} rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 4. Strengths & Low-points bento
export const HighlightSummaryCard: React.FC<CustomChartProps> = ({ data }) => {
  const averages = calculateCategoryAverages(data);

  // Compute highest & lowest rated items
  const sortedStats = CATEGORIES.map((cat) => ({
    ...cat,
    avg: averages[cat.key]?.average || 0,
    count: averages[cat.key]?.count || 0,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.avg - a.avg);

  if (sortedStats.length === 0) {
    return null;
  }

  const highest = sortedStats[0];
  const lowest = sortedStats[sortedStats.length - 1];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Highest Satisfaction */}
      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/60 flex gap-3 items-start">
        <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-sm">
          <BadgeCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide font-bold text-emerald-800">優勢亮點</span>
          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{highest.label}</h4>
          <p className="text-xs text-slate-600 mt-1">
            平均得分高達 <strong className="text-emerald-700">{highest.avg.toFixed(2)}</strong> 分。這是顧客極度滿意的強項項目，請繼續保持以此作為市場壁壘。
          </p>
        </div>
      </div>

      {/* Lowest Satisfaction */}
      <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100/60 flex gap-3 items-start">
        <div className="p-2 rounded-lg bg-rose-500 text-white shadow-sm">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide font-bold text-rose-800">急需改善</span>
          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{lowest.label}</h4>
          <p className="text-xs text-slate-600 mt-1">
            平均得分僅為 <strong className="text-rose-700">{lowest.avg.toFixed(2)}</strong> 分。這是目前的關鍵痛點，建議立即投入資源，檢視製程或交運流程。
          </p>
        </div>
      </div>
    </div>
  );
};
