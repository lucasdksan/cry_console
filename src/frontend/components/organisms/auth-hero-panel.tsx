import Image from "next/image";

const heroBackdrop =
  "bg-[#080c14] bg-[radial-gradient(circle_at_18%_28%,rgba(225,29,72,0.55)_0%,transparent_48%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.45)_0%,transparent_44%),radial-gradient(circle_at_62%_88%,rgba(251,191,36,0.35)_0%,transparent_42%),linear-gradient(155deg,#0f172a_0%,#1a1033_42%,#0a1220_100%)]";

export function AuthHeroPanel() {
  return (
    <aside
      aria-hidden
      className={`relative hidden overflow-hidden lg:flex lg:min-h-dvh ${heroBackdrop}`}
    >
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-[10%] top-[18%] size-[55%] rotate-12 rounded-full border border-sky-300/20" />
        <div className="absolute bottom-[8%] right-[6%] size-[38%] -rotate-6 rounded-full border border-rose-400/25" />
        <div className="absolute left-[28%] top-[62%] size-[22%] rounded-full border border-amber-300/20" />
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center p-12">
        <Image
          src="/brand/logo/signet.svg"
          alt=""
          width={640}
          height={640}
          unoptimized
          className="size-52 max-w-[min(320px,36vw)] drop-shadow-[0_24px_80px_rgba(56,189,248,0.25)] xl:size-72"
          priority
        />
      </div>
    </aside>
  );
}
