'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="fr">
      <body className="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4 p-6 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold">
            🥊
          </div>
          <h2 className="text-lg font-black text-white">Punchy se recharge</h2>
          <p className="text-xs text-slate-400">
            Une erreur de session est survenue. Cliquez ci-dessous pour recharger l&apos;application en toute sécurité.
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
          >
            Recharger Punchy
          </button>
        </div>
      </body>
    </html>
  );
}
