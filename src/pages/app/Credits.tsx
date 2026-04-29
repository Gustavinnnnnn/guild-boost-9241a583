import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  Coins, Plus, ArrowDown, ArrowUp, Sparkles, Zap, Crown, Rocket, Loader2,
  Gift, Flame, TrendingUp, Activity, Target, Info, ChevronRight, CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { formatCoins, coinsToDms } from "@/lib/ads";

type Tx = {
  id: string; amount: number; type: string;
  description: string | null; balance_after: number; created_at: string;
};

const PACKAGES = [
  { coins: 100, bonus: 0, price: "R$ 19,90", icon: Zap, label: "Starter", tag: null, accent: "from-sky-500 to-cyan-500", hex: "#06b6d4" },
  { coins: 500, bonus: 50, price: "R$ 89,90", icon: Rocket, label: "Pro", tag: "POPULAR", accent: "from-primary to-primary-glow", hex: "hsl(var(--primary))" },
  { coins: 2000, bonus: 400, price: "R$ 299,90", icon: Crown, label: "Business", tag: "+20%", accent: "from-amber-400 to-orange-500", hex: "#f59e0b" },
  { coins: 5000, bonus: 1500, price: "R$ 699,90", icon: Flame, label: "Whale", tag: "+30%", accent: "from-fuchsia-500 to-pink-500", hex: "#d946ef" },
];

