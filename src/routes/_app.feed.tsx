import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send } from "lucide-react";
import { coachAvatar, fetchMessages, formatRelative, type Message } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/_app/feed")({
  component: FeedPage,
});

type LikeRow = { message_id: string; joueuse_id: string };
type ReplyRow = {
  id: string;
  message_id: string;
  auteur_nom: string;
  auteur_type: string;
  contenu: string;
  created_at: string;
};

function FeedPage() {
  const session = getSession();
  const joueuseId = session?.joueuseId ?? null;

  const messagesQ = useQuery({ queryKey: ["messages"], queryFn: fetchMessages });

  const likesQ = useQuery({
    queryKey: ["messages-likes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages_likes")
        .select("message_id, joueuse_id");
      if (error) throw error;
      return (data ?? []) as LikeRow[];
    },
  });

  const repliesQ = useQuery({
    queryKey: ["messages-reponses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages_reponses")
        .select("id, message_id, auteur_nom, auteur_type, contenu, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReplyRow[];
    },
  });

  return (
    <div className="px-5 pt-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Fil d'actu</p>
        <h1 className="mt-1 text-3xl font-black">Le vestiaire</h1>
        <p className="mt-1 text-sm text-muted-foreground">Les news du coach, en direct.</p>
      </header>

      <section className="mt-6 space-y-4">
        {messagesQ.isLoading && (
          <p className="text-center text-sm text-muted-foreground">Chargement…</p>
        )}
        {(messagesQ.data ?? []).map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            delay={i * 0.05}
            joueuseId={joueuseId}
            joueusePrenom={session?.prenom ?? "Anonyme"}
            likes={(likesQ.data ?? []).filter((l) => l.message_id === post.id)}
            replies={(repliesQ.data ?? []).filter((r) => r.message_id === post.id)}
          />
        ))}
        {messagesQ.data && messagesQ.data.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Pas encore de message.</p>
        )}
      </section>
    </div>
  );
}

function PostCard({
  post,
  delay,
  joueuseId,
  joueusePrenom,
  likes,
  replies,
}: {
  post: Message;
  delay: number;
  joueuseId: string | null;
  joueusePrenom: string;
  likes: LikeRow[];
  replies: ReplyRow[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const liked = !!joueuseId && likes.some((l) => l.joueuse_id === joueuseId);
  const likeCount = likes.length;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!joueuseId) throw new Error("Connecte-toi pour aimer");
      if (liked) {
        const { error } = await supabase
          .from("messages_likes")
          .delete()
          .eq("message_id", post.id)
          .eq("joueuse_id", joueuseId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("messages_likes")
          .insert({ message_id: post.id, joueuse_id: joueuseId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages-likes"] }),
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const contenu = text.trim();
      if (!contenu) return;
      const { error } = await supabase.from("messages_reponses").insert({
        message_id: post.id,
        joueuse_id: joueuseId,
        auteur_nom: joueusePrenom,
        auteur_type: "joueuse",
        contenu,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages-reponses"] });
    },
  });

  return (
    <article
      className="overflow-hidden rounded-3xl bg-card shadow-card animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center gap-3 p-4">
        <img
          src={coachAvatar}
          alt="Coach"
          loading="lazy"
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-2xl bg-muted object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-black">Coach</p>
          <p className="text-xs text-muted-foreground">{formatRelative(post.date_publication)}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
          Coach
        </span>
      </div>
      <div className="px-4 pb-4">
        {post.titre && <h2 className="text-lg font-black">{post.titre}</h2>}
        <p className="mt-1 text-sm leading-relaxed text-foreground/80">{post.contenu}</p>
      </div>
      <div className="flex items-center gap-1 border-t border-border px-2 py-1">
        <button
          onClick={() => toggleLike.mutate()}
          disabled={!joueuseId || toggleLike.isPending}
          className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
            liked ? "text-primary" : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          {likeCount}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle size={18} />
          Répondre
          {replies.length > 0 && <span className="text-xs opacity-70">({replies.length})</span>}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-3">
          {replies.length > 0 && (
            <ul className="space-y-2">
              {replies.map((r) => (
                <li key={r.id} className="rounded-2xl bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black">{r.auteur_nom}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.auteur_type}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatRelative(r.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{r.contenu}</p>
                </li>
              ))}
            </ul>
          )}
          {joueuseId ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendReply.mutate();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écris ta réponse…"
                className="flex-1 rounded-full bg-card px-4 py-2 text-sm outline-none border border-border focus:border-primary"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!text.trim() || sendReply.isPending}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Connecte-toi pour répondre.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
