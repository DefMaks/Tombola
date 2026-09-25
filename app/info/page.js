'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Info, 
  FileText, 
  Mail, 
  ArrowLeft, MapPin,
  Send, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BottomNav from '@/components/BottomNav';
import AdBlock from '@/components/AdBlock';
import { toast } from 'sonner';

export default function InfoPage() {
  const [activeTab, setActiveTab] = useState('about'); // 'about', 'terms', 'contact'

  // Contact Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Fetch Page 2934 (À propos de Punchy)
  const { data: aboutData, isLoading: loadingAbout } = useQuery({
    queryKey: ['wp-page-2934'],
    queryFn: async () => {
      const res = await fetch('https://defmaks.com/wp-json/wp/v2/pages/2934');
      if (!res.ok) throw new Error('WP 2934 error');
      return res.json();
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch Page 2936 (Termes d'utilisation)
  const { data: termsData, isLoading: loadingTerms } = useQuery({
    queryKey: ['wp-page-2936'],
    queryFn: async () => {
      const res = await fetch('https://defmaks.com/wp-json/wp/v2/pages/2936');
      if (!res.ok) throw new Error('WP 2936 error');
      return res.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l&apos;envoi');

      toast.success('Votre message a été transmis avec succès à support@defmaks.com !');
      setSentSuccess(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.message || 'Impossible d&apos;envoyer le message. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-extrabold text-lg leading-tight flex items-center gap-2">
                Informations &amp; Support
              </h1>
              <p className="text-xs text-muted-foreground">À propos, conditions générales et contact DefMaks</p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/P-punchy-emblem.png" alt="Punchy Logo" className="h-8 w-8 object-contain" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-5">
        {/* Ad Block Banner */}
        <AdBlock zone="inner" sources={["SPB", "NDB"]} />

        {/* Tab Switcher Buttons */}
        <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'about'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Info className="h-4 w-4 shrink-0" />
            <span>À propos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'terms'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Conditions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'contact'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span>Contact</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {/* TAB 1: À PROPOS */}
          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-foreground">
                      {aboutData?.title?.rendered || 'À propos de Punchy'}
                    </h2>
                  </div>
                </div>

                {loadingAbout ? (
                  <div className="space-y-3 py-6">
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-full animate-pulse" />
                    <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
                  </div>
                ) : aboutData?.content?.rendered ? (
                  <div
                    className="prose prose-invert max-w-none text-sm text-foreground/90 leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: aboutData.content.rendered }}
                  />
                ) : (
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p className="text-foreground font-medium">
                      Bienvenue sur <strong>Punchy</strong>, la première plateforme de tirages au sort 100% cryptographiques, transparentes et équitables en République Démocratique du Congo.
                    </p>
                    <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2">
                      <div className="font-bold text-amber-500 flex items-center gap-2 text-xs uppercase tracking-wider">
                        <ShieldCheck className="h-4 w-4" /> Transparence Équitable SHA-256
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Chaque Punch à 1$ participe à un algorithme certifié vérifiable en temps réel par tout participant via la signature SHA-256 du tirage.
                      </p>
                    </div>
                    <p>
                      Développé et géré par <strong>DefMaks Labs</strong>, Punchy permet aux citoyens et passionnés de tenter leur chance pour gagner des lots d&apos;exception (motos neuves, téléphones phares, téléviseurs Smart 4K, équipements solaires) remis en main propre en RDC.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: TERMES D'UTILISATION */}
          {activeTab === 'terms' && (
            <motion.div
              key="terms"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-foreground">
                      {/*termsData?.title?.rendered || 'Termes d’utilisation'*/}
                      Termes d’utilisation
                    </h2>
                    <span className="text-xs text-muted-foreground">Conditions Générales d&apos;Utilisation Punchy</span>
                  </div>
                </div>

                {loadingTerms ? (
                  <div className="space-y-3 py-6">
                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-full animate-pulse" />
                    <div className="h-4 bg-muted rounded w-4/5 animate-pulse" />
                  </div>
                ) : termsData?.content?.rendered ? (
                  <div
                    className="prose prose-invert max-w-none text-sm text-foreground/90 leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: termsData.content.rendered }}
                  />
                ) : (
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <div className="space-y-2">
                      <h3 className="font-bold text-foreground text-base">1. Éligibilité &amp; Participation</h3>
                      <p className="text-xs">
                        La participation est ouverte à toute personne résidant en RDC ou en mesure de recevoir les lots sur le territoire national. L&apos;achat d&apos;un Punch à 1$ est définitif et valide la participation au Round associé.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-foreground text-base">2. Équité &amp; Algorithme du Tirage</h3>
                      <p className="text-xs">
                        Les gagnants sont désignés par l&apos;algorithme cryptographique officiel de la plateforme. La graine de tirage (seed) est verrouillée avant le début des ventes et la preuve SHA-256 est consultable sur la page de transparence.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-bold text-foreground text-base">3. Remise des Lots</h3>
                      <p className="text-xs">
                        Après la clôture du tirage, le gagnant officiel est contacté par téléphone ou SMS sur le numéro fourni lors de l&apos;achat. La remise du lot s&apos;effectue sur présentation de la preuve d&apos;achat du Punch ou de la pièce d&apos;identité.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: FORMULAIRE DE CONTACT */}
          {activeTab === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-lg text-foreground">Formulaire de Contact</h2>
                      <p className="text-xs text-muted-foreground">Écrivez à notre équipe de support</p>
                    </div>
                  </div>
                </div>


                {sentSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400" />
                    <div className="font-bold text-sm">Message Envoyé !</div>
                    <p className="text-xs text-emerald-300/90">
                      Merci d&apos;avoir contacté le support DefMaks. Notre équipe examinera votre requête et vous répondra très rapidement par email à <strong>{form.email || 'votre adresse'}</strong>.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSentSuccess(false)}
                      className="mt-2 text-xs h-8 border-emerald-500/40 text-emerald-300"
                    >
                      Envoyer un autre message
                    </Button>
                  </div>
                )}

                {!sentSuccess && (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Nom complet <span className="text-amber-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Ex: Alain Kalala"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="bg-background h-11 text-sm rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Adresse Email <span className="text-amber-500">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="exemple@mail.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        className="bg-background h-11 text-sm rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Numéro de Téléphone <span className="text-muted-foreground font-normal">(Optionnel)</span>
                      </label>
                      <Input
                        type="tel"
                        placeholder="+243 82 000 0000"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="bg-background h-11 text-sm rounded-xl font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Sujet de votre demande <span className="text-amber-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="Ex: Question sur un tirage, assistance Punch..."
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        required
                        className="bg-background h-11 text-sm rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">
                        Message <span className="text-amber-500">*</span>
                      </label>
                      <Textarea
                        rows={4}
                        placeholder="Expliquez en détail votre demande ou préoccupation..."
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        required
                        className="bg-background text-sm rounded-xl resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={sending}
                      className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Transmission au support...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Envoyer le message</span>
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}
