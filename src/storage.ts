import { Storage, type StorageCallbackMap } from "@plasmohq/storage"

import {
  DEFAULT_WRITING_OPTIONS,
  WRITING_OPTIONS_KEY,
  type WritingOption
} from "~lib/options"

const storage = new Storage()

export async function getWritingOptions(): Promise<WritingOption[]> {
  const writingOptions =
    await storage.get<Array<WritingOption>>(WRITING_OPTIONS_KEY)

  if (writingOptions) {
    return writingOptions
  }

  storage.set(WRITING_OPTIONS_KEY, DEFAULT_WRITING_OPTIONS)
  return DEFAULT_WRITING_OPTIONS
}

export async function getToolConfigurations(
  operationId: WritingOption["id"]
): Promise<Record<string, string>> {
  const writingOptions = await getWritingOptions()
  return Object.fromEntries(
    writingOptions
      .find((opt) => opt.id === operationId)
      ?.configs?.map((config) => [config.id, config.selectedOptionId]) ?? []
  )
}

let writeChain = Promise.resolve()

export async function setWritingOptions(
  newOptions:
    | WritingOption[]
    | ((prevOptions: WritingOption[]) => WritingOption[])
): Promise<void> {
  writeChain = writeChain.then(async () => {
    const options = await getWritingOptions()
    if (typeof newOptions === "function") {
      newOptions = newOptions(options)
    }
    await storage.set(WRITING_OPTIONS_KEY, newOptions)
  })
}

export function watchStorage(callbackMap: StorageCallbackMap) {
  storage.watch(callbackMap)
}

export function unwatchStorage(callbackMap: StorageCallbackMap) {
  storage.unwatch(callbackMap)
}

export async function updateWritingOptionAvailability(
  optionId: WritingOption["id"],
  availability: NonNullable<WritingOption["availability"]>
): Promise<void> {
  setWritingOptions((writingOptions) =>
    writingOptions.map((option) => ({
      ...option,
      ...(option.id === optionId && { availability })
    }))
  )
}
