import Image from "next/image";

import { AuthHeroPanel } from "@/frontend/components/organisms/auth-hero-panel";

type AuthSplitLayoutProps = {
  children: React.ReactNode;
};

const mobileBackdrop =
  "bg-[#080c14] bg-[radial-gradient(circle_at_20%_25%,rgba(225,29,72,0.5)_0%,transparent_50%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.4)_0%,transparent_45%),linear-gradient(180deg,#0f172a_0%,#13131b_100%)]";

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_min(28rem,40vw)] xl:grid-cols-[minmax(0,1fr)_32rem]">
      <div className={`relative overflow-hidden lg:hidden ${mobileBackdrop}`}>
        <div className="relative flex items-center justify-center px-6 py-8">
          <Image
            src="/brand/logo/signet.svg"
            alt="Cry Console"
            width={96}
            height={96}
            className="size-20"
            priority
            unoptimized
          />
        </div>
      </div>
      <AuthHeroPanel />
      <div className="flex min-h-dvh flex-col justify-center border-border/40 px-5 py-8 sm:px-8 sm:py-10 lg:border-l lg:px-10 lg:py-12 xl:px-12">
        <div className="ml-auto w-full max-w-md lg:max-w-none">{children}</div>
      </div>
    </div>
  );
}
