import {
  Barcode,
  BriefcaseBusiness,
  Brush,
  Cable,
  ChartNoAxesColumn,
  CheckCircle,
  Clapperboard,
  Ellipsis,
  File,
  Files,
  FileText,
  Grip,
  GripHorizontal,
  Handshake,
  Hourglass,
  List,
  MapPin,
  Newspaper,
  PenLine,
  Shredder,
  Sparkles,
  Tag,
  Tally4,
  TextAlignJustify,
  Zap
} from "lucide-react"

const Icons = {
  Brush,
  CheckCircle,
  FileText,
  PenLine,
  Sparkles,
  Clapperboard,
  Hourglass,
  MapPin,
  Grip,
  GripHorizontal,
  Ellipsis,
  List,
  Newspaper,
  TextAlignJustify,
  Tag,
  Zap,
  ChartNoAxesColumnRotated: ChartNoAxesColumn,
  BarcodeRotated: Barcode,
  Tally4Rotated: Tally4,
  Shredder,
  File,
  Files,
  BriefcaseBusiness,
  Handshake,
  Cable
}

export const WRITING_OPTIONS_KEY = "writingOptions"

export type WritingOption = {
  id: "proofread" | "summarize" | "rewrite"
  name: string
  iconName: keyof typeof Icons
  title: string
  contexts: chrome.contextMenus.ContextType[]
  enabled: boolean
  availability?:
    | { status: Exclude<Availability, "downloading"> }
    | { status: "downloading"; progress: number }
  configs?: Array<{
    id: string
    name: string
    type: "radio"
    selectedOptionId: string
    options: Array<{
      id: string
      name: string
      description?: string
      iconName: keyof typeof Icons
    }>
    dependsOn?: string
    dynamicDescriptionMap?: Record<string, Record<string, string>>
  }>
}

export const DEFAULT_WRITING_OPTIONS: WritingOption[] = [
  {
    id: "rewrite",
    name: "Rewrite",
    iconName: "PenLine",
    title: `Rewrite "%s"`,
    contexts: ["selection", "editable"],
    enabled: true,
    configs: [
      {
        id: "tone",
        name: "Tone",
        type: "radio",
        selectedOptionId: "as-is",
        options: [
          {
            id: "more-formal",
            name: "More Formal",
            description:
              "Writing should use polished and professional language, maintaining a serious and respectful tone.",
            iconName: "BriefcaseBusiness"
          },
          {
            id: "as-is",
            name: "As-is",
            description:
              "Writing should keep the natural tone of the input without changing the formality level.",
            iconName: "Cable"
          },
          {
            id: "more-casual",
            name: "More Casual",
            description:
              "Writing should use a friendly and relaxed tone, with simpler and more conversational language.",
            iconName: "Handshake"
          }
        ]
      },
      {
        id: "length",
        name: "Length",
        type: "radio",
        selectedOptionId: "as-is",
        options: [
          {
            id: "shorter",
            name: "Shorter",
            description:
              "Output should be more concise, removing extra details while keeping the main ideas clear.",
            iconName: "Shredder"
          },
          {
            id: "as-is",
            name: "As-is",
            description:
              "Output should match the original length and level of detail of the input.",
            iconName: "File"
          },
          {
            id: "longer",
            name: "Longer",
            description:
              "Output should be more detailed and cover the content in greater depth.",
            iconName: "Files"
          }
        ]
      }
    ]
  },
  {
    id: "proofread",
    name: "Proofread",
    iconName: "CheckCircle",
    title: `Proofread "%s"`,
    contexts: ["selection", "editable"],
    enabled: true
  },
  {
    id: "summarize",
    name: "Summarize",
    iconName: "Brush",
    title: `Summarize "%s"`,
    contexts: ["selection"],
    enabled: true,
    configs: [
      {
        id: "type",
        name: "Type",
        type: "radio",
        selectedOptionId: "tldr",
        options: [
          {
            id: "tldr",
            name: "TL;DR",
            description:
              "Summary should be short and to the point, providing a quick overview of the input, suitable for a busy reader.",
            iconName: "Zap"
          },
          {
            id: "teaser",
            name: "Teaser",
            description:
              "Summary should focus on the most interesting or intriguing parts of the input, designed to draw the reader in to read more.",
            iconName: "Clapperboard"
          },
          {
            id: "key-points",
            name: "Key Points",
            description:
              "Summary should extract the most important points from the input, presented as a bulleted list.",
            iconName: "MapPin"
          },
          {
            id: "headline",
            name: "Headline",
            description:
              "Summary should effectively contain the main point of the input in a single sentence, in the format of an article headline.",
            iconName: "Tag"
          }
        ]
      },
      {
        id: "length",
        name: "Length",
        type: "radio",
        selectedOptionId: "medium",
        options: [
          { id: "short", name: "Short", iconName: "TextAlignJustify" },
          { id: "medium", name: "Medium", iconName: "Tally4Rotated" },
          { id: "long", name: "Long", iconName: "BarcodeRotated" }
        ],
        dependsOn: "type",
        dynamicDescriptionMap: {
          tldr: {
            short: "Summary should be one sentence long.",
            medium: "Summary should be three sentences long.",
            long: "Summary should be five sentences long."
          },
          teaser: {
            short: "Summary should be one sentence long.",
            medium: "Summary should be three sentences long.",
            long: "Summary should be five sentences long."
          },
          "key-points": {
            short: "Summary should have three bullet points.",
            medium: "Summary should have five bullet points.",
            long: "Summary should have seven bullet points."
          },
          headline: {
            short: "Summary should be within 12 words.",
            medium: "Summary should be within 17 words.",
            long: "Summary should be within 22 words."
          }
        }
      }
    ]
  }
]

export function getOptionIcon(iconName: keyof typeof Icons) {
  return Icons[iconName]
}
