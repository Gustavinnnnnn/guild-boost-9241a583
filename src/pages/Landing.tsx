import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DiscordIcon } from "@/components/DiscordIcon";
import { toast } from "sonner";
import {
  Loader2,
  Rocket,
  MessageSquareHeart,
  Target,
  ShieldCheck,
  Zap,
  Users,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Coins,
  Gift,
  ArrowRight,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [clientId, setClientId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Captura código de afiliado
  useEffect(() => {
    const ref = params.get("ref");
    if (ref) {
      try {
        localStorage.setItem("aff_ref", ref);
        fetch(`${SUPABASE_URL}/functions/v1/track-referral`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: ref, action: "click" }),
        }).catch(() => {});
      } catch { /* ignore */ }
    }
  }, [params]);

  useEffect(() => {
    supabase.functions.invoke("discord-config").then(({ data }) => {
      if (data?.client_id) setClientId(data.client_id);
    }).catch(() => {});
  }, []);

  const loginWithDiscord = () => {
    if (user) return navigate("/app");
    if (!clientId) return toast.error("Configuração do Discord não carregada");
    setBusy(true);
    const state = btoa(JSON.stringify({ origin: window.location.origin, nonce: crypto.randomUUID() }));
    const redirectUri = encodeURIComponent(`${SUPABASE_URL}/functions/v1/discord-oauth-callback`);
    const scope = encodeURIComponent("identify email guilds");
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&prompt=consent`;
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-glow">
              <DiscordIcon className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ServerBoost</span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("how")} className="hover:text-foreground transition-colors">Como funciona</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">Preços</button>
            <button onClick={() => scrollTo("affiliate")} className="hover:text-foreground transition-colors">Afiliados</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">FAQ</button>
          </nav>

          <Button variant="discord" size="sm" className="gap-2" onClick={loginWithDiscord} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><DiscordIcon className="h-4 w-4" /> {user ? "Abrir painel" : "Entrar"}</>}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(235_86%_65%/0.18),transparent_60%)]" />
        <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-primary-glow/20 blur-3xl" />

        <div className="container mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Crescimento real, sem bot, sem fake
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Faça seu servidor do Discord <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">explodir de membros</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Pessoas reais divulgam seu servidor por DM no Discord. Você paga só pelo resultado:
              <span className="text-foreground font-semibold"> R$ 0,05 por cada DM enviada</span>.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="discord" size="xl" className="gap-2" onClick={loginWithDiscord} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><DiscordIcon className="h-5 w-5" /> Começar com Discord</>}
              </Button>
              <Button variant="outline" size="xl" className="gap-2" onClick={() => scrollTo("how")}>
                Ver como funciona <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem mensalidade</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> PIX instantâneo</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Cancela quando quiser</div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { v: "+2M", l: "DMs enviadas" },
              { v: "+15k", l: "Servidores ativos" },
              { v: "98%", l: "Taxa de entrega" },
              { v: "R$ 0,05", l: "Custo por DM" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur p-5 text-center">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Como funciona</div>
            <h2 className="text-3xl md:text-5xl font-bold">3 passos pro seu servidor crescer</h2>
            <p className="mt-4 text-muted-foreground text-lg">Simples, transparente e sem enrolação.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: DiscordIcon,
                step: "01",
                title: "Conecte seu Discord",
                desc: "Faça login com sua conta do Discord. Sem senha, sem formulário chato. Em 5 segundos você está dentro.",
              },
              {
                icon: Target,
                step: "02",
                title: "Crie sua campanha",
                desc: "Escolha o nicho, escreva a mensagem e quantas DMs quer enviar. A gente cuida do resto.",
              },
              {
                icon: TrendingUp,
                step: "03",
                title: "Receba membros reais",
                desc: "Pessoas de verdade recebem o convite por DM e entram no seu servidor. Você acompanha tudo em tempo real.",
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative group">
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur" />
                  <div className="relative rounded-2xl border border-border bg-card p-7 h-full">
                    <div className="flex items-start justify-between mb-5">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-4xl font-bold text-muted-foreground/15">{s.step}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 border-y border-border/40 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Por que escolher</div>
            <h2 className="text-3xl md:text-5xl font-bold">Feito pra quem quer resultado</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {[
              { icon: Users, title: "Pessoas reais", desc: "Nada de bot ou conta fake. Membros de verdade do Discord recebendo seu convite." },
              { icon: Zap, title: "Entrega rápida", desc: "Sua campanha começa em minutos depois do pagamento. Sem espera." },
              { icon: ShieldCheck, title: "100% seguro", desc: "Pagamento via PIX processado pela Paradise. Seus dados protegidos." },
              { icon: Target, title: "Segmentação por nicho", desc: "Escolha o público certo: gaming, NSFW, trade, anime, e muito mais." },
              { icon: MessageSquareHeart, title: "Mensagem personalizada", desc: "Você escreve a copy. A gente entrega no inbox do público certo." },
              { icon: Rocket, title: "Dashboard completo", desc: "Veja DMs enviadas, conversões, gastos e performance em tempo real." },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">Preços</div>
            <h2 className="text-3xl md:text-5xl font-bold">Pague só pelo que usar</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              <span className="text-foreground font-semibold">1 DM = R$ 0,05</span>. Sem mensalidade, sem pegadinha.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { name: "Starter", price: 20, dms: 400, bonus: null },
              { name: "Growth", price: 50, dms: 1100, bonus: "+10% bônus", popular: true },
              { name: "Pro", price: 100, dms: 2400, bonus: "+20% bônus" },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-2xl border p-7 ${p.popular ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Mais popular
                  </div>
                )}
                <div className="text-sm text-muted-foreground">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">R$ {p.price}</span>
                </div>
                <div className="mt-1 text-primary font-semibold">{p.dms.toLocaleString("pt-BR")} DMs</div>
                {p.bonus && <div className="text-xs text-muted-foreground mt-0.5">{p.bonus}</div>}

                <div className="mt-5 h-px bg-border" />

                <ul className="mt-5 space-y-2.5 text-sm">
                  {["Membros reais", "Entrega rápida", "Dashboard de performance", "Suporte"].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {b}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={p.popular ? "discord" : "outline"}
                  className="w-full mt-6 gap-2"
                  onClick={loginWithDiscord}
                >
                  <Coins className="h-4 w-4" /> Começar agora
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Depósito mínimo R$ 20. Você pode comprar qualquer valor acima disso.
          </p>
        </div>
      </section>

      {/* Affiliate */}
      <section id="affiliate" className="py-20 md:py-28 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-14 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs mb-5">
                  <Gift className="h-3.5 w-3.5" /> Programa de afiliados
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">Indique e ganhe <span className="text-primary">20% vitalício</span></h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Compartilhe seu link, traga novos clientes e ganhe 20% de comissão em <span className="text-foreground font-semibold">todas as compras</span> deles, pra sempre.
                  Saque via PIX a partir de R$ 50.
                </p>
                <Button variant="discord" size="lg" className="mt-6 gap-2" onClick={loginWithDiscord}>
                  <DiscordIcon className="h-4 w-4" /> Virar afiliado
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "20%", l: "Comissão por venda" },
                  { v: "Vitalício", l: "Pra sempre" },
                  { v: "R$ 50", l: "Saque mínimo" },
                  { v: "PIX", l: "Pagamento" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-border bg-background/50 backdrop-blur p-5 text-center">
                    <div className="text-2xl font-bold text-primary">{s.v}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <div className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">FAQ</div>
            <h2 className="text-3xl md:text-5xl font-bold">Perguntas frequentes</h2>
          </div>

          <div className="space-y-3">
            {[
              { q: "É seguro? Minha conta pode ser banida?", a: "100% seguro. As DMs são enviadas por contas reais que aceitam divulgar. Seu servidor não corre nenhum risco." },
              { q: "Quanto custa cada DM?", a: "R$ 0,05 por DM. Comprou R$ 20? Recebe 400 DMs. Comprou R$ 50? Recebe 1.100 DMs (com bônus)." },
              { q: "Em quanto tempo começa a entregar?", a: "Sua campanha entra na fila em segundos depois do pagamento. A entrega depende do volume, mas geralmente começa em poucos minutos." },
              { q: "Como funciona o pagamento?", a: "PIX instantâneo via Paradise. Aprovou o PIX, créditos caem na sua conta na hora." },
              { q: "Tem mensalidade?", a: "Não. Você compra créditos quando quiser e usa quando quiser. Sem assinatura." },
              { q: "Posso pedir reembolso?", a: "Créditos não usados não expiram. Para casos específicos, fale com o suporte no Discord." },
            ].map((f, i) => (
              <details key={i} className="group rounded-xl border border-border bg-card p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-medium pr-4">{f.q}</span>
                  <span className="h-7 w-7 rounded-full bg-muted grid place-items-center text-muted-foreground group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 md:py-28 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(235_86%_65%/0.15),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold">Pronto pra fazer seu servidor crescer?</h2>
              <p className="mt-4 text-muted-foreground text-lg">Entre com Discord e crie sua primeira campanha em 2 minutos.</p>
              <Button variant="discord" size="xl" className="mt-8 gap-2" onClick={loginWithDiscord} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><DiscordIcon className="h-5 w-5" /> Começar grátis com Discord</>}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary-glow grid place-items-center">
              <DiscordIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">ServerBoost</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/auth" className="hover:text-foreground transition-colors">Login</Link>
            <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">FAQ</button>
            <button onClick={() => scrollTo("affiliate")} className="hover:text-foreground transition-colors">Afiliados</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
