import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import * as d3 from "d3";
import { Printer, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// ── Printable View Component ──────────────────────────────────────
function PrintView({
  nodes,
  gatesByTier,
  branchesByGate,
}: {
  nodes: NodeRecord[];
  gatesByTier: Map<number, string[]>;
  branchesByGate: Map<string, NodeRecord[]>;
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
  const navigate = useNavigate();

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
  const { gatesByTier, branchesByGate, gateToTitle } = useMemo(() => {
    if (!nodes) {
      return { gatesByTier: new globalThis.Map(), branchesByGate: new globalThis.Map() };
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
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => {
        if (byGate.has(g)) byGate.get(g)!.push(n);
      });
    });

    // Build gate-to-title lookup: match gate name (e.g. "S-01") to node title
    const gateToTitle = new globalThis.Map<string, string>();
    gateSet.forEach((gate) => {
      const match = nodes.find((n) => n.id.toLowerCase() === gate.toLowerCase());
      if (match) gateToTitle.set(gate, match.title);
    });

    return { gatesByTier: byTier, branchesByGate: byGate, gateToTitle };
  }, [nodes]);

  useEffect(() => {
    if (!nodes || !svgRef.current || !containerRef.current || showPrintView) return;

    const containerWidth = containerRef.current.clientWidth;
    const TIER_COUNT = 7;
    const BAND_HEIGHT = 180;
    const PADDING_TOP = 40;
    const PADDING_BOTTOM = 40;
    const totalHeight = PADDING_TOP + TIER_COUNT * BAND_HEIGHT + PADDING_BOTTOM;
    const contentWidth = Math.max(containerWidth, 900);

    const tierBandY = (tier: number) => {
      const invertedIndex = (TIER_COUNT - 1) - tier;
      return PADDING_TOP + invertedIndex * BAND_HEIGHT;
    };

    // ── 1. Collect unique spine nodes, sorted by number ──
    const spinePattern = /^s-(\d+)$/i;
    const spineNodesMap = new globalThis.Map<string, NodeRecord>();
    nodes.forEach((n) => {
      if (spinePattern.test(n.id)) {
        spineNodesMap.set(n.id.toLowerCase(), n);
      }
    });
    const spineNodesList = Array.from(spineNodesMap.values()).sort((a, b) => {
      const aNum = parseInt(a.id.match(spinePattern)![1]);
      const bNum = parseInt(b.id.match(spinePattern)![1]);
      return aNum - bNum;
    });

    // ── 2. Position spine nodes as vertical column ──
    type PosNode = {
      id: string; label: string; x: number; y: number;
      tier: number; isSpine: boolean; radius: number; color: string; navigateId: string;
    };
    const posNodes: PosNode[] = [];
    const spineX = contentWidth / 2;
    const spineCount = spineNodesList.length;

    // Group spine nodes by tier, then position within each tier's band
    const spineByTier = new globalThis.Map<number, typeof spineNodesList>();
    spineNodesList.forEach((node) => {
      const tier = node.tier ?? 0;
      if (!spineByTier.has(tier)) spineByTier.set(tier, []);
      spineByTier.get(tier)!.push(node);
    });

    spineByTier.forEach((tierNodes, tier) => {
      const bandTop = tierBandY(tier) + 30;
      const bandBottom = tierBandY(tier) + BAND_HEIGHT - 30;
      tierNodes.forEach((node, i) => {
        const y = tierNodes.length === 1
          ? (bandTop + bandBottom) / 2
          : bandBottom - (bandBottom - bandTop) * (i / (tierNodes.length - 1));
        posNodes.push({
          id: node.id, label: node.title, x: spineX, y,
          tier, isSpine: true, radius: 28,
          color: TIER_COLORS[tier] ?? "hsl(0, 0%, 50%)",
          navigateId: node.id,
        });
      });
    });

    // Re-sort posNodes by spine number for chain lines
    const spinePositioned = [...posNodes].sort((a, b) => {
      const aNum = parseInt(a.id.match(/s-(\d+)/i)![1]);
      const bNum = parseInt(b.id.match(/s-(\d+)/i)![1]);
      return aNum - bNum;
    });

    // ── 2b. Collect and position branch nodes ──
    type BranchNode = PosNode & { parentX: number; parentY: number };
    const branchNodes: BranchNode[] = [];
    const spineIdSet = new Set(spineNodesMap.keys());

    // Index spine posNodes by id for lookup
    const spinePosById = new globalThis.Map<string, PosNode>();
    spinePositioned.forEach((p) => spinePosById.set(p.id.toLowerCase(), p));

    // Group branches per spine gate
    const branchesPerGate = new globalThis.Map<string, NodeRecord[]>();
    nodes.forEach((n) => {
      if (spineIdSet.has(n.id.toLowerCase())) return;
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => {
        const key = g.toLowerCase();
        if (spinePosById.has(key)) {
          if (!branchesPerGate.has(key)) branchesPerGate.set(key, []);
          branchesPerGate.get(key)!.push(n);
        }
      });
    });

    branchesPerGate.forEach((branches, gateKey) => {
      const parent = spinePosById.get(gateKey)!;
      branches.sort((a, b) => a.title.localeCompare(b.title));
      branches.forEach((b, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const col = Math.floor(i / 2);
        const xOffset = (col + 1) * 110 * side;
        const yJitter = (i % 3 - 1) * 18;
        branchNodes.push({
          id: b.id,
          label: b.title,
          x: parent.x + xOffset,
          y: parent.y + yJitter,
          tier: b.tier ?? parent.tier,
          isSpine: false,
          radius: 13,
          color: TIER_COLORS[b.tier ?? parent.tier] ?? "hsl(0, 0%, 50%)",
          navigateId: b.id,
          parentX: parent.x,
          parentY: parent.y,
        });
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

    // Tier bands
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const bandY = tierBandY(tier);
      g.append("rect")
        .attr("x", 0).attr("y", bandY)
        .attr("width", contentWidth).attr("height", BAND_HEIGHT)
        .attr("fill", TIER_BG_COLORS[tier] ?? "transparent")
        .attr("stroke", TIER_COLORS[tier] ?? "transparent")
        .attr("stroke-opacity", 0.2).attr("stroke-width", 1);
      g.append("text")
        .attr("x", 16).attr("y", bandY + BAND_HEIGHT / 2)
        .attr("dy", "0.35em").attr("font-size", 18).attr("font-weight", 800)
        .attr("fill", TIER_COLORS[tier] ?? "currentColor").attr("opacity", 0.85)
        .text(`T${tier}: ${TIER_LABELS[tier] ?? ""}`);
    }

    // ── Spine chain lines ──
    for (let i = 0; i < spinePositioned.length - 1; i++) {
      const a = spinePositioned[i];
      const b = spinePositioned[i + 1];
      g.append("line")
        .attr("x1", a.x).attr("y1", a.y)
        .attr("x2", b.x).attr("y2", b.y)
        .attr("stroke", "hsl(var(--foreground))")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.25);
    }

    // ── Branch connection lines ──
    branchNodes.forEach((bn) => {
      g.append("line")
        .attr("x1", bn.parentX).attr("y1", bn.parentY)
        .attr("x2", bn.x).attr("y2", bn.y)
        .attr("stroke", bn.color)
        .attr("stroke-width", 1.2)
        .attr("stroke-opacity", 0.35)
        .attr("stroke-dasharray", "4 3");
    });

    // ── Branch node circles ──
    g.append("g")
      .selectAll<SVGCircleElement, BranchNode>("circle")
      .data(branchNodes).join("circle")
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", 0.85)
      .attr("stroke", "hsl(var(--foreground))")
      .attr("stroke-width", 1.2)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", d.radius * 1.4);
        setTooltip({ x: event.offsetX, y: event.offsetY, text: d.label });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => {
        navigate(`/node/${d.navigateId}`);
      });

    // ── Branch node labels ──
    g.append("g")
      .selectAll("text")
      .data(branchNodes).join("text")
      .text((d) => d.label.length > 18 ? d.label.slice(0, 16) + "…" : d.label)
      .attr("x", (d) => d.x).attr("y", (d) => d.y - 18)
      .attr("font-size", 9).attr("font-weight", 500)
      .attr("fill", "hsl(var(--foreground))").attr("fill-opacity", 0.7)
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none");

    // ── Spine node circles ──
    g.append("g")
      .selectAll<SVGCircleElement, PosNode>("circle")
      .data(spinePositioned).join("circle")
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", "hsl(var(--foreground))")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", d.radius * 1.3);
        setTooltip({ x: event.offsetX, y: event.offsetY, text: d.label });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => {
        navigate(`/node/${d.navigateId}`);
      });

    // ── Spine node labels ──
    g.append("g")
      .selectAll("text")
      .data(spinePositioned).join("text")
      .text((d) => d.id.toUpperCase())
      .attr("x", (d) => d.x).attr("y", (d) => d.y - 34)
      .attr("font-size", 11).attr("font-weight", 700)
      .attr("fill", "hsl(var(--foreground))").attr("text-anchor", "middle")
      .attr("pointer-events", "none");

  }, [nodes, navigate, showPrintView]);

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-[1600px] mx-auto print:px-2 print:py-2">
        <div className="flex items-center justify-between mb-2 print:hidden">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Spine Map
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (showPrintView) {
                setShowPrintView(false);
              } else {
                setShowPrintView(true);
              }
            }}
          >
            {showPrintView ? <><Map className="w-4 h-4 mr-1.5" /> Map View</> : <><Printer className="w-4 h-4 mr-1.5" /> Print View</>}
          </Button>
        </div>
        <h1 className="hidden print:block text-xl font-bold mb-4">Spine Map — Node Listing</h1>

        <p className="text-muted-foreground text-sm mb-4 print:hidden">
          {showPrintView
            ? "Printable listing of all nodes grouped by tier and spine gate."
            : "Vertical tier layout — lower tiers at the bottom, higher at the top. Click a branch to view it."}
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
                className="absolute pointer-events-none z-50 px-3 py-1.5 rounded-md bg-popover text-popover-foreground text-xs shadow-lg border border-border max-w-[280px] truncate"
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
