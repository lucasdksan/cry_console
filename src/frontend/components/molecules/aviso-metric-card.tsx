"use client";

import { useActionState, useState } from "react";

import {
  clearWorkspaceMetricTarget,
  saveWorkspaceMetricTarget,
  type AlertActionState,
} from "@/backend/controllers/alert.controller";
import type { AvisosMetricCard } from "@/backend/lib/workspace/avisos-dto";
import type {
  MetricProjectionRisk,
  MetricZoneStatus,
} from "@/backend/lib/workspace/alert-status";
import { FormField } from "@/frontend/components/atoms/form-field";
import {
  RangeBar,
  type RangeBarTone,
} from "@/frontend/components/atoms/range-bar";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { cn } from "@/frontend/lib/utils";

type AvisoMetricCardProps = {
  workspaceId: string;
  periodType: "week" | "month";
  metric: AvisosMetricCard;
  sourceReady: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onUpdated?: () => void;
};

const numberFmt = new Intl.NumberFormat("pt-BR");
const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const pctFmt = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

function formatValue(
  unit: AvisosMetricCard["unit"],
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }
  if (unit === "currency") {
    return currencyFmt.format(value);
  }
  if (unit === "percent") {
    return `${pctFmt.format(value)}%`;
  }
  return numberFmt.format(value);
}

function statusLabel(status: AvisosMetricCard["status"]): string | null {
  switch (status) {
    case "on_track":
      return "No ritmo";
    case "at_risk":
      return "Em risco";
    case "off_track":
      return "Não vai atingir";
    default:
      return null;
  }
}

function zoneLabel(status: MetricZoneStatus): string {
  switch (status) {
    case "below_min":
      return "Abaixo do mínimo";
    case "in_band":
      return "Dentro do esperado";
    case "on_meta_pace":
      return "No ritmo da meta";
  }
}

function projectionRiskLabel(risk: MetricProjectionRisk): string {
  switch (risk) {
    case "wont_hit_min":
      return "Não vai atingir o mínimo";
    case "wont_hit_meta":
      return "Não vai atingir a meta";
    case "on_course":
      return "Projeção no alvo";
  }
}

function hitLabel(status: AvisosMetricCard["targetHitStatus"]): string | null {
  if (status === "reached") {
    return "Meta atingida";
  }
  if (status === "not_reached") {
    return "Ainda não";
  }
  return null;
}

function hitVariant(
  status: AvisosMetricCard["targetHitStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "reached") {
    return "default";
  }
  if (status === "not_reached") {
    return "destructive";
  }
  return "outline";
}

function statusVariant(
  status: AvisosMetricCard["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "on_track":
      return "default";
    case "at_risk":
      return "secondary";
    case "off_track":
      return "destructive";
    default:
      return "outline";
  }
}

function zoneVariant(
  status: MetricZoneStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "below_min":
      return "destructive";
    case "in_band":
      return "outline";
    case "on_meta_pace":
      return "default";
  }
}

function projectionRiskVariant(
  risk: MetricProjectionRisk,
): "default" | "secondary" | "destructive" | "outline" {
  switch (risk) {
    case "wont_hit_min":
      return "destructive";
    case "wont_hit_meta":
      return "secondary";
    case "on_course":
      return "default";
  }
}

function zoneTone(status: MetricZoneStatus): RangeBarTone {
  switch (status) {
    case "below_min":
      return "danger";
    case "in_band":
      return "ok";
    case "on_meta_pace":
      return "primary";
  }
}

function bandBadges(metric: AvisosMetricCard): Array<{
  key: string;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}> {
  if (!metric.hasBand || !metric.zoneStatus) {
    return [];
  }

  const badges: Array<{
    key: string;
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }> = [];

  const metaReached = metric.targetHitStatus === "reached";
  const showZone =
    !metaReached || metric.zoneStatus !== "on_meta_pace";

  if (showZone) {
    badges.push({
      key: "zone",
      label: zoneLabel(metric.zoneStatus),
      variant: zoneVariant(metric.zoneStatus),
      className:
        metric.zoneStatus === "in_band"
          ? "border-brand-secondary/40 bg-brand-secondary/10 text-brand-secondary"
          : undefined,
    });
  }

  if (metaReached) {
    badges.push({
      key: "hit",
      label: "Meta atingida",
      variant: "default",
    });
  } else if (metric.projectionRisk && metric.projectionRisk !== "on_course") {
    badges.push({
      key: "risk",
      label: projectionRiskLabel(metric.projectionRisk),
      variant: projectionRiskVariant(metric.projectionRisk),
    });
  }

  return badges.slice(0, 2);
}

