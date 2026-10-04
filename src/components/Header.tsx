import { GraduationCap, Send } from 'lucide-react';

export function Header({ onHome }: { onHome: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onHome}
          className="flex items-center gap-2.5 transition active:scale-95"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold text-white leading-tight">
              Quantica Digital
            </h1>
            <p className="text-[10px] text-slate-400 leading-tight">
              Learning Platform
            </p>
          </div>
        </button>

        <a
          href="https://t.me/studytrackerpro"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-sky-400 hover:to-blue-400 active:scale-95 sm:text-sm"
        >
          <Send className="h-4 w-4" />
          <span className="hidden xs:inline sm:inline">Join Telegram</span>
          <span className="xs:hidden sm:hidden">Join</span>
        </a>
      </div>
    </header>
  );
}
