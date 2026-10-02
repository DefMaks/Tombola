'use client';

export default function Error({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-3xl mb-4 border border-amber-500/20">
        🥊
      </div>
      <h2 className="text-xl font-black mb-2 text-foreground">Chargement interrompu</h2>
      <p className="text-muted-foreground text-xs max-w-xs mb-6">
        Une session temporaire a nécessité un rafraîchissement. Cliquez ci-dessous pour reprendre vos tirages.
      </p>
      <button
        onClick={() => {
          if (reset) {
            try { reset(); } catch (e) { window.location.href = '/'; }
          } else {
            window.location.href = '/';
          }
        }}
        className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors"
      >
        Reprendre le round
      </button>
    </div>
  );
}
