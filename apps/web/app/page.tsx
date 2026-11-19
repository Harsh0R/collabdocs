
import Link from "next/link";

const features = [
  {
    number: "01",
    icon: "✦",
    title: "Real-time collaboration",
    description:
      "Write together with your team. See changes appear instantly as everyone works on the same document.",
  },
  {
    number: "02",
    icon: "◈",
    title: "Powerful document sharing",
    description:
      "Invite teammates and share documents with clear EDITOR and VIEWER permissions.",
  },
  {
    number: "03",
    icon: "↺",
    title: "Version history",
    description:
      "Keep track of document snapshots, preview previous versions, and restore when needed.",
  },
  {
    number: "04",
    icon: "⌘",
    title: "Always in sync",
    description:
      "Collaborate through a real-time synchronization layer powered by modern web technologies.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a document",
    description: "Start with a blank document and bring your ideas into one shared workspace.",
  },
  {
    number: "02",
    title: "Invite your team",
    description: "Share access with teammates and decide who can view or edit.",
  },
  {
    number: "03",
    title: "Build together",
    description: "See edits in real time and keep your team's work moving forward.",
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
        C
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">
        Collab<span className="text-indigo-400">Docs</span>
      </span>
    </Link>
  );
}

function EditorPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="absolute -inset-8 rounded-[40px] bg-indigo-500/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>

          <div className="hidden text-xs text-slate-500 sm:block">
            collabdocs / product-strategy
          </div>

          <div className="flex -space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#111827] bg-indigo-500 text-[10px] font-bold text-white">
              H
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#111827] bg-emerald-500 text-[10px] font-bold text-white">
              A
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#111827] bg-pink-500 text-[10px] font-bold text-white">
              S
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#111827] bg-slate-700 text-[9px] text-white">
              +2
            </div>
          </div>
        </div>

        <div className="grid min-h-[340px] md:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-white/10 p-5 md:block">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>

            <div className="mb-5 space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-indigo-300">
                <span>▦</span> My documents
              </div>
              <div className="flex items-center gap-2">
                <span>◷</span> Recent
              </div>
                <div className="flex items-center gap-2">
                <span>♧</span> Shared with me
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                Recent files
              </p>
              <div className="space-y-3 text-xs text-slate-400">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-indigo-400">▤</span> Product Strategy
                </div>
                <div className="flex items-center gap-2">
                  <span>▤</span> Team Roadmap
                </div>
                <div className="flex items-center gap-2">
                  <span>▤</span> Meeting Notes
                </div>
              </div>
            </div>
          </aside>

          <div className="p-5 sm:p-8 md:p-10">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
                  Last edited just now
                </p>
                <p className="text-xs text-slate-400">
                  Product Strategy
                </p>
              </div>
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-medium text-emerald-300">
                ● Live collaboration
              </span>
            </div>

            <div className="mx-auto max-w-xl">
              <h3 className="mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Building something
                <br />
                <span className="text-indigo-400">great together.</span>
              </h3>

              <p className="mb-7 text-xs leading-6 text-slate-400 sm:text-sm">
                Great products are built through great collaboration.
                Bring your team's ideas together and turn them into
                meaningful progress.
              </p>

              <div className="mb-6 space-y-3">
                <div className="h-2 w-full rounded-full bg-slate-700/70" />
                <div className="h-2 w-[94%] rounded-full bg-slate-700/70" />
                <div className="h-2 w-[82%] rounded-full bg-slate-700/70" />
              </div>

              <div className="relative rounded-xl border border-indigo-400/20 bg-indigo-400/5 p-4">
                <div className="absolute -top-3 right-5 rounded-md bg-indigo-500 px-2 py-1 text-[9px] font-medium text-white">
                  Alex is editing
                </div>
                <p className="text-xs leading-6 text-slate-300">
                  Our next milestone is to create a workspace where every
                  team member can contribute, share feedback, and stay
                  aligned.
                  <span className="ml-1 inline-block h-4 w-0.5 translate-y-1 animate-pulse bg-indigo-400" />
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] text-slate-500">
                  All changes saved
                </span>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] text-slate-400">Alex</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-slate-400">Harsh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080B14] text-white">
      {/* Navigation */}
      <header className="relative z-20 border-b border-white/[0.06]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo />

          <div className="hidden items-center gap-9 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
            <a href="#technology" className="transition hover:text-white">Technology</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
            >
              Get started <span className="ml-1">↗</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-24 pt-24 sm:px-8 sm:pt-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-600/[0.13] blur-[130px]" />

        <div className="relative mx-auto max-w-7xl text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[0.07] px-4 py-2 text-xs font-medium text-indigo-300">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            A better way to work together
            <span>✦</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">
            Your team's ideas,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              all in one place.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Create documents, collaborate in real time, and bring your
            team's best ideas to life. Work better, together, with CollabDocs.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group rounded-xl bg-indigo-500 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-400"
            >
              Start collaborating
              <span className="ml-2 transition group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              Explore features
            </a>
          </div>

          <p className="mt-5 text-xs text-slate-500">
            Create an account and start building together.
          </p>

          <div className="mt-20 sm:mt-24">
            <EditorPreview />
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-9 gap-y-4 text-xs text-slate-500">
            <span>✦ Real-time editing</span>
            <span>◈ Secure sharing controls</span>
            <span>↺ Version history</span>
            <span>⌘ Collaborative workspace</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/[0.06] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">
              Everything in sync
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Less switching.
              <br />
              <span className="text-slate-500">More creating.</span>
            </h2>
            <p className="mt-5 leading-7 text-slate-400">
              Everything your team needs to create, organize, and collaborate
              on documents in one focused workspace.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.number}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-indigo-400/30 hover:bg-indigo-400/[0.05]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-2xl text-indigo-400">{feature.icon}</span>
                  <span className="text-xs text-slate-600">{feature.number}</span>
                </div>
                <h3 className="mb-3 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-y border-white/[0.06] bg-[#0C1020] px-5 py-24 sm:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">
              Simple by design
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              From first thought
              <br />
              to shared progress.
            </h2>
            <p className="mt-5 leading-7 text-slate-400">
              Get your team working together in three simple steps.
            </p>
          </div>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <span className="mb-6 block text-5xl font-semibold tracking-tight text-indigo-400/40">
                  {step.number}
                </span>
                <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
                <p className="max-w-sm text-sm leading-7 text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section id="technology" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.12] via-[#111827] to-[#111827] p-8 sm:p-14">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                Built with modern technology
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                A modern foundation
                <br />
                for teamwork.
              </h2>
              <p className="mt-5 leading-7 text-slate-400">
                CollabDocs brings together a modern web stack and
                real-time collaboration technologies to power a shared
                document experience.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {["Next.js", "TypeScript", "Node.js", "PostgreSQL", "Redis", "WebSockets", "Yjs", "Tiptap"].map((tech) => (
                <span
                  key={tech}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-medium text-slate-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-28 pt-8 sm:px-8">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-indigo-400/20 bg-[#11172A] px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />

          <div className="relative">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
              Your workspace is waiting
            </p>
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Great work starts with
              <span className="text-indigo-400"> working together.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-400">
              Bring your team together, share your ideas, and create
              something meaningful with CollabDocs.
            </p>
            <Link
              href="/login"
              className="mt-9 inline-flex rounded-xl bg-indigo-500 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-400"
            >
              Get started with CollabDocs →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <Logo />
          <p className="text-center text-xs text-slate-500">
            Built for teams that create together.
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            <Link href="/login" className="transition hover:text-white">
              Sign in
            </Link>
            <Link href="/documents" className="transition hover:text-white">
              Workspace
            </Link>
          </div>
        </div>
        <p className="mt-7 text-center text-[11px] text-slate-600">
          © {new Date().getFullYear()} CollabDocs. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
