import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import * as d3 from "d3";

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

export default function SpineMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const navigate = useNavigate();

  const { data: nodes, isLoading } = useQuery({
    queryKey: ["spine-map-nodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nodes")
        .select("id, title, tier, spine_gates, published, category")
        .not("tier", "is", null)
        .order("tier");
      if (error) throw error;
      return (data ?? []) as NodeRecord[];
    },
  });

  useEffect(() => {
    if (!nodes || !svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const TIER_COUNT = 7;
    const BAND_HEIGHT = 180;
    const LABEL_WIDTH = 180;
    const PADDING_TOP = 40;
    const PADDING_BOTTOM = 40;
    const totalHeight = PADDING_TOP + TIER_COUNT * BAND_HEIGHT + PADDING_BOTTOM;
    const contentWidth = Math.max(containerWidth, 900);

    // Group gates by tier
    const gateSet = new Set<string>();
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => gateSet.add(g));
    });

    // Determine tier for each gate
    const gateTierVotes = new Map<string, Map<number, number>>();
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      const tier = n.tier ?? 0;
      gates.forEach((g: string) => {
        if (!gateTierVotes.has(g)) gateTierVotes.set(g, new Map());
        const votes = gateTierVotes.get(g)!;
        votes.set(tier, (votes.get(tier) ?? 0) + 1);
      });
    });

    const gateToTier = new Map<string, number>();
    gateTierVotes.forEach((votes, gate) => {
      let maxTier = 0, maxCount = 0;
      votes.forEach((count, tier) => {
        if (count > maxCount) { maxCount = count; maxTier = tier; }
      });
      gateToTier.set(gate, maxTier);
    });

    // Group gates by tier
    const gatesByTier = new Map<number, string[]>();
    for (let t = 0; t < TIER_COUNT; t++) gatesByTier.set(t, []);
    gateSet.forEach((gate) => {
      const tier = gateToTier.get(gate) ?? 0;
      gatesByTier.get(tier)!.push(gate);
    });
    gatesByTier.forEach((gates) => gates.sort());

    // Group branch nodes by gate
    const branchesByGate = new Map<string, NodeRecord[]>();
    gateSet.forEach((g) => branchesByGate.set(g, []));
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => {
        if (branchesByGate.has(g)) branchesByGate.get(g)!.push(n);
      });
    });

    // Compute y for each tier band (bottom-up: tier 0 at bottom, tier 6 at top)
    const tierBandY = (tier: number) => {
      const invertedIndex = (TIER_COUNT - 1) - tier;
      return PADDING_TOP + invertedIndex * BAND_HEIGHT;
    };

    // Positioned nodes
    type PosNode = {
      id: string;
      label: string;
      x: number;
      y: number;
      tier: number;
      isGate: boolean;
      radius: number;
      color: string;
      navigateId?: string;
    };
    const posNodes: PosNode[] = [];
    const gatePositions = new Map<string, { x: number; y: number }>();

    // Place gates and branches
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const gates = gatesByTier.get(tier) ?? [];
      const bandY = tierBandY(tier);
      const bandCenterY = bandY + BAND_HEIGHT / 2;
      const availableWidth = contentWidth - LABEL_WIDTH - 40;
      const startX = LABEL_WIDTH + 40;

      gates.forEach((gate, gi) => {
        const gateX = startX + (availableWidth / (gates.length + 1)) * (gi + 1);
        const gateY = bandCenterY;
        gatePositions.set(gate, { x: gateX, y: gateY });

        posNodes.push({
          id: `gate-${gate}`,
          label: gate,
          x: gateX,
          y: gateY,
          tier,
          isGate: true,
          radius: 18,
          color: TIER_COLORS[tier] ?? "hsl(0, 0%, 50%)",
        });

        // Place branches in arc around gate
        const branches = branchesByGate.get(gate) ?? [];
        const arcRadius = 45;
        branches.forEach((branch, bi) => {
          const angleSpread = Math.min(Math.PI * 1.4, branches.length * 0.35);
          const startAngle = -Math.PI / 2 - angleSpread / 2;
          const angle = branches.length === 1
            ? -Math.PI / 2
            : startAngle + (angleSpread / (branches.length - 1)) * bi;
          const bx = gateX + Math.cos(angle) * arcRadius;
          const by = gateY + Math.sin(angle) * arcRadius;

          posNodes.push({
            id: branch.id,
            label: branch.title,
            x: bx,
            y: by,
            tier,
            isGate: false,
            radius: branch.published ? 7 : 4,
            color: TIER_COLORS[tier] ?? "hsl(0, 0%, 50%)",
            navigateId: branch.id,
          });
        });
      });
    }

    // Links: gate → branch
    type PosLink = { sourceId: string; targetId: string };
    const posLinks: PosLink[] = [];
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => {
        posLinks.push({ sourceId: `gate-${g}`, targetId: n.id });
      });
    });

    // Build lookup
    const nodeById = new Map<string, PosNode>();
    posNodes.forEach((n) => nodeById.set(n.id, n));

    // Render SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${contentWidth} ${totalHeight}`);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Tier background bands
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const bandY = tierBandY(tier);
      g.append("rect")
        .attr("x", 0)
        .attr("y", bandY)
        .attr("width", contentWidth)
        .attr("height", BAND_HEIGHT)
        .attr("fill", TIER_BG_COLORS[tier] ?? "transparent")
        .attr("stroke", TIER_COLORS[tier] ?? "transparent")
        .attr("stroke-opacity", 0.2)
        .attr("stroke-width", 1);

      // Tier label
      g.append("text")
        .attr("x", 16)
        .attr("y", bandY + BAND_HEIGHT / 2)
        .attr("dy", "0.35em")
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", TIER_COLORS[tier] ?? "currentColor")
        .attr("opacity", 0.85)
        .text(`T${tier}: ${TIER_LABELS[tier] ?? ""}`);
    }

    // Vertical spine line
    const spineX = contentWidth / 2;
    g.append("line")
      .attr("x1", spineX)
      .attr("y1", tierBandY(6) + BAND_HEIGHT / 2)
      .attr("x2", spineX)
      .attr("y2", tierBandY(0) + BAND_HEIGHT / 2)
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6,4")
      .attr("opacity", 0.3);

    // Links (curved)
    posLinks.forEach((link) => {
      const s = nodeById.get(link.sourceId);
      const t = nodeById.get(link.targetId);
      if (!s || !t) return;
      g.append("line")
        .attr("x1", s.x)
        .attr("y1", s.y)
        .attr("x2", t.x)
        .attr("y2", t.y)
        .attr("stroke", s.color)
        .attr("stroke-opacity", 0.15)
        .attr("stroke-width", 1);
    });

    // Nodes
    const nodeEls = g.append("g")
      .selectAll<SVGCircleElement, PosNode>("circle")
      .data(posNodes)
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => d.isGate ? "hsl(var(--foreground))" : "none")
      .attr("stroke-width", (d) => d.isGate ? 2 : 0)
      .attr("opacity", (d) => d.isGate ? 1 : 0.8)
      .attr("cursor", (d) => d.isGate ? "default" : "pointer")
      .on("mouseover", function (_event, d) {
        d3.select(this).attr("r", d.radius * 1.4);
        setTooltip({
          x: d.x,
          y: d.y,
          text: d.isGate ? `${d.label} — ${TIER_LABELS[d.tier] ?? ""}` : d.label,
        });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => {
        if (d.navigateId) navigate(`/node/${d.navigateId}`);
      });

    // Gate labels
    g.append("g")
      .selectAll("text")
      .data(posNodes.filter((n) => n.isGate))
      .join("text")
      .text((d) => d.label)
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y - 24)
      .attr("font-size", 10)
      .attr("font-weight", 600)
      .attr("fill", "hsl(var(--foreground))")
      .attr("text-anchor", "middle")
      .attr("pointer-events", "none");

  }, [nodes, navigate]);

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-[1600px] mx-auto">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          Spine Map
        </h1>
        <p className="text-muted-foreground text-sm mb-4">
          Vertical tier layout — lower tiers at the bottom, higher at the top. Click a branch to view it.
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(TIER_LABELS).map(([tier, label]) => (
            <div key={tier} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: TIER_COLORS[Number(tier)] }}
              />
              <span>T{tier}: {label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            Loading nodes…
          </div>
        ) : (
          <div ref={containerRef} className="relative w-full border border-border rounded-lg bg-card overflow-hidden">
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