const Credits = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [buying, setBuying] = useState<number | null>(null);
  const [tab, setTab] = useState<"shop" | "history">("shop");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setTxs((data ?? []) as Tx[]);
  };

  useEffect(() => { load(); }, [user]);

  const buy = async (coinsAmount: number, bonus: number) => {
    const total = coinsAmount + bonus;
    setBuying(coinsAmount);
    const { error } = await supabase.functions.invoke("add-credits", { body: { amount: total } });
    setBuying(null);
    if (error) return toast.error("Falha ao adicionar coins");
    toast.success(`+${formatCoins(total)} coins adicionados! 🎉`);
    refresh();
    load();
  };

  const coins = profile?.credits ?? 0;
  const reach = coinsToDms(coins);

  const { totalSpent, totalBought, last7d } = useMemo(() => {
    let spent = 0, bought = 0, recent = 0;
    const now = Date.now();
    txs.forEach((t) => {
      if (t.amount > 0) bought += t.amount;
      else spent += -t.amount;
      if (now - new Date(t.created_at).getTime() < 7 * 86400000) recent += Math.abs(t.amount);
    });
    return { totalSpent: spent, totalBought: bought, last7d: recent };
  }, [txs]);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* ================= HEADER STRIP ================= */}
      <div className="relative mb-6 rounded-2xl border border-border bg-card overflow-hidden">
        {/* Faixa colorida lateral */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary via-primary-glow to-primary" />

        <div className="grid md:grid-cols-[1fr,auto,auto,auto] gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Saldo principal */}
          <div className="p-5 pl-7 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-glow shrink-0">
              <Coins className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Saldo disponível</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter tabular-nums">{formatCoins(coins)}</span>
                <span className="text-sm text-muted-foreground font-bold">coins</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                ≈ <b className="text-foreground">{reach.toLocaleString("pt-BR")}</b> DMs · <b className="text-foreground">{Math.floor(reach / 1000)}k</b> alcance
              </div>
            </div>
          </div>

          {/* Mini stat 1 */}
          <div className="p-5 flex flex-col justify-center min-w-[140px]">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-success font-bold">
              <ArrowUp className="h-3 w-3" /> Comprado
            </div>
            <div className="text-2xl font-black tabular-nums mt-1">{formatCoins(totalBought)}</div>
            <div className="text-[10px] text-muted-foreground">lifetime</div>
          </div>

          {/* Mini stat 2 */}
          <div className="p-5 flex flex-col justify-center min-w-[140px]">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-destructive font-bold">
              <ArrowDown className="h-3 w-3" /> Gasto
            </div>
            <div className="text-2xl font-black tabular-nums mt-1">{formatCoins(totalSpent)}</div>
            <div className="text-[10px] text-muted-foreground">lifetime</div>
          </div>

          {/* Mini stat 3 */}
          <div className="p-5 flex flex-col justify-center min-w-[140px]">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary font-bold">
              <Activity className="h-3 w-3" /> 7 dias
            </div>
            <div className="text-2xl font-black tabular-nums mt-1">{formatCoins(last7d)}</div>
            <div className="text-[10px] text-muted-foreground">movimentação</div>
          </div>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-secondary/50 border border-border w-fit">
        <button
          onClick={() => setTab("shop")}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
            tab === "shop" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Loja
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
            tab === "history" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3.5 w-3.5" /> Extrato
          {txs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[10px]">{txs.length}</span>
          )}
        </button>
        <div className="ml-2 px-2.5 py-1 rounded-md bg-warning/15 text-warning text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          🧪 Modo teste · grátis
        </div>
      </div>

      {tab === "shop" && (
        <>
          {/* ================= PACOTES — LISTA HORIZONTAL ================= */}
          <div className="space-y-3">
            {PACKAGES.map((p, idx) => {
              const I = p.icon;
              const total = p.coins + p.bonus;
              const reachPkg = coinsToDms(total);
              const isPopular = p.label === "Pro";
              return (
                <div
                  key={p.coins}
                  className={`group relative rounded-2xl bg-card border overflow-hidden transition-all hover:shadow-glow ${
                    isPopular ? "border-primary/50 shadow-glow" : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Glow lateral */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${p.accent}`}
                  />
                  <div
                    className={`absolute -left-20 top-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-gradient-to-r ${p.accent} opacity-10 blur-3xl group-hover:opacity-20 transition`}
                  />

                  <div className="relative grid md:grid-cols-[auto,1.5fr,1fr,1fr,auto] gap-4 md:gap-6 items-center p-4 md:p-5 pl-6">
                    {/* Ícone + número de tier */}
                    <div className="flex items-center gap-3">
                      <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${p.accent} grid place-items-center shadow-lg shrink-0`}>
                        <I className="h-7 w-7 text-white" />
                      </div>
                      <div className="md:hidden">
                        <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Tier {idx + 1}</div>
                        <div className="text-base font-black">{p.label}</div>
                      </div>
                    </div>

                    {/* Nome e total */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Tier {idx + 1}</div>
                        {p.tag && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r ${p.accent}`}>
                            {p.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-black tracking-tight">{p.label}</div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <Coins className="h-3.5 w-3.5 text-primary" />
                        <span className="text-base font-bold tabular-nums">{formatCoins(p.coins)}</span>
                        {p.bonus > 0 && (
                          <span className="text-[11px] text-success font-black flex items-center gap-0.5">
                            <Gift className="h-3 w-3" /> +{formatCoins(p.bonus)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total recebido */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Você recebe</div>
                      <div className="text-2xl font-black tabular-nums">{formatCoins(total)}</div>
                      <div className="text-[10px] text-muted-foreground">coins totais</div>
                    </div>

                    {/* Alcance */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Alcance</div>
                      <div className="text-2xl font-black text-primary tabular-nums">{reachPkg.toLocaleString("pt-BR")}</div>
                      <div className="text-[10px] text-muted-foreground">DMs entregues</div>
                    </div>

                    {/* Preço + CTA */}
                    <div className="flex flex-col items-stretch md:items-end gap-2 md:min-w-[160px]">
                      <div className="text-right md:text-right">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Por apenas</div>
                        <div className="text-2xl font-black tracking-tight leading-none">{p.price}</div>
                      </div>
                      <Button
                        onClick={() => buy(p.coins, p.bonus)}
                        disabled={buying !== null}
                        variant={isPopular ? "discord" : "secondary"}
                        size="sm"
                        className="gap-1.5 font-bold w-full md:w-auto"
                      >
                        {buying === p.coins ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            Comprar
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= INFO STRIP ================= */}
          <div className="mt-6 grid md:grid-cols-3 gap-3">
            {[
              { icon: Target, title: "1 coin = 10 DMs", desc: "Entrega real, segmentada por nicho" },
              { icon: TrendingUp, title: "Bônus progressivo", desc: "Pacotes maiores rendem até +30%" },
              { icon: CircleDollarSign, title: "Coins não expiram", desc: "Use quando quiser, sem prazo" },
            ].map((it) => {
              const I = it.icon;
              return (
                <div key={it.title} className="rounded-xl border border-border bg-card/50 p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                    <I className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-black">{it.title}</div>
                    <div className="text-[11px] text-muted-foreground">{it.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "history" && (
        <div>
          {txs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
              <Coins className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-base font-bold">Nenhuma transação ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Vá para a Loja e compre seu primeiro pacote</p>
              <Button onClick={() => setTab("shop")} variant="discord" size="sm" className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Ir para a Loja
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              {/* Header da tabela */}
              <div className="hidden md:grid grid-cols-[auto,1fr,140px,140px,160px] gap-4 px-5 py-3 bg-secondary/30 border-b border-border text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                <div className="w-10">Tipo</div>
                <div>Descrição</div>
                <div className="text-right">Valor</div>
                <div className="text-right">Saldo após</div>
                <div className="text-right">Data</div>
              </div>
              <div className="divide-y divide-border">
                {txs.map((t) => {
                  const isCredit = t.amount > 0;
                  return (
                    <div key={t.id} className="grid md:grid-cols-[auto,1fr,140px,140px,160px] gap-3 md:gap-4 px-4 md:px-5 py-3 items-center hover:bg-secondary/30 transition">
                      <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                        isCredit ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}>
                        {isCredit ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{t.description || t.type}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.type}</div>
                      </div>
                      <div className={`text-right font-black tabular-nums text-base ${isCredit ? "text-success" : "text-destructive"}`}>
                        {isCredit ? "+" : ""}{formatCoins(t.amount)}
                      </div>
                      <div className="text-right tabular-nums text-sm font-bold text-muted-foreground">
                        {formatCoins(t.balance_after)}
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Credits;
