"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, X, Edit2, Check, Lightbulb, Copy, Download, Star } from "lucide-react";

/**
 * SpotTips — user-authored tips & tricks per spot.
 *
 * Persistence: localStorage (key: photoscout-spot-tips).
 * Schema:
 *   {
 *     [spotId]: {
 *       tips: Tip[]
 *     }
 *   }
 *
 * Each tip:
 *   - id: string (uuid-ish)
 *   - text: string
 *   - category: "composition" | "timing" | "access" | "gear" | "warning" | "general"
 *   - starred: boolean (for guidebook highlights)
 *   - createdAt: ISO date
 *   - updatedAt: ISO date
 *
 * Designed for guidebook export later — `getAllTipsForExport()` and the
 * Copy/Markdown actions emit clean structured text.
 */

const STORAGE_KEY = "photoscout-spot-tips";

export type TipCategory =
  | "composition"
  | "timing"
  | "access"
  | "gear"
  | "warning"
  | "general";

export interface SpotTip {
  id: string;
  text: string;
  category: TipCategory;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TipsStore {
  [spotId: string]: { tips: SpotTip[] };
}

const CATEGORY_META: Record<
  TipCategory,
  { label: string; emoji: string; color: string }
> = {
  composition: { label: "Composition", emoji: "🎨", color: "text-purple-400" },
  timing: { label: "Timing", emoji: "🕰️", color: "text-amber-400" },
  access: { label: "Access", emoji: "🗺️", color: "text-blue-400" },
  gear: { label: "Gear", emoji: "📷", color: "text-emerald-400" },
  warning: { label: "Warning", emoji: "⚠️", color: "text-red-400" },
  general: { label: "General", emoji: "💡", color: "text-[var(--neutral-200)]" },
};

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadStore(): TipsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: TipsStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Failed to save tips:", e);
  }
}

export function useSpotTips(spotId: string) {
  const [tips, setTips] = useState<SpotTip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const store = loadStore();
    setTips(store[spotId]?.tips ?? []);
    setLoaded(true);
  }, [spotId]);

  const persist = useCallback(
    (next: SpotTip[]) => {
      const store = loadStore();
      store[spotId] = { tips: next };
      saveStore(store);
      setTips(next);
    },
    [spotId]
  );

  const addTip = useCallback(
    (text: string, category: TipCategory) => {
      const now = new Date().toISOString();
      persist([
        ...tips,
        { id: uuid(), text, category, starred: false, createdAt: now, updatedAt: now },
      ]);
    },
    [tips, persist]
  );

  const updateTip = useCallback(
    (id: string, patch: Partial<Pick<SpotTip, "text" | "category" | "starred">>) => {
      persist(
        tips.map((t) =>
          t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
        )
      );
    },
    [tips, persist]
  );

  const removeTip = useCallback(
    (id: string) => persist(tips.filter((t) => t.id !== id)),
    [tips, persist]
  );

  return { tips, loaded, addTip, updateTip, removeTip };
}

/** Export helper — pulls all tips across all spots, useful for guidebook gen. */
export function getAllTipsForExport(): TipsStore {
  return loadStore();
}

// ─── UI ──────────────────────────────────────────────────────────────────

interface SpotTipsProps {
  spotId: string;
  spotName: string;
}

