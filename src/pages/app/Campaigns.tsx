import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Send, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type Campaign = {
  id: string; name: string; message: string; image_url: string | null;
  status: string; sent_at: string | null; channel_name: string | null;
  error_message: string | null; created_at: string;
  discord_servers: { name: string; icon_url: string | null } | null;
};

const Campaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("campaigns")
      .select("*, discord_servers(name, icon_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCampaigns((data as any) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const send = async (id: string) => {
    setSending(id);
    const { data, error } = await supabase.functions.invoke("send-campaign", { body: { campaign_id: id } });
    setSending(null);
    if (error || data?.error) {
      toast.error("Falha ao enviar: " + (data?.error || error?.message || "erro desconhecido"));
      load();
      return;
    }
    toast.success("Campanha enviada! 🚀");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("campaigns").delete().eq("id", id);
    toast.success("Campanha removida");
    load();
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { icon: any; cls: string; label: string }> = {
      draft: { icon: Clock, cls: "bg-muted text-muted-foreground", label: "Rascunho" },
      sent: { icon: CheckCircle2, cls: "bg-success/15 text-success", label: "Enviada" },
      failed: { icon: XCircle, cls: "bg-destructive/15 text-destructive", label: "Falhou" },
    };
    const m = map[status] ?? map.draft;
    const I = m.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.cls}`}><I className="h-3 w-3" />{m.label}</span>;
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Crie mensagens, escolha o servidor e envie pelo bot.</p>
        <Link to="/app/campanhas/nova"><Button variant="discord" className="gap-2"><Plus className="h-4 w-4" /> Nova campanha</Button></Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma campanha ainda.</p>
          <Link to="/app/campanhas/nova"><Button variant="discord" className="mt-4 gap-2"><Plus className="h-4 w-4" /> Criar a primeira</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold">{c.name}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.discord_servers?.name ?? "—"} {c.channel_name ? `· #${c.channel_name}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  {c.status !== "sent" && (
                    <Button size="sm" variant="discord" disabled={sending === c.id} onClick={() => send(c.id)} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" /> {sending === c.id ? "Enviando..." : "Enviar"}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-secondary/40 text-sm whitespace-pre-wrap line-clamp-3">{c.message}</div>
              {c.error_message && <p className="text-xs text-destructive mt-2">⚠ {c.error_message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;
