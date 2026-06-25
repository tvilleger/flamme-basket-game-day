import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchPersonalBest,
  fetchShootLeaderboard,
  saveShootScore,
  type ShootLeaderEntry,
  type ShootUserType,
} from "@/lib/shoot";
import { Trophy, RotateCcw, Play, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  user: { id: string; type: ShootUserType; nom: string };
};

const GAME_DURATION = 60;
const W = 360;
const H = 560;
const GRAVITY = 0.55;
const BALL_RADIUS = 18;
const RIM_Y = 150;
const RIM_HALF = 32;
const NET_HEIGHT = 28;

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  flying: boolean;
  resting: boolean;
  scored: boolean;
  passedRim: boolean;
};

type FxItem = { id: number; x: number; y: number; t: number; text: string };

// Lightweight audio (Web Audio API)
let audioCtx: AudioContext | null = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}
function beep(freq: number, duration = 0.08, type: OscillatorType = "sine", gain = 0.06) {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration + 0.02);
}
function soundBounce() { beep(180, 0.05, "triangle", 0.04); }
function soundSwish() {
  beep(880, 0.08, "sine", 0.08);
  setTimeout(() => beep(1320, 0.1, "sine", 0.07), 60);
}

function rimMotion(timeLeft: number) {
  const elapsed = GAME_DURATION - timeLeft;
  // phases : 0-15 fixe ; 15-30 lent ; 30-45 medium ; 45-60 rapide
  let amp = 0;
  let speed = 0;
  if (elapsed >= 45) { amp = 100; speed = 0.0035; }
  else if (elapsed >= 30) { amp = 80; speed = 0.0022; }
  else if (elapsed >= 15) { amp = 50; speed = 0.0014; }
  return { amp, speed };
}

