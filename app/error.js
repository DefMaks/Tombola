'use client';

export default function Error({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h2 className="text-2xl font-black mb-2">Une erreur est survenue</h2>
      <p className="text-muted-foreground text-sm mb-6">{error?.message || "Erreur inattendue"}</p>
      <button onClick={() => reset()} className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm">
        Réessayer
      </button>
    </div>
  );
}
