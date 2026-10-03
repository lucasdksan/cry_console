"use client";

import { useActionState } from "react";

import {
  deleteWorkspace,
  type WorkspaceActionState,
} from "@/backend/controllers/workspace.controller";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type WorkspaceDeleteZoneProps = {
  workspaceId: string;
  workspaceName: string;
};

export function WorkspaceDeleteZone({
  workspaceId,
  workspaceName,
}: WorkspaceDeleteZoneProps) {
  const [deleteState, deleteAction, deleting] = useActionState<
    WorkspaceActionState,
    FormData
  >(deleteWorkspace, {});

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Zona de perigo</CardTitle>
        <CardDescription>
          Remove a loja e todas as credenciais cifradas associadas.
        </CardDescription>
      </CardHeader>
      {deleteState.error ? (
        <p className="px-6 pb-2 text-sm text-destructive">{deleteState.error}</p>
      ) : null}
      <div className="px-6 pb-6">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button type="button" variant="destructive" disabled={deleting} />
            }
          >
            Excluir loja
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir {workspaceName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={deleteAction}>
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <AlertDialogAction type="submit" variant="destructive">
                  Excluir
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
