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
  0: "hsl(220, 60%, 55%)",   // Epistemological Bedrock — blue
  1: "hsl(280, 50%, 55%)",   // Existence Question — purple
  2: "hsl(160, 55%, 42%)",   // Design & Information — teal
  3: "hsl(38, 92%, 50%)",    // Moral Reality — amber
  4: "hsl(0, 60%, 55%)",     // Human Nature — red
  5: "hsl(320, 55%, 50%)",   // Revelation Bridge — magenta
  6: "hsl(45, 80%, 48%)",    // Testing the Bible — gold
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

type GraphNode = d3.SimulationNodeDatum & {
  nodeId: string;
  label: string;
  tier: number;
  isGate: boolean;
  radius: number;
  color: string;
};

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  source: string | GraphNode;
  target: string | GraphNode;
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

    const width = containerRef.current.clientWidth;
    const height = Math.max(600, window.innerHeight - 200);

    // Build graph data: gates as hub nodes, branches linked to their gate
    const gateSet = new Set<string>();
    nodes.forEach((n) => {
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => gateSet.add(g));
    });

    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];
    const gateNodeMap = new Map<string, GraphNode>();

    // Determine tier for each gate (most common tier among its branches)
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

    // Create gate nodes
    const sortedGates = Array.from(gateSet).sort();
    sortedGates.forEach((gate) => {
      const tier = gateToTier.get(gate) ?? 0;
      const gNode: GraphNode = {
        nodeId: `gate-${gate}`,
        label: gate,
        tier,
        isGate: true,
        radius: 20,
        color: TIER_COLORS[tier] ?? "hsl(0, 0%, 50%)",
      };
      graphNodes.push(gNode);
      gateNodeMap.set(gate, gNode);
    });

    // Create branch nodes and links
    nodes.forEach((n) => {
      const tier = n.tier ?? 0;
      const bNode: GraphNode = {
        nodeId: n.id,
        label: n.title,
        tier,
        isGate: false,
        radius: n.published ? 8 : 5,
        color: TIER_COLORS[tier] ?? "hsl(0, 0%, 50%)",
      };
      graphNodes.push(bNode);

      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => {
        graphLinks.push({ source: `gate-${g}`, target: n.id });
      });
    });

    // D3 force simulation
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const simulation = d3.forceSimulation<GraphNode>(graphNodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graphLinks).id((d) => d.nodeId).distance(60).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius((d) => d.radius + 4))
      .force("x", d3.forceX<GraphNode>(width / 2).strength(0.03))
      .force("y", d3.forceY<GraphNode>().y((d) => {
        const tierCount = 7;
        const margin = 60;
        const band = (height - margin * 2) / (tierCount - 1);
        return margin + d.tier * band;
      }).strength(0.15));

    const link = g.append("g")
      .selectAll("line")
      .data(graphLinks)
      .join("line")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1);

    const node = g.append("g")
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .data(graphNodes)
      .join("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => d.isGate ? "hsl(var(--foreground))" : "none")
      .attr("stroke-width", (d) => d.isGate ? 2 : 0)
      .attr("opacity", (d) => d.isGate ? 1 : 0.8)
      .attr("cursor", "pointer")
      .on("mouseover", function (_event, d) {
        d3.select(this).attr("r", d.radius * 1.4);
        const svgRect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          x: (d.x ?? 0),
          y: (d.y ?? 0),
          text: d.isGate ? `${d.label} — ${TIER_LABELS[d.tier] ?? ""}` : d.label,
        });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => {
        if (!d.isGate) {
          navigate(`/node/${d.nodeId}`);
        }
      });

    // Gate labels
    const labels = g.append("g")
      .selectAll("text")
      .data(graphNodes.filter((n) => n.isGate))
      .join("text")
      .text((d) => d.label)
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "hsl(var(--foreground))")
      .attr("text-anchor", "middle")
      .attr("dy", -26)
      .attr("pointer-events", "none");

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
    node.call(drag);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      labels.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    return () => { simulation.stop(); };
  }, [nodes, navigate]);

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-[1600px] mx-auto">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
          Spine Map
        </h1>
        <p className="text-muted-foreground text-sm mb-4">
          Interactive visualization of all tiers, spine gates, and branch questions. Drag nodes to rearrange. Click a branch to view it.
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
            <svg ref={svgRef} className="w-full" style={{ height: "calc(100vh - 280px)", minHeight: 500 }} />
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
