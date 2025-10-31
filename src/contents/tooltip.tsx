import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useRef, useState } from "react"
import mediumUrl from "url:../../assets/CabinetGrotesk-Medium.woff2"
import regularUrl from "url:../../assets/CabinetGrotesk-Regular.woff2"

import Tooltip from "~components/Tooltip"
import { APP_STATE_UPDATE, type AppState } from "~lib/state"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const styleElement = document.createElement("style")

styleElement.textContent = `
    @font-face {
      font-family: "CabinetGrotesk";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("${regularUrl}") format("woff2");
    }
    @font-face {
      font-family: "CabinetGrotesk";
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: url("${mediumUrl}") format("woff2");
    }
  `

document.head.appendChild(styleElement)

/**
 * Generates a style element with adjusted CSS to work correctly within a Shadow DOM.
 *
 * Tailwind CSS relies on `rem` units, which are based on the root font size (typically defined on the <html>
 * or <body> element). However, in a Shadow DOM (as used by Plasmo), there is no native root element, so the
 * rem values would reference the actual page's root font size—often leading to sizing inconsistencies.
 *
 * To address this, we:
 * 1. Replace the `:root` selector with `:host(plasmo-csui)` to properly scope the styles within the Shadow DOM.
 * 2. Convert all `rem` units to pixel values using a fixed base font size, ensuring consistent styling
 *    regardless of the host page's font size.
 */
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize

    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")

  styleElement.textContent = updatedCssText

  return styleElement
}

export default function TooltipContainer() {
  const [appState, setAppState] = useState<AppState>()
  const mousePosRef = useRef({ x: 0, y: 0 })
  const activeOperationId = appState?.activeOperationId

  useEffect(() => {
    const listener = (message: unknown) => {
      if (
        message &&
        typeof message === "object" &&
        "type" in message &&
        message.type === APP_STATE_UPDATE
      ) {
        if ("appState" in message) {
          setAppState(message.appState as AppState)
        }
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    document.addEventListener("contextmenu", (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    })
  })

  if (!activeOperationId) {
    return null
  }

  const operationState = appState[activeOperationId]
  if (operationState.status === "IDLE" || operationState.status === "READY") {
    return null
  }

  return (
    <Tooltip
      activeOperationId={activeOperationId}
      operationState={operationState}
      top={mousePosRef.current.y}
      left={mousePosRef.current.x}
    />
  )
}
