import { revalidatePath } from "next/cache";

/** Invalida páginas do agente e o layout privado (menu lateral). */
export function revalidateAgentNav(sessionId?: string): void {
  if (sessionId) {
    revalidatePath(`/agente/${sessionId}`);
  }
  revalidatePath("/agente");
  revalidatePath("/agente", "layout");
}
