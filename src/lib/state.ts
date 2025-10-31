import { instantiateProofreader } from "~ai/proofreader"
import { instantiateRewriter } from "~ai/rewriter"
import { instantiateSummarizer } from "~ai/summarizer"

import type { WritingOption } from "./options"

export type AppState = {
  activeOperationId: WritingOption["id"] | null
  proofread: ModelStatus<Proofreader>
  summarize: ModelStatus<Summarizer>
  rewrite: ModelStatus<Rewriter>
}

export type ModelStatus<TInstance> =
  | {
      status: "IDLE"
    }
  | {
      status: "DOWNLOADING_MODEL"
      downloadingProgress: number
      instance: Promise<TInstance> | TInstance
      controller: AbortController
    }
  | {
      status: "READY"
      instance: Promise<TInstance> | TInstance
    }
  | {
      status: "GENERATING_RESPONSE"
      controller: AbortController
      instance: Promise<TInstance> | TInstance
    }
  | {
      status: "RESPONSE_GENERATED"
      response: string
      controller: AbortController
      instance: Promise<TInstance> | TInstance
    }

const defaultAppState: AppState = {
  activeOperationId: null,
  summarize: { status: "IDLE" },
  proofread: { status: "IDLE" },
  rewrite: { status: "IDLE" }
}

let appState: AppState = defaultAppState

export const APP_STATE_UPDATE = "APP_STATE_UPDATE"

export function getAppState() {
  return appState
}

export async function setAppState(
  newAppState: Partial<AppState>
): Promise<void> {
  appState = { ...appState, ...newAppState }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) {
    return
  }

  chrome.tabs.sendMessage(tab.id, {
    type: APP_STATE_UPDATE,
    appState
  })
}

export async function resetAppState() {
  appState = defaultAppState
  return appState
}

chrome.runtime.onMessage.addListener((message) => {
  if (
    message &&
    typeof message === "object" &&
    "type" in message &&
    message.type === "DISMISS"
  ) {
    if (!appState.activeOperationId) {
      // Should not be possible
      return
    }

    const operationState = appState[appState.activeOperationId]

    if (operationState.status === "IDLE" || operationState.status === "READY") {
      // Should not be possible
      return
    }

    if (
      operationState.status === "DOWNLOADING_MODEL" ||
      operationState.status === "GENERATING_RESPONSE" ||
      operationState.status === "RESPONSE_GENERATED"
    ) {
      operationState.controller.abort()
      setAppState({
        activeOperationId: null,
        [appState.activeOperationId]: {
          status: "READY",
          instance: operationState.instance
        }
      })
      return
    }

    const _never: never = operationState
  }

  if (
    message &&
    typeof message === "object" &&
    "type" in message &&
    message.type === "DOWNLOAD"
  ) {
    const operationId = message.operationId as WritingOption["id"]
    const controller = new AbortController()
    if (operationId === "summarize") {
      instantiateSummarizer(controller)
    }
    if (operationId === "proofread") {
      instantiateProofreader(controller)
    }
    if (operationId === "rewrite") {
      instantiateRewriter(controller)
    }
  }

  if (
    message &&
    typeof message === "object" &&
    "type" in message &&
    message.type === "INVALIDATE_TOOL_INSTANCE"
  ) {
    const operationId = message.operationId as WritingOption["id"]
    const operationState = appState[operationId]
    if ("controller" in operationState) {
      operationState.controller.abort()
    }
    setAppState({
      activeOperationId:
        appState.activeOperationId === operationId
          ? null
          : appState.activeOperationId,
      [operationId]: { status: "IDLE" }
    })
  }
})
