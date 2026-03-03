

## Fix: Position Spine Nodes Within Their Tier Bands

### Problem
Currently, spine nodes are evenly spaced from bottom of T0 to top of T6 (lines 220-226), ignoring which tier each node actually belongs to. S-01 (tier 0) renders near the bottom correctly, but S-02 (tier 3) and S-03 (tier 6) are placed by index position rather than by their actual tier — so they can land outside their tier band.

### Solution
Instead of distributing nodes evenly across the full chart height by index, position each spine node's Y coordinate **within its tier band**. Multiple spine nodes sharing the same tier should be spaced evenly within that band.

### Changes (single file: `src/pages/SpineMap.tsx`, lines ~219-231)

**Replace the even-spacing logic with tier-aware positioning:**

1. Group spine nodes by their tier
2. For each tier group, distribute nodes evenly within that tier's band (using `tierBandY(tier)` as the top and `tierBandY(tier) + BAND_HEIGHT` as the bottom)
3. Within a tier, order nodes by their spine number so lower numbers sit lower
4. This ensures every spine node sits inside its colored tier band while maintaining the bottom-to-top chain visual

The connecting chain lines between consecutive spine nodes will still work — they'll just cross tier boundaries when consecutive nodes are in different tiers.

