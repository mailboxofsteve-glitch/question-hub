

## Add In-App Writer's Guide Dialog to Node Admin

### Overview
Add a "Help" button to the Admin Dashboard header that opens a dialog containing the full Node Authoring Guide. Writers can reference it anytime without leaving the form.

### Implementation

**New file: `src/components/admin/WriterGuideDialog.tsx`**
- A Dialog component triggered by a `HelpCircle` icon button
- Contains the full writer's guide content as structured JSX (headings, lists, code snippets for formatting examples)
- Uses existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` and `ScrollArea` components
- Covers all sections: Required Fields, Metadata, Content Layers (1/2/3), Formatting (Markdown), and Publishing

**Modified file: `src/components/admin/AdminDashboard.tsx`**
- Import `WriterGuideDialog`
- Add `<WriterGuideDialog />` to the header button row (next to "New Node" and logout buttons)

### Guide Content Sections
1. Required Fields -- ID (slug rules) and Title
2. Metadata -- Category, Keywords, Alt Phrasings
3. Layer 1 -- Summary (2-3 sentences)
4. Layer 2 -- Reasoning Bullets (Title, Summary, Detail with word counts)
5. Layer 3 -- Resources, Sources, Related Questions
6. Formatting -- `*italic*`, `**bold**`, `***both***`, supported vs unsupported fields
7. Publishing -- Draft vs Published toggle

### Technical Details
- No new dependencies required
- Uses existing UI components: `Dialog`, `ScrollArea`, `Button`, `HelpCircle` icon from lucide-react
- The dialog is self-contained and does not affect any other admin functionality
- Content is static JSX, no database or API changes needed