export function SpotTips({ spotId, spotName }: SpotTipsProps) {
  const { tips, loaded, addTip, updateTip, removeTip } = useSpotTips(spotId);
  const [adding, setAdding] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftCategory, setDraftCategory] = useState<TipCategory>("general");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<TipCategory>("general");
  const [copied, setCopied] = useState(false);

  const orderedTips = useMemo(
    () => [...tips].sort((a, b) => Number(b.starred) - Number(a.starred)),
    [tips]
  );

  if (!loaded) return null;

  const submitNew = () => {
    const text = draftText.trim();
    if (!text) return;
    addTip(text, draftCategory);
    setDraftText("");
    setDraftCategory("general");
    setAdding(false);
  };

  const startEdit = (t: SpotTip) => {
    setEditingId(t.id);
    setEditText(t.text);
    setEditCategory(t.category);
  };
  const submitEdit = () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) return;
    updateTip(editingId, { text, category: editCategory });
    setEditingId(null);
  };

  const exportMarkdown = () => {
    if (tips.length === 0) return;
    const lines = [`## ${spotName} — Tips & Tricks`, ""];
    const byCat = new Map<TipCategory, SpotTip[]>();
    for (const t of orderedTips) {
      if (!byCat.has(t.category)) byCat.set(t.category, []);
      byCat.get(t.category)!.push(t);
    }
    for (const [cat, list] of byCat) {
      lines.push(`### ${CATEGORY_META[cat].emoji} ${CATEGORY_META[cat].label}`);
      lines.push("");
      for (const t of list) {
        const star = t.starred ? "⭐ " : "";
        lines.push(`- ${star}${t.text}`);
      }
      lines.push("");
    }
    const md = lines.join("\n");
    navigator.clipboard.writeText(md).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  };

  const downloadMarkdown = () => {
    if (tips.length === 0) return;
    const lines = [`# ${spotName}`, "", "## Tips & Tricks", ""];
    for (const t of orderedTips) {
      const star = t.starred ? "⭐ " : "";
      lines.push(
        `- ${star}**[${CATEGORY_META[t.category].label}]** ${t.text}`
      );
    }
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${spotId}-tips.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass rounded-xl p-4 sm:p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-orange-400" strokeWidth={2} />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--neutral-200)]">
            Tips &amp; Tricks
          </h3>
          {tips.length > 0 && (
            <span className="text-[10px] uppercase tracking-wider text-[var(--neutral-300)] bg-[#262626] px-2 py-0.5 rounded-full">
              {tips.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {tips.length > 0 && (
            <>
              <button
                onClick={exportMarkdown}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--neutral-300)] hover:text-[var(--neutral-200)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Copy as markdown for guidebook"
              >
                <Copy size={12} /> {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={downloadMarkdown}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--neutral-300)] hover:text-[var(--neutral-200)] hover:bg-white/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Download as .md"
              >
                <Download size={12} /> Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {tips.length === 0 && !adding && (
        <p className="text-sm text-[var(--neutral-300)] mb-3">
          No tips yet. Add notes for yourself or future guidebook readers — what
          worked, what to avoid, where to stand.
        </p>
      )}

      {/* Tips list */}
      {orderedTips.length > 0 && (
        <ul className="space-y-2 mb-3">
          {orderedTips.map((t) =>
            editingId === t.id ? (
              <li
                key={t.id}
                className="rounded-lg p-3 bg-[#262626] border border-orange-500/30"
              >
                <CategoryPicker value={editCategory} onChange={setEditCategory} />
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full mt-2 px-3 py-2 rounded-lg text-sm bg-transparent border border-neutral-600 focus:border-orange-500/50 outline-none text-[var(--white)]"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[var(--neutral-300)] hover:text-[var(--neutral-200)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitEdit}
                    className="px-3 py-1.5 rounded-lg text-xs bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={t.id}
                className="group rounded-lg p-3 bg-[#262626] flex items-start gap-3"
              >
                <span
                  className={`text-base flex-shrink-0 leading-none mt-0.5 ${
                    CATEGORY_META[t.category].color
                  }`}
                  title={CATEGORY_META[t.category].label}
                >
                  {CATEGORY_META[t.category].emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--neutral-200)] whitespace-pre-wrap break-words">
                    {t.text}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--neutral-300)] mt-1">
                    {CATEGORY_META[t.category].label}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => updateTip(t.id, { starred: !t.starred })}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                      t.starred
                        ? "text-yellow-400"
                        : "text-[var(--neutral-300)] hover:text-yellow-400"
                    }`}
                    title={t.starred ? "Unstar" : "Star for guidebook"}
                  >
                    <Star size={14} fill={t.starred ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--neutral-300)] hover:text-[var(--neutral-200)] cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => removeTip(t.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--neutral-300)] hover:text-red-400 cursor-pointer"
                    title="Delete"
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {/* Add form */}
      {adding ? (
        <div className="rounded-lg p-3 bg-[#262626] border border-orange-500/30">
          <CategoryPicker value={draftCategory} onChange={setDraftCategory} />
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="e.g. Park at the upper lot — the lower one fills by 6 AM in summer."
            rows={3}
            className="w-full mt-2 px-3 py-2 rounded-lg text-sm bg-transparent border border-neutral-600 focus:border-orange-500/50 outline-none text-[var(--white)] placeholder:text-[var(--neutral-300)]"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setAdding(false);
                setDraftText("");
                setDraftCategory("general");
              }}
              className="px-3 py-1.5 rounded-lg text-xs text-[var(--neutral-300)] hover:text-[var(--neutral-200)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={submitNew}
              disabled={!draftText.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check size={12} /> Add Tip
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--neutral-200)] hover:text-[var(--white)] bg-[#262626] hover:bg-[#333] border border-dashed border-neutral-600 transition-colors cursor-pointer w-full sm:w-auto justify-center sm:justify-start"
        >
          <Plus size={14} /> Add a tip
        </button>
      )}
    </div>
  );
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: TipCategory;
  onChange: (c: TipCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(CATEGORY_META) as TipCategory[]).map((cat) => {
        const meta = CATEGORY_META[cat];
        const active = cat === value;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer ${
              active
                ? "bg-orange-500 text-white"
                : "bg-[#262626] text-[var(--neutral-200)] hover:bg-[#333]"
            }`}
          >
            <span>{meta.emoji}</span> {meta.label}
          </button>
        );
      })}
    </div>
  );
}
