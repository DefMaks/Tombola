import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Home,
  Check,
  Download,
  Share2,
  LogOut,
  User as UserIcon,
} from "lucide-react";

import logoAsset from "@/assets/lokko-logo-light.png";
import { getPlan, PaymentPlan, PLANS } from "@/lib/Twigapaie";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      orderId: (search.orderId as string) || "LOKKO-DEMO-102",
      planId: (search.planId as string) || "premium.monthly",
      propertyId: (search.propertyId as string) || undefined,
      userId: (search.userId as string) || undefined,
    };
  },
  component: CheckoutSuccessPage,
  head: () => ({
    meta: [
      { title: "Confirmation de Paiement — Lokko Kinshasa" },
      {
        name: "description",
        content: "Votre Pass Visite ou Boost d'Annonce est activé avec succès.",
      },
    ],
  }),
});

function Logo({ className = "h-8" }: { className?: string }) {
  const logoSrc =
    typeof logoAsset === "string"
      ? logoAsset
      : (logoAsset as { url?: string })?.url || logoAsset;
  return (
    <img src={logoSrc} alt="Lokko" className={`object-contain ${className}`} />
  );
}

export function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { orderId, planId, propertyId } = search;
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setUserEmail(data.session.user.email);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    navigate({ to: "/" });
  };

  const plan: PaymentPlan = getPlan(planId) || PLANS[0];
  const isBoost = plan.productType === "boost";

  const handleDownloadReceipt = () => {
    const receiptContent = `================================================
          LOKKO KINSHASA - REÇU DE PAIEMENT
================================================
Référence Transaction : ${orderId}
Formule Activée       : ${plan.label}
Montant Payé          : ${plan.price}
Durée de Validité     : ${plan.durationDays} jours
Annonce Réf           : ${propertyId ? propertyId : "Global / Compte"}
Statut                : Payé & Activé
Date d'émission       : ${new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}

Privilèges Débloqués :
${
  isBoost
    ? "- En tête de liste sur le fil de recherche Kinshasa\n- Épingle Dorée 'Sponsorisée' sur la carte\n- Statistiques de vues & contacts prioritaires"
    : "- Accès illimité aux vidéos HD de visites virtuelles\n- Coordonnées directes des bailleurs\n- 0 FC de commissionnaire"
}

================================================
Merci pour votre confiance sur Lokko Kinshasa !
Support : contact@lokko.cd | www.lokko.cd
================================================`;

    const blob = new Blob([receiptContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Recu_Paiement_Lokko_${orderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Lokko Kinshasa",
          text: `Mon paiement pour ${plan.label} est validé sur Lokko !`,
          url: window.location.href,
        });
        return;
      } catch (e) {
        // Fallback sur le presse-papier si partage annulé
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur px-4 py-3.5 shadow-2xs">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8" />
          </Link>
          <div className="flex items-center gap-2.5">
            {userEmail && (
              <div className="flex items-center gap-2">
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700"
                  title={`Session ouverte (${userEmail})`}
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Se déconnecter"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all cursor-pointer"
                  aria-label="Se déconnecter"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Paiement Validé</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-12">
        <div className="rounded-3xl border border-border bg-white p-8 shadow-md text-center">
          {/* Badge Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <span className="mt-4 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold-deep border border-gold/30">
            Félicitations !
          </span>

          <h1 className="mt-2 text-2xl font-black text-ink font-display">
            {isBoost ? "Boost d'Annonce Activé !" : "Pass Visite Activé !"}
          </h1>

          <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Votre paiement Mobile Money a été traité et vos privilèges sont
            désormais actifs sur votre compte Lokko à Kinshasa.
          </p>

          {/* Receipt Card */}
          <div className="mt-6 rounded-2xl border border-border bg-secondary/50 p-5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Formule Activée
                </span>
                <p className="text-sm font-black text-ink font-display">
                  {plan.label}
                </p>
              </div>
              <span className="text-lg font-black text-gold-deep font-display">
                {plan.price}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block">
                  Réf. Transaction :
                </span>
                <span className="font-mono font-bold text-ink">{orderId}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Durée de validité :
                </span>
                <span className="font-bold text-ink">
                  {plan.durationDays} jours
                </span>
              </div>
              {propertyId && (
                <div className="col-span-2 pt-1">
                  <span className="text-muted-foreground block">
                    Annonce boostée :
                  </span>
                  <span className="font-bold text-gold-deep">
                    Réf {propertyId} (Kinshasa Gombe)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Unlocked Advantages List */}
          <div className="mt-6 text-left space-y-2 rounded-2xl bg-gold/10 p-4 border border-gold/30">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gold-deep flex items-center gap-1.5 mb-2">
              {isBoost ? (
                <Sparkles className="h-4 w-4 text-gold-deep" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-gold-deep" />
              )}
              Privilèges débloqués :
            </h3>
            {isBoost ? (
              <>
                <div className="flex items-center gap-2 text-xs text-ink font-medium">
                  <Check className="h-4 w-4 text-gold-deep shrink-0" />
                  <span>En tête de liste sur le fil de recherche Kinshasa</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink font-medium">
                  <Check className="h-4 w-4 text-gold-deep shrink-0" />
                  <span>
                    Épingle Dorée "Sponsorisée" sur la carte interactive
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink font-medium">
                  <Check className="h-4 w-4 text-gold-deep shrink-0" />
                  <span>Statistiques de vue & contacts prioritaires</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-ink font-medium">
                  <Check className="h-4 w-4 text-gold-deep shrink-0" />
                  <span>
                    Accès illimité aux vidéos de visites virtuelles HD
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink font-medium">
                  <Check className="h-4 w-4 text-gold-deep shrink-0" />
                  <span>
                    Coordonnées directes des bailleurs & locataires sortants
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink font-medium">
                  <Check className="h-4 w-4 text-gold-deep shrink-0" />
                  <span>0 FC de commissionnaire sur toutes vos visites</span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Link
              to="/"
              className="w-full rounded-2xl bg-gold hover:bg-gold-deep text-ink font-black py-4 px-6 text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01]"
            >
              <Home className="h-4 w-4" />
              <span>Accéder aux Logements & Annonces</span>
            </Link>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="flex-1 rounded-xl border border-border bg-white hover:bg-secondary py-2.5 text-xs font-bold text-ink flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
              >
                <Download className="h-3.5 w-3.5" /> Télécharger Reçu PDF
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 rounded-xl border border-border bg-white hover:bg-secondary py-2.5 text-xs font-bold text-ink flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Lien
                    copié !
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" /> Partager
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CheckoutSuccessPage;
