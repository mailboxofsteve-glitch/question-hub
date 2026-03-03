

## Remove Spine ID Labels & Show Full Titles in Tooltips

Two small changes, both in `src/pages/SpineMap.tsx`:

### 1. Remove "S-**" labels from spine nodes
Delete the "Spine node ID labels" block (lines 515-528) that renders `d.id.toUpperCase()` above each spine circle. The nodes will still be identifiable by their tooltip and by clicking through to detail.

### 2. Show full node title in tooltip
The tooltip div (line 630) currently has `truncate` and `max-w-[280px]`, cutting off long titles. Change it to allow text wrapping: remove `truncate`, keep `max-w-[280px]`, and add `whitespace-normal break-words` so the entire title displays across multiple lines if needed.

