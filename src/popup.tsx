import OperationsList from "~components/operations-list"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "~components/ui/card"
import { ScrollArea } from "~components/ui/scroll-area"

import "~style.css"

export default function IndexPopup() {
  return (
    <ScrollArea className="h-[532px] m-0.5">
      <Card className="font-sans w-120 border-none rounded-none shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Text Modification Options</CardTitle>
          <CardDescription className="text-pretty">
            View available tools, check their status, and customize
            configurations for your workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperationsList />
        </CardContent>
      </Card>
    </ScrollArea>
  )
}
