"use client";

import { NavHeader } from "@/components/nav-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  useKiteCatalog,
  useBoardCatalog,
  useKitesurfGearProfile,
} from "@/lib/kitesurf-hooks";
import type { Kite, Board, OwnedKite, OwnedBoard } from "@/lib/kitesurf-types";

const SKILL_LEVELS: Array<{ id: NonNullable<OwnedKiteProfileSkill>; label: string }> = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
  { id: "expert", label: "Expert" },
];

type OwnedKiteProfileSkill = "beginner" | "intermediate" | "advanced" | "expert";

const DISCIPLINES = [
  { id: "freeride", label: "Freeride" },
  { id: "wave", label: "Wave" },
  { id: "freestyle", label: "Freestyle" },
  { id: "foil", label: "Foil" },
  { id: "big-air", label: "Big Air" },
];

const BOARD_TYPE_LABELS: Record<Board["type"], string> = {
  twintip: "Twintip",
  directional: "Directional",
  foilboard: "Foilboard",
};

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export default function KitesurfGearPage() {
  const kiteDb = useKiteCatalog();
  const boardDb = useBoardCatalog();
  const { gear, updateGear, loaded } = useKitesurfGearProfile();

  // Adding a kite: two-step flow (pick model → pick sizes)
  const [pickingKiteModel, setPickingKiteModel] = useState(false);
  const [pendingKite, setPendingKite] = useState<Kite | null>(null);
  const [pendingSizes, setPendingSizes] = useState<number[]>([]);

  // Editing sizes of already-owned kite
  const [editingKiteId, setEditingKiteId] = useState<string | null>(null);

  // Adding a board: pick model → maybe pick size
  const [pickingBoardModel, setPickingBoardModel] = useState(false);
  const [pendingBoard, setPendingBoard] = useState<Board | null>(null);

  if (!loaded) return null;

  // Group kites by brand for select
  const availableKites = kiteDb.filter(
    (k) => !gear.kites.some((ok) => ok.id === k.id)
  );
  const kitesByBrand = availableKites.reduce<Record<string, Kite[]>>((acc, k) => {
    (acc[k.brand] = acc[k.brand] || []).push(k);
    return acc;
  }, {});

  // Group boards by type for select
  const availableBoards = boardDb.filter(
    (b) => !gear.boards.some((ob) => ob.id === b.id)
  );
  const boardsByType = availableBoards.reduce<Record<string, Board[]>>((acc, b) => {
    const key = BOARD_TYPE_LABELS[b.type] || b.type;
    (acc[key] = acc[key] || []).push(b);
    return acc;
  }, {});

  function startAddKite() {
    setPickingKiteModel(true);
    setPendingKite(null);
    setPendingSizes([]);
  }

  function confirmAddKite() {
    if (!pendingKite || pendingSizes.length === 0) return;
    const owned: OwnedKite = {
      id: pendingKite.id,
      brand: pendingKite.brand,
      model: pendingKite.model,
      sizes_m2: [...pendingSizes].sort((a, b) => a - b),
    };
    updateGear({ kites: [...gear.kites, owned] });
    setPendingKite(null);
    setPendingSizes([]);
    setPickingKiteModel(false);
  }

  function cancelAddKite() {
    setPendingKite(null);
    setPendingSizes([]);
    setPickingKiteModel(false);
  }

  function toggleSize(size: number) {
    setPendingSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function toggleEditSize(kiteId: string, size: number) {
    const owned = gear.kites.find((k) => k.id === kiteId);
    if (!owned) return;
    const next = owned.sizes_m2.includes(size)
      ? owned.sizes_m2.filter((s) => s !== size)
      : [...owned.sizes_m2, size].sort((a, b) => a - b);
    updateGear({
      kites: gear.kites.map((k) =>
        k.id === kiteId ? { ...k, sizes_m2: next } : k
      ),
    });
  }

  function removeKite(id: string) {
    updateGear({ kites: gear.kites.filter((k) => k.id !== id) });
    if (editingKiteId === id) setEditingKiteId(null);
  }

  function startAddBoard() {
    setPickingBoardModel(true);
    setPendingBoard(null);
  }

  function cancelAddBoard() {
    setPickingBoardModel(false);
    setPendingBoard(null);
  }

  function saveBoard(board: Board, size?: string) {
    const owned: OwnedBoard = {
      id: board.id,
      brand: board.brand,
      model: board.model,
      type: board.type,
      size_cm: size,
    };
    updateGear({ boards: [...gear.boards, owned] });
    setPendingBoard(null);
    setPickingBoardModel(false);
  }

  function removeBoard(id: string) {
    updateGear({ boards: gear.boards.filter((b) => b.id !== id) });
  }

  return (
    <>
      <NavHeader />
      <main className="pt-14">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h2 className="text-[13px]l font-bold text-[var(--white)] mb-6">Your Kitesurf Gear</h2>

          {/* Kites Card */}
          <div className="glass rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px]s uppercase tracking-widest text-[var(--neutral-300)]">
                Kites
              </span>
              <button
                onClick={() => (pickingKiteModel ? cancelAddKite() : startAddKite())}
                className="text-[13px]s text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
              >
                {pickingKiteModel ? "Cancel" : "+ Add Kite"}
              </button>
            </div>

            {gear.kites.length === 0 && !pickingKiteModel && (
              <p className="text-sm text-[var(--neutral-300)] py-4 text-center">
                No kites added yet. Tap &quot;+ Add Kite&quot; to build your quiver.
              </p>
            )}

            <div className="space-y-2">
              {gear.kites.map((kite) => {
                const catalog = kiteDb.find((k) => k.id === kite.id);
                const allSizes = catalog?.sizes_m2 ?? kite.sizes_m2;
                const isEditing = editingKiteId === kite.id;
                return (
                  <div
                    key={kite.id}
                    className="p-3 rounded-lg bg-[#1c1c1c]/50 border border-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--white)]">
                          {kite.brand} {kite.model}
                        </p>
                        <button
                          onClick={() => setEditingKiteId(isEditing ? null : kite.id)}
                          className="text-[13px]s text-[var(--neutral-200)] hover:text-orange-300 transition-colors cursor-pointer text-left"
                        >
                          {kite.sizes_m2.length > 0
                            ? kite.sizes_m2
                                .slice()
                                .sort((a, b) => a - b)
                                .map((s) => `${s}m`)
                                .join(" · ")
                            : "No sizes selected — tap to edit"}
                        </button>
                      </div>
                      <button
                        onClick={() => removeKite(kite.id)}
                        className="text-neutral-600 hover:text-red-400 transition-colors ml-2 cursor-pointer"
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-[13px]s text-[var(--neutral-300)] mb-2">
                          Sizes you own (m²)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {allSizes.map((size) => {
                            const selected = kite.sizes_m2.includes(size);
                            return (
                              <label
                                key={size}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                                  selected
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-neutral-500/20 text-[var(--neutral-200)] hover:bg-neutral-500/30"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleEditSize(kite.id, size)}
                                  className="sr-only"
                                />
                                {size}m
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pickingKiteModel && !pendingKite && (
              <div className="mt-3">
                <Select
                  onValueChange={(id) => {
                    const k = kiteDb.find((x) => x.id === id);
                    if (k) {
                      setPendingKite(k);
                      setPendingSizes([]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a kite model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(kitesByBrand).map(([brand, kites]) => (
                      <div key={brand}>
                        <div className="px-2 py-1.5 text-[13px]s font-semibold text-[var(--neutral-300)]">
                          {brand}
                        </div>
                        {kites.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.brand} {k.model}
                            {k.year ? ` (${k.year})` : ""}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pickingKiteModel && pendingKite && (
              <div className="mt-3 p-3 rounded-lg bg-[#1c1c1c]/50 border border-white/5">
                <p className="text-sm font-semibold text-[var(--white)] mb-1">
                  {pendingKite.brand} {pendingKite.model}
                </p>
                <p className="text-[13px]s text-[var(--neutral-300)] mb-3">
                  Select the sizes you own (m²)
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {pendingKite.sizes_m2.map((size) => {
                    const selected = pendingSizes.includes(size);
                    return (
                      <label
                        key={size}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                          selected
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-neutral-500/20 text-[var(--neutral-200)] hover:bg-neutral-500/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSize(size)}
                          className="sr-only"
                        />
                        {size}m
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmAddKite}
                    disabled={pendingSizes.length === 0}
                    className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-[13px] font-semibold hover:bg-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Add Kite
                  </button>
                  <button
                    onClick={cancelAddKite}
                    className="px-4 py-1.5 rounded-lg bg-neutral-700 text-[var(--neutral-200)] text-[13px] font-semibold hover:bg-neutral-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Boards Card */}
          <div className="glass rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px]s uppercase tracking-widest text-[var(--neutral-300)]">
                Boards
              </span>
              <button
                onClick={() => (pickingBoardModel ? cancelAddBoard() : startAddBoard())}
                className="text-[13px]s text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
              >
                {pickingBoardModel ? "Cancel" : "+ Add Board"}
              </button>
            </div>

            {gear.boards.length === 0 && !pickingBoardModel && (
              <p className="text-sm text-[var(--neutral-300)] py-4 text-center">
                No boards added yet. Tap &quot;+ Add Board&quot; to get started.
              </p>
            )}

            <div className="space-y-2">
              {gear.boards.map((board) => (
                <div
                  key={board.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#1c1c1c]/50 border border-white/5"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--white)]">
                      {board.brand} {board.model}
                    </p>
                    <p className="text-[13px]s text-[var(--neutral-200)]">
                      {BOARD_TYPE_LABELS[board.type]}
                      {board.size_cm ? ` · ${board.size_cm}cm` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => removeBoard(board.id)}
                    className="text-neutral-600 hover:text-red-400 transition-colors ml-2 cursor-pointer"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>

            {pickingBoardModel && !pendingBoard && (
              <div className="mt-3">
                <Select
                  onValueChange={(id) => {
                    const b = boardDb.find((x) => x.id === id);
                    if (!b) return;
                    if (b.sizes_cm && b.sizes_cm.length > 1) {
                      setPendingBoard(b);
                    } else {
                      saveBoard(b, b.sizes_cm?.[0]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(boardsByType).map(([type, boards]) => (
                      <div key={type}>
                        <div className="px-2 py-1.5 text-[13px]s font-semibold text-[var(--neutral-300)]">
                          {type}
                        </div>
                        {boards.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.brand} {b.model}
                            {b.year ? ` (${b.year})` : ""}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {pickingBoardModel && pendingBoard && (
              <div className="mt-3 p-3 rounded-lg bg-[#1c1c1c]/50 border border-white/5">
                <p className="text-sm font-semibold text-[var(--white)] mb-1">
                  {pendingBoard.brand} {pendingBoard.model}
                </p>
                <p className="text-[13px]s text-[var(--neutral-300)] mb-3">
                  Select the size you own (cm)
                </p>
                <Select
                  onValueChange={(size: string | null) => {
                    if (!size) return;
                    saveBoard(pendingBoard, size);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a size..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingBoard.sizes_cm.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}cm
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Rider Profile Card */}
          <div className="glass rounded-2xl p-6">
            <span className="text-[13px]s uppercase tracking-widest text-[var(--neutral-300)] block mb-4">
              Rider Profile
            </span>

            <div className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="20"
                  max="200"
                  value={gear.weightKg ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateGear({
                      weightKg: val === "" ? undefined : Number(val),
                    });
                  }}
                  placeholder="e.g. 75"
                  className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c]/50 border border-white/5 text-sm text-[var(--white)] placeholder:text-[var(--neutral-300)] focus:outline-none focus:border-orange-400/50"
                />
              </div>

              {/* Skill Level */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">
                  Skill Level
                </label>
                <Select
                  value={gear.skillLevel || ""}
                  onValueChange={(val: string | null) => {
                    if (!val) return;
                    updateGear({ skillLevel: val as OwnedKiteProfileSkill });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select skill level..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Discipline */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">
                  Primary Discipline
                </label>
                <Select
                  value={gear.primaryDiscipline || ""}
                  onValueChange={(val: string | null) => {
                    if (!val) return;
                    updateGear({ primaryDiscipline: val });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select discipline..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCIPLINES.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Harness */}
              <div>
                <label className="text-[13px]s text-[var(--neutral-200)] block mb-1.5">
                  Harness
                </label>
                <input
                  type="text"
                  value={gear.harness ?? ""}
                  onChange={(e) => updateGear({ harness: e.target.value })}
                  placeholder="e.g. Mystic Majestic X"
                  className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c]/50 border border-white/5 text-sm text-[var(--white)] placeholder:text-[var(--neutral-300)] focus:outline-none focus:border-orange-400/50"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
