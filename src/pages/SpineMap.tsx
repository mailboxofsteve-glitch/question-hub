import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import * as d3 from "d3";
import { Printer, Map, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NodeRecord {
  id: string;
  title: string;
  tier: number | null;
  spine_gates: string[];
  published: boolean;
  category: string | null;
}

const TIER_COLORS: Record<number, string> = {
  0: "hsl(220, 60%, 55%)",
  1: "hsl(280, 50%, 55%)",
  2: "hsl(160, 55%, 42%)",
  3: "hsl(38, 92%, 50%)",
  4: "hsl(0, 60%, 55%)",
  5: "hsl(320, 55%, 50%)",
  6: "hsl(45, 80%, 48%)",
};

const TIER_BG_COLORS: Record<number, string> = {
  0: "hsla(220, 60%, 55%, 0.08)",
  1: "hsla(280, 50%, 55%, 0.08)",
  2: "hsla(160, 55%, 42%, 0.08)",
  3: "hsla(38, 92%, 50%, 0.08)",
  4: "hsla(0, 60%, 55%, 0.08)",
  5: "hsla(320, 55%, 50%, 0.08)",
  6: "hsla(45, 80%, 48%, 0.08)",
};

const TIER_LABELS: Record<number, string> = {
  0: "Epistemological Bedrock",
  1: "The Existence Question",
  2: "Design & Information",
  3: "Moral Reality",
  4: "Human Nature",
  5: "The Revelation Bridge",
  6: "Testing the Bible",
};

const BAND_HEIGHT_MIN = 180;
const BAND_HEIGHT_COLLAPSED = 44;
const NODE_VERTICAL_SPACING = 70;
const ZIGZAG_OFFSET = 30;
const PADDING_TOP = 40;
const PADDING_BOTTOM = 40;
const TIER_COUNT = 7;

// ── Printable View Component ──────────────────────────────────────
function PrintView({
  nodes,
  gatesByTier,
  branchesByGate,
}: {
  nodes: NodeRecord[];
  gatesByTier: globalThis.Map<number, string[]>;
  branchesByGate: globalThis.Map<string, NodeRecord[]>;
}) {
  return (
    <div className="print-view space-y-6">
      {Array.from({ length: 7 }, (_, i) => 6 - i).map((tier) => {
        const gates = gatesByTier.get(tier) ?? [];
        if (gates.length === 0) return null;
        return (
          <div key={tier} className="break-inside-avoid">
            <h2
              className="text-lg font-bold mb-2 pb-1 border-b-2"
              style={{ borderColor: TIER_COLORS[tier], color: TIER_COLORS[tier] }}
            >
              T{tier}: {TIER_LABELS[tier]}
            </h2>
            <div className="space-y-3 pl-2">
              {gates.map((gate) => {
                const branches = branchesByGate.get(gate) ?? [];
                return (
                  <div key={gate}>
                    <h3 className="font-semibold text-sm text-foreground">{gate}</h3>
                    {branches.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-muted-foreground ml-3 mt-1 space-y-0.5">
                        {branches.map((b) => (
                          <li key={b.id}>{b.title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 ml-3 italic">No branch nodes</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function SpineMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const toggleTier = useCallback((tier: number) => {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  const { data: nodes, isLoading } = useQuery({
    queryKey: ["spine-map-nodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nodes")
        .select("id, title, tier, spine_gates, published, category")
        .not("tier", "is", null)
        .eq("published", true)
        .order("tier");
      if (error) throw error;
      return (data ?? []) as NodeRecord[];
    },
  });

  // Precompute gate groupings for both views
  const { gatesByTier, branchesByGate, branchCountBySpine } = useMemo(() => {
    if (!nodes) {
      return {
        gatesByTier: new globalThis.Map<number, string[]>(),
        branchesByGate: new globalThis.Map<string, NodeRecord[]>(),
        branchCountBySpine: new globalThis.Map<string, number>(),
      };
    }

    const gateSet = new Set<string>();
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => gateSet.add(g));
    });

    const gateTierVotes = new globalThis.Map<string, globalThis.Map<number, number>>();
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      const tier = n.tier ?? 0;
      gates.forEach((g: string) => {
        if (!gateTierVotes.has(g)) gateTierVotes.set(g, new globalThis.Map<number, number>());
        const votes = gateTierVotes.get(g)!;
        votes.set(tier, (votes.get(tier) ?? 0) + 1);
      });
    });

    const gateToTier = new globalThis.Map<string, number>();
    gateTierVotes.forEach((votes, gate) => {
      let maxTier = 0, maxCount = 0;
      votes.forEach((count, tier) => {
        if (count > maxCount) { maxCount = count; maxTier = tier; }
      });
      gateToTier.set(gate, maxTier);
    });

    const byTier = new globalThis.Map<number, string[]>();
    for (let t = 0; t < 7; t++) byTier.set(t, []);
    gateSet.forEach((gate) => {
      const tier = gateToTier.get(gate) ?? 0;
      byTier.get(tier)!.push(gate);
    });
    byTier.forEach((gates) => gates.sort());

    const byGate = new globalThis.Map<string, NodeRecord[]>();
    gateSet.forEach((g) => byGate.set(g, []));

    const spinePattern = /^s-(\d+)$/i;
    const spineIdSet = new Set<string>();
    nodes.forEach((n) => {
      if (spinePattern.test(n.id)) spineIdSet.add(n.id.toLowerCase());
    });

    // Count branch nodes per spine gate
    const countBySpine = new globalThis.Map<string, number>();
    nodes.forEach((n) => {
      if (spineIdSet.has(n.id.toLowerCase())) return; // skip spine nodes themselves
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => {
        if (byGate.has(g)) byGate.get(g)!.push(n);
        const key = g.toLowerCase();
        if (spineIdSet.has(key)) {
          countBySpine.set(key, (countBySpine.get(key) ?? 0) + 1);
        }
      });
    });

    return { gatesByTier: byTier, branchesByGate: byGate, branchCountBySpine: countBySpine };
  }, [nodes]);

  // Search matching set
  const matchingIds = useMemo(() => {
    if (!searchQuery.trim() || !nodes) return null; // null = no filter
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    nodes.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) {
        ids.add(n.id.toLowerCase());
      }
    });
    return ids;
  }, [searchQuery, nodes]);

  useEffect(() => {
    if (!nodes || !svgRef.current || !containerRef.current || showPrintView) return;

    const containerWidth = containerRef.current.clientWidth;
    const contentWidth = Math.max(containerWidth, 900);

    // ── Pre-pass: count spine nodes per tier for dynamic band heights ──
    const spinePattern = /^s-(\d+)$/i;
    const spineNodesMap = new globalThis.Map<string, NodeRecord>();
    nodes.forEach((n) => {
      if (spinePattern.test(n.id)) {
        spineNodesMap.set(n.id.toLowerCase(), n);
      }
    });

    const spineCountByTier = new globalThis.Map<number, number>();
    spineNodesMap.forEach((n) => {
      const t = n.tier ?? 0;
      spineCountByTier.set(t, (spineCountByTier.get(t) ?? 0) + 1);
    });

    // Dynamic band height: max(BAND_HEIGHT_MIN, count * NODE_VERTICAL_SPACING + padding)
    const bandHeight = (tier: number) => {
      if (collapsedTiers.has(tier)) return BAND_HEIGHT_COLLAPSED;
      const count = spineCountByTier.get(tier) ?? 0;
      return Math.max(BAND_HEIGHT_MIN, count * NODE_VERTICAL_SPACING + 60);
    };

    const totalHeight = PADDING_TOP + Array.from({ length: TIER_COUNT }, (_, i) => bandHeight(i)).reduce((a, b) => a + b, 0) + PADDING_BOTTOM;

    const tierBandY = (tier: number) => {
      const invertedIndex = (TIER_COUNT - 1) - tier;
      let y = PADDING_TOP;
      for (let i = 0; i < invertedIndex; i++) {
        const t = (TIER_COUNT - 1) - i;
        y += bandHeight(t);
      }
      return y;
    };

    // ── 1. Collect unique spine nodes, sorted by number ──
    const spineNodesList = Array.from(spineNodesMap.values()).sort((a, b) => {
      const aNum = parseInt(a.id.match(spinePattern)![1]);
      const bNum = parseInt(b.id.match(spinePattern)![1]);
      return aNum - bNum;
    });

    // ── 2. Position spine nodes with zigzag offset ──
    type PosNode = {
      id: string; label: string; x: number; y: number;
      tier: number; isSpine: boolean; radius: number; color: string; navigateId: string;
    };
    const posNodes: PosNode[] = [];
    const spineX = contentWidth / 2;

    const spineByTier = new globalThis.Map<number, typeof spineNodesList>();
    spineNodesList.forEach((node) => {
      const tier = node.tier ?? 0;
      if (!spineByTier.has(tier)) spineByTier.set(tier, []);
      spineByTier.get(tier)!.push(node);
    });

    // Track global spine index for consistent zigzag across tiers
    let globalSpineIdx = 0;
    // Process tiers bottom-to-top so globalSpineIdx increments naturally
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const tierNodes = spineByTier.get(tier);
      if (!tierNodes || collapsedTiers.has(tier)) continue;
      const bh = bandHeight(tier);
      const bandTop = tierBandY(tier) + 30;
      const bandBottom = tierBandY(tier) + bh - 30;
      tierNodes.forEach((node, i) => {
        const y = tierNodes.length === 1
          ? (bandTop + bandBottom) / 2
          : bandBottom - (bandBottom - bandTop) * (i / (tierNodes.length - 1));
        const xOffset = (globalSpineIdx % 2 === 0 ? -1 : 1) * ZIGZAG_OFFSET;
        posNodes.push({
          id: node.id, label: node.title, x: spineX + xOffset, y,
          tier, isSpine: true, radius: 28,
          color: TIER_COLORS[tier] ?? "hsl(0, 0%, 50%)",
          navigateId: node.id,
        });
        globalSpineIdx++;
      });
    }

    const spinePositioned = [...posNodes].sort((a, b) => {
      const aNum = parseInt(a.id.match(/s-(\d+)/i)![1]);
      const bNum = parseInt(b.id.match(/s-(\d+)/i)![1]);
      return aNum - bNum;
    });

    // ── 2b. Collect and position branch nodes ──
    type BranchNode = PosNode & { parents: { x: number; y: number }[] };
    const branchNodes: BranchNode[] = [];
    const spineIdSet = new Set(spineNodesMap.keys());

    const spinePosById = new globalThis.Map<string, PosNode>();
    spinePositioned.forEach((p) => spinePosById.set(p.id.toLowerCase(), p));

    const branchCandidates = nodes.filter((n) => !spineIdSet.has(n.id.toLowerCase()));
    const gateChildCount = new globalThis.Map<string, number>();

    branchCandidates.forEach((b) => {
      const bTier = b.tier ?? 0;
      if (collapsedTiers.has(bTier)) return; // skip collapsed tiers

      const gates = Array.isArray(b.spine_gates) ? b.spine_gates : [];
      const parents: { x: number; y: number }[] = [];
      gates.forEach((g: string) => {
        const pos = spinePosById.get(g.toLowerCase());
        if (pos) parents.push({ x: pos.x, y: pos.y });
      });
      if (parents.length === 0) return;

      const firstGateKey = gates[0].toLowerCase();
      const idx = gateChildCount.get(firstGateKey) ?? 0;
      gateChildCount.set(firstGateKey, idx + 1);

      const parentPos = spinePosById.get(firstGateKey)!;
      const side = idx % 2 === 0 ? -1 : 1;
      const col = Math.floor(idx / 2);
      const xOffset = (col + 1) * 110 * side;
      const yJitter = (idx % 3 - 1) * 18;

      branchNodes.push({
        id: b.id, label: b.title,
        x: parentPos.x + xOffset, y: parentPos.y + yJitter,
        tier: bTier, isSpine: false, radius: 13,
        color: TIER_COLORS[bTier] ?? "hsl(0, 0%, 50%)",
        navigateId: b.id, parents,
      });
    });

    // ── 3. Render ──
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${contentWidth} ${totalHeight}`);

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        zoomTransformRef.current = event.transform;
      });
    svg.call(zoom);

    // Helper: is node matched by search?
    const isMatch = (id: string) => matchingIds === null || matchingIds.has(id.toLowerCase());
    const dimOpacity = 0.12;

    // Tier bands (clickable labels for collapse/expand)
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const bandY = tierBandY(tier);
      const bh = bandHeight(tier);
      const collapsed = collapsedTiers.has(tier);

      g.append("rect")
        .attr("x", 0).attr("y", bandY)
        .attr("width", contentWidth).attr("height", bh)
        .attr("fill", TIER_BG_COLORS[tier] ?? "transparent")
        .attr("stroke", TIER_COLORS[tier] ?? "transparent")
        .attr("stroke-opacity", 0.2).attr("stroke-width", 1);

      // Clickable tier label area
      const labelGroup = g.append("g")
        .attr("cursor", "pointer")
        .on("click", () => toggleTier(tier));

      // Chevron icon (▶ collapsed, ▼ expanded)
      labelGroup.append("text")
        .attr("x", 8).attr("y", bandY + (collapsed ? bh / 2 : bh / 2))
        .attr("dy", "0.35em").attr("font-size", 12)
        .attr("fill", TIER_COLORS[tier] ?? "currentColor").attr("opacity", 0.7)
        .text(collapsed ? "▶" : "▼");

      labelGroup.append("text")
        .attr("x", 24).attr("y", bandY + (collapsed ? bh / 2 : bh / 2))
        .attr("dy", "0.35em").attr("font-size", 18).attr("font-weight", 800)
        .attr("fill", TIER_COLORS[tier] ?? "currentColor").attr("opacity", 0.85)
        .text(`T${tier}: ${TIER_LABELS[tier] ?? ""}`);

      // Invisible hit area for easier clicking
      labelGroup.append("rect")
        .attr("x", 0).attr("y", bandY)
        .attr("width", 340).attr("height", bh)
        .attr("fill", "transparent");
    }

    // ── Spine chain lines ──
    for (let i = 0; i < spinePositioned.length - 1; i++) {
      const a = spinePositioned[i];
      const b = spinePositioned[i + 1];
      const bothMatch = isMatch(a.id) && isMatch(b.id);
      g.append("line")
        .attr("x1", a.x).attr("y1", a.y)
        .attr("x2", b.x).attr("y2", b.y)
        .attr("stroke", "hsl(var(--foreground))")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", bothMatch ? 0.25 : dimOpacity);
    }

    // ── Branch connection lines ──
    branchNodes.forEach((bn) => {
      const bnMatch = isMatch(bn.id);
      bn.parents.forEach((parent) => {
        g.append("line")
          .attr("x1", parent.x).attr("y1", parent.y)
          .attr("x2", bn.x).attr("y2", bn.y)
          .attr("stroke", bn.color)
          .attr("stroke-width", 1.2)
          .attr("stroke-opacity", bnMatch ? 0.35 : dimOpacity)
          .attr("stroke-dasharray", "4 3");
      });
    });

    // ── Branch node circles (with animation) ──
    const branchCircles = g.append("g")
      .selectAll<SVGCircleElement, BranchNode>("circle")
      .data(branchNodes).join("circle")
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 0) // start at 0 for animation
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", (d) => isMatch(d.id) ? 0.85 : dimOpacity)
      .attr("stroke", (d) => {
        if (matchingIds && matchingIds.has(d.id.toLowerCase())) return "hsl(var(--foreground))";
        return "hsl(var(--foreground))";
      })
      .attr("stroke-width", (d) => matchingIds && matchingIds.has(d.id.toLowerCase()) ? 2.5 : 1.2)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(150).attr("r", d.radius * 1.4);
        setTooltip({ x: event.offsetX, y: event.offsetY, text: d.label });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).transition().duration(150).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => navigate(`/node/${d.navigateId}`));

    // Animate branch circles in
    branchCircles.transition()
      .duration(400)
      .delay((_d, i) => 300 + i * 8)
      .attr("r", (d) => d.radius);

    // ── Branch node labels ──
    g.append("g")
      .selectAll("text")
      .data(branchNodes).join("text")
      .text((d) => d.label.length > 18 ? d.label.slice(0, 16) + "…" : d.label)
      .attr("x", (d) => d.x).attr("y", (d) => d.y - 18)
      .attr("font-size", 9).attr("font-weight", 500)
      .attr("fill", "hsl(var(--foreground))")
      .attr("fill-opacity", (d) => isMatch(d.id) ? 0.7 : dimOpacity)
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none")
      .attr("opacity", 0)
      .transition().duration(400).delay((_d, i) => 300 + i * 8)
      .attr("opacity", 1);

    // ── Spine node circles (with staggered animation) ──
    const spineCircles = g.append("g")
      .selectAll<SVGCircleElement, PosNode>("circle")
      .data(spinePositioned).join("circle")
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 0) // start at 0
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", (d) => isMatch(d.id) ? 1 : dimOpacity)
      .attr("stroke", (d) => {
        if (matchingIds && matchingIds.has(d.id.toLowerCase())) return "hsl(45, 100%, 60%)";
        return "hsl(var(--foreground))";
      })
      .attr("stroke-width", (d) => matchingIds && matchingIds.has(d.id.toLowerCase()) ? 3 : 2)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(150).attr("r", d.radius * 1.3);
        setTooltip({ x: event.offsetX, y: event.offsetY, text: d.label });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).transition().duration(150).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => navigate(`/node/${d.navigateId}`));

    // Staggered fade-in from bottom to top
    spineCircles.transition()
      .duration(500)
      .delay((_d, i) => i * 40)
      .attr("r", (d) => d.radius);


    // ── Node count badges ──
    const badgeData = spinePositioned
      .map((sp) => {
        const count = branchCountBySpine.get(sp.id.toLowerCase()) ?? 0;
        return { ...sp, count };
      })
      .filter((d) => d.count > 0);

    const badgeG = g.append("g")
      .selectAll<SVGGElement, typeof badgeData[0]>("g")
      .data(badgeData).join("g")
      .attr("transform", (d) => `translate(${d.x + d.radius * 0.7}, ${d.y - d.radius * 0.7})`)
      .attr("pointer-events", "none")
      .attr("opacity", 0);

    badgeG.append("circle")
      .attr("r", 10)
      .attr("fill", (d) => d.color)
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 2);

    badgeG.append("text")
      .text((d) => d.count.toString())
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 9)
      .attr("font-weight", 700)
      .attr("fill", "white");

    badgeG.transition().duration(400).delay((_d, i) => 600 + i * 40).attr("opacity", 1);

  }, [nodes, navigate, showPrintView, collapsedTiers, matchingIds, toggleTier, branchCountBySpine]);

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-[1600px] mx-auto print:px-2 print:py-2">
        <div className="flex items-center justify-between mb-2 print:hidden gap-3">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground shrink-0">
            Vertebrae of Truth
          </h1>
          <div className="flex items-center gap-2">
            {!showPrintView && (
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search nodes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (showPrintView) setShowPrintView(false);
                else setShowPrintView(true);
              }}
            >
              {showPrintView ? <><Map className="w-4 h-4 mr-1.5" /> Map View</> : <><Printer className="w-4 h-4 mr-1.5" /> Print View</>}
            </Button>
          </div>
        </div>
        <h1 className="hidden print:block text-xl font-bold mb-4">Spine Map — Node Listing</h1>

        <p className="text-muted-foreground text-sm mb-4 print:hidden">
          {showPrintView
            ? "Printable listing of all nodes grouped by tier and spine gate."
            : "Vertical tier layout — click a tier label to collapse/expand. Click a node to view it."}
        </p>

        {/* Legend — hide in print */}
        {!showPrintView && (
          <div className="flex flex-wrap gap-3 mb-4 print:hidden">
            {Object.entries(TIER_LABELS).map(([tier, label]) => (
              <div key={tier} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS[Number(tier)] }} />
                <span>T{tier}: {label}</span>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">Loading nodes…</div>
        ) : showPrintView ? (
          <div>
            <div className="flex justify-end mb-3 print:hidden">
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" /> Print
              </Button>
            </div>
            <PrintView nodes={nodes ?? []} gatesByTier={gatesByTier} branchesByGate={branchesByGate} />
          </div>
        ) : (
          <div ref={containerRef} className="relative w-full border border-border rounded-lg bg-card overflow-hidden print:hidden">
            <svg ref={svgRef} className="w-full" style={{ height: "calc(100vh - 240px)", minHeight: 600 }} />
            {tooltip && (
              <div
                className="absolute pointer-events-none z-50 px-3 py-1.5 rounded-md bg-popover text-popover-foreground text-xs shadow-lg border border-border max-w-[280px] whitespace-normal break-words"
                style={{ left: 0, top: 0, transform: `translate(${tooltip.x + 14}px, ${tooltip.y - 10}px)` }}
              >
                {tooltip.text}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
