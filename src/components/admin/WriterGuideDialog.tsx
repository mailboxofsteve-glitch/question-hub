import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const WriterGuideDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="icon" title="Writer's Guide">
        <HelpCircle className="w-4 h-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[85vh] p-0">
      <DialogHeader className="px-6 pt-6 pb-0">
        <DialogTitle>Node Authoring Guide</DialogTitle>
      </DialogHeader>
      <ScrollArea className="h-[70vh] px-6 pb-6">
        <div className="space-y-6 text-sm leading-relaxed pr-4">

          {/* Required Fields */}
          <section>
            <h3 className="font-semibold text-base mb-2">1. Required Fields</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>ID (slug)</strong> — URL-friendly identifier. Use lowercase letters, numbers, and hyphens only (e.g. <code className="bg-muted px-1 rounded text-xs">what-is-probate</code>). Cannot be changed after creation.</li>
              <li><strong>Title</strong> — The display name shown to users (e.g. "What Is Probate?").</li>
            </ul>
          </section>

          {/* Metadata */}
          <section>
            <h3 className="font-semibold text-base mb-2">2. Metadata</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Category</strong> — A broad grouping (e.g. "Estate Planning", "Tax").</li>
              <li><strong>Keywords</strong> — Comma-separated search terms to help users find this node.</li>
              <li><strong>Alt Phrasings</strong> — Alternative ways a user might ask this question. Add one per line. These improve search matching.</li>
            </ul>
          </section>

          {/* Layer 1 */}
          <section>
            <h3 className="font-semibold text-base mb-2">3. Layer 1 — Summary</h3>
            <p>Write a <strong>2–3 sentence</strong> plain-language summary that directly answers the question. This is the first thing users see.</p>
          </section>

          {/* Layer 2 */}
          <section>
            <h3 className="font-semibold text-base mb-2">4. Layer 2 — Reasoning Bullets</h3>
            <p className="mb-2">Each bullet has three parts:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Title</strong> — Short label (a slug ID is auto-generated from this).</li>
              <li><strong>Summary</strong> — One-sentence overview of the point.</li>
              <li><strong>Detail</strong> — Expanded explanation, <strong>60–120 words</strong>. Supports Markdown formatting.</li>
              <li><strong>Image (optional)</strong> — Upload a still image to illustrate the point. Supported formats: JPG, PNG, WebP, GIF. The image appears below the detail text.</li>
              <li><strong>Video URL (optional)</strong> — Paste a YouTube or Vimeo link to embed a video. The video appears below the image (if any). Standard watch URLs are automatically converted to embeds.</li>
            </ul>
            <p className="mt-2 text-muted-foreground">Add as many bullets as needed using the "+ Add Bullet" button.</p>
          </section>

          {/* Layer 3 */}
          <section>
            <h3 className="font-semibold text-base mb-2">5. Layer 3 — Resources, Sources &amp; Related</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Resources</strong> — Helpful links. Provide a <em>title</em>, <em>URL</em>, and optional <em>description</em>.</li>
              <li><strong>Sources</strong> — Citations backing up the content. Include <em>title</em>, <em>URL</em>, and optional <em>description</em>.</li>
              <li><strong>Related Questions</strong> — Enter existing node slug IDs (e.g. <code className="bg-muted px-1 rounded text-xs">what-is-probate</code>) to link related content.</li>
            </ul>
          </section>

          {/* Formatting */}
          <section>
            <h3 className="font-semibold text-base mb-2">6. Formatting (Markdown)</h3>
            <p className="mb-2">Use Markdown syntax for emphasis:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><code className="bg-muted px-1 rounded text-xs">*italic*</code> → <em>italic</em></li>
              <li><code className="bg-muted px-1 rounded text-xs">**bold**</code> → <strong>bold</strong></li>
              <li><code className="bg-muted px-1 rounded text-xs">***bold &amp; italic***</code> → <strong><em>bold &amp; italic</em></strong></li>
            </ul>
            <div className="mt-3 p-3 rounded bg-muted/50 space-y-1">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Supported fields</p>
              <p>Layer 1 summary, Layer 2 summary &amp; detail, Layer 3 resource/source titles &amp; descriptions</p>
            </div>
            <div className="mt-2 p-3 rounded bg-muted/50 space-y-1">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Not supported</p>
              <p>ID, Title, Category, Keywords, Alt Phrasings, Related Questions</p>
            </div>
          </section>

          {/* Publishing */}
          <section>
            <h3 className="font-semibold text-base mb-2">7. Publishing</h3>
            <p>Toggle <strong>Published</strong> when the node is ready for users. Unpublished nodes are saved as <em>Drafts</em> and won't appear in search results.</p>
          </section>

          {/* Roles & Permissions */}
          <section>
            <h3 className="font-semibold text-base mb-2">8. Roles &amp; Permissions</h3>

            <div className="space-y-3">
              <div>
                <p className="font-medium mb-1">Admin</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Can <strong>create</strong> new nodes (saved as Draft).</li>
                  <li>Can <strong>edit only nodes they created</strong>. The edit button is hidden for nodes submitted by others.</li>
                  <li>Any edit by an admin <strong>automatically reverts</strong> the node to <em>Draft</em> status, requiring editor review before republication.</li>
                  <li><strong>Cannot delete</strong> any nodes.</li>
                  <li><strong>Cannot publish</strong> or change publication status.</li>
                </ul>
              </div>

              <div>
                <p className="font-medium mb-1">Editor</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Full permissions — can <strong>create, edit, and delete</strong> any node regardless of who submitted it.</li>
                  <li>Only editors can <strong>publish</strong> nodes or toggle publication status.</li>
                  <li>Can re-publish nodes that were reverted to draft by an admin edit.</li>
                </ul>
              </div>

              <div className="mt-3 p-3 rounded bg-muted/50">
                <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">Typical Workflow</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li><strong>Admin</strong> creates or edits a node — it is saved as a <em>Draft</em>.</li>
                  <li><strong>Editor</strong> reviews the draft for accuracy and completeness.</li>
                  <li><strong>Editor</strong> publishes the node (or requests changes from the admin).</li>
                </ol>
              </div>
            </div>
          </section>

        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

export default WriterGuideDialog;
