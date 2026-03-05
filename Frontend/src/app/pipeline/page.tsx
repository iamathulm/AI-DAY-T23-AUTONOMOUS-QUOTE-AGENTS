"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { QuoteResult } from "@/lib/types";
import { MOCK_QUOTES } from "@/lib/mock-data";
import { fetchQuotes } from "@/lib/api";
import { PipelineViewer } from "@/components/pipeline/pipeline-viewer";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const requestedQuote = searchParams.get("quote") ?? "";
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    fetchQuotes({ limit: 500 })
      .then(({ quotes: q }) => {
        if (q.length > 0) {
          setQuotes(q);
          const wanted = requestedQuote && q.some((item) => item.quote_num === requestedQuote)
            ? requestedQuote
            : q[0].quote_num;
          setSelectedQuote(wanted);
        }
      })
      .catch(() => setFetchFailed(true))
      .finally(() => setLoading(false));
  }, [requestedQuote]);

  function loadSample() {
    setQuotes(MOCK_QUOTES);
    setSelectedQuote(MOCK_QUOTES[0].quote_num);
    setFetchFailed(false);
  }

  if (!loading && fetchFailed && quotes.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Trace a quote through all 4 agents and inspect each step&apos;s explainability output
        </p>
        <EmptyState onLoadSample={loadSample} />
      </div>
    );
  }

  const quote = quotes.find((q) => q.quote_num === selectedQuote) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Trace a quote through all 4 agents and inspect each step&apos;s explainability output
          {loading && " — loading…"}
        </p>
        <Select value={selectedQuote} onValueChange={setSelectedQuote}>
          <SelectTrigger size="sm" className="w-52">
            <SelectValue placeholder="Select quote" />
          </SelectTrigger>
          <SelectContent>
            {quotes.map((q) => (
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