export function ShootGame({ user }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [best, setBest] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<ShootLeaderEntry[]>([]);
  const [endResult, setEndResult] = useState<{
    score: number;
    rank: number;
    overtookCoach: boolean;
    overtookPlayer: boolean;
    newBest: boolean;
  } | null>(null);

  // mutable refs
  const ballRef = useRef<Ball>({
    x: W / 2,
    y: H - 60,
    vx: 0,
    vy: 0,
    flying: false,
    resting: true,
    scored: false,
    passedRim: false,
  });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  }>({ active: false, startX: 0, startY: 0, curX: 0, curY: 0 });
  const rimRef = useRef<{ x: number; phase: number }>({ x: W / 2, phase: 0 });
  const scoreRef = useRef(0);
  const timeRef = useRef(GAME_DURATION);
  const statusRef = useRef<typeof status>("idle");
  const fxRef = useRef<FxItem[]>([]);
  const fxIdRef = useRef(1);

  useEffect(() => { statusRef.current = status; }, [status]);

  // Load personal best & leaderboard on mount
  const loadStats = useCallback(async () => {
    try {
      const [b, lb] = await Promise.all([
        fetchPersonalBest(user.id),
        fetchShootLeaderboard(),
      ]);
      setBest(b);
      setLeaderboard(lb);
    } catch {
      /* silent */
    }
  }, [user.id]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const resetBall = useCallback(() => {
    ballRef.current = {
      x: W / 2,
      y: H - 60,
      vx: 0,
      vy: 0,
      flying: false,
      resting: true,
      scored: false,
      passedRim: false,
    };
  }, []);

  const endGame = useCallback(async (finalScore: number) => {
    setStatus("ended");
    statusRef.current = "ended";
    // determine rank
    let rank = 0;
    let overtookCoach = false;
    let overtookPlayer = false;
    try {
      const lbBefore = leaderboard;
      const myPrev = lbBefore.find((e) => e.utilisateur_id === user.id)?.best ?? 0;
      // simulate new leaderboard
      const others = lbBefore.filter((e) => e.utilisateur_id !== user.id);
      const myNew = {
        utilisateur_id: user.id,
        utilisateur_type: user.type,
        nom: user.nom,
        best: Math.max(finalScore, myPrev),
        date: new Date().toISOString(),
      };
      const combined = [...others, myNew].sort((a, b) => b.best - a.best);
      rank = combined.findIndex((e) => e.utilisateur_id === user.id) + 1;
      // overtaking detection: someone of opposite type whose best is strictly less than my new best
      // but was strictly greater than my previous best
      others.forEach((o) => {
        if (o.best < myNew.best && o.best >= myPrev) {
          if (user.type === "joueuse" && o.utilisateur_type === "coach") overtookCoach = true;
          if (user.type === "coach" && o.utilisateur_type === "joueuse") overtookPlayer = true;
        }
      });
      await saveShootScore({
        utilisateur_id: user.id,
        utilisateur_type: user.type,
        nom: user.nom,
        score: finalScore,
      });
      const newBest = finalScore > myPrev;
      setEndResult({ score: finalScore, rank, overtookCoach, overtookPlayer, newBest });
      if (overtookCoach) toast.success("🔥 Tu viens de dépasser un coach au classement !");
      if (overtookPlayer) toast.success("😎 Le coach reprend sa place.");
      await loadStats();
    } catch (e) {
      toast.error("Score non enregistré");
      setEndResult({ score: finalScore, rank: 0, overtookCoach: false, overtookPlayer: false, newBest: false });
    }
  }, [leaderboard, user.id, user.type, user.nom, loadStats]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      const dt = now - last;
      last = now;

      if (statusRef.current === "playing") {
        acc += dt;
        // timer
        while (acc >= 1000) {
          acc -= 1000;
          timeRef.current = Math.max(0, timeRef.current - 1);
          setTimeLeft(timeRef.current);
          if (timeRef.current <= 0) {
            const fs = scoreRef.current;
            void endGame(fs);
            break;
          }
        }
        // physics
        const ball = ballRef.current;
        const { amp, speed } = rimMotion(timeRef.current);
        rimRef.current.phase += dt * speed;
        rimRef.current.x = W / 2 + Math.sin(rimRef.current.phase) * amp;

        if (ball.flying) {
          ball.vy += GRAVITY;
          ball.x += ball.vx;
          ball.y += ball.vy;
          // walls
          if (ball.x < BALL_RADIUS) { ball.x = BALL_RADIUS; ball.vx = -ball.vx * 0.7; soundBounce(); }
          if (ball.x > W - BALL_RADIUS) { ball.x = W - BALL_RADIUS; ball.vx = -ball.vx * 0.7; soundBounce(); }
          // backboard (small rect behind rim)
          const boardX = rimRef.current.x + RIM_HALF + 4;
          const boardY1 = RIM_Y - 60;
          const boardY2 = RIM_Y + 6;
          if (
            ball.x + BALL_RADIUS > boardX &&
            ball.x - BALL_RADIUS < boardX + 8 &&
            ball.y > boardY1 && ball.y < boardY2 &&
            ball.vx > 0
          ) {
            ball.vx = -ball.vx * 0.6;
            ball.x = boardX - BALL_RADIUS;
            soundBounce();
          }
          // rim posts (small circles at edges)
          const posts = [
            { x: rimRef.current.x - RIM_HALF, y: RIM_Y },
            { x: rimRef.current.x + RIM_HALF, y: RIM_Y },
          ];
          for (const p of posts) {
            const dx = ball.x - p.x;
            const dy = ball.y - p.y;
            const d = Math.hypot(dx, dy);
            const min = BALL_RADIUS + 3;
            if (d < min) {
              const nx = dx / (d || 1);
              const ny = dy / (d || 1);
              ball.x = p.x + nx * min;
              ball.y = p.y + ny * min;
              const dot = ball.vx * nx + ball.vy * ny;
              ball.vx = (ball.vx - 2 * dot * nx) * 0.55;
              ball.vy = (ball.vy - 2 * dot * ny) * 0.55;
              soundBounce();
            }
          }
          // detect score: ball center crosses RIM_Y going down, between rim posts
          if (
            !ball.scored &&
            ball.vy > 0 &&
            !ball.passedRim &&
            ball.y >= RIM_Y &&
            ball.y - ball.vy < RIM_Y &&
            ball.x > rimRef.current.x - RIM_HALF + 6 &&
            ball.x < rimRef.current.x + RIM_HALF - 6
          ) {
            ball.scored = true;
            ball.passedRim = true;
            scoreRef.current += 2;
            setScore(scoreRef.current);
            soundSwish();
            fxRef.current.push({
              id: fxIdRef.current++,
              x: rimRef.current.x,
              y: RIM_Y - 20,
              t: 0,
              text: Math.random() < 0.5 ? "SWISH!" : "+2",
            });
          }
          // ground / reset
          if (ball.y > H + 50) {
            resetBall();
          }
        }
        // FX update
        fxRef.current = fxRef.current
          .map((f) => ({ ...f, t: f.t + dt }))
          .filter((f) => f.t < 900);
      }

      // ---- draw ----
      ctx.clearRect(0, 0, W, H);
      // background: court
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "#0a0a0a");
      grd.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // court lines
      ctx.strokeStyle = "rgba(255,140,0,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H - 20, 80, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, H - 200);
      ctx.lineTo(W, H - 200);
      ctx.stroke();
      // mid logo
      ctx.fillStyle = "rgba(255,140,0,0.07)";
      ctx.beginPath();
      ctx.arc(W / 2, H / 2 + 40, 60, 0, Math.PI * 2);
      ctx.fill();

      // backboard
      const rx = rimRef.current.x;
      ctx.fillStyle = "#fff";
      ctx.fillRect(rx + RIM_HALF + 4, RIM_Y - 60, 8, 66);
      ctx.fillStyle = "#ff8c00";
      ctx.fillRect(rx + RIM_HALF + 4, RIM_Y - 30, 8, 30);

      // hoop rim
      ctx.strokeStyle = "#ff5a00";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(rx - RIM_HALF, RIM_Y);
      ctx.lineTo(rx + RIM_HALF, RIM_Y);
      ctx.stroke();
      // net
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      const netSway = Math.sin(performance.now() / 200) * 2;
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const xTop = rx - RIM_HALF + t * (RIM_HALF * 2);
        const xBot = rx - RIM_HALF * 0.65 + t * (RIM_HALF * 1.3) + netSway * (t - 0.5);
        ctx.beginPath();
        ctx.moveTo(xTop, RIM_Y);
        ctx.lineTo(xBot, RIM_Y + NET_HEIGHT);
        ctx.stroke();
      }
      // net horizontal
      ctx.beginPath();
      ctx.moveTo(rx - RIM_HALF * 0.65 + netSway * -0.5, RIM_Y + NET_HEIGHT);
      ctx.lineTo(rx + RIM_HALF * 0.65 + netSway * 0.5, RIM_Y + NET_HEIGHT);
      ctx.stroke();

      // ball
      const b = ballRef.current;
      const grad = ctx.createRadialGradient(b.x - 6, b.y - 6, 4, b.x, b.y, BALL_RADIUS);
      grad.addColorStop(0, "#ffb066");
      grad.addColorStop(1, "#d35400");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a0d00";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.x - BALL_RADIUS + 2, b.y); ctx.lineTo(b.x + BALL_RADIUS - 2, b.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y - BALL_RADIUS + 2); ctx.lineTo(b.x, b.y + BALL_RADIUS - 2); ctx.stroke();

      // aiming trajectory (preview)
      if (dragRef.current.active && !b.flying) {
        const dx = dragRef.current.startX - dragRef.current.curX;
        const dy = dragRef.current.startY - dragRef.current.curY;
        const power = 0.18;
        let px = b.x, py = b.y;
        let pvx = dx * power, pvy = -Math.abs(dy) * power;
        ctx.fillStyle = "rgba(255,180,0,0.6)";
        for (let i = 0; i < 25; i++) {
          pvy += GRAVITY * 0.9;
          px += pvx;
          py += pvy;
          if (py > H) break;
          ctx.beginPath();
          ctx.arc(px, py, 2.5 - i * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // FX text
      fxRef.current.forEach((f) => {
        const alpha = 1 - f.t / 900;
        const offset = f.t * 0.04;
        ctx.fillStyle = `rgba(255,200,0,${alpha})`;
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y - offset);
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [endGame, resetBall]);

  // Pointer handlers
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== "playing") return;
    const ball = ballRef.current;
    if (ball.flying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const d = Math.hypot(x - ball.x, y - ball.y);
    if (d > BALL_RADIUS * 2.5) return;
    dragRef.current = { active: true, startX: x, startY: y, curX: x, curY: y };
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current.curX = ((e.clientX - rect.left) / rect.width) * W;
    dragRef.current.curY = ((e.clientY - rect.top) / rect.height) * H;
  };
  const onPointerUp = () => {
    if (!dragRef.current.active) return;
    const { startX, startY, curX, curY } = dragRef.current;
    dragRef.current.active = false;
    const dx = startX - curX;
    const dy = startY - curY;
    // Only shoot if swiped upward enough
    if (dy < 20) return;
    const power = 0.18;
    const ball = ballRef.current;
    ball.vx = dx * power;
    ball.vy = -Math.abs(dy) * power;
    ball.flying = true;
    ball.resting = false;
    ball.scored = false;
    ball.passedRim = false;
    beep(440, 0.05, "square", 0.05);
  };

  const startGame = () => {
    getAudio()?.resume?.();
    scoreRef.current = 0;
    timeRef.current = GAME_DURATION;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setEndResult(null);
    fxRef.current = [];
    resetBall();
    setStatus("playing");
    statusRef.current = "playing";
  };

  return (
    <div className="px-4 pt-6 pb-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={user.type === "coach" ? "/coach-dashboard" : "/home"}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-card text-foreground"
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">Shoot Challenge</p>
          <h1 className="text-xl font-black">🏀 60 secondes</h1>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-flame text-primary-foreground text-xs font-black">
          {best}
        </div>
      </header>

      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-black shadow-flame">
        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
          <div className="rounded-2xl bg-black/60 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
            ⏱ {String(timeLeft).padStart(2, "0")}s
          </div>
          <div className="rounded-2xl bg-gradient-flame px-4 py-1.5 text-sm font-black text-primary-foreground shadow-flame">
            SCORE {score}
          </div>
          <div className="rounded-2xl bg-black/60 px-3 py-1.5 text-xs font-black text-yellow-300 backdrop-blur">
            ★ {best}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="block w-full touch-none select-none"
          style={{ aspectRatio: `${W}/${H}` }}
        />

        {status !== "playing" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur">
            {status === "idle" && (
              <div className="px-6 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-primary">Prêt(e) ?</p>
                <h2 className="mt-2 text-2xl font-black text-white">Glisse le ballon vers le haut</h2>
                <p className="mt-1 text-sm text-white/70">Vise le panier — 2 pts par swish. 60 secondes.</p>
                <button
                  onClick={startGame}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-flame px-6 py-3 text-sm font-black text-primary-foreground shadow-flame"
                >
                  <Play size={16} /> Démarrer
                </button>
              </div>
            )}
            {status === "ended" && endResult && (
              <div className="w-full max-w-xs rounded-3xl bg-gradient-ink p-5 text-center text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Fin de partie</p>
                <p className="mt-2 text-5xl font-black text-yellow-300">{endResult.score}</p>
                <p className="text-xs text-white/60">points</p>
                {endResult.newBest && (
                  <p className="mt-3 inline-block rounded-full bg-gradient-flame px-3 py-1 text-xs font-black text-primary-foreground">
                    🎉 Nouveau record perso !
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase text-white/60">Record</p>
                    <p className="text-lg font-black">{Math.max(endResult.score, best)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-[10px] uppercase text-white/60">Rang</p>
                    <p className="text-lg font-black">#{endResult.rank || "—"}</p>
                  </div>
                </div>
                {endResult.overtookCoach && (
                  <p className="mt-3 text-sm font-black text-primary">🔥 Tu viens de dépasser un coach !</p>
                )}
                {endResult.overtookPlayer && (
                  <p className="mt-3 text-sm font-black text-primary">😎 Le coach reprend sa place.</p>
                )}
                <button
                  onClick={startGame}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-flame px-5 py-3 text-sm font-black text-primary-foreground shadow-flame"
                >
                  <RotateCcw size={16} /> Rejouer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <section className="mt-6">
        <div className="mb-2 flex items-center gap-2">
          <Trophy size={18} className="text-primary" />
          <h3 className="text-lg font-black">Top Scores</h3>
        </div>
        {leaderboard.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground shadow-card">
            Sois le/la premier(e) à marquer un score !
          </p>
        ) : (
          <ul className="space-y-2">
            {leaderboard.slice(0, 20).map((row, i) => {
              const me = row.utilisateur_id === user.id;
              return (
                <li
                  key={row.utilisateur_id}
                  className={`flex items-center gap-3 rounded-2xl p-3 shadow-card ${
                    me ? "bg-gradient-flame text-primary-foreground" : "bg-card"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-black ${
                      i === 0 ? "bg-yellow-400 text-black" :
                      i === 1 ? "bg-zinc-300 text-black" :
                      i === 2 ? "bg-amber-700 text-white" :
                      me ? "bg-white/30" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">
                      {row.nom}
                      {row.utilisateur_type === "coach" && (
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black ${me ? "bg-black/30" : "bg-secondary text-secondary-foreground"}`}>
                          COACH
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-black">
                    {row.best}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
