import { AuthSplitLayout } from "@/frontend/components/templates/auth-split-layout";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthSplitLayout>{children}</AuthSplitLayout>;
}
