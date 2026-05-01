import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  MessageCircle, Plus, ArrowDown, ArrowUp, Sparkles, Loader2,
  Activity, ShieldCheck, Bolt, Copy, QrCode,
  Wallet, Send, Target, Clock, CheckCircle2, Info, Zap,
} from "lucide-react";
import { toast } from "sonner";

type Tx = {
  id: string; amount: number; type: string;
  description: string | null; balance_after: number; created_at: string;
};

// 1 DM = R$ 0,20 (mesmo da edge function create-pix-deposit: CENTS_PER_COIN = 20)
const PRICE_PER_DM = 0.20;
const MIN_DEPOSIT_BRL = 30;
const MIN_DMS = Math.round(MIN_DEPOSIT_BRL / PRICE_PER_DM); // 150
const MAX_DMS = 50000;

const dmsToBRL = (dms: number) => dms * PRICE_PER_DM;

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDMs = (n: number) => n.toLocaleString("pt-BR");

const QUICK_PICKS = [150, 250, 500, 1000, 2500, 5000];

const HOW_STEPS = [
  { icon: Wallet, title: "Compre DMs", desc: "Pague via PIX e receba as DMs na hora após confirmação." },
  { icon: Target, title: "Crie sua campanha", desc: "Escreva a mensagem e escolha o público que vai receber." },
  { icon: Send, title: "Bot envia DMs", desc: "Distribuímos a mensagem em ritmo natural pra evitar bloqueio." },
  { icon: Activity, title: "Acompanhe resultados", desc: "Veja entregas, cliques e métricas em tempo real." },
];

type DepositInfo = {
  reference: string;
  qr_code: string;
  qr_code_base64: string;
  amount_cents: number;
  coins: number;
  expires_at?: string;
};

