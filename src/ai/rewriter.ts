import { getAppState, setAppState } from "~lib/state"
import { throttle } from "~lib/utils"
import {
  getToolConfigurations,
  updateWritingOptionAvailability
} from "~storage"

const defaultOptions: RewriterCreateOptions = {
  format: "as-is",
  expectedInputLanguages: ["en"],
  expectedContextLanguages: ["en"],
  outputLanguage: "en"
}

export async function instantiateRewriter(
  controller: AbortController
): Promise<Rewriter> {
  if ("Rewriter" in self) {
    const status = await Rewriter.availability()
    const appState = getAppState()

    if ("instance" in appState.rewrite && appState.rewrite.instance) {
      return await appState.rewrite.instance
    }

    if (status === "downloadable" || status === "downloading") {
      return await instantiateRewriterWithMonitor(controller)
    } else if (status === "available") {
      const rewriterOptions = await getToolConfigurations("rewrite")
      const rewriter = Rewriter.create({
        ...defaultOptions,
        ...rewriterOptions
      })
      setAppState({
        rewrite: {
          status: "GENERATING_RESPONSE",
          instance: rewriter,
          controller
        }
      })
      return await rewriter
    }
  }

  throw new Error("Rewriter not available")
}

export async function rewrite(text: string): Promise<void> {
  try {
    const controller = new AbortController()
    const rewriter = await instantiateRewriter(controller)

    setAppState({
      rewrite: { status: "GENERATING_RESPONSE", controller, instance: rewriter }
    })

    const response = await rewriter.rewrite(text, { signal: controller.signal })
    setAppState({
      rewrite: {
        status: "RESPONSE_GENERATED",
        response,
        controller,
        instance: rewriter
      }
    })
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return
    }
    throw e
  }
}

async function instantiateRewriterWithMonitor(
  controller: AbortController
): Promise<Rewriter> {
  const rewriterOptions = await getToolConfigurations("rewrite")

  const rewriter = Rewriter.create({
    ...defaultOptions,
    ...rewriterOptions,
    monitor: (m) => {
      const throttledUpdate = throttle(async (e) => {
        const progress = Math.round(e.loaded * 100)
        updateWritingOptionAvailability("rewrite", {
          status: "downloading",
          progress
        })
        setAppState({
          rewrite: {
            status: "DOWNLOADING_MODEL",
            instance: rewriter,
            downloadingProgress: progress,
            controller
          }
        })
      }, 2000)

      m.addEventListener("downloadprogress", throttledUpdate)
    }
  })

  updateWritingOptionAvailability("rewrite", {
    status: "downloading",
    progress: 0
  })
  setAppState({
    rewrite: {
      status: "DOWNLOADING_MODEL",
      instance: rewriter,
      downloadingProgress: 0,
      controller
    }
  })

  const rewriterInstance = await rewriter

  updateWritingOptionAvailability("rewrite", { status: "available" })
  setAppState({
    rewrite: { status: "READY", instance: rewriterInstance }
  })

  return rewriterInstance
}

export async function setInitialRewriterAvailability(): Promise<void> {
  if ("Rewriter" in self) {
    const status = await Rewriter.availability()
    if (status === "downloading") {
      const controller = new AbortController()
      instantiateRewriterWithMonitor(controller)
    } else {
      updateWritingOptionAvailability("rewrite", { status })
    }
  } else {
    updateWritingOptionAvailability("rewrite", { status: "unavailable" })
  }
}
