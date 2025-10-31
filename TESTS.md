# Test Scenarios

- User clicks "Summarize" from the context menu.
- "Summarize" was in "downloadable" status, so download gets started
- User closes the popover while the download was still in progress
- User again clicks the "Summarize" option from the context menu but with a different text.
- "Summarize" is still in "downloadable" status, the same instance is returned
- User waits for the download to complete
- Once the download is complete, "summarize" is called with the new text.
- But if the previous process is not correctly cancelled, "summarize" will get called with the previously selected text as well. And if this resolves after the "summarize" with new text, user would see a stale response.

- Test unavailable scenario
