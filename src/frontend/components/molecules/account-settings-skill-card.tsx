"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import {
  removeUserAgentSkill,
  saveUserAgentSkill,
  type AgentSkillActionState,
} from "@/backend/controllers/agent-skill.controller";
import {
  suggestSlugFromName,
  USER_AGENT_SKILL_METRIC_KEYS,
} from "@/backend/lib/agent/skill";
import { CHART_METRIC_LABELS } from "@/backend/lib/agent/types";
import type { UserAgentSkillPublic } from "@/backend/models/user-agent-skill.model";
import { FormField } from "@/frontend/components/atoms/form-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/frontend/components/ui/alert-dialog";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";

type AccountSettingsSkillCardProps = {
  skill?: UserAgentSkillPublic;
  onSkillsChange?: (skills: UserAgentSkillPublic[]) => void;
  onCancelCreate?: () => void;
};

export function AccountSettingsSkillCard({
  skill,
  onSkillsChange,
  onCancelCreate,
}: AccountSettingsSkillCardProps) {
  const isNew = !skill;
  const formId = skill ? `skill-form-${skill.id}` : "skill-form-new";

  const [name, setName] = useState(skill?.name ?? "");
  const [slug, setSlug] = useState(skill?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(skill?.slug));
  const [instruction, setInstruction] = useState(skill?.instruction ?? "");
  const [selectedMetrics, setSelectedMetrics] = useState(
    () => new Set(skill?.metricKeys ?? []),
  );

  const [state, formAction, pending] = useActionState<
    AgentSkillActionState,
    FormData
  >(saveUserAgentSkill, {});

  const [removeState, removeAction, removing] = useActionState<
    AgentSkillActionState,
    FormData
  >(removeUserAgentSkill, {});

  const bannerError = state.error ?? removeState.error;
  const bannerSuccess = state.success ?? removeState.success;

  useEffect(() => {
    const next = state.skills ?? removeState.skills;
    if (next) {
      onSkillsChange?.(next);
    }
  }, [onSkillsChange, removeState.skills, state.skills]);

  useEffect(() => {
    if (!slugTouched && name.trim()) {
      setSlug(suggestSlugFromName(name));
    }
  }, [name, slugTouched]);

  const metricFieldError = state.fieldErrors?.metricKeys?.[0];
  const slugFieldError = state.fieldErrors?.slug?.[0];

  const slashPreview = useMemo(() => {
    const s = slug.trim() || "minha-skill";
    return `/${s}`;
  }, [slug]);

  function toggleMetric(key: (typeof USER_AGENT_SKILL_METRIC_KEYS)[number]) {
    setSelectedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <CardTitle className="font-heading text-base">
          {isNew ? "Nova skill" : skill.name}
        </CardTitle>
        <CardDescription>
          Invoque no chat com{" "}
          <span className="font-mono text-foreground">{slashPreview}</span>.
          Associe métricas salvas da loja para gerar gráfico no turno.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {bannerError ? (
          <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {bannerError}
          </p>
        ) : null}
        {bannerSuccess ? (
          <p className="rounded-[var(--radius-md)] border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
            {bannerSuccess}
          </p>
        ) : null}

        <form id={formId} action={formAction} className="flex flex-col gap-4">
          {skill ? (
            <input type="hidden" name="skillId" value={skill.id} />
          ) : null}

          <FormField
            id={`${formId}-name`}
            label="Nome"
            error={state.fieldErrors?.name?.[0]}
          >
            <Input
              id={`${formId}-name`}
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Search x VTEX"
              maxLength={60}
              required
            />
          </FormField>

          <FormField
            id={`${formId}-slug`}
            label="Slug (comando)"
            error={slugFieldError}
          >
            <Input
              id={`${formId}-slug`}
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="search-vtex"
              maxLength={32}
              required
            />
          </FormField>

          <FormField
            id={`${formId}-instruction`}
            label="Instrução para o modelo"
            error={state.fieldErrors?.instruction?.[0]}
          >
            <Textarea
              id={`${formId}-instruction`}
              name="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Cruze cliques orgânicos com receita e destaque divergências…"
              rows={5}
              maxLength={2000}
              required
              className="min-h-[120px] resize-y"
            />
          </FormField>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              Métricas no gráfico (opcional)
            </legend>
            <p className="text-xs text-muted-foreground">
              Dados já sincronizados (VTEX, GA4, Search Console e Clarity) da
              loja aberta no agente. Máximo duas unidades (moeda, contagem ou
              %).
            </p>
            {metricFieldError ? (
              <p className="text-xs text-destructive">{metricFieldError}</p>
            ) : null}
            <div className="flex flex-col gap-2">
              {USER_AGENT_SKILL_METRIC_KEYS.map((key) => {
                const checked = selectedMetrics.has(key);
                return (
                  <div key={key} className="flex items-start gap-2">
                    <Checkbox
                      id={`${formId}-metric-${key}`}
                      checked={checked}
                      onCheckedChange={() => toggleMetric(key)}
                    />
                    <Label
                      htmlFor={`${formId}-metric-${key}`}
                      className="cursor-pointer text-sm font-normal leading-snug"
                    >
                      {CHART_METRIC_LABELS[key]}
                    </Label>
                    {checked ? (
                      <input type="hidden" name="metricKeys" value={key} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {isNew && onCancelCreate ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={onCancelCreate}
            >
              Cancelar
            </Button>
          ) : null}
          {!isNew ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer text-destructive hover:text-destructive"
                    disabled={removing}
                  />
                }
              >
                Excluir
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir skill?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Mensagens antigas no chat não serão alteradas. O comando{" "}
                    {slashPreview} deixará de funcionar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <form action={removeAction}>
                    <input type="hidden" name="skillId" value={skill.id} />
                    <AlertDialogAction type="submit" disabled={removing}>
                      Excluir
                    </AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
        <Button
          type="submit"
          form={formId}
          className="w-full cursor-pointer sm:w-auto"
          disabled={pending}
        >
          {pending ? "Salvando…" : "Salvar skill"}
        </Button>
      </CardFooter>
    </Card>
  );
}
