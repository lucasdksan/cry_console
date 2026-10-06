"use client";

import * as React from "react";
import { Bot, Sparkles, User } from "lucide-react";

import { fetchAccountAgentSkills } from "@/backend/controllers/agent-skill.controller";
import { fetchAccountAiProviders } from "@/backend/controllers/account-settings.controller";
import type { UserAgentSkillPublic } from "@/backend/models/user-agent-skill.model";
import type { UserAiProvidersPublic } from "@/backend/models/user-ai-provider.model";
import { AccountSettingsSkillsSection } from "@/frontend/components/molecules/account-settings-skills-section";
import { AccountSettingsAccountSection } from "@/frontend/components/molecules/account-settings-account-section";
import { AccountSettingsProvidersSection } from "@/frontend/components/molecules/account-settings-providers-section";
import {
  AccountSettingsDialog,
  type AccountSettingsSection,
} from "@/frontend/components/organisms/account-settings-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/frontend/components/ui/avatar";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { useSidebar } from "@/frontend/components/ui/sidebar";
import { cn } from "@/frontend/lib/utils";

const EMPTY_PROVIDERS: UserAiProvidersPublic = {
  providers: [],
  availableToAdd: [],
};

const EMPTY_SKILLS: UserAgentSkillPublic[] = [];

function ProvidersSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border bg-card/80">
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

type AccountSettingsSessionTriggerProps = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export function AccountSettingsSessionTrigger({
  email,
  name,
  image,
}: AccountSettingsSessionTriggerProps) {
  const [open, setOpen] = React.useState(false);
  const [providersData, setProvidersData] =
    React.useState<UserAiProvidersPublic>(EMPTY_PROVIDERS);
  const [providersLoading, setProvidersLoading] = React.useState(false);
  const [providersError, setProvidersError] = React.useState<string | null>(
    null,
  );
  const [skillsData, setSkillsData] =
    React.useState<UserAgentSkillPublic[]>(EMPTY_SKILLS);
  const [skillsLoading, setSkillsLoading] = React.useState(false);
  const [skillsError, setSkillsError] = React.useState<string | null>(null);
  const { isMobile, setOpenMobile } = useSidebar();

  const loadProviders = React.useCallback(async () => {
    setProvidersLoading(true);
    setProvidersError(null);

    try {
      const data = await fetchAccountAiProviders();
      setProvidersData(data);
    } catch {
      setProvidersError("Não foi possível carregar os provedores de IA.");
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  const loadSkills = React.useCallback(async () => {
    setSkillsLoading(true);
    setSkillsError(null);
    try {
      const data = await fetchAccountAgentSkills();
      setSkillsData(data);
    } catch {
      setSkillsError("Não foi possível carregar as skills.");
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  async function openSettings() {
    if (isMobile) {
      setOpenMobile(false);
    }
    setOpen(true);
    await Promise.all([loadProviders(), loadSkills()]);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setOpen(false);
    }
  }

  const sections = React.useMemo<AccountSettingsSection[]>(() => {
    const providersContent = providersLoading ? (
      <ProvidersSectionSkeleton />
    ) : providersError ? (
      <Card className="border-destructive/30 bg-card/80">
        <CardHeader>
          <CardTitle className="font-heading text-base text-destructive">
            Falha ao carregar
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {providersError}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => void loadProviders()}
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    ) : (
      <AccountSettingsProvidersSection
        data={providersData}
        onProvidersChange={setProvidersData}
      />
    );

    const skillsContent = skillsLoading ? (
      <ProvidersSectionSkeleton />
    ) : skillsError ? (
      <Card className="border-destructive/30 bg-card/80">
        <CardHeader>
          <CardTitle className="font-heading text-base text-destructive">
            Falha ao carregar
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {skillsError}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => void loadSkills()}
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    ) : (
      <AccountSettingsSkillsSection
        data={skillsData}
        onSkillsChange={setSkillsData}
      />
    );

    return [
      {
        id: "account",
        label: "Conta",
        description: "Dados da sua sessão e identidade no Cry Console.",
        icon: User,
        content: (
          <AccountSettingsAccountSection
            email={email}
            name={name}
            image={image}
          />
        ),
      },
      {
        id: "providers",
        label: "Provedores",
        description: "Tokens de acesso por provedor de IA.",
        icon: Bot,
        content: providersContent,
      },
      {
        id: "skills",
        label: "Skills",
        description: "Workflows /slug no agente com gráficos da loja.",
        icon: Sparkles,
        content: skillsContent,
      },
    ];
  }, [
    email,
    image,
    loadProviders,
    loadSkills,
    name,
    providersData,
    providersError,
    providersLoading,
    skillsData,
    skillsError,
    skillsLoading,
  ]);

  return (
    <>
      <button
        type="button"
        onClick={() => void openSettings()}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Avatar size="sm">
          {image ? (
            <AvatarImage src={image} alt={name ?? email ?? "Usuário"} />
          ) : null}
          <AvatarFallback>
            <User aria-hidden />
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          {name ? (
            <span className="truncate text-sm font-medium text-foreground">
              {name}
            </span>
          ) : null}
          <span className="truncate text-xs text-muted-foreground">
            {email ?? "Conta"}
          </span>
        </div>
      </button>
      <AccountSettingsDialog
        open={open}
        onOpenChange={handleOpenChange}
        sections={sections}
      />
    </>
  );
}
