

## Add Welcome Instructions Dialog to Diagnostic Journey

When the Diagnostic page loads, show a dismissible dialog explaining how the journey works. Use `localStorage` to track whether the user has seen it, so it only auto-opens on first visit (with an option to reopen it later).

### Dialog Content (plain language)
1. Some early questions may seem obvious or irrelevant — they lay the foundation for deeper questions ahead.
2. To disagree or say "I don't know", you must first expand and read all the content within the question node.
3. If you disagree or don't know, you'll be asked to briefly explain why before submitting.
4. You can only progress to the next question once you agree with the relevant prerequisite questions.

### Implementation

**`src/pages/Diagnostic.tsx`**
- Add state `showWelcome` initialized to `!localStorage.getItem('diagnostic-welcome-seen')`
- On close, set localStorage flag and `setShowWelcome(false)`
- Render a `Dialog` with `open={showWelcome}` containing the instructions text and a "Got it" button
- Add a small help/info button (e.g. `HelpCircle` icon) in the page header area that reopens the dialog on click

