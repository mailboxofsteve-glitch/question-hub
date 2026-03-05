import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import * as d3 from "d3";
import { Search, HelpCircle, Play, RotateCcw, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import NodeDetailContent from "@/components/NodeDetailContent";
import { useDiagnosticProgress, type DiagnosticResponse } from "@/hooks/use-diagnostic-progress";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";

interface NodeRecord {
  id: string;
  title: string;
  tier: number | null;
  spine_gates: string[];
  published: boolean;
  category: string | null;
}

const TIER_COLORS: Record<number, string> = {
  0: "hsl(220, 60%, 55%)", 1: "hsl(280, 50%, 55%)", 2: "hsl(160, 55%, 42%)",
  3: "hsl(38, 92%, 50%)", 4: "hsl(0, 60%, 55%)", 5: "hsl(320, 55%, 50%)", 6: "hsl(45, 80%, 48%)",
};
const TIER_BG_COLORS: Record<number, string> = {
  0: "hsla(220, 60%, 55%, 0.08)", 1: "hsla(280, 50%, 55%, 0.08)", 2: "hsla(160, 55%, 42%, 0.08)",
  3: "hsla(38, 92%, 50%, 0.08)", 4: "hsla(0, 60%, 55%, 0.08)", 5: "hsla(320, 55%, 50%, 0.08)", 6: "hsla(45, 80%, 48%, 0.08)",
};
const TIER_LABELS: Record<number, string> = {
  0: "Epistemological Bedrock", 1: "The Existence Question", 2: "Design & Information",
  3: "Moral Reality", 4: "Human Nature", 5: "The Revelation Bridge", 6: "Testing the Bible",
};

const RESPONSE_COLORS: Record<DiagnosticResponse, string> = {
  agree: "hsl(142, 71%, 45%)",
  disagree: "hsl(0, 72%, 51%)",
  dont_know: "hsl(45, 93%, 47%)",
};

const BAND_HEIGHT_MIN = 180;
const BAND_HEIGHT_COLLAPSED = 44;
const NODE_VERTICAL_SPACING = 70;
const ZIGZAG_OFFSET = 30;
const PADDING_TOP = 40;
const PADDING_BOTTOM = 40;
const TIER_COUNT = 7;

export default function Diagnostic() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [collapsedTiers, setCollapsedTiers] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [overlayNodeId, setOverlayNodeId] = useState<string | null>(null);
  const [diagnosticReady, setDiagnosticReady] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<'disagree' | 'dont_know' | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('diagnostic-welcome-seen'));
  const [showRouteChoice, setShowRouteChoice] = useState(false);
  const [justResponded, setJustResponded] = useState(false);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem('diagnostic-welcome-seen', '1');
    setShowWelcome(false);
  }, []);

  const { user } = useAuth();

  const toggleTier = useCallback((tier: number) => {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  }, []);

  const { data: nodes, isLoading } = useQuery({
    queryKey: ["diagnostic-nodes"],
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

  const { respondedIds, responseMap, unlockedIds, respond } = useDiagnosticProgress(nodes);

  // Compute available (unlocked & unresponded) nodes, sorted spine-first
  const availableNodes = useMemo(() => {
    if (!nodes) return [];
    const spinePattern = /^s-(\d+)$/i;
    return nodes
      .filter((n) => unlockedIds.has(n.id.toLowerCase()) && !respondedIds.has(n.id.toLowerCase()))
      .sort((a, b) => {
        const aSpine = spinePattern.test(a.id);
        const bSpine = spinePattern.test(b.id);
        if (aSpine && !bSpine) return -1;
        if (!aSpine && bSpine) return 1;
        return a.id.localeCompare(b.id);
      });
  }, [nodes, unlockedIds, respondedIds]);

  const journeyComplete = availableNodes.length === 0 && respondedIds.size > 0;

  const openNextNode = useCallback(() => {
    if (availableNodes.length === 1) {
      setOverlayNodeId(availableNodes[0].id);
      setDiagnosticReady(false);
    } else if (availableNodes.length > 1) {
      setShowRouteChoice(true);
    }
  }, [availableNodes]);

  const handleResponse = useCallback((response: DiagnosticResponse, note?: string) => {
    if (!overlayNodeId) return;
    respond(overlayNodeId, response, note);
    setOverlayNodeId(null);
    setPendingResponse(null);
    setNoteText("");
    setDiagnosticReady(false);
    setJustResponded(true);
  }, [overlayNodeId, respond]);

  // Auto-advance after response: wait for state to settle then open next
  useEffect(() => {
    if (!justResponded) return;
    setJustResponded(false);
    // Use a small timeout to let respondedIds/unlockedIds recompute
    const timer = setTimeout(() => {
      if (availableNodes.length === 1) {
        setOverlayNodeId(availableNodes[0].id);
        setDiagnosticReady(false);
      } else if (availableNodes.length > 1) {
        setShowRouteChoice(true);
      }
      // if 0, journey complete or blocked — do nothing
    }, 100);
    return () => clearTimeout(timer);
  }, [justResponded, availableNodes]);

  // Precompute groupings (same as SpineMap)
  const { branchCountBySpine } = useMemo(() => {
    if (!nodes) return { branchCountBySpine: new globalThis.Map<string, number>() };
    const spinePattern = /^s-(\d+)$/i;
    const spineIdSet = new Set<string>();
    nodes.forEach((n) => { if (spinePattern.test(n.id)) spineIdSet.add(n.id.toLowerCase()); });
    const countBySpine = new globalThis.Map<string, number>();
    nodes.forEach((n) => {
      if (spineIdSet.has(n.id.toLowerCase())) return;
      const gates = Array.isArray(n.spine_gates) ? n.spine_gates : [];
      gates.forEach((g: string) => {
        const key = g.toLowerCase();
        if (spineIdSet.has(key)) countBySpine.set(key, (countBySpine.get(key) ?? 0) + 1);
      });
    });
    return { branchCountBySpine: countBySpine };
  }, [nodes]);

  // Search matching
  const matchingIds = useMemo(() => {
    if (!searchQuery.trim() || !nodes) return null;
    const q = searchQuery.toLowerCase();
    const ids = new Set<string>();
    nodes.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) ids.add(n.id.toLowerCase());
    });
    return ids;
  }, [searchQuery, nodes]);

  // Ancestor path
  const ancestorPathIds = useMemo(() => {
    if (!selectedNodeId || !nodes) return null;
    const nodeMap = new globalThis.Map<string, NodeRecord>();
    nodes.forEach((n) => nodeMap.set(n.id.toLowerCase(), n));
    const pathSet = new Set<string>();
    const spinePattern = /^s-(\d+)$/i;
    let currentId = selectedNodeId.toLowerCase();
    while (currentId) {
      pathSet.add(currentId);
      const node = nodeMap.get(currentId);
      if (!node) break;
      const gates = Array.isArray(node.spine_gates) ? node.spine_gates : [];
      if (gates.length === 0) break;
      const parentId = gates[0].toLowerCase();
      if (pathSet.has(parentId)) break;
      currentId = parentId;
    }
    let maxSpineNum = -1;
    pathSet.forEach((id) => { const m = id.match(spinePattern); if (m) { const num = parseInt(m[1]); if (num > maxSpineNum) maxSpineNum = num; } });
    if (maxSpineNum >= 0) {
      nodes.forEach((n) => { const m = n.id.match(spinePattern); if (m && parseInt(m[1]) <= maxSpineNum) pathSet.add(n.id.toLowerCase()); });
    }
    return pathSet;
  }, [selectedNodeId, nodes]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedNodeId(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!nodes || !svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const contentWidth = Math.max(containerWidth, 900);
    const spinePattern = /^s-(\d+)$/i;

    const spineNodesMap = new globalThis.Map<string, NodeRecord>();
    nodes.forEach((n) => { if (spinePattern.test(n.id)) spineNodesMap.set(n.id.toLowerCase(), n); });

    const spineCountByTier = new globalThis.Map<number, number>();
    spineNodesMap.forEach((n) => { const t = n.tier ?? 0; spineCountByTier.set(t, (spineCountByTier.get(t) ?? 0) + 1); });

    const bandHeight = (tier: number) => {
      if (collapsedTiers.has(tier)) return BAND_HEIGHT_COLLAPSED;
      const count = spineCountByTier.get(tier) ?? 0;
      return Math.max(BAND_HEIGHT_MIN, count * NODE_VERTICAL_SPACING + 60);
    };

    const totalHeight = PADDING_TOP + Array.from({ length: TIER_COUNT }, (_, i) => bandHeight(i)).reduce((a, b) => a + b, 0) + PADDING_BOTTOM;

    const tierBandY = (tier: number) => {
      const invertedIndex = (TIER_COUNT - 1) - tier;
      let y = PADDING_TOP;
      for (let i = 0; i < invertedIndex; i++) { const t = (TIER_COUNT - 1) - i; y += bandHeight(t); }
      return y;
    };

    const spineNodesList = Array.from(spineNodesMap.values()).sort((a, b) => parseInt(a.id.match(spinePattern)![1]) - parseInt(b.id.match(spinePattern)![1]));

    type PosNode = { id: string; label: string; x: number; y: number; tier: number; isSpine: boolean; radius: number; color: string; navigateId: string; };
    const posNodes: PosNode[] = [];
    const spineX = contentWidth / 2;

    const spineByTier = new globalThis.Map<number, typeof spineNodesList>();
    spineNodesList.forEach((node) => { const tier = node.tier ?? 0; if (!spineByTier.has(tier)) spineByTier.set(tier, []); spineByTier.get(tier)!.push(node); });

    let globalSpineIdx = 0;
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const tierNodes = spineByTier.get(tier);
      if (!tierNodes || collapsedTiers.has(tier)) continue;
      const bh = bandHeight(tier);
      const bandTop = tierBandY(tier) + 30;
      const bandBottom = tierBandY(tier) + bh - 30;
      tierNodes.forEach((node, i) => {
        const y = tierNodes.length === 1 ? (bandTop + bandBottom) / 2 : bandBottom - (bandBottom - bandTop) * (i / (tierNodes.length - 1));
        const xOffset = (globalSpineIdx % 2 === 0 ? -1 : 1) * ZIGZAG_OFFSET;
        posNodes.push({ id: node.id, label: node.title, x: spineX + xOffset, y, tier: node.tier ?? 0, isSpine: true, radius: 28, color: TIER_COLORS[node.tier ?? 0] ?? "hsl(0, 0%, 50%)", navigateId: node.id });
        globalSpineIdx++;
      });
    }

    const spinePositioned = [...posNodes].sort((a, b) => parseInt(a.id.match(/s-(\d+)/i)![1]) - parseInt(b.id.match(/s-(\d+)/i)![1]));

    const posById = new globalThis.Map<string, PosNode>();
    spinePositioned.forEach((p) => posById.set(p.id.toLowerCase(), p));

    const spineIdSet = new Set(spineNodesMap.keys());

    type BranchNode = PosNode & { parents: { x: number; y: number }[] };
    const branchNodes: BranchNode[] = [];
    const gateChildCount = new globalThis.Map<string, number>();

    let remaining = nodes.filter((n) => !spineIdSet.has(n.id.toLowerCase()));
    for (let round = 0; round < 5; round++) {
      const stillUnplaced: typeof remaining = [];
      remaining.forEach((b) => {
        const bTier = b.tier ?? 0;
        if (collapsedTiers.has(bTier)) return;
        const gates = Array.isArray(b.spine_gates) ? b.spine_gates : [];
        const parents: { x: number; y: number }[] = [];
        gates.forEach((g: string) => { const pos = posById.get(g.toLowerCase()); if (pos) parents.push({ x: pos.x, y: pos.y }); });
        if (parents.length === 0) { stillUnplaced.push(b); return; }
        const firstGateKey = gates[0].toLowerCase();
        const idx = gateChildCount.get(firstGateKey) ?? 0;
        gateChildCount.set(firstGateKey, idx + 1);
        const parentPos = posById.get(firstGateKey)!;
        const side = idx % 2 === 0 ? -1 : 1;
        const col = Math.floor(idx / 2);
        const xOffset = (col + 1) * 110 * side;
        const bh = bandHeight(bTier);
        const bandTop = tierBandY(bTier) + 30;
        const bandBottom = tierBandY(bTier) + bh - 30;
        const ySlot = (idx % 5) / 4;
        const y = bandTop + (bandBottom - bandTop) * ySlot;
        const branch: BranchNode = { id: b.id, label: b.title, x: parentPos.x + xOffset, y, tier: bTier, isSpine: false, radius: 13, color: TIER_COLORS[bTier] ?? "hsl(0, 0%, 50%)", navigateId: b.id, parents };
        branchNodes.push(branch);
        posNodes.push(branch);
        posById.set(b.id.toLowerCase(), branch);
      });
      remaining = stillUnplaced;
      if (remaining.length === 0) break;
    }

    // Render
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${contentWidth} ${totalHeight}`);
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 3]).on("zoom", (event) => { g.attr("transform", event.transform); zoomTransformRef.current = event.transform; });
    svg.call(zoom);

    const isRestoringZoom = zoomTransformRef.current.k !== 1 || zoomTransformRef.current.x !== 0 || zoomTransformRef.current.y !== 0;
    if (isRestoringZoom) svg.call(zoom.transform, zoomTransformRef.current);

    // Helpers
    const isUnlocked = (id: string) => unlockedIds.has(id.toLowerCase());
    const isResponded = (id: string) => respondedIds.has(id.toLowerCase());
    const getResponseColor = (id: string) => {
      const r = responseMap.get(id.toLowerCase());
      return r ? RESPONSE_COLORS[r] : null;
    };

    const isInPath = (id: string) => ancestorPathIds !== null && ancestorPathIds.has(id.toLowerCase());
    const hasActivePath = ancestorPathIds !== null;
    const isMatch = (id: string) => {
      if (!isUnlocked(id)) return false;
      if (hasActivePath) return isInPath(id);
      return matchingIds === null || matchingIds.has(id.toLowerCase());
    };
    const isGoldHighlight = (id: string) => {
      if (!isUnlocked(id)) return false;
      if (hasActivePath) return isInPath(id);
      return matchingIds !== null && matchingIds.has(id.toLowerCase());
    };
    const dimOpacity = 0.12;
    const lockedOpacity = 0.15;

    // Tier bands
    for (let tier = 0; tier < TIER_COUNT; tier++) {
      const bandY = tierBandY(tier);
      const bh = bandHeight(tier);
      const collapsed = collapsedTiers.has(tier);
      g.append("rect").attr("x", 0).attr("y", bandY).attr("width", contentWidth).attr("height", bh).attr("fill", TIER_BG_COLORS[tier] ?? "transparent").attr("stroke", TIER_COLORS[tier] ?? "transparent").attr("stroke-opacity", 0.2).attr("stroke-width", 1);
      const labelGroup = g.append("g").attr("cursor", "pointer").on("click", () => toggleTier(tier));
      labelGroup.append("text").attr("x", 8).attr("y", bandY + bh / 2).attr("dy", "0.35em").attr("font-size", 12).attr("fill", TIER_COLORS[tier] ?? "currentColor").attr("opacity", 0.7).text(collapsed ? "▶" : "▼");
      labelGroup.append("text").attr("x", 24).attr("y", bandY + bh / 2).attr("dy", "0.35em").attr("font-size", 18).attr("font-weight", 800).attr("fill", TIER_COLORS[tier] ?? "currentColor").attr("opacity", 0.85).text(`T${tier}: ${TIER_LABELS[tier] ?? ""}`);
      labelGroup.append("rect").attr("x", 0).attr("y", bandY).attr("width", 340).attr("height", bh).attr("fill", "transparent");
    }

    // Spine chain lines
    for (let i = 0; i < spinePositioned.length - 1; i++) {
      const a = spinePositioned[i], b = spinePositioned[i + 1];
      const bothUnlocked = isUnlocked(a.id) && isUnlocked(b.id);
      const bothMatch = isMatch(a.id) && isMatch(b.id);
      const bothGold = isGoldHighlight(a.id) && isGoldHighlight(b.id);
      g.append("line").attr("x1", a.x).attr("y1", a.y).attr("x2", b.x).attr("y2", b.y)
        .attr("stroke", bothGold ? "hsl(45, 100%, 60%)" : "hsl(var(--foreground))")
        .attr("stroke-width", bothGold ? 3 : 2)
        .attr("stroke-opacity", !bothUnlocked ? lockedOpacity : bothMatch ? (bothGold ? 0.7 : 0.25) : dimOpacity);
    }

    // Branch connection lines
    branchNodes.forEach((bn) => {
      const bnUnlocked = isUnlocked(bn.id);
      const bnMatch = isMatch(bn.id);
      const bnGold = isGoldHighlight(bn.id);
      bn.parents.forEach((parent) => {
        g.append("line").attr("x1", parent.x).attr("y1", parent.y).attr("x2", bn.x).attr("y2", bn.y)
          .attr("stroke", bnGold ? "hsl(45, 100%, 60%)" : bn.color)
          .attr("stroke-width", bnGold ? 2.5 : 1.2)
          .attr("stroke-opacity", !bnUnlocked ? lockedOpacity : bnMatch ? (bnGold ? 0.7 : 0.35) : dimOpacity)
          .attr("stroke-dasharray", "4 3");
      });
    });

    // Branch circles
    const branchCircles = g.append("g").selectAll<SVGCircleElement, BranchNode>("circle").data(branchNodes).join("circle")
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 0)
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", (d) => !isUnlocked(d.id) ? lockedOpacity : isMatch(d.id) ? 0.85 : dimOpacity)
      .attr("stroke", (d) => {
        const rc = getResponseColor(d.id);
        if (rc) return rc;
        return isGoldHighlight(d.id) ? "hsl(45, 100%, 60%)" : "hsl(var(--foreground))";
      })
      .attr("stroke-width", (d) => isResponded(d.id) ? 3 : isGoldHighlight(d.id) ? 2.5 : 1.2)
      .attr("cursor", (d) => isUnlocked(d.id) ? "pointer" : "not-allowed")
      .on("mouseover", function (event, d) {
        if (!isUnlocked(d.id)) return;
        d3.select(this).transition().duration(150).attr("r", d.radius * 1.4);
        setTooltip({ x: event.offsetX, y: event.offsetY, text: d.label });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).transition().duration(150).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => {
        if (!isUnlocked(d.id)) return;
        if (selectedNodeId === d.navigateId) setOverlayNodeId(d.navigateId);
        else setSelectedNodeId(d.navigateId);
      });

    if (isRestoringZoom) branchCircles.attr("r", (d) => d.radius);
    else branchCircles.transition().duration(400).delay((_d, i) => 300 + i * 8).attr("r", (d) => d.radius);

    // Branch labels
    const branchLabels = g.append("g").selectAll("text").data(branchNodes).join("text")
      .text((d) => d.label.length > 18 ? d.label.slice(0, 16) + "…" : d.label)
      .attr("x", (d) => d.x).attr("y", (d) => d.y - 18).attr("font-size", 9).attr("font-weight", 500)
      .attr("fill", "hsl(var(--foreground))")
      .attr("fill-opacity", (d) => !isUnlocked(d.id) ? lockedOpacity : isMatch(d.id) ? 0.7 : dimOpacity)
      .attr("text-anchor", "middle").attr("pointer-events", "none");

    if (isRestoringZoom) branchLabels.attr("opacity", 1);
    else branchLabels.attr("opacity", 0).transition().duration(400).delay((_d, i) => 300 + i * 8).attr("opacity", 1);

    // Spine circles
    const spineCircles = g.append("g").selectAll<SVGCircleElement, PosNode>("circle").data(spinePositioned).join("circle")
      .attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 0)
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", (d) => !isUnlocked(d.id) ? lockedOpacity : isMatch(d.id) ? 1 : dimOpacity)
      .attr("stroke", (d) => {
        const rc = getResponseColor(d.id);
        if (rc) return rc;
        return isGoldHighlight(d.id) ? "hsl(45, 100%, 60%)" : "hsl(var(--foreground))";
      })
      .attr("stroke-width", (d) => isResponded(d.id) ? 4 : isGoldHighlight(d.id) ? 3 : 2)
      .attr("cursor", (d) => isUnlocked(d.id) ? "pointer" : "not-allowed")
      .on("mouseover", function (event, d) {
        if (!isUnlocked(d.id)) return;
        d3.select(this).transition().duration(150).attr("r", d.radius * 1.3);
        setTooltip({ x: event.offsetX, y: event.offsetY, text: d.label });
      })
      .on("mouseout", function (_event, d) {
        d3.select(this).transition().duration(150).attr("r", d.radius);
        setTooltip(null);
      })
      .on("click", (_event, d) => {
        if (!isUnlocked(d.id)) return;
        if (selectedNodeId === d.navigateId) setOverlayNodeId(d.navigateId);
        else setSelectedNodeId(d.navigateId);
      });

    if (isRestoringZoom) spineCircles.attr("r", (d) => d.radius);
    else spineCircles.transition().duration(500).delay((_d, i) => i * 40).attr("r", (d) => d.radius);

    // Node count badges
    const badgeData = spinePositioned.map((sp) => ({ ...sp, count: branchCountBySpine.get(sp.id.toLowerCase()) ?? 0 })).filter((d) => d.count > 0);
    const badgeG = g.append("g").selectAll<SVGGElement, typeof badgeData[0]>("g").data(badgeData).join("g")
      .attr("transform", (d) => `translate(${d.x + d.radius * 0.7}, ${d.y - d.radius * 0.7})`).attr("pointer-events", "none").attr("opacity", 0);
    badgeG.append("circle").attr("r", 10).attr("fill", (d) => d.color).attr("stroke", "hsl(var(--background))").attr("stroke-width", 2);
    badgeG.append("text").text((d) => d.count.toString()).attr("text-anchor", "middle").attr("dy", "0.35em").attr("font-size", 9).attr("font-weight", 700).attr("fill", "white");
    if (isRestoringZoom) badgeG.attr("opacity", 1);
    else badgeG.transition().duration(400).delay((_d, i) => 600 + i * 40).attr("opacity", 1);

  }, [nodes, collapsedTiers, matchingIds, toggleTier, branchCountBySpine, ancestorPathIds, selectedNodeId, unlockedIds, respondedIds, responseMap]);

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-2 gap-3">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground shrink-0">
            Diagnostic Journey
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search nodes…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-sm" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowWelcome(true)} title="How it works">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!user && (
          <div className="mb-4 p-3 rounded-lg border border-border surface-elevated text-sm text-muted-foreground">
            <Link to="/auth" className="text-accent hover:underline font-medium">Sign in</Link> to save your progress across sessions.
          </div>
        )}

        <p className="text-muted-foreground text-sm mb-4">
          {selectedNodeId
            ? "Path highlighted — click the selected node again to open it. Press Esc to clear."
            : "Begin at S-01 (bottom). Respond to unlock the next nodes in the journey."}
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: RESPONSE_COLORS.agree }} />
            <span>Agreed</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: RESPONSE_COLORS.disagree }} />
            <span>Disagreed</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: RESPONSE_COLORS.dont_know }} />
            <span>Don't Know</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-muted-foreground/20" />
            <span>Locked</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">Loading nodes…</div>
        ) : (
          <div ref={containerRef} className="relative w-full border border-border rounded-lg bg-card overflow-hidden">
            <svg ref={svgRef} className="w-full" style={{ height: "calc(100vh - 280px)", minHeight: 600 }} />
            {tooltip && (
              <div className="absolute pointer-events-none z-50 px-3 py-1.5 rounded-md bg-popover text-popover-foreground text-xs shadow-lg border border-border max-w-[280px] whitespace-normal break-words" style={{ left: 0, top: 0, transform: `translate(${tooltip.x + 14}px, ${tooltip.y - 10}px)` }}>
                {tooltip.text}
              </div>
            )}
            {/* Start / Resume / Complete overlay button */}
            {!overlayNodeId && !showWelcome && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <Button
                  size="lg"
                  className="pointer-events-auto text-base px-8 py-6 shadow-xl gap-2"
                  disabled={journeyComplete}
                  onClick={openNextNode}
                >
                  {respondedIds.size === 0 ? (
                    <><Play className="w-5 h-5" /> Start Diagnostic</>
                  ) : journeyComplete ? (
                    <><CheckCircle2 className="w-5 h-5" /> Journey Complete</>
                  ) : (
                    <><RotateCcw className="w-5 h-5" /> Resume Diagnostic</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diagnostic overlay with response buttons */}
      <Dialog open={!!overlayNodeId} onOpenChange={(open) => { if (!open) { setOverlayNodeId(null); setDiagnosticReady(false); setPendingResponse(null); setNoteText(""); } }}>
        <DialogContent className="max-w-2xl p-0 gap-0 border-none bg-transparent shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Node Detail</DialogTitle>
          <div className="relative">
            {/* Main content card */}
            <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-y-auto max-h-[60vh] p-6">
                {overlayNodeId && (
                  <NodeDetailContent
                    id={overlayNodeId}
                    onNavigateNode={(nodeId) => {
                      if (unlockedIds.has(nodeId.toLowerCase())) {
                        setOverlayNodeId(nodeId);
                        setDiagnosticReady(false);
                      }
                    }}
                    diagnosticMode
                    onDiagnosticReady={setDiagnosticReady}
                  />
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => { setOverlayNodeId(null); setDiagnosticReady(false); }}
                className="absolute top-3 right-3 z-10 rounded-sm p-1 opacity-70 hover:opacity-100 transition-opacity bg-background border border-border shadow-sm"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Response buttons or note field below modal */}
            {overlayNodeId && responseMap.get(overlayNodeId.toLowerCase()) !== 'agree' && (
              <div className="mt-4 pb-4">
                {pendingResponse ? (
                  <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={pendingResponse === 'disagree' ? "Explain why you disagree..." : "What are you struggling with?"}
                      className="min-h-[80px] resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setPendingResponse(null); setNoteText(""); }}
                        className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResponse(pendingResponse, noteText)}
                        disabled={!noteText.trim()}
                        className="px-4 py-2 text-sm font-medium rounded-md text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: pendingResponse === 'disagree' ? RESPONSE_COLORS.disagree : RESPONSE_COLORS.dont_know }}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-start gap-4">
                    <button
                      onClick={() => setPendingResponse('disagree')}
                      disabled={!diagnosticReady}
                      className="flex flex-col items-center gap-1 group disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Disagree"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: RESPONSE_COLORS.disagree }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5l-10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
                      </div>
                      <span className="text-xs font-medium" style={{ color: RESPONSE_COLORS.disagree }}>Disagree</span>
                    </button>

                    <button
                      onClick={() => setPendingResponse('dont_know')}
                      disabled={!diagnosticReady}
                      className="flex flex-col items-center gap-1 group disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="I Don't Know"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: RESPONSE_COLORS.dont_know }}>
                        <span className="text-white font-bold text-lg">?</span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: RESPONSE_COLORS.dont_know }}>Don't Know</span>
                    </button>

                    <button
                      onClick={() => handleResponse('agree')}
                      className="flex flex-col items-center gap-1 group"
                      aria-label="Agree"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: RESPONSE_COLORS.agree }}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span className="text-xs font-medium" style={{ color: RESPONSE_COLORS.agree }}>Agree</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Route choice dialog */}
      <Dialog open={showRouteChoice} onOpenChange={setShowRouteChoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Your Next Question</DialogTitle>
            <DialogDescription>Multiple questions are available. Select which one to explore next.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {availableNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  setShowRouteChoice(false);
                  setOverlayNodeId(node.id);
                  setDiagnosticReady(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-3"
              >
                <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: TIER_COLORS[node.tier ?? 0] }} />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{node.title}</p>
                  <p className="text-xs text-muted-foreground">{node.id.toUpperCase()}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome instructions dialog */}
      <Dialog open={showWelcome} onOpenChange={(open) => { if (!open) dismissWelcome(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Welcome to the Diagnostic Journey</DialogTitle>
            <DialogDescription>Here's how to navigate and respond to each question.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed text-foreground">
            <div className="space-y-1">
              <p className="font-medium">Why do some questions seem obvious?</p>
              <p className="text-muted-foreground">The early questions lay a necessary foundation. Even if they feel elementary, they are prerequisites that unlock deeper, more complex questions ahead.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">How to respond</p>
              <p className="text-muted-foreground">Open a question node and read through all of its content. If you wish to <strong>Disagree</strong> or say <strong>I Don't Know</strong>, you must first expand and review the full reasoning before those options become available. You'll then be asked to briefly explain your position before submitting.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Progressing through the journey</p>
              <p className="text-muted-foreground">You can only advance to the next question once you <strong>Agree</strong> with the relevant prerequisite questions. Disagreeing or saying you don't know will not unlock further nodes — but you can always revisit a question and change your response.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={dismissWelcome}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
