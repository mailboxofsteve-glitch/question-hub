

## Add Note Field for Disagree / Don't Know Responses

When a user clicks "Disagree" or "Don't Know", instead of immediately submitting, show a note input area below the buttons with Submit and Cancel options.

### Flow

1. User clicks Disagree or Don't Know → store the pending response type in state, show the note field
2. Note field appears with placeholder text contextual to the response ("Explain why you disagree..." or "What are you struggling with?")
3. **Submit** button — enabled only when the text field is non-empty — calls `respond(nodeId, response, note)` and closes the overlay
4. **Cancel** button — always available — hides the note field and returns to the three-button state

### Changes — `src/pages/Diagnostic.tsx`

- Add state: `pendingResponse: 'disagree' | 'dont_know' | null` and `noteText: string`
- When Disagree/Don't Know is clicked, set `pendingResponse` instead of calling `handleResponse`
- Conditionally render: if `pendingResponse` is set, replace the button row with a note input area (Textarea + Submit/Cancel buttons)
- Submit calls `respond(overlayNodeId, pendingResponse, noteText)` and closes overlay
- Cancel resets `pendingResponse` and `noteText` back to null/empty
- Reset `pendingResponse`/`noteText` when overlay closes or node changes
- Update `handleResponse` to accept optional note parameter

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Diagnostic.tsx` | Add pending response state, note textarea, Submit/Cancel flow |

