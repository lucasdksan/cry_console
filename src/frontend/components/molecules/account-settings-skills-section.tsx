"use client";

import { useMemo, useState } from "react";

import { USER_AGENT_SKILL_MAX_COUNT } from "@/backend/lib/agent/skill";
import type { UserAgentSkillPublic } from "@/backend/models/user-agent-skill.model";
import { AccountSettingsSkillCard } from "@/frontend/components/molecules/account-settings-skill-card";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type AccountSettingsSkillsSectionProps = {
  data: UserAgentSkillPublic[];
  onSkillsChange?: (skills: UserAgentSkillPublic[]) => void;
};

export function AccountSettingsSkillsSection({
  data,
  onSkillsChange,
}: AccountSettingsSkillsSectionProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const atLimit = data.length >= USER_AGENT_SKILL_MAX_COUNT;

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [data],
  );

  function handleSkillsChange(skills: UserAgentSkillPublic[]) {
    onSkillsChange?.(skills);
    setCreating(false);
    setEditingId(null);
  }

  if (creating) {
    return (
      <AccountSettingsSkillCard
        onSkillsChange={handleSkillsChange}
        onCancelCreate={() => setCreating(false)}
      />
    );
  }

  if (editingId) {
    const skill = sorted.find((s) => s.id === editingId);
    if (!skill) {
      return null;
    }
    return (
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit cursor-pointer px-0 text-muted-foreground"
          onClick={() => setEditingId(null)}
        >
          ← Voltar à lista
        </Button>
        <AccountSettingsSkillCard
          skill={skill}
          onSkillsChange={handleSkillsChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sorted.length === 0 ? (
        <Card className="border-dashed border-border bg-card/50">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Nenhuma skill
            </CardTitle>
            <CardDescription>
              Crie workflows com /slug no agente — instruções e gráficos com
              dados VTEX, GA4, Search Console e Clarity já salvos na loja.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((skill) => (
            <li key={skill.id}>
              <button
                type="button"
                onClick={() => setEditingId(skill.id)}
                className="flex w-full cursor-pointer flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card/80 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="font-medium text-foreground">{skill.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  /{skill.slug}
                </span>
                {skill.metricKeys.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {skill.metricKeys.length} métrica(s) no gráfico
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Só instrução (sem gráfico)
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        disabled={atLimit}
        onClick={() => setCreating(true)}
      >
        {atLimit
          ? `Limite de ${USER_AGENT_SKILL_MAX_COUNT} skills`
          : "Nova skill"}
      </Button>
    </div>
  );
}
