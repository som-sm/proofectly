import { generateAIResponse } from "~ai"
import { setInitialProofreaderAvailability } from "~ai/proofreader"
import { setInitialRewriterAvailability } from "~ai/rewriter"
import { setInitialSummarizerAvailability } from "~ai/summarizer"
import { WRITING_OPTIONS_KEY, type WritingOption } from "~lib/options"
import { setAppState } from "~lib/state"
import { getWritingOptions, watchStorage } from "~storage"

function createNewMenuItems(writingOptions: WritingOption[]) {
  chrome.contextMenus.removeAll()

  writingOptions.forEach(({ id, title, contexts, enabled }) => {
    if (enabled) {
      chrome.contextMenus.create({ id, title, contexts })
    }
  })
}

chrome.runtime.onInstalled.addListener(async function () {
  const writingOptions = await getWritingOptions()
  createNewMenuItems(writingOptions)
  fetchInitialToolsStatus()
})

chrome.runtime.onStartup.addListener(async function () {
  fetchInitialToolsStatus()
})

function fetchInitialToolsStatus() {
  setInitialSummarizerAvailability()
  setInitialProofreaderAvailability()
  setInitialRewriterAvailability()
}

watchStorage({
  [WRITING_OPTIONS_KEY]: (change: { newValue?: WritingOption[] }) => {
    const { newValue: newWritingOptions } = change
    if (newWritingOptions) {
      createNewMenuItems(newWritingOptions)
    }
  }
})

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  const { menuItemId, selectionText } = info
  let unescapedSelectionText = selectionText

  if (tab?.id) {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: () => window.getSelection()?.toString()
    })
    if (result[0]?.result) {
      unescapedSelectionText = result[0].result
    }
  }

  if (unescapedSelectionText) {
    setAppState({ activeOperationId: menuItemId as WritingOption["id"] })
    generateAIResponse(
      menuItemId as WritingOption["id"],
      unescapedSelectionText
    )
  }
})

export {}
