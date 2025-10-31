import { getAppState, setAppState } from "~lib/state"
import { throttle } from "~lib/utils"
import {
  getToolConfigurations,
  updateWritingOptionAvailability
} from "~storage"

const defaultOptions: SummarizerCreateOptions = {
  format: "plain-text",
  expectedInputLanguages: ["en"],
  outputLanguage: "en"
}

export async function instantiateSummarizer(
  controller: AbortController
): Promise<Summarizer> {
  if ("Summarizer" in self) {
    const status = await Summarizer.availability()
    const appState = getAppState()

    if ("instance" in appState.summarize && appState.summarize.instance) {
      return await appState.summarize.instance
    }

    if (status === "downloadable" || status === "downloading") {
      return await instantiateSummarizerWithMonitor(controller)
    } else if (status === "available") {
      const summarizerOptions = await getToolConfigurations("summarize")
      const summarizer = Summarizer.create({
        ...defaultOptions,
        ...summarizerOptions
      })
      setAppState({
        summarize: {
          status: "GENERATING_RESPONSE",
          instance: summarizer,
          controller
        }
      })
      return await summarizer
    }
  }

  throw new Error("Summarizer not available")
}

export async function summarize(text: string): Promise<void> {
  try {
    const controller = new AbortController()
    const summarizer = await instantiateSummarizer(controller)

    setAppState({
      summarize: {
        status: "GENERATING_RESPONSE",
        controller,
        instance: summarizer
      }
    })

    const response = await summarizer.summarize(text, {
      signal: controller.signal
    })
    setAppState({
      summarize: {
        status: "RESPONSE_GENERATED",
        response,
        controller,
        instance: summarizer
      }
    })
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return
    }
    throw e
  }
}

async function instantiateSummarizerWithMonitor(
  controller: AbortController
): Promise<Summarizer> {
  const summarizerOptions = await getToolConfigurations("summarize")

  const summarizer = Summarizer.create({
    ...defaultOptions,
    ...summarizerOptions,
    monitor: (m) => {
      const throttledUpdate = throttle(async (e) => {
        const progress = Math.round(e.loaded * 100)
        updateWritingOptionAvailability("summarize", {
          status: "downloading",
          progress
        })
        setAppState({
          summarize: {
            status: "DOWNLOADING_MODEL",
            instance: summarizer,
            downloadingProgress: progress,
            controller
          }
        })
      }, 2000)

      m.addEventListener("downloadprogress", throttledUpdate)
    }
  })

  updateWritingOptionAvailability("summarize", {
    status: "downloading",
    progress: 0
  })
  setAppState({
    summarize: {
      status: "DOWNLOADING_MODEL",
      instance: summarizer,
      downloadingProgress: 0,
      controller
    }
  })

  const summarizerInstance = await summarizer

  updateWritingOptionAvailability("summarize", { status: "available" })
  setAppState({
    summarize: { status: "READY", instance: summarizerInstance }
  })

  return summarizerInstance
}

export async function setInitialSummarizerAvailability(): Promise<void> {
  if ("Summarizer" in self) {
    const status = await Summarizer.availability()
    if (status === "downloading") {
      const controller = new AbortController()
      instantiateSummarizerWithMonitor(controller)
    } else {
      updateWritingOptionAvailability("summarize", { status })
    }
  } else {
    updateWritingOptionAvailability("summarize", { status: "unavailable" })
  }
}
