import { proofread } from "~ai/proofreader"
import { rewrite } from "~ai/rewriter"
import { summarize } from "~ai/summarizer"
import { type WritingOption } from "~lib/options"

export async function generateAIResponse(
  operationId: WritingOption["id"],
  text: string
): Promise<void> {
  switch (operationId) {
    case "proofread":
      proofread(text)
      break
    case "summarize":
      summarize(text)
      break
    case "rewrite":
      rewrite(text)
      break
    default:
      const _never: never = operationId
      throw new Error("Unrecognised operationId", operationId)
  }
}
