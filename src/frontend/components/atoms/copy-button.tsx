"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";

const COPIED_FEEDBACK_MS = 2000;

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export function CopyButton({
  value,
  label = "Copiar",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={cn(
        "border-border shadow-sm",
        copied && "text-emerald-500",
        className,
      )}
      onClick={handleCopy}
      aria-label={copied ? "Copiado" : label}
      title={copied ? "Copiado" : label}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}
