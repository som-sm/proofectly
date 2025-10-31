import { getAppState, setAppState } from "~lib/state"
import { throttle } from "~lib/utils"
import {
  getToolConfigurations,
  updateWritingOptionAvailability
} from "~storage"

const defaultOptions: ProofreaderCreateOptions = {
  includeCorrectionTypes: true,
  includeCorrectionExplanations: true,
  correctionExplanationLanguage: "en",
  expectedInputLanguages: ["en"]
}

export async function instantiateProofreader(
  controller: AbortController
): Promise<Proofreader> {
  if ("Proofreader" in self) {
    const status = await Proofreader.availability()
    const appState = getAppState()

    if ("instance" in appState.proofread && appState.proofread.instance) {
      return await appState.proofread.instance
    }

    if (status === "downloadable" || status === "downloading") {
      return await instantiateProofreaderWithMonitor(controller)
    } else if (status === "available") {
      const proofreaderOptions = await getToolConfigurations("proofread")
      const proofreader = Proofreader.create({
        ...defaultOptions,
        ...proofreaderOptions
      })
      setAppState({
        proofread: {
          status: "GENERATING_RESPONSE",
          instance: proofreader,
          controller
        }
      })
      return await proofreader
    }
  }

  throw new Error("Proofreader not available")
}

export async function proofread(text: string): Promise<void> {
  try {
    const controller = new AbortController()
    const proofreader = await instantiateProofreader(controller)

    setAppState({
      proofread: {
        status: "GENERATING_RESPONSE",
        controller,
        instance: proofreader
      }
    })

    // @ts-ignore
    const response = await proofreader.proofread(text, {
      signal: controller.signal
    })
    setAppState({
      proofread: {
        status: "RESPONSE_GENERATED",
        response: response.correctedInput,
        controller,
        instance: proofreader
      }
    })
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return
    }
    throw e
  }
}

async function instantiateProofreaderWithMonitor(
  controller: AbortController
): Promise<Proofreader> {
  const proofreaderOptions = await getToolConfigurations("proofread")

  const proofreader = Proofreader.create({
    ...defaultOptions,
    ...proofreaderOptions,
    monitor: (m) => {
      const throttledUpdate = throttle(async (e) => {
        const progress = Math.round(e.loaded * 100)
        updateWritingOptionAvailability("proofread", {
          status: "downloading",
          progress
        })
        setAppState({
          proofread: {
            status: "DOWNLOADING_MODEL",
            instance: proofreader,
            downloadingProgress: progress,
            controller
          }
        })
      }, 2000)

      m.addEventListener("downloadprogress", throttledUpdate)
    }
  })

  updateWritingOptionAvailability("proofread", {
    status: "downloading",
    progress: 0
  })
  setAppState({
    proofread: {
      status: "DOWNLOADING_MODEL",
      instance: proofreader,
      downloadingProgress: 0,
      controller
    }
  })

  const proofreaderInstance = await proofreader

  updateWritingOptionAvailability("proofread", { status: "available" })
  setAppState({
    proofread: { status: "READY", instance: proofreaderInstance }
  })

  return proofreaderInstance
}

export async function setInitialProofreaderAvailability(): Promise<void> {
  if ("Proofreader" in self) {
    const status = await Proofreader.availability()
    if (status === "downloading") {
      const controller = new AbortController()
      instantiateProofreaderWithMonitor(controller)
    } else {
      updateWritingOptionAvailability("proofread", { status })
    }
  } else {
    updateWritingOptionAvailability("proofread", { status: "unavailable" })
  }
}
