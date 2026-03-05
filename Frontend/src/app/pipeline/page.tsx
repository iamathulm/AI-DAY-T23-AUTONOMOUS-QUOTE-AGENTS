"use client";

import { useState } from "react";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { PipelineViewer } from "@/components/pipeline/pipeline-viewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PipelinePage() {
  const [selectedQuote, setSelectedQuote] = useState(MOCK_QUOTES[0].quote_num);
  const quote = MOCK_QUOTES.find((q) => q.quote_num === selectedQuote) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trace a quote through all 4 agents and inspect each step&apos;s explainability output
        </p>
        <Select value={selectedQuote} onValueChange={setSelectedQuote}>
          <SelectTrigger size="sm" className="w-52">
            <SelectValue placeholder="Select quote" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_QUOTES.map((q) => (
              <SelectItem key={q.quote_num} value={q.quote_num}>
                {q.quote_num}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PipelineViewer quote={quote} />
    </div>
  );
}
