import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Check,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  User as UserIcon,
  AlertCircle,
  Building2,
  MapPin,
} from "lucide-react";

import logoAsset from "@/assets/lokko-logo-light.png";
import building from "@/assets/building.jpg";
import {
  PLANS,
  getPlan,
  PaymentPlan,
  initiatePayment,
  isDev,
  detectOperatorFromPhone,
} from "@/lib/Twigapaie";
import { supabase, User } from "@/lib/supabase";
import { MobileOperator } from "@/components/CheckoutModal";
import { getSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/checkout/")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      planId: (search.planId as string) || undefined,
      propertyId: (search.propertyId as string) || undefined,
    };
  },
  component: CheckoutPage,
  head: () =>
    getSeoHead({
      title: "Checkout & Paiement Mobile Money — Lokko Kinshasa",
      description:
        "Paiement sécurisé via M-Pesa, Airtel, Orange, Africell pour vos Pass Visite & Boost d'Annonce.",
      ogTitle: "Checkout & Paiement Mobile Money — Lokko Kinshasa",
      ogDescription:
        "Paiement sécurisé via M-Pesa, Airtel, Orange, Africell pour vos Pass Visite & Boost d'Annonce.",
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

export function CheckoutPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const propertyId = search.propertyId;

  // Filtrage strict :
  // - Si propertyId existe -> Uniquement les formules "boost" (Boost 7j, Boost 30j)
  // - Si propertyId est absent -> Uniquement les formules "premium" (Pass Visite 1 mois, Pass Visite 3 mois)
  const availablePlans = propertyId
    ? PLANS.filter((p) => p.productType === "boost")
    : PLANS.filter((p) => p.productType === "premium");

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    search.planId && availablePlans.some((p) => p.id === search.planId)
      ? search.planId
      : availablePlans[0].id,
  );

  const currentPlan: PaymentPlan =
    availablePlans.find((p) => p.id === selectedPlanId) || availablePlans[0];

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const operator = detectOperatorFromPhone(phone);

  // UI & Loading
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check Supabase Auth session
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        if (data.session?.user) {
          setUser(data.session.user);
          setEmail(data.session.user.email || "");
        } else {
          setUser(null);
        }
        setAuthChecking(false);
      }
    }
    checkAuth();

    const { data: authSub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user || null);
          if (session?.user?.email) setEmail(session.user.email);
        }
      },
    );

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEmail("");
    setPassword("");
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    console.log("🔘 Clic sur le bouton Payer déclenché");
    setAuthError(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      const msg =
        "Veuillez saisir un numéro Mobile Money valide (ex: 0812345678).";
      console.warn("⚠️ Validation téléphone échouée :", cleanPhone);
      setAuthError(msg);
      return;
    }

    if (!operator) {
      const msg =
        "Aucun opérateur mobile n'a été détecté. Veuillez saisir un numéro avec un préfixe valide (ex: 081, 097, 084, 090).";
      console.warn("⚠️ Validation opérateur échouée : aucun opérateur détecté");
      setAuthError(msg);
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Auth check & strictly valid UUID extraction from Supabase Auth
      console.log(
        "🔐 Étape 1: Vérification Authentification & UUID Supabase...",
      );
      let validUserId: string | undefined = undefined;

      if (user) {
        console.log("👤 Utilisateur déjà connecté :", user.email);
        // Force la récupération directe de activeUser.id via supabase.auth.getUser()
        const { data: userData, error: userErr } =
          await supabase.auth.getUser();
        if (userErr || !userData?.user?.id) {
          throw new Error(
            "Session expirée ou invalide. Veuillez vous re-connecter à votre compte.",
          );
        }
        validUserId = userData.user.id;

        // Si l'utilisateur a saisi son mot de passe pour confirmation
        if (password) {
          console.log("🔑 Mot de passe fourni, tentative de validation...");
          const { data: authData, error: signInErr } =
            await supabase.auth.signInWithPassword({
              email: userData.user.email || user.email || email,
              password,
            });

          if (signInErr) {
            console.warn(
              "⚠️ Re-validation du mot de passe échouée :",
              signInErr.message,
            );
            throw new Error(
              "Mot de passe incorrect. Veuillez vérifier votre mot de passe.",
            );
          } else if (authData?.user?.id) {
            validUserId = authData.user.id;
          }
        }
      } else {
        console.log("👤 Utilisateur non connecté, validation du profil...", {
          email,
          authMode,
        });
        if (!email || !email.includes("@")) {
          throw new Error("Veuillez saisir une adresse email valide.");
        }
        if (!password || password.length < 6) {
          throw new Error(
            "Le mot de passe doit contenir au moins 6 caractères.",
          );
        }

        if (authMode === "signup") {
          if (!fullName.trim()) {
            throw new Error("Veuillez indiquer votre nom complet.");
          }
          console.log("📝 Inscription de l'utilisateur...", email);
          const { data: signUpData, error: signUpErr } =
            await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: fullName,
                  phone: cleanPhone,
                },
              },
            });
          if (signUpErr || !signUpData?.user?.id) {
            throw new Error(
              signUpErr?.message || "Erreur lors de la création du compte.",
            );
          }
          // Utilisation stricte de l'ID retourné par signUpData.user.id
          validUserId = signUpData.user.id;
        } else {
          console.log("🔑 Connexion de l'utilisateur...", email);
          const { data: signInData, error: signInErr } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });
          if (signInErr || !signInData?.user?.id) {
            throw new Error(
              signInErr?.message || "Email ou mot de passe incorrect.",
            );
          }
          // Utilisation stricte de l'ID retourné par signInData.user.id
          validUserId = signInData.user.id;
        }
      }

      if (!validUserId) {
        throw new Error(
          "Impossible de récupérer l'identifiant Supabase officiel. Veuillez vous connecter.",
        );
      }

      // Step 2: Initiation TwigaPaie avec l'UUID officiel Supabase Auth
      console.log("🚀 Lancement paiement avec UUID officiel :", validUserId);
      const response = await initiatePayment({
        plan: currentPlan.id,
        phone: cleanPhone,
        propertyId,
        userId: validUserId,
      });

      if (!response || !response.orderId) {
        throw new Error(
          "Réponse d'initiation invalide du serveur de paiement.",
        );
      }

      console.log("✅ Réponse initiation :", response);

      // Step 3: Redirection vers /checkout/pending
      const pendingUrl = `/checkout/pending?orderId=${encodeURIComponent(response.orderId)}&phone=${encodeURIComponent(cleanPhone)}&operator=${encodeURIComponent(operator)}&planId=${encodeURIComponent(currentPlan.id)}${propertyId ? `&propertyId=${encodeURIComponent(propertyId)}` : ""}&userId=${encodeURIComponent(validUserId)}`;

      console.log("🔀 Redirection vers :", pendingUrl);
      window.location.href = pendingUrl;
      return;
    } catch (err: unknown) {
      console.error("❌ ERREUR Checkout :", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erreur de paiement.";
      setAuthError(errorMessage);
      alert(`Erreur de paiement : ${errorMessage}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink font-sans pb-16">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur px-4 py-3.5 shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-ink transition-colors" />
            <Logo className="h-8" />
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700"
                  title={`Session ouverte (${user.email || ""})`}
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
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Paiement Crypté & Sécurisé</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8">
        <div className="mb-8 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-extrabold text-gold-deep border border-gold/30">
            {propertyId ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-gold-deep" />
                <span>Boost d'Annonce Kinshasa</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-gold-deep" />
                <span>Abonnement Pass Visite Lokko</span>
              </>
            )}
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl font-display">
            Finaliser votre commande
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {propertyId
              ? "Propulsez votre logement en tête de liste et captez 5x plus de demandes."
              : "Bénéficiez d'un accès illimité aux vidéos & coordonnées directes des propriétaires sans commissionnaire."}
          </p>
        </div>

        <form
          onSubmit={handleSubmitPayment}
          className="grid grid-cols-1 gap-8 lg:grid-cols-12"
        >
          {/* Main Left Form Column */}
          <div className="space-y-6 lg:col-span-7">
            {/* SECTION 1: AUTH GUARD */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-ink font-black text-sm shadow-xs">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-ink font-display">
                      Compte & Authentification
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Vérification de la session Supabase avant le débit
                    </p>
                  </div>
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-xl border border-destructive/20 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                )}
              </div>

              <div className="mt-5">
                {authChecking ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                    <span>Vérification de votre profil...</span>
                  </div>
                ) : user ? (
                  /* CAS A : Utilisateur connecté */
                  <div className="space-y-4">
                    <div className="rounded-xl bg-secondary p-3.5 border border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/20 text-gold-deep font-bold">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">
                            Compte actif
                          </p>
                          <p className="text-sm font-bold text-ink">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                        Connecté
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        Email du compte
                      </label>
                      <input
                        type="email"
                        value={user.email || ""}
                        disabled
                        className="mt-1 w-full rounded-xl border border-border bg-secondary/80 px-3.5 py-2.5 text-sm font-semibold text-muted-foreground cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        Confirmez votre mot de passe pour valider l'achat{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Entrez votre mot de passe"
                          required
                          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-ink focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Mesure de sécurité pour associer directement l'achat à
                        votre compte Lokko.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* CAS B : Utilisateur non connecté / Invité */
                  <div className="space-y-4">
                    <div className="flex rounded-xl bg-secondary p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setAuthError(null);
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          authMode === "signup"
                            ? "bg-white text-ink shadow-2xs"
                            : "text-muted-foreground hover:text-ink"
                        }`}
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Créer un compte
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError(null);
                        }}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          authMode === "login"
                            ? "bg-white text-ink shadow-2xs"
                            : "text-muted-foreground hover:text-ink"
                        }`}
                      >
                        <LogIn className="h-3.5 w-3.5" /> Se connecter
                      </button>
                    </div>

                    {authMode === "signup" && (
                      <div>
                        <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                          Nom complet
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: Patrick Kabamba"
                          required
                          className="mt-1 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        Adresse e-mail{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre.email@exemple.com"
                        required
                        className="mt-1 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                        Mot de passe <span className="text-destructive">*</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 caractères"
                          required
                          className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-ink focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Votre compte Lokko sera automatiquement créé pour
                        conserver votre privilège.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: MOBILE MONEY */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-border/60 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-ink font-black text-sm shadow-xs">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink font-display">
                    Paiement Mobile Money
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Sélectionnez votre opérateur à Kinshasa
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                {/* Operator Selector Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                      Opérateur Télécom (RDC)
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {operator
                        ? `Réseau : ${
                            operator === "mpesa"
                              ? "Vodacom M-Pesa"
                              : operator === "airtel"
                                ? "Airtel Money"
                                : operator === "orange"
                                  ? "Orange Money"
                                  : "Africell AfriMoney"
                          }`
                        : ""}
                      {/** : "Sélection automatique par préfixe"} */}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        id: "mpesa",
                        name: "M-Pesa",
                        color: "border-red-500 bg-red-50 text-red-800",
                        badge: "Vodacom",
                        prefix: "081, 082, 083",
                      },
                      {
                        id: "airtel",
                        name: "Airtel Money",
                        color: "border-red-600 bg-red-50 text-red-900",
                        badge: "Airtel",
                        prefix: "097, 098, 099",
                      },
                      {
                        id: "orange",
                        name: "Orange Money",
                        color: "border-orange-500 bg-orange-50 text-orange-900",
                        badge: "Orange",
                        prefix: "084, 085, 089, 080",
                      },
                      {
                        id: "africell",
                        name: "Africell",
                        color: "border-purple-500 bg-purple-50 text-purple-900",
                        badge: "AfriMoney",
                        prefix: "090, 091",
                      },
                    ].map((op) => {
                      const isSelected = operator === op.id;
                      return (
                        <div
                          key={op.id}
                          className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition cursor-default select-none ${
                            isSelected
                              ? `${op.color} shadow-2xs ring-2 ring-gold/40 opacity-100`
                              : "border-border bg-secondary/30 text-muted-foreground opacity-50"
                          }`}
                        >
                          <span className="text-[10px] font-extrabold uppercase opacity-80">
                            {op.badge}
                          </span>
                          <span className="text-xs font-black">{op.name}</span>

                          {/** 
                          <span className="text-[9px] mt-0.5 opacity-80 font-mono">
                            {op.prefix}
                          </span>
                          {isSelected && <Check className="mt-1 h-3.5 w-3.5" />}
                          */}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider">
                    Numéro de téléphone Mobile Money{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <div className="relative mt-1 flex rounded-xl border border-border bg-white overflow-hidden focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20 transition-all">
                    <span className="flex items-center bg-secondary px-3.5 text-xs font-bold text-ink border-r border-border">
                      🇨🇩 +243
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(0)812345678"
                      required
                      className="w-full px-3.5 py-2.5 text-sm font-semibold text-ink outline-none bg-transparent"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Préfixes RDC : Vodacom (081, 082, 083), Airtel (097, 098,
                    099), Orange (084, 085, 089, 080), Africell (090, 091). Le
                    réseau est sélectionné automatiquement.
                  </p>
                </div>

                {/* Dev/Test Notice */}
                {isDev() && (
                  <div className="rounded-xl bg-gold/10 p-3 border border-gold/30 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-gold-deep shrink-0 mt-0.5" />
                    <p className="text-xs text-ink leading-relaxed">
                      <strong>Note d'information Dev/Test :</strong> En
                      environnement de test, le débit réel sur le réseau est
                      fixé à <strong>10 CDF</strong> pour la validation USSD.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message Box */}
            {authError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-semibold text-destructive flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Erreur de validation</p>
                  <p className="mt-0.5">{authError}</p>
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gold hover:bg-gold-deep text-ink font-black py-4 px-6 text-base shadow-md shadow-gold/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    <span>
                      Payer {isDev() ? "10 CDF (Mode Test)" : currentPlan.price}{" "}
                      par Mobile Money
                    </span>
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                En cliquant sur Payer, une invite de confirmation USSD sera
                envoyée sur votre téléphone.
              </p>
            </div>
          </div>

          {/* Right Sidebar: Panier & Choix des formules */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-20 rounded-2xl border border-border bg-white p-6 shadow-2xs">
              <h2 className="text-base font-extrabold text-ink border-b border-border/60 pb-3 flex items-center justify-between font-display">
                <span>Récapitulatif de la commande</span>
                <span className="text-xs font-bold text-gold-deep bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30">
                  {propertyId ? "Boost d'Annonce" : "Pass Visite"}
                </span>
              </h2>

              {/* Plan Card */}
              <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-4 relative overflow-hidden">
                {currentPlan.badge && (
                  <span className="absolute top-2 right-2 rounded-full bg-gold px-2.5 py-0.5 text-[9px] font-black text-ink uppercase tracking-wider shadow-2xs">
                    {currentPlan.badge}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/25 text-gold-deep">
                    {currentPlan.productType === "boost" ? (
                      <Sparkles className="h-5 w-5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-ink font-display">
                      {currentPlan.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gold/30 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    Montant :
                  </span>
                  <div className="text-right">
                    <span className="text-xl font-black text-gold-deep font-display">
                      {currentPlan.price}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {currentPlan.priceDetail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Property Card for Boost Mode */}
              {propertyId && (
                <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-3.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={building}
                      alt="Annonce sponsorisée"
                      className="h-14 w-14 rounded-lg object-cover border border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[10px] font-extrabold text-gold-deep uppercase tracking-wider">
                        <Sparkles className="h-3 w-3" /> Logement à booster
                      </div>
                      <h4 className="text-xs font-bold text-ink truncate">
                        Appartement 3 pièces Standing
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground/80" />{" "}
                        Commune de la Gombe, Kinshasa
                      </p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                        Réf: {propertyId}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Options Switcher (Filtré selon propertyId) */}
              <div className="mt-5 pt-4 border-t border-border/60">
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  {propertyId
                    ? "Formules de Boost disponibles"
                    : "Formules de Pass Visite"}
                </label>
                <div className="space-y-2">
                  {availablePlans.map((p) => {
                    const isSelected = p.id === currentPlan.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPlan(p.id)}
                        className={`w-full flex items-center justify-between rounded-xl p-3 text-left border transition ${
                          isSelected
                            ? "border-gold bg-gold/15 shadow-2xs"
                            : "border-border bg-white hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-gold-deep bg-gold-deep"
                                : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ink">
                              {p.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.description}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-ink">
                          {p.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Benefits list */}
              <div className="mt-6 pt-4 border-t border-border/60 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Activation instantanée après validation USSD</span>
                </div>
                {propertyId ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Sponsorisation & Épingle Dorée sur la carte</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Support réactif bailleurs 7j/7</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>0 commissionnaire sur toutes vos visites</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Accès illimité aux vidéos & contacts direct</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CheckoutPage;
