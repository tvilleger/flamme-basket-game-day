import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle } from "lucide-react";
import { coachAvatar, fetchMessages, formatRelative, type Message } from "@/lib/api";

export const Route = createFileRoute("/_app/feed")({
  component: FeedPage,
});

function FeedPage() {
  const messagesQ = useQuery({ queryKey: ["messages"], queryFn: fetchMessages });

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
          <PostCard key={post.id} post={post} delay={i * 0.05} />
        ))}
        {messagesQ.data && messagesQ.data.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Pas encore de message.</p>
        )}
      </section>
    </div>
  );
}

function PostCard({ post, delay }: { post: Message; delay: number }) {
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);

  const toggle = () => {
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
  };

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
          onClick={toggle}
          className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-colors ${
            liked ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          {likes}
        </button>
        <button className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground">
          <MessageCircle size={18} />
          Répondre
        </button>
      </div>
    </article>
  );
}
