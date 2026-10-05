const ALLOWED_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json"]);
export const AGENT_ATTACHMENT_MAX_FILES = 4;
export const AGENT_ATTACHMENT_MAX_BYTES = 100_000;

export type AgentTextAttachment = {
  name: string;
  content: string;
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function isAllowedAgentAttachment(name: string): boolean {
  return ALLOWED_EXTENSIONS.has(extensionOf(name));
}

export async function readAgentTextAttachments(
  fileList: FileList | File[],
): Promise<{ attachments: AgentTextAttachment[]; error?: string }> {
  const files = Array.from(fileList);
  if (files.length > AGENT_ATTACHMENT_MAX_FILES) {
    return {
      attachments: [],
      error: `Envie no máximo ${AGENT_ATTACHMENT_MAX_FILES} arquivos.`,
    };
  }

  const attachments: AgentTextAttachment[] = [];
  let totalBytes = 0;

  for (const file of files) {
    if (!isAllowedAgentAttachment(file.name)) {
      return {
        attachments: [],
        error: "Use arquivos .txt, .md, .csv ou .json.",
      };
    }
    const content = await file.text();
    totalBytes += content.length;
    if (totalBytes > AGENT_ATTACHMENT_MAX_BYTES) {
      return {
        attachments: [],
        error: "Anexos excedem 100 KB no total.",
      };
    }
    attachments.push({ name: file.name, content });
  }

  return { attachments };
}

export function appendAttachmentsToMessage(
  text: string,
  attachments: AgentTextAttachment[],
): string {
  if (attachments.length === 0) {
    return text;
  }
  const blocks = attachments.map(
    (file) => `[Anexo: ${file.name}]\n${file.content.trim()}`,
  );
  return [text.trim(), ...blocks].filter(Boolean).join("\n\n");
}

export function splitUserMessageAttachments(content: string): {
  body: string;
  attachmentNames: string[];
} {
  const parts = content.split(/\n\n(?=\[Anexo: )/);
  const attachmentNames: string[] = [];
  const bodyParts: string[] = [];
  for (const part of parts) {
    const match = part.match(/^\[Anexo: (.+?)\]\n([\s\S]*)$/);
    if (match) {
      attachmentNames.push(match[1]!);
    } else {
      bodyParts.push(part);
    }
  }
  return { body: bodyParts.join("\n\n").trim(), attachmentNames };
}
