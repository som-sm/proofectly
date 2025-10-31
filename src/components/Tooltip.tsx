import { useCallback, useRef, useState } from "react"

import { Button } from "~components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "~components/ui/popover"
import { Progress } from "~components/ui/progress"
import { ScrollArea } from "~components/ui/scroll-area"
import { Skeleton } from "~components/ui/skeleton"
import { type AppState, type ModelStatus } from "~lib/state"

export default function Tooltip({
  activeOperationId,
  operationState,
  top,
  left
}: {
  activeOperationId: Exclude<AppState["activeOperationId"], null>
  operationState: Exclude<ModelStatus<unknown>, { status: "IDLE" | "READY" }>
  top: number
  left: number
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  const activeElement = useRef(document.activeElement).current
  const isInputOrTextarea =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  const isContentEditable =
    activeElement instanceof HTMLElement && activeElement.isContentEditable
  const showReplace = isInputOrTextarea || isContentEditable

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setContainer(node)
    }
  }, [])

  const handleClose = () => {
    chrome.runtime.sendMessage({ type: "DISMISS" })
  }

  function handleReplace(text: string) {
    if (isInputOrTextarea) {
      const { selectionStart: s, selectionEnd: e } = activeElement
      if (s != null && e != null && s !== e) {
        activeElement.setRangeText(text)
      }
    } else if (isContentEditable) {
      const selection = window.getSelection()
      if (selection?.rangeCount && !selection.isCollapsed) {
        const range = selection.getRangeAt(0)

        range.deleteContents()

        const node = document.createTextNode(text)
        range.insertNode(node)
      }
    }

    handleClose()
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    handleClose()
  }

  return (
    <div ref={ref} className="font-sans text-sm">
      {container && (
        <Popover open={true}>
          <PopoverAnchor asChild>
            <div
              className="fixed w-1 h-1"
              style={{ top: `${top}px`, left: `${left}px` }}
            ></div>
          </PopoverAnchor>
          <PopoverContent
            className="w-120 p-0"
            container={container}
            sideOffset={12}
            collisionPadding={12}
            onInteractOutside={handleClose}
            onEscapeKeyDown={handleClose}
            align="start"
          >
            <p className="text-lg font-medium py-3 px-4 border-b">
              {activeOperationId[0]?.toUpperCase() + activeOperationId.slice(1)}
            </p>

            <ScrollArea className="my-4 [&>div]:max-h-72 px-3.5 mx-0.5">
              {operationState.status === "DOWNLOADING_MODEL" ? (
                <div className="flex flex-col">
                  <p>
                    <span className="font-medium text-lg">
                      Downloading Model
                    </span>{" "}
                    ({operationState.downloadingProgress}% complete)
                  </p>
                  <Progress
                    value={operationState.downloadingProgress}
                    className="mt-2 bg-foreground/10 [&>div]:bg-transparent [&>div]:bg-[repeating-linear-gradient(45deg,hsl(var(--foreground))_0_5px,transparent_5px_10px)]"
                  />
                  <p className="text-muted-foreground mt-6">
                    <span className="text-foreground">Note:</span> This is a
                    one-time operation. After the download, you can start using
                    the model right away.
                  </p>
                </div>
              ) : operationState.status === "GENERATING_RESPONSE" ? (
                <div className="h-[3lh] flex flex-col justify-around">
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-1/2 h-4" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap">
                  {operationState.response}
                </div>
              )}
            </ScrollArea>

            {(operationState.status === "RESPONSE_GENERATED" ||
              operationState.status === "GENERATING_RESPONSE") && (
              <div className="px-4 py-3 border-t flex gap-3 justify-end">
                {operationState.status === "RESPONSE_GENERATED" ? (
                  <>
                    {showReplace && (
                      <Button
                        onClick={() => handleReplace(operationState.response)}
                      >
                        Replace
                      </Button>
                    )}
                    <Button
                      variant={showReplace ? "outline" : "default"}
                      onClick={() => handleCopy(operationState.response)}
                    >
                      Copy
                    </Button>
                  </>
                ) : (
                  <>
                    {showReplace && <Skeleton className="h-9 w-16" />}
                    <Skeleton className="h-9 w-16" />
                  </>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