export function AvisoMetricCard({
  workspaceId,
  periodType,
  metric,
  sourceReady,
  selected = false,
  onSelect,
  onUpdated,
}: AvisoMetricCardProps) {
  const [editing, setEditing] = useState(!metric.hasTarget);
  const [saveState, saveAction, savePending] = useActionState<
    AlertActionState,
    FormData
  >(async (prev, formData) => {
    const result = await saveWorkspaceMetricTarget(prev, formData);
    if (result.success) {
      setEditing(false);
      onUpdated?.();
    }
    return result;
  }, {});
  const [clearState, clearAction, clearPending] = useActionState<
    AlertActionState,
    FormData
  >(async (prev, formData) => {
    const result = await clearWorkspaceMetricTarget(prev, formData);
    if (result.success) {
      setEditing(true);
      onUpdated?.();
    }
    return result;
  }, {});

  const bannerError = saveState.error ?? clearState.error;
  const bannerSuccess = saveState.success ?? clearState.success;
  const statusText = statusLabel(metric.status);
  const hitText = hitLabel(metric.targetHitStatus);
  const bandBadgeList = bandBadges(metric);
  const cardRing = selected ? "ring-2 ring-primary/60" : "border-border/60";
  const cardInteractive = onSelect
    ? "cursor-pointer transition hover:border-primary/40"
    : "";

  if (!sourceReady) {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border/60 bg-muted/20 p-4">
        <p className="text-sm font-medium">{metric.label}</p>
        <p className="text-sm text-muted-foreground">
          Configure a fonte para acompanhar esta métrica.
        </p>
      </div>
    );
  }

  if (!metric.hasTarget || editing) {
    return (
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border/60 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{metric.label}</p>
          <p className="text-xs text-muted-foreground">
            Atual: {formatValue(metric.unit, metric.current)}
          </p>
        </div>
        {bannerError ? (
          <p className="text-sm text-destructive">{bannerError}</p>
        ) : null}
        {bannerSuccess ? (
          <p className="text-sm text-muted-foreground">{bannerSuccess}</p>
        ) : null}
        <form action={saveAction} className="flex flex-col gap-3">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="metricKey" value={metric.key} />
          <input type="hidden" name="periodType" value={periodType} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField id={`min-${metric.key}`} label="Mínimo esperado">
              <Input
                id={`min-${metric.key}`}
                name="minExpectedValue"
                type="number"
                min={0}
                step={metric.unit === "percent" ? "0.01" : "1"}
                defaultValue={metric.minExpected ?? undefined}
                placeholder={
                  metric.unit === "percent" ? "Ex.: 1,5" : "Ex.: 800"
                }
                required
              />
            </FormField>
            <FormField id={`target-${metric.key}`} label="Meta">
              <Input
                id={`target-${metric.key}`}
                name="targetValue"
                type="number"
                min={0}
                step={metric.unit === "percent" ? "0.01" : "1"}
                defaultValue={metric.target ?? undefined}
                placeholder={
                  metric.unit === "percent" ? "Ex.: 2,5" : "Ex.: 1000"
                }
                required
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={savePending}>
              {savePending ? "Salvando…" : "Salvar limites"}
            </Button>
            {metric.hasTarget ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`flex flex-col gap-3 rounded-[var(--radius-lg)] border p-4 ${cardRing} ${cardInteractive}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{metric.label}</p>
          <div className="flex flex-wrap gap-1">
            {metric.hasBand
              ? bandBadgeList.map((badge) => (
                  <Badge
                    key={badge.key}
                    variant={badge.variant}
                    className={cn(badge.className)}
                  >
                    {badge.label}
                  </Badge>
                ))
              : null}
            {!metric.hasBand && hitText ? (
              <Badge variant={hitVariant(metric.targetHitStatus)}>
                {hitText}
              </Badge>
            ) : null}
            {!metric.hasBand && statusText ? (
              <Badge variant={statusVariant(metric.status)}>{statusText}</Badge>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            setEditing(true);
          }}
        >
          Editar limites
        </Button>
      </div>
      {bannerError ? (
        <p className="text-sm text-destructive">{bannerError}</p>
      ) : null}
      {bannerSuccess ? (
        <p className="text-sm text-muted-foreground">{bannerSuccess}</p>
      ) : null}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Atual</dt>
          <dd className="font-medium tabular-nums">
            {formatValue(metric.unit, metric.current)}
          </dd>
        </div>
        {metric.hasBand ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Mínimo</dt>
            <dd className="font-medium tabular-nums">
              {formatValue(metric.unit, metric.minExpected)}
            </dd>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Meta</dt>
            <dd className="font-medium tabular-nums">
              {formatValue(metric.unit, metric.target)}
            </dd>
          </div>
        )}
        {metric.hasBand ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Meta</dt>
            <dd className="font-medium tabular-nums">
              {formatValue(metric.unit, metric.target)}
            </dd>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Progresso</dt>
            <dd className="font-medium tabular-nums">
              {metric.progressPct !== null
                ? `${pctFmt.format(metric.progressPct)}%`
                : "—"}
            </dd>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Projeção</dt>
          <dd className="font-medium tabular-nums">
            {formatValue(metric.unit, metric.projection)}
          </dd>
        </div>
      </dl>
      {metric.hasBand &&
      metric.minExpected !== null &&
      metric.target !== null &&
      metric.projection !== null &&
      metric.zoneStatus ? (
        <RangeBar
          fillValue={metric.projection}
          minMarker={metric.minExpected}
          maxMarker={metric.target}
          tone={zoneTone(metric.zoneStatus)}
          ariaLabel={`Projeção de ${metric.label} em relação ao mínimo e à meta`}
        />
      ) : null}
      <form
        action={clearAction}
        onClick={(event) => event.stopPropagation()}
      >
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="metricKey" value={metric.key} />
        <input type="hidden" name="periodType" value={periodType} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={clearPending}
        >
          {clearPending ? "Removendo…" : "Remover limites"}
        </Button>
      </form>
    </div>
  );
}
