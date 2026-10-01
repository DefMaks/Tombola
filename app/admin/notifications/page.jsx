'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Clock,
  ShieldCheck,
  Send,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  Flame,
  Calendar,
  Sliders,
  Power,
  MapPin,
  Users,
  Eye,
  ArrowLeft,
  Loader2,
  Info,
  Check,
  Zap,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { KINSHASA_COMMUNES } from '@/lib/constants/communes';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('flash');

  // Kinshasa digital clock
  const [kinshasaClock, setKinshasaClock] = useState('');

  // Flash push form state
  const [selectedRaffleId, setSelectedRaffleId] = useState('');
  const [flashTitle, setFlashTitle] = useState('');
  const [flashBody, setFlashBody] = useState('');
  const [flashUrl, setFlashUrl] = useState('');
  const [flashAudience, setFlashAudience] = useState('ALL');
  const [flashCommune, setFlashCommune] = useState('');
  const [isSendingFlash, setIsSendingFlash] = useState(false);

  // Simulator state
  const [simDevice, setSimDevice] = useState('ios'); // 'ios' | 'android'
  const [simTemplateId, setSimTemplateId] = useState('morning_daily_single');
  const [simRaffleId, setSimRaffleId] = useState('');

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Slot trigger loading
  const [triggeringSlot, setTriggeringSlot] = useState(null);

  // SMS Africa's Talking Test State
  const [testPhone, setTestPhone] = useState('+243822032855');
  const [testMessage, setTestMessage] = useState('Bonjour ! Ceci est un SMS de vérification Punchy envoyé avec succès via Africa\'s Talking.');
  const [testKeyword, setTestKeyword] = useState('');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState(null);

  // Fetch initial data
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        const json = await res.json();
        if (json.success && isMounted) {
          setData(json);
          if (json.activeRaffles?.length > 0) {
            setSelectedRaffleId((prev) => prev || json.activeRaffles[0].id);
            setSimRaffleId((prev) => prev || json.activeRaffles[0].id);
          }
        }
      } catch (err) {
        if (isMounted) toast.error('Erreur lors du chargement des données');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      toast.error('Erreur lors du rafraîchissement des données');
    }
  };

  // Kinshasa live clock (UTC+1)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const kinshasa = new Date(utc + 3600000 * 1);
      const pad = (n) => String(n).padStart(2, '0');
      setKinshasaClock(
        `${pad(kinshasa.getHours())}:${pad(kinshasa.getMinutes())}:${pad(kinshasa.getSeconds())}`
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update Master Switch (1-clic)
  const toggleMasterSwitch = async (checked) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', is_enabled: checked }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast.success(checked ? '🟢 Notifications Push activées' : '🔴 Notifications Push suspendues');
        fetchData();
      } else {
        toast.error(resJson.error || 'Erreur lors du changement d\'état');
      }
    } catch (err) {
      toast.error('Impossible de modifier l\'interrupteur général');
    }
  };

  // Reset today's quotas (for demo and testing)
  const handleResetQuotas = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_quotas' }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast.success('Quotas du jour réinitialisés à 1/1');
        fetchData();
      }
    } catch (e) {
      toast.error('Erreur de réinitialisation');
    }
  };

  // Trigger scheduled slot (Matin ou Soir)
  const handleTriggerSlot = async (slot) => {
    setTriggeringSlot(slot);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_scheduled_slot', slot }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast.success(resJson.message);
        fetchData();
      } else {
        toast.error(resJson.error || 'Impossible d\'envoyer le créneau');
      }
    } catch (e) {
      toast.error('Erreur d\'envoi');
    } finally {
      setTriggeringSlot(null);
    }
  };

  // Send Flash Push
  const handleSendFlash = async (e) => {
    e.preventDefault();
    if (!flashTitle.trim() || !flashBody.trim()) {
      toast.error('Veuillez renseigner le titre et le corps du message');
      return;
    }
    setIsSendingFlash(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_flash',
          title: flashTitle,
          body: flashBody,
          target_url: flashUrl || null,
          raffle_id: selectedRaffleId || null,
          audience_type: flashAudience,
          target_commune: flashAudience === 'COMMUNE' ? flashCommune : null,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast.success(`🚀 Notification Flash envoyée à ~${resJson.recipients_count} personnes !`);
        setFlashTitle('');
        setFlashBody('');
        setFlashUrl('');
        fetchData();
      } else {
        toast.error(resJson.error || 'Erreur lors de la diffusion flash');
      }
    } catch (e) {
      toast.error('Erreur réseau lors de l\'envoi');
    } finally {
      setIsSendingFlash(false);
    }
  };

  // Save template edit
  const handleSaveTemplate = async (templateId) => {
    if (!editingTemplate) return;
    setIsSavingTemplate(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_template',
          id: templateId,
          title: editingTemplate.title,
          body: editingTemplate.body,
          target_url: editingTemplate.target_url,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        toast.success('Gabarit éditorial mis à jour !');
        setEditingTemplate(null);
        fetchData();
      } else {
        toast.error(resJson.error || 'Erreur de sauvegarde');
      }
    } catch (e) {
      toast.error('Erreur lors de la mise à jour du gabarit');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Test SMS Africa's Talking live
  const handleSendTestSms = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsTestingSms(true);
    setSmsTestResult(null);
    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage,
          keyword: testKeyword || undefined,
        }),
      });
      const json = await res.json();
      setSmsTestResult(json);
      if (json.success) {
        toast.success(`SMS transmis à ${testPhone} avec succès !`);
      } else {
        toast.error(json.result?.error || json.error || 'Erreur lors de l\'envoi du SMS');
      }
    } catch (err) {
      toast.error('Erreur réseau lors de l\'envoi du SMS');
    } finally {
      setIsTestingSms(false);
    }
  };

  // Helper to render dynamic tags
  const renderText = (rawText, raffle) => {
    if (!rawText) return '';
    const title = raffle?.title || 'iPhone 15 Pro Max';
    const slug = raffle?.slug || 'iphone-15-pro-max';
    const percent = raffle ? Math.min(100, Math.round(((raffle.tickets_sold || 0) / (raffle.max_tickets || 100)) * 100)) : 80;
    const remaining = raffle ? Math.max(0, (raffle.max_tickets || 100) - (raffle.tickets_sold || 0)) : 45;

    return rawText
      .replace(/{titre}/g, title)
      .replace(/{duree}/g, '2 heures')
      .replace(/{pourcentage}/g, `${percent}%`)
      .replace(/{places_restantes}/g, `${remaining} punches`)
      .replace(/{slug}/g, slug);
  };

  // Test notification directly on the current device
  const handleTestOnDevice = async (title, body) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Les notifications ne sont pas supportées par ce navigateur.');
      return;
    }
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification(title, {
            body,
            icon: '/P-punchy-emblem.png',
            badge: '/P-punchy-emblem.png',
            vibrate: [100, 50, 100],
          });
        } else {
          new Notification(title, {
            body,
            icon: '/P-punchy-emblem.png',
          });
        }
        toast.success('Notification test affichée sur votre écran !');
      } catch (e) {
        toast.info(`[Notification] ${title} : ${body}`);
      }
    } else {
      toast.warning('Autorisation refusée par le navigateur.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Chargement du Centre de Notifications Push...
        </p>
      </div>
    );
  }

  const { settings, templates = [], logs = [], goldenPush, activeRaffles = [], subscribersCount = 1420 } = data || {};
  const isEnabled = settings?.is_enabled !== false;
  const currentSimRaffle = activeRaffles.find((r) => r.id === simRaffleId) || activeRaffles[0];
  const currentSimTemplate = templates.find((t) => t.id === simTemplateId) || templates[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Retour au Profil"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                  PUNCHY
                </span>
                <span className="text-xs font-bold text-slate-400">·</span>
                <span className="text-xs uppercase tracking-widest font-black text-amber-400">
                  Centre de Notifications
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Politique & Stratégie Push PWA (Conforme <code className="text-amber-300">politique_push_notifications.md</code>)
              </p>
            </div>
          </div>

          {/* Kinshasa Live Clock & Master Switch */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                <span>{kinshasaClock || '12:00:00'} WAT</span>
                <span className="text-[10px] text-amber-400/70 font-sans">(Kinshasa)</span>
              </div>
            </div>

            {/* Master Switch (1-Clic) */}
            <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-2xl shadow-lg">
              <Power className={`h-4 w-4 ${isEnabled ? 'text-emerald-400' : 'text-rose-500'}`} />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Interrupteur</span>
                <span className={`text-xs font-black leading-tight ${isEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isEnabled ? 'Actif' : 'Suspendu'}
                </span>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={toggleMasterSwitch}
                className="data-[state=checked]:bg-emerald-500 ml-1"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner Alert if master switch is off */}
        {!isEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">Diffusion Push actuellement suspendue</h4>
                <p className="text-xs text-rose-300">
                  Toutes les notifications programmées et flash sont temporairement bloquées par l&apos;interrupteur général.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => toggleMasterSwitch(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl"
            >
              Réactiver maintenant
            </Button>
          </motion.div>
        )}

        {/* Quotas & Golden Push Live Bar */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Quota Matin */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-500/20 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <SunIcon className="h-3.5 w-3.5 text-amber-400" />
                Créneau Matin (08h30)
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-black ${
                  goldenPush?.morning?.sentToday
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                }`}
              >
                Quota : {goldenPush?.morning?.quotaRemaining}/1
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-base font-black text-white">
                {goldenPush?.morning?.sentToday ? 'Envoyé aujourd\'hui' : 'Prêt pour diffusion'}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Découverte des nouveaux rounds & lancement express.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between border-t border-slate-800/80 mt-3">
              <span className="text-[10px] text-slate-400 font-mono">Heure cible : {goldenPush?.morning?.time}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={triggeringSlot === 'morning' || !isEnabled}
                onClick={() => handleTriggerSlot('morning')}
                className="h-7 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2"
              >
                {triggeringSlot === 'morning' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Déclencher
              </Button>
            </div>
          </div>

          {/* Quota Soir */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-500/20 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                <MoonIcon className="h-3.5 w-3.5 text-orange-400" />
                Créneau Soir (18h30)
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-black ${
                  goldenPush?.evening?.sentToday
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                    : 'border-orange-500/40 text-orange-300 bg-orange-500/10'
                }`}
              >
                Quota : {goldenPush?.evening?.quotaRemaining}/1
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-base font-black text-white">
                {goldenPush?.evening?.sentToday ? 'Envoyé aujourd\'hui' : 'Prêt pour diffusion'}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Compte à rebours du tirage & derniers punches.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between border-t border-slate-800/80 mt-3">
              <span className="text-[10px] text-slate-400 font-mono">Heure cible : {goldenPush?.evening?.time}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={triggeringSlot === 'evening' || !isEnabled}
                onClick={() => handleTriggerSlot('evening')}
                className="h-7 text-[11px] text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 px-2"
              >
                {triggeringSlot === 'evening' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                Déclencher
              </Button>
            </div>
          </div>

          {/* Règle Pas de Bruit Sans Valeur */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Rounds Actifs en Cours
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                {activeRaffles.length} actif{activeRaffles.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-base font-black text-white">
                {activeRaffles.length > 0 ? 'Diffusion autorisée' : 'Silence complet appliqué'}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Règle « Pas de bruit sans valeur » : Si 0 round actif, aucun push n&apos;est transmis.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between border-t border-slate-800/80 mt-3 text-[10px] text-slate-400">
              <span>{activeRaffles.length} round(s) éligible(s)</span>
              <button onClick={handleResetQuotas} className="text-amber-400 hover:underline flex items-center gap-1">
                <RotateCcw className="h-2.5 w-2.5" /> Réinitialiser Quotas
              </button>
            </div>
          </div>

          {/* Audience PWA */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-400" />
                Audience Abonnée PWA
              </span>
              <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-[10px]">
                Kinshasa
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                {subscribersCount.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Abonnés répertoriés avec token push actif.
              </p>
            </div>
            <div className="pt-3 flex items-center justify-between border-t border-slate-800/80 mt-3 text-[10px] text-slate-400">
              <span>Redirection automatique configurée</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> VAPID OK
              </span>
            </div>
          </div>
        </section>

        {/* Tabbed Workspace */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 p-1 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-5 w-full">
            <TabsTrigger
              value="flash"
              className="rounded-xl font-bold text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-950"
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              1. Envoi Immédiat (Flash)
            </TabsTrigger>
            <TabsTrigger
              value="simulator"
              className="rounded-xl font-bold text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-950"
            >
              <Smartphone className="h-3.5 w-3.5 mr-1.5" />
              2. Simulateur Smartphone
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="rounded-xl font-bold text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-950"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              3. Les 12 Modèles
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="rounded-xl font-bold text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-950"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              4. Journal ({logs.length})
            </TabsTrigger>
            <TabsTrigger
              value="sms"
              className="rounded-xl font-bold text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-slate-950"
            >
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              5. Test SMS RDC
            </TabsTrigger>
          </TabsList>

          {/* ==================================================== */}
          {/* TAB 1: ENVOI IMMEDIAT (PUSH FLASH)                   */}
          {/* ==================================================== */}
          <TabsContent value="flash" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulaire Flash */}
              <div className="lg:col-span-7 bg-slate-900/90 border border-amber-500/20 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-400" />
                      Créer une Notification Flash
                    </h3>
                    <p className="text-xs text-slate-400">
                      Diffusion exceptionnelle (Victoire majeure, clôture imminente, alerte spéciale).
                    </p>
                  </div>
                  <Badge className="bg-amber-500/10 border-amber-500/40 text-amber-300 text-[10px]">
                    Instantané
                  </Badge>
                </div>

                <form onSubmit={handleSendFlash} className="space-y-4">
                  {/* Round concerné */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Round concerné (injecte automatiquement le titre et le lien)
                    </label>
                    <select
                      value={selectedRaffleId}
                      onChange={(e) => setSelectedRaffleId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">Aucun round spécifique (Message général)</option>
                      {activeRaffles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.tickets_sold}/{r.max_tickets} punches · {r.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Boutons d'insertion rapide de modèles Flash */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Gabarits Flash préconfigurés :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFlashTitle('🎉 Annonce du gagnant en direct !');
                          setFlashBody('Le tirage de {titre} vient de désigner son vainqueur ! Viens vérifier si c\'est toi.');
                          setFlashUrl('/transparency');
                        }}
                        className="text-[11px] bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        🏆 Annonce Vainqueur
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFlashTitle('⚡ Dernières places disponibles !');
                          setFlashBody('Clôture imminente pour {titre}. Saisis ton punch avant qu\'il ne soit trop tard !');
                          setFlashUrl('');
                        }}
                        className="text-[11px] bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        ⏰ Clôture Imminente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFlashTitle('🔥 80% des places déjà prises !');
                          setFlashBody('Le Round Ultime pour {titre} s\'accélère. Ne rate pas les derniers tickets !');
                          setFlashUrl('');
                        }}
                        className="text-[11px] bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        📈 Palier Critique 80%
                      </button>
                    </div>
                  </div>

                  {/* Titre */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Titre de la notification
                    </label>
                    <Input
                      value={flashTitle}
                      onChange={(e) => setFlashTitle(e.target.value)}
                      placeholder="Ex: ⚡ Dernières places disponibles !"
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs h-10"
                      maxLength={70}
                    />
                  </div>

                  {/* Corps du message */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Corps du message (balises disponibles : <code className="text-amber-400">&#123;titre&#125;</code>, <code className="text-amber-400">&#123;duree&#125;</code>, <code className="text-amber-400">&#123;pourcentage&#125;</code>)
                      </label>
                      <span className="text-[10px] text-slate-400">{flashBody.length}/150</span>
                    </div>
                    <Textarea
                      rows={3}
                      value={flashBody}
                      onChange={(e) => setFlashBody(e.target.value)}
                      placeholder="Ex: Le Round Ultime pour {titre} s'accélère. Ne rate pas les derniers tickets !"
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                      maxLength={150}
                    />
                  </div>

                  {/* Ciblage & Segmentation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        Ciblage par niveau d&apos;engagement
                      </label>
                      <select
                        value={flashAudience}
                        onChange={(e) => setFlashAudience(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="ALL">👥 Tous les abonnés</option>
                        <option value="PARTICIPANTS">🎟️ Uniquement participants avec ticket</option>
                        <option value="NON_PARTICIPANTS">👀 Joueurs n&apos;ayant pas encore de ticket</option>
                        <option value="COMMUNE">📍 Ciblage par Commune de Kinshasa</option>
                      </select>
                    </div>

                    {flashAudience === 'COMMUNE' && (
                      <div>
                        <label className="text-xs font-semibold text-amber-300 block mb-1.5">
                          Sélectionner la Commune (Kinshasa)
                        </label>
                        <select
                          value={flashCommune}
                          onChange={(e) => setFlashCommune(e.target.value)}
                          className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="">Sélectionnez une commune...</option>
                          {KINSHASA_COMMUNES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {flashAudience !== 'COMMUNE' && (
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                          Lien de redirection au clic
                        </label>
                        <Input
                          value={flashUrl}
                          onChange={(e) => setFlashUrl(e.target.value)}
                          placeholder="Auto: fiche du round (/raffles/...)"
                          className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs h-10"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bouton d'action */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSendingFlash || !isEnabled}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      {isSendingFlash ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Diffusion en cours vers les téléphones...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Diffuser la Notification Push Flash Maintenant
                        </>
                      )}
                    </Button>
                    {!isEnabled && (
                      <p className="text-[11px] text-rose-400 text-center mt-2">
                        Impossible d&apos;envoyer : l&apos;interrupteur général est désactivé.
                      </p>
                    )}
                  </div>
                </form>
              </div>

              {/* Aperçu en direct Smartphone */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="w-full max-w-xs space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Aperçu Immédiat
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono">Format Écran</span>
                  </div>

                  {/* Smartphone Frame */}
                  <div className="w-full bg-slate-900 border-4 border-slate-800 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden min-h-[380px] flex flex-col justify-start">
                    {/* Speaker notch */}
                    <div className="w-20 h-4 bg-slate-950 rounded-full mx-auto mb-4 border border-slate-800/80" />

                    {/* Lockscreen Header Clock */}
                    <div className="text-center mb-6">
                      <div className="text-3xl font-light text-white tracking-tight">
                        {kinshasaClock.slice(0, 5) || '18:30'}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        Mercredi 30 Septembre
                      </div>
                    </div>

                    {/* Push Notification Card */}
                    <div className="bg-slate-800/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-3.5 shadow-xl space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-amber-500 flex items-center justify-center text-slate-950 font-black text-[9px]">
                            P
                          </div>
                          <span className="font-bold text-white tracking-wide">PUNCHY</span>
                        </div>
                        <span className="text-[9px] text-slate-400">maintenant</span>
                      </div>
                      <div className="text-xs font-black text-amber-300">
                        {renderText(
                          flashTitle || 'Titre de la notification',
                          activeRaffles.find((r) => r.id === selectedRaffleId)
                        )}
                      </div>
                      <div className="text-[11px] text-slate-200 leading-tight">
                        {renderText(
                          flashBody || 'Le message push apparaîtra ici avec remplacement en direct des variables dynamiques.',
                          activeRaffles.find((r) => r.id === selectedRaffleId)
                        )}
                      </div>
                    </div>

                    {/* Action button inside simulator */}
                    <div className="mt-auto pt-6 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleTestOnDevice(
                            renderText(flashTitle || 'Notification Test Punchy', activeRaffles[0]),
                            renderText(flashBody || 'Ceci est un test en temps réel sur votre écran.', activeRaffles[0])
                          )
                        }
                        className="text-[10px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-xl w-full"
                      >
                        <Eye className="h-3 w-3 mr-1" /> Tester sur mon écran
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================================================== */}
          {/* TAB 2: SIMULATEUR SMARTPHONE INTERACTIF (iOS & Android) */}
          {/* ==================================================== */}
          <TabsContent value="simulator" className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-amber-400" />
                    Simulateur Mobile Interactif (iOS & Android)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Testez le rendu exact de n&apos;importe quel gabarit avec les données réelles des rounds en cours.
                  </p>
                </div>

                {/* Device Selector Switch */}
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => setSimDevice('ios')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      simDevice === 'ios'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Format iPhone (iOS)
                  </button>
                  <button
                    onClick={() => setSimDevice('android')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      simDevice === 'android'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Format Android (OneUI/Pixel)
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 pb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Choisir le modèle à tester
                  </label>
                  <select
                    value={simTemplateId}
                    onChange={(e) => setSimTemplateId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.slot.toUpperCase()}] {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Injecter les données de ce Round
                  </label>
                  <select
                    value={simRaffleId}
                    onChange={(e) => setSimRaffleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {activeRaffles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.tickets_sold}/{r.max_tickets} vendus · {r.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Simulator Center Preview */}
              <div className="flex justify-center py-4">
                {simDevice === 'ios' ? (
                  /* iPhone Mockup */
                  <div className="w-80 bg-slate-950 border-4 border-slate-700 rounded-[3rem] p-5 shadow-2xl relative overflow-hidden flex flex-col justify-start min-h-[460px]">
                    <div className="w-24 h-5 bg-black rounded-full mx-auto mb-6 flex items-center justify-end px-2">
                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                    </div>

                    <div className="text-center my-6">
                      <div className="text-4xl font-extralight text-white tracking-tight">
                        {kinshasaClock.slice(0, 5) || '18:30'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Mercredi 30 Septembre</div>
                    </div>

                    {/* iOS Notification Banner */}
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                            P
                          </div>
                          <span className="font-bold text-white tracking-wider text-[11px]">PUNCHY</span>
                        </div>
                        <span className="text-[10px] text-slate-400">il y a 2m</span>
                      </div>
                      <div className="text-xs font-black text-white">
                        {renderText(currentSimTemplate?.title, currentSimRaffle)}
                      </div>
                      <div className="text-[11px] text-slate-300 leading-snug">
                        {renderText(currentSimTemplate?.body, currentSimRaffle)}
                      </div>
                    </div>

                    {/* Bottom unlock line */}
                    <div className="mt-auto pt-8">
                      <div className="w-28 h-1 bg-white/40 rounded-full mx-auto" />
                    </div>
                  </div>
                ) : (
                  /* Android Mockup */
                  <div className="w-80 bg-slate-950 border-4 border-slate-800 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden flex flex-col justify-start min-h-[460px]">
                    {/* Top status bar */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 pt-1 mb-6">
                      <span>{kinshasaClock.slice(0, 5) || '18:30'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>4G+</span>
                        <span>85%</span>
                      </div>
                    </div>

                    {/* Android Banner */}
                    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3.5 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                            P
                          </div>
                          <span className="text-xs font-bold text-white">Punchy · Tirages RDC</span>
                        </div>
                        <span className="text-[10px] text-slate-400">18:30</span>
                      </div>

                      <div className="space-y-0.5 pl-7">
                        <h5 className="text-xs font-bold text-amber-300">
                          {renderText(currentSimTemplate?.title, currentSimRaffle)}
                        </h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {renderText(currentSimTemplate?.body, currentSimRaffle)}
                        </p>
                      </div>

                      <div className="flex justify-end pt-1 gap-2 pl-7">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          Participer (1$)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="text-center pt-4">
                <Button
                  onClick={() =>
                    handleTestOnDevice(
                      renderText(currentSimTemplate?.title, currentSimRaffle),
                      renderText(currentSimTemplate?.body, currentSimRaffle)
                    )
                  }
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs px-5 h-10 shadow-lg"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Tester cette notification sur mon appareil
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ==================================================== */}
          {/* TAB 3: LES 12 MODELES EDITORIAUX (MATRICE DE GABARITS) */}
          {/* ==================================================== */}
          <TabsContent value="templates" className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-amber-400" />
                    Répertoire des 12 Modèles Éditoriaux
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ces textes sont utilisés automatiquement par le planificateur aux heures programmées.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Balises disponibles :</span>
                  <code className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    &#123;titre&#125;
                  </code>
                  <code className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    &#123;duree&#125;
                  </code>
                  <code className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    &#123;pourcentage&#125;
                  </code>
                </div>
              </div>

              {/* Grid of templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => {
                  const isEditing = editingTemplate?.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[9px] uppercase tracking-wider font-bold ${
                              tpl.slot === 'morning'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : tpl.slot === 'evening'
                                ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                                : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {tpl.slot === 'morning' ? '🌅 Matin' : tpl.slot === 'evening' ? '🌆 Soir' : '⚡ Flash'}
                          </Badge>
                          <span className="text-xs font-bold text-white">{tpl.category}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{tpl.id}</span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Titre
                            </label>
                            <Input
                              value={editingTemplate.title}
                              onChange={(e) =>
                                setEditingTemplate({ ...editingTemplate, title: e.target.value })
                              }
                              className="bg-slate-900 border-slate-700 text-xs text-white h-8"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Message
                            </label>
                            <Textarea
                              rows={2}
                              value={editingTemplate.body}
                              onChange={(e) =>
                                setEditingTemplate({ ...editingTemplate, body: e.target.value })
                              }
                              className="bg-slate-900 border-slate-700 text-xs text-white"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTemplate(null)}
                              className="h-7 text-xs text-slate-400 hover:text-white"
                            >
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              disabled={isSavingTemplate}
                              onClick={() => handleSaveTemplate(tpl.id)}
                              className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                            >
                              {isSavingTemplate ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                              Enregistrer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-amber-300">{tpl.title}</h4>
                            <p className="text-xs text-slate-300 leading-relaxed">{tpl.body}</p>
                          </div>
                          <div className="pt-2 flex items-center justify-between border-t border-slate-900">
                            <span className="text-[10px] text-slate-500 font-mono">
                              Cible : {tpl.target_url || '/'}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTemplate({ ...tpl })}
                              className="h-6 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2 rounded-lg"
                            >
                              Modifier le texte
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ==================================================== */}
          {/* TAB 4: JOURNAL DE BORD (HISTORIQUE ET TRAÇABILITE)    */}
          {/* ==================================================== */}
          <TabsContent value="logs" className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-400" />
                    Journal de Bord & Traçabilité des Diffusions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Historique chronologique des envois récents aux abonnés de Kinshasa.
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-xs">
                  {logs.length} enregistrements
                </Badge>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Aucun historique de diffusion pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[9px] uppercase font-bold ${
                              log.slot === 'morning'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : log.slot === 'evening'
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            }`}
                          >
                            {log.slot.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-bold text-white">{log.title}</span>
                          {log.target_commune && (
                            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-300">
                              📍 {log.target_commune}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{log.body}</p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-3 pt-0.5">
                          <span>URL : <code className="text-slate-400">{log.target_url || '/'}</code></span>
                          <span>Audience : <strong>{log.audience_type || 'ALL'}</strong></span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-900 text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-amber-400">
                          ~{log.recipients_count || 0} destinataires
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa' }) : 'Récemment'}
                        </div>
                        <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 mt-1">
                          Diffusé
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ==================================================== */}
          {/* TAB 5: TEST SMS RDC (+243) & AFRICA'S TALKING        */}
          {/* ==================================================== */}
          <TabsContent value="sms" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulaire de Test SMS */}
              <div className="lg:col-span-7 bg-slate-900/90 border border-amber-500/20 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Phone className="h-5 w-5 text-amber-400" />
                      Test de Réception SMS en Direct (Africa&apos;s Talking)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Vérifiez l&apos;acheminement réel vers un numéro RDC (+243) avec suivi du messageId et des statuts opérateurs.
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/10 border-emerald-500/40 text-emerald-300 text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Connecté
                  </Badge>
                </div>

                <form onSubmit={handleSendTestSms} className="space-y-4">
                  {/* Numéro de téléphone */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Numéro de téléphone RDC destinataire
                    </label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+243822032855"
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs h-10 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Formats acceptés : <code className="text-amber-300">+243822032855</code>, <code className="text-amber-300">0822032855</code> ou <code className="text-amber-300">822032855</code>
                    </span>
                  </div>

                  {/* Boutons d'insertion rapide de messages */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Exemples de messages préconfigurés :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTestMessage(`Votre code de verification Punchy est : ${Math.floor(100000 + Math.random() * 900000)}. Expire dans 10 minutes.`)
                        }
                        className="text-[11px] bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        🔑 Code OTP Vérification
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTestMessage('Félicitations ! Vous avez remporté le tirage Punchy pour iPhone 15 Pro Max. Vérifiez votre profil Punchy dès maintenant !')
                        }
                        className="text-[11px] bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        🎉 Alerte Gagnant
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTestMessage('⏰ Rappel Punchy : Le tirage du Round Express a lieu ce soir à 20h00. Vos punches sont bien enregistrés !')
                        }
                        className="text-[11px] bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-slate-300 px-3 py-1.5 rounded-lg transition"
                      >
                        ⏰ Rappel Tirage
                      </button>
                    </div>
                  </div>

                  {/* Corps du SMS */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Message SMS
                      </label>
                      <span className="text-[10px] text-slate-400">{testMessage.length} caractères (1 SMS)</span>
                    </div>
                    <Textarea
                      rows={3}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Saisissez le contenu du message SMS..."
                      className="bg-slate-950 border-slate-800 text-white rounded-xl text-xs"
                      maxLength={160}
                    />
                  </div>

                  {/* Paramètres optionnels Premium */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        Options Premium SMS (africastalking.com/docs/sms/sending/premium)
                      </span>
                      <span className="text-[10px] text-slate-400">Optionnel</span>
                    </div>
                    <div>
                      <Input
                        value={testKeyword}
                        onChange={(e) => setTestKeyword(e.target.value)}
                        placeholder="Keyword Premium (si shortcode configuré, ex: PUNCHY)"
                        className="bg-slate-900 border-slate-700 text-white rounded-xl text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Bouton d'envoi test */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isTestingSms}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      {isTestingSms ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Transmission vers le réseau télécom RDC...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Envoyer le SMS de Test à {testPhone}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Résultat d'Acheminement Télécom & Logs */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 flex-1">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Statut de Transmission Télécom
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Africa&apos;s Talking Gateway</span>
                  </div>

                  {smsTestResult ? (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className={`p-4 rounded-2xl border ${smsTestResult.success ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/40 border-rose-500/40 text-rose-200'}`}>
                        <div className="flex items-center justify-between font-bold text-xs mb-1">
                          <span>Statut : {smsTestResult.success ? 'Succès (100 - Success)' : 'Échec'}</span>
                          <span className="font-mono text-[10px]">{smsTestResult.result?.cost || 'USD 0.0250'}</span>
                        </div>
                        <div className="text-[11px] leading-relaxed">
                          {smsTestResult.success
                            ? `Le SMS a été remis à l'opérateur avec succès pour le numéro ${smsTestResult.phone}.`
                            : `Erreur retournée : ${smsTestResult.result?.error || smsTestResult.error}`}
                        </div>
                      </div>

                      {smsTestResult.result?.messageId && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Identifiant Unique Télécom (MessageId)
                          </span>
                          <code className="text-xs text-amber-300 font-mono break-all select-all">
                            {smsTestResult.result.messageId}
                          </code>
                        </div>
                      )}

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Réponse Brute Passerelle
                        </span>
                        <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto max-h-40 p-2 bg-slate-900 rounded-lg">
                          {JSON.stringify(smsTestResult.result?.rawResponse || smsTestResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                      <Phone className="h-8 w-8 mx-auto text-slate-600" />
                      <p>Cliquez sur « Envoyer le SMS de Test » pour lancer une vérification en temps réel.</p>
                      <p className="text-[10px] text-slate-400">Le destinataire configuré par défaut est le numéro +243822032855.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SunIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="m4.93 4.93 1.41 1.41"/>
      <path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="m6.34 17.66-1.41 1.41"/>
      <path d="m19.07 4.93-1.41 1.41"/>
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  );
}
