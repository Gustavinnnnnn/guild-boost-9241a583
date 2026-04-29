import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2, Send, Save, X } from "lucide-react";
import { toast } from "sonner";

type Server = { id: string; name: string; icon_url: string | null; guild_id: string; bot_in_server: boolean };
type Channel = { id: string; name: string };

const COLORS = ["#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245", "#9B59B6"];

const NewCampaign = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [serverId, setServerId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [color, setColor] = useState("#5865F2");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("discord_servers").select("id, name, icon_url, guild_id, bot_in_server").eq("user_id", user.id).then(({ data }) => {
      const list = (data ?? []) as Server[];
      setServers(list);
      const firstWithBot = list.find((s) => s.bot_in_server);
      if (firstWithBot) setServerId(firstWithBot.id);
    });
  }, [user]);

  const selectedServer = useMemo(() => servers.find((s) => s.id === serverId), [servers, serverId]);

  useEffect(() => {
    if (!selectedServer || !selectedServer.bot_in_server) { setChannels([]); return; }
    setLoadingChannels(true);
    supabase.functions.invoke("discord-list-channels", { body: { guild_id: selectedServer.guild_id } }).then(({ data }) => {
      setLoadingChannels(false);
      if (data?.channels) {
        setChannels(data.channels);
        if (data.channels[0]) setChannelId(data.channels[0].id);
      }
    });
  }, [selectedServer]);

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("campaign-images").upload(path, file, { upsert: false });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data: pub } = supabase.storage.from("campaign-images").getPublicUrl(path);
    setImageUrl(pub.publicUrl);
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const save = async (sendNow: boolean) => {
    if (!user || !profile) return;
    if (!serverId) return toast.error("Selecione um servidor");
    if (!selectedServer?.bot_in_server) return toast.error("Instale o bot nesse servidor primeiro");
    if (!channelId) return toast.error("Selecione um canal");
    if (!name.trim()) return toast.error("Dê um nome à campanha");
    if (!message.trim()) return toast.error("Escreva a mensagem");

    setBusy(true);
    const channelName = channels.find((c) => c.id === channelId)?.name ?? null;
    const { data, error } = await supabase.from("campaigns").insert({
      user_id: user.id, server_id: serverId, name, message,
      image_url: imageUrl || null, embed_color: color,
      channel_id: channelId, channel_name: channelName, status: "draft",
    }).select().single();

    if (error || !data) { setBusy(false); return toast.error(error?.message ?? "Erro"); }

    if (sendNow) {
      const { data: sd, error: se } = await supabase.functions.invoke("send-campaign", { body: { campaign_id: data.id } });
      if (se || sd?.error) { setBusy(false); toast.error("Falha ao enviar: " + (sd?.error || se?.message)); return; }
      toast.success("Campanha enviada! 🚀");
    } else {
      toast.success("Campanha salva como rascunho");
    }
    navigate("/app/campanhas");
  };

  const previewName = profile?.discord_username || "ServerBoost Bot";
  const previewAvatar = profile?.avatar_url;

  return (
    <div className="grid lg:grid-cols-2 gap-6 max-w-7xl">
      {/* Form */}
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <div>
            <Label>Servidor</Label>
            {servers.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">Nenhum servidor conectado. <a href="/app/servidores" className="text-primary underline">Conectar</a></p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {servers.map((s) => (
                  <button key={s.id} type="button" onClick={() => setServerId(s.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition ${serverId === s.id ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:border-primary/40"} ${!s.bot_in_server && "opacity-50"}`}>
                    {s.icon_url ? <img src={s.icon_url} className="h-9 w-9 rounded-lg" alt="" /> : <div className="h-9 w-9 rounded-lg bg-primary/20 grid place-items-center text-sm font-bold">{s.name[0]}</div>}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{s.name}</div>
                      <div className={`text-[10px] ${s.bot_in_server ? "text-success" : "text-warning"}`}>{s.bot_in_server ? "Bot ativo" : "Sem bot"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedServer?.bot_in_server && (
            <div>
              <Label>Canal</Label>
              {loadingChannels ? (
                <div className="mt-2 p-3 rounded-lg bg-secondary/40 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Buscando canais...</div>
              ) : (
                <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="mt-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                </select>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="name">Nome da campanha (interno)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Promo de inverno" className="mt-2" />
          </div>

          <div>
            <Label htmlFor="message">Mensagem</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="O que você quer anunciar? Suporta **negrito**, *itálico*, links, emojis 🎉" className="mt-2 min-h-[140px]" />
            <p className="text-xs text-muted-foreground mt-1">{message.length} caracteres</p>
          </div>

          <div>
            <Label>Imagem (opcional)</Label>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  {uploading ? "Enviando..." : "Escolher imagem"}
                </div>
              </label>
              {imageUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setImageUrl("")} className="gap-1"><X className="h-3 w-3" /> Remover</Button>
              )}
            </div>
          </div>

          <div>
            <Label>Cor da borda</Label>
            <div className="flex gap-2 mt-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-lg border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="secondary" disabled={busy} className="flex-1 gap-2"><Save className="h-4 w-4" /> Salvar rascunho</Button>
          <Button type="button" variant="discord" disabled={busy} onClick={() => save(true)} className="flex-1 gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Salvar e enviar
          </Button>
        </div>
      </form>

      {/* Discord Preview */}
      <div className="lg:sticky lg:top-8 self-start">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview no Discord</div>
        <div className="rounded-xl bg-[#313338] border border-[#1e1f22] p-4 shadow-2xl">
          {/* Channel header */}
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#3f4147]">
            <span className="text-[#80848e] text-xl">#</span>
            <span className="text-white font-semibold">{channels.find(c => c.id === channelId)?.name ?? "canal"}</span>
          </div>

          {/* Bot message */}
          <div className="flex gap-3">
            {previewAvatar ? (
              <img src={previewAvatar} className="h-10 w-10 rounded-full shrink-0" alt="" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-glow grid place-items-center text-white font-bold text-sm shrink-0">B</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-white font-semibold text-[15px]">{previewName}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#5865F2] text-white text-[10px] font-bold leading-none">APP</span>
                <span className="text-[#949ba4] text-xs">hoje às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {/* Embed */}
              <div className="mt-1.5 flex">
                <div className="w-1 rounded-l" style={{ backgroundColor: color }} />
                <div className="bg-[#2b2d31] rounded-r p-3 max-w-[440px] flex-1">
                  <div className="text-[#dbdee1] text-sm whitespace-pre-wrap break-words">
                    {message || <span className="text-[#80848e] italic">Sua mensagem aparecerá aqui...</span>}
                  </div>
                  {imageUrl && (
                    <img src={imageUrl} className="mt-2 rounded max-w-full max-h-72 object-contain" alt="" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">É exatamente assim que vai aparecer no Discord.</p>
      </div>
    </div>
  );
};

export default NewCampaign;
