import {
  Ban,
  CircleCheckBig,
  CircleQuestionMark,
  Download,
  SquareArrowOutUpRight
} from "lucide-react"
import { useEffect, useState } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "~components/ui/accordion"
import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import { Checkbox } from "~components/ui/checkbox"
import { Label } from "~components/ui/label"
import { Progress } from "~components/ui/progress"
import { Separator } from "~components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "~components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "~components/ui/tooltip"
import {
  getOptionIcon,
  WRITING_OPTIONS_KEY,
  type WritingOption
} from "~lib/options"
import {
  getWritingOptions,
  setWritingOptions,
  unwatchStorage,
  watchStorage
} from "~storage"

export default function OperationsList() {
  const [operations, setOperations] = useState<WritingOption[]>([])

  useEffect(() => {
    const callbackMap = {
      [WRITING_OPTIONS_KEY]: (change: { newValue?: WritingOption[] }) => {
        const { newValue: newWritingOptions } = change
        if (newWritingOptions) {
          setOperations(newWritingOptions)
        }
      }
    }
    watchStorage(callbackMap)

    return () => unwatchStorage(callbackMap)
  }, [])

  useEffect(() => {
    getWritingOptions().then(setOperations)
  }, [])

  function handleOperationVisibilityChange(operationId: WritingOption["id"]) {
    const newOptions = operations.map((operation) =>
      operation.id === operationId
        ? { ...operation, enabled: !operation.enabled }
        : operation
    )

    setOperations(newOptions)
    setWritingOptions(newOptions)
  }

  function handleOperationConfigChange(
    operationId: WritingOption["id"],
    configId: string,
    selectedOptionId: string
  ) {
    const newOptions = operations.map((operation) =>
      operation.id === operationId
        ? {
            ...operation,
            ...(operation.configs && {
              configs: operation.configs.map((config) =>
                config.id === configId
                  ? { ...config, selectedOptionId }
                  : config
              )
            })
          }
        : operation
    )

    chrome.runtime.sendMessage({
      type: "INVALIDATE_TOOL_INSTANCE",
      operationId
    })

    setOperations(newOptions)
    setWritingOptions(newOptions)
  }

  if (operations.length === 0) {
    return null
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Accordion
        type="single"
        collapsible
        className="w-full"
        defaultValue={`item-${operations[0]?.id}`}
      >
        {operations.map((operation) => (
          <AccordionItem value={`item-${operation.id}`} key={operation.id}>
            <AccordionTrigger className="text-base font-medium hover:no-underline">
              <div className="flex items-center gap-4">
                <span>{operation.name}</span>
                {operation.availability && (
                  <StatusBadge availability={operation.availability} />
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6">
              {operation.availability && (
                <StatusDetails
                  availability={operation.availability}
                  onDownloadClick={() =>
                    chrome.runtime.sendMessage({
                      type: "DOWNLOAD",
                      operationId: operation.id
                    })
                  }
                />
              )}
              {operation.availability?.status !== "unavailable" && (
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`switch-${operation.id}`}
                    checked={operation.enabled}
                    onCheckedChange={() =>
                      handleOperationVisibilityChange(operation.id)
                    }
                  />
                  <div className="grid gap-1">
                    <Label htmlFor={`switch-${operation.id}`}>
                      Include in context menu
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      Show this action when you right-click selected text.
                    </p>
                  </div>
                </div>
              )}
              {operation.availability?.status !== "unavailable" && (
                <Configurations
                  configs={operation.configs}
                  onOperationConfigChange={(configId, value) =>
                    handleOperationConfigChange(operation.id, configId, value)
                  }
                />
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </TooltipProvider>
  )
}

function Configurations({
  configs,
  onOperationConfigChange
}: {
  configs: WritingOption["configs"]
  onOperationConfigChange: (configId: string, selectedOptionId: string) => void
}) {
  if (!configs || configs.length === 0) {
    return null
  }

  return (
    <>
      <Separator />
      <div className="mt-2 space-y-3">
        {<p className="text-sm font-medium mb-4">Configurations</p>}
        {configs?.map((config) => {
          const dependentConfig = configs?.find(
            (c) => c.id === config.dependsOn
          )
          const description =
            dependentConfig &&
            config.dynamicDescriptionMap?.[dependentConfig.selectedOptionId]

          return (
            <Config
              key={config.id}
              config={{
                ...config,
                options: config.options.map((option) => ({
                  ...option,
                  ...(description && {
                    description: description[option.id]
                  })
                }))
              }}
              onChange={(value) => {
                onOperationConfigChange(config.id, value)
              }}
            />
          )
        })}
      </div>
    </>
  )
}

function Config({
  config,
  onChange
}: {
  config: NonNullable<WritingOption["configs"]>[number]
  onChange: (value: string) => void
}) {
  const selectedOption = config.options.find(
    (option) => option.id === config.selectedOptionId
  )
  const description = selectedOption?.description || ""
  return (
    <div className="bg-gray-50 p-4 rounded-md">
      <p className="mb-2 text-sm font-medium flex justify-between items-center gap-1">
        <span>{config.name}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <CircleQuestionMark size={16} strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent
            align="end"
            collisionPadding={24}
            className="max-w-96 min-w-40 bg-white border p-1 font-normal"
          >
            <dl className="divide-y divide-border">
              {config.options.map((option) => {
                const Icon = getOptionIcon(option.iconName)
                return (
                  <div
                    key={option.id}
                    className="py-2.5 px-4 grid grid-cols-[auto_1fr] items-center gap-x-2 text-foreground"
                  >
                    <Icon
                      className={`${option.iconName.includes("Rotated") ? "rotate-90" : ""}`}
                      size={16}
                      strokeWidth={1.5}
                    />
                    <dt className="font-medium text-sm">{option.name}</dt>
                    <dd className="text-xs text-muted-foreground col-start-2">
                      {option.description}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </TooltipContent>
        </Tooltip>
      </p>
      <ToggleGroup
        type="single"
        value={config.selectedOptionId}
        onValueChange={onChange}
        variant="outline"
        size="sm"
        className="justify-start"
      >
        {config.options.map((option) => {
          const Icon = getOptionIcon(option.iconName)
          return (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              className="shadow-none px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
            >
              <Icon
                className={`${option.iconName.includes("Rotated") ? "rotate-90" : ""}`}
                size={16}
                strokeWidth={1.5}
              />
              {option.name}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
      <p className="mt-4 text-muted-foreground">{description}</p>
    </div>
  )
}

function StatusBadge({
  availability
}: {
  availability: NonNullable<WritingOption["availability"]>
}) {
  if (availability.status === "available") {
    return (
      <Badge className="capitalize bg-green-100 text-green-800">
        {availability.status}
      </Badge>
    )
  }

  if (availability.status === "downloadable") {
    return (
      <Badge className="capitalize bg-blue-100 text-blue-800">
        {availability.status}
      </Badge>
    )
  }

  if (availability.status === "downloading") {
    return (
      <Badge className="capitalize bg-amber-100 text-amber-800">
        {availability.status}
      </Badge>
    )
  }

  if (availability.status === "unavailable") {
    return (
      <Badge className="capitalize bg-gray-100 text-gray-800">
        {availability.status}
      </Badge>
    )
  }

  return null
}

function StatusDetails({
  availability,
  onDownloadClick
}: {
  availability: NonNullable<WritingOption["availability"]>
  onDownloadClick: () => void
}) {
  if (availability.status === "available") {
    return (
      <div className="border border-green-600 bg-green-50 rounded-md p-4 flex items-center gap-2 text-green-800">
        <CircleCheckBig
          className="text-green-600"
          size={20}
          strokeWidth={1.5}
        />
        <p>This tool is downloaded and ready to use.</p>
      </div>
    )
  }

  if (availability.status === "downloadable") {
    return (
      <div className="border border-blue-600 bg-blue-50 rounded-md p-4 text-blue-800">
        <div className="flex items-center gap-2 mb-1.5">
          <Download
            className="text-blue-600 shrink-0 self-start"
            size={20}
            strokeWidth={1.5}
          />
          <div className="mb-4">
            <p className="mb-1.5">This tool is not downloaded yet.</p>
            <p className="text-muted-foreground text-sm leading-tight">
              Note: This is a one-time operation. After the download, you can
              start using the model right away.
            </p>
          </div>
        </div>
        <Button className="w-full" onClick={onDownloadClick}>
          Download Tool
        </Button>
      </div>
    )
  }

  if (availability.status === "downloading") {
    return (
      <div className="border border-amber-600 bg-amber-50  rounded-md p-4 text-amber-800 flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <Download
            className="shrink-0 self-start text-amber-600"
            size={20}
            strokeWidth={1.5}
          />
          <p className="mb-1.5">This tool is currently downloading...</p>
        </div>
        <Progress
          value={availability.progress}
          className="mb-4 bg-amber-600/15 [&>div]:bg-transparent [&>div]:bg-[repeating-linear-gradient(45deg,theme(colors.amber.600)_0_5px,transparent_5px_10px)]"
        />
        <p className="self-end">{availability.progress}% complete</p>
      </div>
    )
  }

  if (availability.status === "unavailable") {
    return (
      <div className="border border-gray-600 bg-gray-50 rounded-md p-4 text-gray-800 flex flex-col">
        <div className="flex items-center gap-2 mb-1.5">
          <Ban
            className="shrink-0 self-start text-gray-600"
            size={20}
            strokeWidth={1.5}
          />
          <div className="mb-4">
            <p className="mb-1.5">This tool is unavailable.</p>
            <p className="text-muted-foreground text-sm leading-tight mb-1.5">
              Ensure that your device and browser meet the necessary
              requirements.{" "}
            </p>
          </div>
        </div>
        <Button
          asChild
          className="w-full bg-gray-200/70 hover:bg-gray-200"
          variant="secondary"
        >
          <a
            href="https://developer.chrome.com/docs/ai/get-started#requirements"
            className="flex items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check system requirements
            <SquareArrowOutUpRight />
          </a>
        </Button>
      </div>
    )
  }

  const _never: never = availability.status

  return null
}
