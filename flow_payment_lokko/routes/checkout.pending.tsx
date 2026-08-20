import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
  Loader2,
  LogOut,
  User as UserIcon,
} from "lucide-react";

import logoAsset from "@/assets/lokko-logo-light.png";
import { supabase } from "@/lib/supabase";
import {
  getPlan,
  verifyPayment,
  PaymentStatus,
  PaymentPlan,
  isDev,
} from "@/lib/Twigapaie";

export const Route = createFileRoute("/checkout/pending")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      orderId: (search.orderId as string) || (search.order_id as string) || "",
      phone: (search.phone as string) || "",
      operator: (search.operator as string) || "mpesa",
      planId: (search.planId as string) || "premium.monthly",
      propertyId: (search.propertyId as string) || undefined,
      userId: (search.userId as string) || undefined,
    };
  },
  component: CheckoutPendingPage,
  head: () => ({
    meta: [
      { title: "Validation USSD en cours — Lokko Kinshasa" },
      {
        name: "description",
        content:
          "Validez la demande de paiement Mobile Money sur votre téléphone.",
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

export function CheckoutPendingPage() {
  const navigate = useNavigate();
  const rawSearch = Route.useSearch();

  // Extraction sécurisée des paramètres d'URL avec fallback window.location
  const getParam = (key: string, fallback: string = "") => {
    if (rawSearch && rawSearch[key as keyof typeof rawSearch]) {
      return String(rawSearch[key as keyof typeof rawSearch]);
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const val = params.get(key);
      if (val) return val;
    }
    return fallback;
  };

  const orderId =
    getParam("orderId") || getParam("order_id") || rawSearch.orderId || "";
  const phone = getParam("phone", rawSearch.phone);
  const operator = getParam("operator", rawSearch.operator || "mpesa");
  const planId = getParam("planId", rawSearch.planId || "premium.monthly");
  const propertyId = getParam("propertyId", rawSearch.propertyId || "");
  const userId = getParam("userId", rawSearch.userId || "");

  const plan: PaymentPlan | undefined = getPlan(planId);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [countdown, setCountdown] = useState<number>(45);
  const [logs, setLogs] = useState<string[]>([]);
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
    navigate({ to: "/checkout" });
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [
      ...prev.slice(-4),
      `${new Date().toLocaleTimeString()} - ${msg}`,
    ]);
  };

  const getOperatorName = (op: string) => {
    const map: Record<string, string> = {
      mpesa: "M-Pesa (Vodacom)",
      airtel: "Airtel Money",
      orange: "Orange Money",
      africell: "Africell AfriMoney",
    };
    return map[op?.toLowerCase()] || op?.toUpperCase() || "Mobile Money";
  };

  const operatorName = getOperatorName(operator);

  useEffect(() => {
    // 1. Log immédiat au montage du composant
    console.log("📌 Pending Checkout monté avec params :", {
      orderId,
      phone,
      operator,
      planId,
      propertyId,
      userId,
    });
    addLog(
      `Params reçus: orderId=${orderId || "NON SPÉCIFIÉ"}, phone=${phone || "n/a"}`,
    );

    // 2. Déclenchement automatique du polling
    if (!orderId) {
      console.error("❌ orderId manquant dans l'URL !");
      addLog("❌ OrderID manquant !");
      setStatus("failed");
      return;
    }

    let mounted = true;
    let attemptsCount = 0;
    const maxAttempts = 25;
    const intervalMs = 3000;

    async function poll() {
      console.log("🔄 Début de la vérification pour :", orderId);
      addLog(`Début du polling...`);

      // Récupération stricte de l'UUID utilisateur Supabase Auth avant de lancer la boucle
      let activeUserId = userId || "";
      if (!activeUserId) {
        console.log(
          "🔍 userId non fourni dans l'URL, interrogation de la session Supabase...",
        );
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          activeUserId = sessionData.session.user.id;
        } else {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            activeUserId = userData.user.id;
          }
        }
      }

      if (!activeUserId) {
        console.error(
          "❌ Impossible de déterminer un userId valide avant la vérification du paiement !",
        );
        addLog("❌ userId introuvable.");
        setStatus("failed");
        return;
      }

      console.log(
        "👤 UUID Utilisateur valide identifié pour la vérification :",
        activeUserId,
      );

      try {
        while (mounted && attemptsCount < maxAttempts) {
          attemptsCount++;
          console.log(
            "🔄 Tentative de vérification pour :",
            orderId,
            `(${attemptsCount}/${maxAttempts})`,
          );
          addLog(`Tentative #${attemptsCount}...`);

          try {
            const currentStatus = await verifyPayment(orderId, {
              planId,
              propertyId,
              userId: activeUserId,
            });
            console.log(`📡 Statut reçu :`, currentStatus);

            if (!mounted) break;

            if (currentStatus === "success") {
              console.log("✅ Paiement Confirmé !");
              addLog("✅ Paiement confirmé ! Redirection...");
              setStatus("success");
              setTimeout(() => {
                if (mounted) {
                  navigate({
                    to: "/checkout/success",
                    search: {
                      orderId,
                      planId,
                      propertyId,
                      userId: activeUserId,
                    },
                  });
                }
              }, 1200);
              return;
            }

            if (currentStatus === "failed" || currentStatus === "cancelled") {
              console.warn(`⚠️ Statut échec/annulé : ${currentStatus}`);
              addLog(`⚠️ Statut : ${currentStatus}`);
              setStatus(currentStatus);
              return;
            }
          } catch (error) {
            console.error("❌ Erreur pendant le polling :", error);
            addLog(`Erreur réseau/API tentative #${attemptsCount}`);
          }

          // Attente avant la prochaine tentative
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        if (mounted && attemptsCount >= maxAttempts) {
          console.warn("⏱️ Délai d'attente expiré.");
          addLog("⏱️ Délai expiré.");
          setStatus("timeout");
        }
      } catch (globalErr) {
        console.error("❌ Erreur pendant le polling :", globalErr);
        addLog(`❌ Erreur fatale polling: ${String(globalErr)}`);
        if (mounted) setStatus("failed");
      }
    }

    poll();

    // Timer visuel de compte à rebours
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [orderId, phone, operator, planId, propertyId, userId, navigate]);

  return (
    <div className="min-h-screen bg-background text-ink font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur px-4 py-3.5 shadow-2xs">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            to="/checkout"
            search={{ planId, propertyId }}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Modifier la commande</span>
          </Link>
          <div className="flex items-center gap-2">
            <Logo className="h-8" />
          </div>
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
            <div className="flex items-center gap-1.5 text-xs font-bold text-gold-deep bg-gold/15 px-3 py-1 rounded-full border border-gold/30">
              <Clock className="h-3.5 w-3.5 text-gold-deep" />
              <span>Paiement USSD</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-10">
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-md text-center">
          {/* Visual Indicator */}
          {status === "pending" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gold/10 border-4 border-gold/30 relative">
              <div className="absolute inset-0 rounded-full border-4 border-gold border-t-transparent animate-spin" />
              <Smartphone className="h-10 w-10 text-gold-deep animate-pulse" />
            </div>
          )}

          {status === "success" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 border-4 border-emerald-200">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
          )}

          {(status === "failed" || status === "cancelled") && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 border-4 border-destructive/20">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
          )}

          {status === "timeout" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-secondary border-4 border-border">
              <Clock className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Title */}
          <h1 className="mt-6 text-2xl font-black text-ink font-display">
            {status === "pending" && `Paiement ${operatorName} en cours...`}
            {status === "success" && "Paiement réussi !"}
            {status === "failed" && "Échec de la transaction"}
            {status === "cancelled" && "Paiement annulé"}
            {status === "timeout" && "Délai d'attente expiré"}
          </h1>

          {/* Status Message & Instructions */}
          {status === "pending" && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-gold/10 p-4 border border-gold/30 text-ink text-sm leading-relaxed text-left">
                <p className="font-medium">
                  Un message de confirmation a été envoyé au{" "}
                  <strong className="font-black text-gold-deep">
                    {phone || "numéro indiqué"}
                  </strong>
                  . Veuillez valider avec votre code PIN.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Opérateur sélectionné : <strong>{operatorName}</strong>
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-ink bg-secondary py-2.5 px-4 rounded-xl border border-border">
                <Loader2 className="h-4 w-4 text-gold-deep animate-spin" />
                <span>Statut : Vérification en cours... ({countdown}s)</span>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Votre paiement a été confirmé avec succès par le réseau{" "}
                {operatorName}. Redirection vers votre reçu...
              </p>
            </div>
          )}

          {(status === "failed" || status === "cancelled") && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {!orderId
                  ? "Aucun numéro de commande valide n'a été fourni."
                  : "La transaction n'a pas pu être finalisée. Cela peut arriver en cas de solde insuffisant ou d'annulation du code PIN."}
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/checkout",
                    search: { planId, propertyId },
                  })
                }
                className="w-full rounded-2xl bg-gold hover:bg-gold-deep text-ink font-black py-3.5 px-6 text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Réessayer le paiement
              </button>
            </div>
          )}

          {status === "timeout" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Le délai a expiré. Si vous avez déjà entré votre code PIN, votre
                paiement sera validé sous peu.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/checkout/success",
                      search: {
                        orderId,
                        planId,
                        propertyId,
                        userId: userId || undefined,
                      },
                    })
                  }
                  className="w-full rounded-2xl bg-ink hover:bg-ink/90 text-white font-black py-3.5 px-6 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  Vérifier mon reçu
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/checkout",
                      search: { planId, propertyId },
                    })
                  }
                  className="w-full rounded-2xl border border-border bg-white hover:bg-secondary text-ink font-bold py-3 px-6 text-sm cursor-pointer"
                >
                  Réessayer le paiement
                </button>
              </div>
            </div>
          )}

          {/* Details Card */}
          {plan && (
            <div className="mt-6 pt-5 border-t border-border/60 text-left space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Réf. Commande :</span>
                <span className="font-mono font-bold text-ink">
                  {orderId || "Non spécifiée"}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Offre sélectionnée :</span>
                <span className="font-bold text-ink">{plan.label}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Opérateur :</span>
                <span className="font-bold text-ink">{operatorName}</span>
              </div>
            </div>
          )}

          {/* Debug Box */}
          {isDev() && (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-slate-50 p-3.5 text-left font-mono text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                <span>🔍 Affichage de Debug</span>
              </div>
              <div>
                <strong>OrderID:</strong> {orderId || "(non spécifié)"}
              </div>
              <div>
                <strong>Téléphone:</strong> {phone || "(non spécifié)"}
              </div>
              <div>
                <strong>Opérateur:</strong> {operatorName} ({operator})
              </div>
              <div>
                <strong>PlanID:</strong> {planId}
              </div>
              <div>
                <strong>Statut:</strong>{" "}
                <span className="font-bold text-gold-deep">{status}</span>
              </div>
              {logs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200/80 text-[10px] space-y-0.5 text-slate-500">
                  <div className="font-semibold text-slate-700">
                    Dernières étapes :
                  </div>
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CheckoutPendingPage;