const Credits = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [tab, setTab] = useState<"shop" | "history">("shop");
  const [dmAmount, setDmAmount] = useState<number>(MIN_DMS);
  const [buying, setBuying] = useState(false);
  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("credit_transactions").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setTxs((data ?? []) as Tx[]);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!deposit || paid) {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = window.setInterval(async () => {
      const { data } = await supabase.functions.invoke("check-deposit", {
        body: { reference: deposit.reference },
      });
      if (data?.status === "approved") {
        setPaid(true);
        toast.success(`+${formatDMs(deposit.coins)} DMs creditadas! 🎉`);
        refresh();
        load();
      } else if (data?.status === "failed" || data?.status === "expired") {
        toast.error("Pagamento expirou ou falhou");
        setDeposit(null);
      }
    }, 3500);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [deposit, paid, refresh]);

  const startDeposit = async () => {
    if (dmAmount < MIN_DMS) return toast.error(`Mínimo: ${MIN_DMS} DMs (${formatBRL(MIN_DEPOSIT_BRL)})`);
    setBuying(true);
    setPaid(false);
    const { data, error } = await supabase.functions.invoke("create-pix-deposit", {
      body: { coins: dmAmount, bonus: 0 },
    });
    setBuying(false);
    if (error || !data?.success) {
      console.error(error, data);
      return toast.error("Falha ao gerar PIX. Tente novamente.");
    }
    setDeposit(data as DepositInfo);
  };

  const dms = profile?.credits ?? 0;
  const totalBRL = dmsToBRL(dmAmount);

  const { totalSpent, totalBought } = useMemo(() => {
    let spent = 0, bought = 0;
    txs.forEach((t) => { if (t.amount > 0) bought += t.amount; else spent += -t.amount; });
    return { totalSpent: spent, totalBought: bought };
  }, [txs]);

  const copyPix = () => {
    if (!deposit) return;
    navigator.clipboard.writeText(deposit.qr_code);
    toast.success("Código PIX copiado!");
  };

  return (
    <div className="max-w-[1280px] mx-auto pb-12">
      {/* HERO COMPACTO */}
      <div className="relative mb-6 rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-card via-card to-secondary/30">
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/60">
          <div className="col-span-2 p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-glow shrink-0">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">DMs disponíveis</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter tabular-nums">{formatDMs(dms)}</span>
                <span className="text-xs text-muted-foreground font-bold">DMs</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                ≈ <b className="text-foreground">{formatBRL(dmsToBRL(dms))}</b> · 1 DM = R$ 0,20
              </div>
            </div>
          </div>
          {[
            { icon: ArrowUp, label: "Compradas", value: totalBought, color: "text-success" },
            { icon: ArrowDown, label: "Enviadas", value: totalSpent, color: "text-destructive" },
          ].map((s) => {
            const I = s.icon;
            return (
              <div key={s.label} className="p-5 flex flex-col justify-center">
                <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold ${s.color}`}>
                  <I className="h-3 w-3" /> {s.label}
                </div>
                <div className="text-2xl font-black tabular-nums mt-1">{formatDMs(s.value)}</div>
                <div className="text-[10px] text-muted-foreground">DMs</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-secondary/50 border border-border w-fit">
        <button onClick={() => setTab("shop")}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
            tab === "shop" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}>
          <Sparkles className="h-3.5 w-3.5" /> Comprar DMs
        </button>
        <button onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
            tab === "history" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}>
          <Activity className="h-3.5 w-3.5" /> Histórico
          {txs.length > 0 && <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[10px]">{txs.length}</span>}
        </button>
      </div>

      {tab === "shop" && (
        <div className="grid lg:grid-cols-[1fr,340px] gap-5">
          {/* SELETOR PERSONALIZADO — DESTAQUE */}
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8 shadow-[0_0_60px_-20px_hsl(var(--primary)/0.5)]">
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-[10px] uppercase tracking-widest font-black mb-2">
                      <Zap className="h-3 w-3" /> Quanto você quer comprar?
                    </div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">Escolha sua quantidade</h2>
                    <p className="text-xs text-muted-foreground">Mínimo {MIN_DMS} DMs · 1 DM = R$ 0,20 · Sem mensalidade</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Total a pagar</div>
                    <div className="text-3xl md:text-4xl font-black text-primary tabular-nums">{formatBRL(totalBRL)}</div>
                  </div>
                </div>

                {/* Big input */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Quantidade de DMs</label>
                  <div className="relative mt-2">
                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                    <Input
                      type="number"
                      min={MIN_DMS}
                      max={MAX_DMS}
                      step={1}
                      value={dmAmount}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setDmAmount(isNaN(v) ? MIN_DMS : Math.min(MAX_DMS, Math.max(0, v)));
                      }}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        if (isNaN(v) || v < MIN_DMS) setDmAmount(MIN_DMS);
                      }}
                      className="h-20 pl-14 pr-24 text-4xl md:text-5xl font-black tabular-nums bg-background/60 border-2 focus-visible:border-primary"
                      placeholder={String(MIN_DMS)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground uppercase tracking-wider">DMs</span>
                  </div>
                  {dmAmount < MIN_DMS && (
                    <p className="text-xs text-destructive mt-1.5 font-bold">⚠️ Mínimo: {MIN_DMS} DMs ({formatBRL(MIN_DEPOSIT_BRL)})</p>
                  )}
                </div>

                {/* Slider fino */}
                <div>
                  <Slider
                    min={MIN_DMS}
                    max={5000}
                    step={10}
                    value={[Math.min(5000, Math.max(MIN_DMS, dmAmount))]}
                    onValueChange={([v]) => setDmAmount(v)}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-bold">
                    <span>{MIN_DMS} DMs</span>
                    <span>5.000 DMs</span>
                  </div>
                </div>

                {/* Atalhos */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-2">Atalhos rápidos</div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PICKS.map((v) => {
                      const active = dmAmount === v;
                      return (
                        <button
                          key={v}
                          onClick={() => setDmAmount(v)}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-black transition ${
                            active
                              ? "border-primary bg-primary/15 text-primary shadow-glow"
                              : "border-border bg-background/40 hover:border-primary/40"
                          }`}
                        >
                          {formatDMs(v)} DMs
                          <div className="text-[9px] font-bold text-muted-foreground mt-0.5">{formatBRL(dmsToBRL(v))}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Resumo + CTA */}
                <div className="rounded-2xl bg-background/60 border border-border p-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Compra</div>
                      <div className="text-lg font-black tabular-nums flex items-center gap-1">
                        <MessageCircle className="h-4 w-4 text-primary" /> {formatDMs(dmAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Preço/DM</div>
                      <div className="text-lg font-black tabular-nums">R$ 0,20</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Saldo após</div>
                      <div className="text-lg font-black tabular-nums text-success">{formatDMs(dms + dmAmount)}</div>
                    </div>
                  </div>

                  <Button
                    onClick={startDeposit}
                    disabled={buying || dmAmount < MIN_DMS}
                    variant="discord"
                    className="w-full h-14 text-base font-black gap-2"
                  >
                    {buying ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Gerando PIX...</>
                    ) : (
                      <><QrCode className="h-5 w-5" /> Pagar {formatBRL(totalBRL)} via PIX</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Banner regra */}
            <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center shrink-0">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <b className="text-foreground">Como funciona o preço:</b> você paga por DM <i>enviada</i>, não por pessoa que entra no servidor.
                Sem mensalidade, sem assinatura. As DMs <b>nunca expiram</b>.
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Como funciona</h3>
              </div>
              <ol className="space-y-3">
                {HOW_STEPS.map((step, i) => {
                  const I = step.icon;
                  return (
                    <li key={step.title} className="flex gap-3">
                      <div className="relative shrink-0">
                        <div className="h-8 w-8 rounded-lg bg-card border border-border grid place-items-center">
                          <I className="h-4 w-4 text-primary" />
                        </div>
                        <div className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-black grid place-items-center">
                          {i + 1}
                        </div>
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="text-xs font-black">{step.title}</div>
                        <div className="text-[11px] text-muted-foreground leading-snug">{step.desc}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /><span className="text-xs font-bold">Pagamento via PIX</span></div>
              <div className="flex items-center gap-2"><Bolt className="h-4 w-4 text-warning" /><span className="text-xs font-bold">Liberação instantânea</span></div>
              <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /><span className="text-xs font-bold">DMs não expiram</span></div>
            </div>
          </aside>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {txs.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhuma transação ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {txs.map((t) => {
                const isCredit = t.amount > 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                      isCredit ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      {isCredit ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{t.description ?? t.type}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-black tabular-nums ${isCredit ? "text-success" : "text-destructive"}`}>
                        {isCredit ? "+" : ""}{formatDMs(t.amount)} <span className="text-[10px] font-bold opacity-70">DMs</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">saldo: {formatDMs(t.balance_after)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL PIX */}
      <Dialog open={!!deposit} onOpenChange={(open) => { if (!open) { setDeposit(null); setPaid(false); } }}>
        <DialogContent className="max-w-md">
          {paid ? (
            <div className="py-6 text-center">
              <div className="h-16 w-16 rounded-full bg-success/15 grid place-items-center mx-auto mb-4">
                <CheckCircle2 className="h-9 w-9 text-success" />
              </div>
              <DialogTitle className="text-xl font-black">Pagamento confirmado! 🎉</DialogTitle>
              <DialogDescription className="mt-2">
                <span className="text-foreground font-bold">+{formatDMs(deposit?.coins ?? 0)} DMs</span> creditadas na sua conta.
              </DialogDescription>
              <Button className="mt-5 w-full font-black" variant="discord" onClick={() => { setDeposit(null); setPaid(false); }}>
                Continuar
              </Button>
            </div>
          ) : deposit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-black">
                  <QrCode className="h-5 w-5" /> Pague com PIX
                </DialogTitle>
                <DialogDescription>Escaneie o QR Code ou copie o código abaixo. Liberação automática.</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 my-2">
                <div className="rounded-xl bg-secondary/50 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Valor</div>
                  <div className="text-lg font-black">{formatBRL(deposit.amount_cents / 100)}</div>
                </div>
                <div className="rounded-xl bg-primary/10 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Você recebe</div>
                  <div className="text-lg font-black">{formatDMs(deposit.coins)} <span className="text-xs">DMs</span></div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-border bg-white p-4 grid place-items-center">
                {deposit.qr_code_base64 ? (
                  <img src={deposit.qr_code_base64} alt="QR Code PIX" className="h-56 w-56" />
                ) : deposit.qr_code ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(deposit.qr_code)}`}
                    alt="QR Code PIX"
                    className="h-56 w-56"
                  />
                ) : (
                  <div className="h-56 w-56 grid place-items-center text-muted-foreground text-xs">QR Code indisponível</div>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Código PIX (copia e cola)</label>
                <div className="flex gap-2 mt-1">
                  <Input value={deposit.qr_code} readOnly className="font-mono text-xs" />
                  <Button onClick={copyPix} variant="outline" size="icon" className="shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>Aguardando pagamento... as DMs aparecem automaticamente após confirmação.</span>
              </div>

              {deposit.expires_at && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Expira em {new Date(deposit.expires_at).toLocaleString("pt-BR")}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;
