import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchPersonalBest,
  fetchShootLeaderboard,
  saveShootScore,
  type ShootLeaderEntry,
  type ShootUserType,
} from "@/lib/shoot";
import { Trophy, RotateCcw, Play, ArrowLeft, Star, Zap, Clock, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  user: { id: string; type: ShootUserType; nom: string };
};

const GAME_DURATION = 60;
const W = 360;
const H = 600;
const GRAVITY = 0.55;
const BALL_RADIUS = 20;
const RIM_Y = 180;
const RIM_HALF = 34;
const NET_HEIGHT = 32;
const COMBO_WINDOW = 5000; // ms between baskets to keep combo alive

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  flying: boolean;
  resting: boolean;
  scored: boolean;
  passedRim: boolean;
};

type FxItem = { id: number; x: number; y: number; t: number; text: string; color: string };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type ComboFx = { id: number; t: number; mult: number } | null;

// --- Audio ---
let audioCtx: AudioContext | null = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch { return null; }
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
  osc.connect(g); g.connect(ctx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration + 0.02);
}
const soundBounce = () => beep(180, 0.05, "triangle", 0.04);
const soundSwish = () => { beep(880, 0.08, "sine", 0.08); setTimeout(() => beep(1320, 0.1, "sine", 0.07), 60); };
const soundCombo = (n: number) => { beep(660 + n * 80, 0.1, "sawtooth", 0.07); setTimeout(() => beep(990 + n * 80, 0.12, "square", 0.06), 80); };

function rimMotion(timeLeft: number) {
  const elapsed = GAME_DURATION - timeLeft;
  let amp = 0, speed = 0;
  if (elapsed >= 45) { amp = 110; speed = 0.0038; }
  else if (elapsed >= 30) { amp = 85; speed = 0.0024; }
  else if (elapsed >= 15) { amp = 55; speed = 0.0015; }
  return { amp, speed };
}

const starsFromScore = (s: number) => Math.min(5, Math.floor(s / 12));

export function ShootGame({ user }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "ended">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [best, setBest] = useState<number>(0);
  const [combo, setCombo] = useState(0);
  const [leaderboard, setLeaderboard] = useState<ShootLeaderEntry[]>([]);
  const [endResult, setEndResult] = useState<{
    score: number; rank: number; teamRank: number; stars: number;
    overtookCoach: boolean; overtookPlayer: boolean; newBest: boolean;
  } | null>(null);

  const ballRef = useRef<Ball>({
    x: W / 2, y: H - 80, vx: 0, vy: 0, rot: 0, vrot: 0,
    flying: false, resting: true, scored: false, passedRim: false,
  });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, curX: 0, curY: 0 });
  const rimRef = useRef({ x: W / 2, phase: 0, shake: 0, netSway: 0 });
  const scoreRef = useRef(0);
  const timeRef = useRef(GAME_DURATION);
  const statusRef = useRef<typeof status>("idle");
  const fxRef = useRef<FxItem[]>([]);
  const fxIdRef = useRef(1);
  const particlesRef = useRef<Particle[]>([]);
  const lastBasketRef = useRef(0);
  const comboRef = useRef(0);
  const comboFxRef = useRef<ComboFx>(null);
  const flashRef = useRef(0);

  useEffect(() => { statusRef.current = status; }, [status]);

  const loadStats = useCallback(async () => {
    try {
      const [b, lb] = await Promise.all([fetchPersonalBest(user.id), fetchShootLeaderboard()]);
      setBest(b); setLeaderboard(lb);
    } catch { /* silent */ }
  }, [user.id]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const resetBall = useCallback(() => {
    ballRef.current = {
      x: W / 2, y: H - 80, vx: 0, vy: 0, rot: 0, vrot: 0,
      flying: false, resting: true, scored: false, passedRim: false,
    };
  }, []);

  const spawnSwishParticles = (x: number, y: number) => {
    const colors = ["#ffb84a", "#ff6a00", "#ffd86b", "#ffffff"];
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 * i) / 28 + Math.random() * 0.2;
      const sp = 2 + Math.random() * 4;
      particlesRef.current.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: 0, max: 600 + Math.random() * 300,
        color: colors[i % colors.length], size: 2 + Math.random() * 3,
      });
    }
  };

  const endGame = useCallback(async (finalScore: number) => {
    setStatus("ended"); statusRef.current = "ended";
    let rank = 0, teamRank = 0;
    let overtookCoach = false, overtookPlayer = false;
    try {
      const lbBefore = leaderboard;
      const myPrev = lbBefore.find((e) => e.utilisateur_id === user.id)?.best ?? 0;
      const others = lbBefore.filter((e) => e.utilisateur_id !== user.id);
      const myNew = {
        utilisateur_id: user.id, utilisateur_type: user.type, nom: user.nom,
        best: Math.max(finalScore, myPrev), date: new Date().toISOString(),
      };
      const combined = [...others, myNew].sort((a, b) => b.best - a.best);
      rank = combined.findIndex((e) => e.utilisateur_id === user.id) + 1;
      const team = combined.filter((e) => e.utilisateur_type === "joueuse");
      teamRank = team.findIndex((e) => e.utilisateur_id === user.id) + 1;
      others.forEach((o) => {
        if (o.best < myNew.best && o.best >= myPrev) {
          if (user.type === "joueuse" && o.utilisateur_type === "coach") overtookCoach = true;
          if (user.type === "coach" && o.utilisateur_type === "joueuse") overtookPlayer = true;
        }
      });
      await saveShootScore({
        utilisateur_id: user.id, utilisateur_type: user.type,
        nom: user.nom, score: finalScore,
      });
      const newBest = finalScore > myPrev;
      const stars = starsFromScore(finalScore);
      setEndResult({ score: finalScore, rank, teamRank, stars, overtookCoach, overtookPlayer, newBest });
      if (overtookCoach) toast.success("🔥 Tu viens de dépasser un coach au classement !");
      if (overtookPlayer) toast.success("😎 Le coach reprend sa place.");
      await loadStats();
    } catch {
      toast.error("Score non enregistré");
      setEndResult({ score: finalScore, rank: 0, teamRank: 0, stars: starsFromScore(finalScore), overtookCoach: false, overtookPlayer: false, newBest: false });
    }
  }, [leaderboard, user.id, user.type, user.nom, loadStats]);

  // Main loop
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
        while (acc >= 1000) {
          acc -= 1000;
          timeRef.current = Math.max(0, timeRef.current - 1);
          setTimeLeft(timeRef.current);
          if (timeRef.current <= 0) { void endGame(scoreRef.current); break; }
        }

        // Combo expiry
        if (comboRef.current > 0 && now - lastBasketRef.current > COMBO_WINDOW) {
          comboRef.current = 0;
          setCombo(0);
        }

        const ball = ballRef.current;
        const { amp, speed } = rimMotion(timeRef.current);
        rimRef.current.phase += dt * speed;
        rimRef.current.x = W / 2 + Math.sin(rimRef.current.phase) * amp;
        rimRef.current.shake = Math.max(0, rimRef.current.shake - dt * 0.008);
        rimRef.current.netSway = Math.max(0, rimRef.current.netSway - dt * 0.004);

        if (ball.flying) {
          ball.vy += GRAVITY;
          ball.x += ball.vx;
          ball.y += ball.vy;
          ball.rot += ball.vrot;
          if (ball.x < BALL_RADIUS) { ball.x = BALL_RADIUS; ball.vx = -ball.vx * 0.7; soundBounce(); }
          if (ball.x > W - BALL_RADIUS) { ball.x = W - BALL_RADIUS; ball.vx = -ball.vx * 0.7; soundBounce(); }

          const boardX = rimRef.current.x + RIM_HALF + 4;
          if (
            ball.x + BALL_RADIUS > boardX &&
            ball.x - BALL_RADIUS < boardX + 8 &&
            ball.y > RIM_Y - 70 && ball.y < RIM_Y + 6 && ball.vx > 0
          ) {
            ball.vx = -ball.vx * 0.6; ball.x = boardX - BALL_RADIUS; soundBounce();
          }

          const posts = [
            { x: rimRef.current.x - RIM_HALF, y: RIM_Y },
            { x: rimRef.current.x + RIM_HALF, y: RIM_Y },
          ];
          for (const p of posts) {
            const dx = ball.x - p.x; const dy = ball.y - p.y;
            const d = Math.hypot(dx, dy); const min = BALL_RADIUS + 3;
            if (d < min) {
              const nx = dx / (d || 1); const ny = dy / (d || 1);
              ball.x = p.x + nx * min; ball.y = p.y + ny * min;
              const dot = ball.vx * nx + ball.vy * ny;
              ball.vx = (ball.vx - 2 * dot * nx) * 0.55;
              ball.vy = (ball.vy - 2 * dot * ny) * 0.55;
              soundBounce();
            }
          }

          if (
            !ball.scored && ball.vy > 0 && !ball.passedRim &&
            ball.y >= RIM_Y && ball.y - ball.vy < RIM_Y &&
            ball.x > rimRef.current.x - RIM_HALF + 6 &&
            ball.x < rimRef.current.x + RIM_HALF - 6
          ) {
            ball.scored = true; ball.passedRim = true;
            // Combo
            const nowT = performance.now();
            if (nowT - lastBasketRef.current < COMBO_WINDOW) comboRef.current += 1;
            else comboRef.current = 1;
            lastBasketRef.current = nowT;
            const mult = comboRef.current >= 5 ? 5 : comboRef.current >= 3 ? 3 : comboRef.current >= 2 ? 2 : 1;
            const pts = 2 * mult;
            scoreRef.current += pts;
            setScore(scoreRef.current);
            setCombo(comboRef.current);
            soundSwish();
            if (mult > 1) { soundCombo(mult); comboFxRef.current = { id: fxIdRef.current++, t: 0, mult }; }
            flashRef.current = 1;
            rimRef.current.shake = 1;
            rimRef.current.netSway = 1;
            spawnSwishParticles(rimRef.current.x, RIM_Y + 6);
            fxRef.current.push({
              id: fxIdRef.current++,
              x: rimRef.current.x, y: RIM_Y - 20, t: 0,
              text: mult > 1 ? `+${pts} 🔥` : (Math.random() < 0.5 ? "SWISH!" : "+2"),
              color: mult >= 5 ? "#ff3b3b" : mult >= 3 ? "#ffb84a" : "#ffd86b",
            });
          }

          if (ball.y > H + 50) {
            // Missed shot resets combo if the basket was the cause of last update
            if (performance.now() - lastBasketRef.current > 300) {
              comboRef.current = 0;
              setCombo(0);
            }
            resetBall();
          }
        }

        // particles
        particlesRef.current = particlesRef.current
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.12, life: p.life + dt }))
          .filter((p) => p.life < p.max);

        fxRef.current = fxRef.current
          .map((f) => ({ ...f, t: f.t + dt }))
          .filter((f) => f.t < 900);

        if (comboFxRef.current) {
          comboFxRef.current.t += dt;
          if (comboFxRef.current.t > 1100) comboFxRef.current = null;
        }
        flashRef.current = Math.max(0, flashRef.current - dt * 0.004);
      }

      // ---- DRAW ----
      ctx.clearRect(0, 0, W, H);

      // 1. Arena background (deep night gymnasium)
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a0612");
      bg.addColorStop(0.45, "#1a0d0a");
      bg.addColorStop(1, "#050505");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Neon arena halo
      const halo = ctx.createRadialGradient(W / 2, 90, 10, W / 2, 90, 260);
      halo.addColorStop(0, "rgba(255,140,0,0.35)");
      halo.addColorStop(1, "rgba(255,140,0,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, 260);

      // Spotlights from ceiling
      for (let i = 0; i < 3; i++) {
        const cx = (W / 4) * (i + 1);
        const g = ctx.createLinearGradient(cx, 0, cx, 280);
        g.addColorStop(0, "rgba(255,255,255,0.10)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - 6, 0); ctx.lineTo(cx + 6, 0);
        ctx.lineTo(cx + 50, 280); ctx.lineTo(cx - 50, 280);
        ctx.closePath(); ctx.fill();
      }

      // Crowd silhouettes
      ctx.fillStyle = "#0d0a08";
      ctx.fillRect(0, 240, W, 90);
      for (let i = 0; i < 22; i++) {
        const cx = (i * 18) + 6 + Math.sin(i) * 3;
        const cy = 245 + (i % 3) * 8;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
      }

      // 2. Court with perspective (trapezoid)
      const courtTop = 320;
      const courtTopW = 240;
      ctx.save();
      const courtGrad = ctx.createLinearGradient(0, courtTop, 0, H);
      courtGrad.addColorStop(0, "#3a1f0a");
      courtGrad.addColorStop(1, "#1a0d05");
      ctx.fillStyle = courtGrad;
      ctx.beginPath();
      ctx.moveTo(W / 2 - courtTopW / 2, courtTop);
      ctx.lineTo(W / 2 + courtTopW / 2, courtTop);
      ctx.lineTo(W + 40, H);
      ctx.lineTo(-40, H);
      ctx.closePath(); ctx.fill();

      // Court lines
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      // Free throw / paint lines (perspective)
      ctx.beginPath();
      ctx.moveTo(W / 2 - 60, courtTop + 40);
      ctx.lineTo(W / 2 + 60, courtTop + 40);
      ctx.stroke();
      // 3-point arc (perspective ellipse)
      ctx.beginPath();
      ctx.ellipse(W / 2, H - 60, 150, 50, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
      // free throw circle
      ctx.strokeStyle = "rgba(255,140,0,0.7)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(W / 2, H - 95, 70, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner glow shoot zone
      const zoneGrad = ctx.createRadialGradient(W / 2, H - 95, 5, W / 2, H - 95, 90);
      zoneGrad.addColorStop(0, "rgba(255,140,0,0.35)");
      zoneGrad.addColorStop(1, "rgba(255,140,0,0)");
      ctx.fillStyle = zoneGrad;
      ctx.beginPath();
      ctx.ellipse(W / 2, H - 95, 70, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Backboard with depth
      const rx = rimRef.current.x + (Math.random() - 0.5) * rimRef.current.shake * 2;
      const boardX = rx + RIM_HALF + 4;
      // pole
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(boardX + 6, RIM_Y - 100, 4, 320);
      // backboard shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(boardX + 3, RIM_Y - 70, 12, 80);
      // backboard white
      const bbGrad = ctx.createLinearGradient(boardX, RIM_Y - 70, boardX + 8, RIM_Y);
      bbGrad.addColorStop(0, "#ffffff");
      bbGrad.addColorStop(1, "#d6d6d6");
      ctx.fillStyle = bbGrad;
      ctx.fillRect(boardX, RIM_Y - 70, 8, 76);
      // square target
      ctx.strokeStyle = "#ff6a00";
      ctx.lineWidth = 2;
      ctx.strokeRect(boardX - 2, RIM_Y - 36, 12, 28);

      // 4. Rim (ellipse for depth)
      ctx.save();
      ctx.translate(rx, RIM_Y);
      // rim shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(0, 4, RIM_HALF, 6, 0, 0, Math.PI * 2); ctx.fill();
      // rim back
      ctx.strokeStyle = "#a82800";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, RIM_HALF, 6, 0, Math.PI, 2 * Math.PI); ctx.stroke();
      // rim front
      ctx.strokeStyle = "#ff5a00";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, RIM_HALF, 6, 0, 0, Math.PI); ctx.stroke();
      // rim highlight
      ctx.strokeStyle = "#ffb066";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, -1, RIM_HALF - 1, 5, 0, Math.PI, 2 * Math.PI); ctx.stroke();
      ctx.restore();

      // 5. Net (animated)
      const sway = Math.sin(performance.now() / 150) * (1 + rimRef.current.netSway * 4);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.2;
      const strands = 9;
      for (let i = 0; i <= strands; i++) {
        const t = i / strands;
        const xTop = rx - RIM_HALF + t * (RIM_HALF * 2);
        const xBot = rx - RIM_HALF * 0.55 + t * (RIM_HALF * 1.1) + sway * (t - 0.5);
        const yBot = RIM_Y + NET_HEIGHT + rimRef.current.netSway * 4;
        ctx.beginPath();
        ctx.moveTo(xTop, RIM_Y + 2);
        ctx.quadraticCurveTo((xTop + xBot) / 2 + sway * 0.5, RIM_Y + NET_HEIGHT * 0.6, xBot, yBot);
        ctx.stroke();
      }
      // horizontal net rings
      for (let r = 1; r <= 3; r++) {
        const y = RIM_Y + (NET_HEIGHT / 3) * r;
        const wRing = RIM_HALF - r * 4;
        ctx.beginPath();
        ctx.ellipse(rx + sway * 0.3, y, wRing, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 6. Particles
      particlesRef.current.forEach((p) => {
        const alpha = 1 - p.life / p.max;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 7. Aiming trajectory
      const b = ballRef.current;
      if (dragRef.current.active && !b.flying) {
        const dx = dragRef.current.startX - dragRef.current.curX;
        const dy = dragRef.current.startY - dragRef.current.curY;
        const power = 0.18;
        let px = b.x, py = b.y;
        let pvx = dx * power, pvy = -Math.abs(dy) * power;
        for (let i = 0; i < 28; i++) {
          pvy += GRAVITY * 0.9; px += pvx; py += pvy;
          if (py > H) break;
          ctx.fillStyle = `rgba(255,180,0,${0.7 - i * 0.022})`;
          ctx.beginPath();
          ctx.arc(px, py, 3 - i * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 8. Ball with shadow + rotation
      // shadow on the floor
      const shadowY = Math.min(H - 30, Math.max(b.y + 50, b.y));
      const shadowScale = b.flying ? Math.max(0.4, 1 - (H - b.y) / H) : 1;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(b.x, H - 30, BALL_RADIUS * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      // ball body
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      const ballGrad = ctx.createRadialGradient(-6, -6, 4, 0, 0, BALL_RADIUS);
      ballGrad.addColorStop(0, "#ffc285");
      ballGrad.addColorStop(0.6, "#e8761d");
      ballGrad.addColorStop(1, "#8a3a08");
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
      // seams
      ctx.strokeStyle = "#1a0a00";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-BALL_RADIUS + 2, 0); ctx.lineTo(BALL_RADIUS - 2, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -BALL_RADIUS + 2); ctx.lineTo(0, BALL_RADIUS - 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS - 2, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS - 2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      // highlight
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(-7, -8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // 9. FX text
      fxRef.current.forEach((f) => {
        const alpha = 1 - f.t / 900;
        const offset = f.t * 0.06;
        const scale = 1 + Math.min(0.4, f.t / 600);
        ctx.save();
        ctx.translate(f.x, f.y - offset);
        ctx.scale(scale, scale);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = alpha;
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      // 10. Combo banner
      if (comboFxRef.current) {
        const t = comboFxRef.current.t;
        const k = Math.min(1, t / 200);
        const fade = t > 800 ? Math.max(0, 1 - (t - 800) / 300) : 1;
        const scale = 0.4 + k * 0.8;
        const m = comboFxRef.current.mult;
        ctx.save();
        ctx.translate(W / 2, H / 2 - 40);
        ctx.scale(scale, scale);
        ctx.globalAlpha = fade;
        const grad = ctx.createLinearGradient(-100, 0, 100, 0);
        grad.addColorStop(0, "#ff3b00");
        grad.addColorStop(1, "#ffd700");
        ctx.fillStyle = grad;
        ctx.font = "900 56px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(255,140,0,0.8)";
        ctx.shadowBlur = 24;
        ctx.fillText(`COMBO x${m}`, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // 11. Score flash
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255,200,80,${flashRef.current * 0.18})`;
        ctx.fillRect(0, 0, W, H);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [endGame, resetBall]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== "playing") return;
    const ball = ballRef.current;
    if (ball.flying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const d = Math.hypot(x - ball.x, y - ball.y);
    if (d > BALL_RADIUS * 3) return;
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
    const dx = startX - curX; const dy = startY - curY;
    if (dy < 20) return;
    const power = 0.18;
    const ball = ballRef.current;
    ball.vx = dx * power; ball.vy = -Math.abs(dy) * power;
    ball.vrot = ball.vx * 0.03;
    ball.flying = true; ball.resting = false;
    ball.scored = false; ball.passedRim = false;
    beep(440, 0.05, "square", 0.05);
  };

  const startGame = () => {
    getAudio()?.resume?.();
    scoreRef.current = 0; timeRef.current = GAME_DURATION;
    setScore(0); setTimeLeft(GAME_DURATION); setCombo(0);
    setEndResult(null);
    fxRef.current = []; particlesRef.current = []; comboFxRef.current = null;
    comboRef.current = 0; lastBasketRef.current = 0; flashRef.current = 0;
    resetBall();
    setStatus("playing"); statusRef.current = "playing";
  };

  const liveStars = starsFromScore(score);
  const timePct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className="px-4 pt-6 pb-10 min-h-screen bg-gradient-to-b from-background to-black">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={user.type === "coach" ? "/coach-dashboard" : "/home"}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-card text-foreground shadow-card"
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Shoot Challenge</p>
          <h1 className="text-xl font-black">🏀 60 secondes</h1>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-flame text-primary-foreground text-xs font-black shadow-flame">
          {best}
        </div>
      </header>

      {/* HUD badges */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <div className="rounded-2xl border border-primary/30 bg-black/70 p-2 text-center backdrop-blur">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-primary"><Clock size={10} /> Temps</div>
          <p className="text-lg font-black text-white tabular-nums">{String(timeLeft).padStart(2, "0")}s</p>
        </div>
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/30 to-black p-2 text-center backdrop-blur">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-primary"><Target size={10} /> Score</div>
          <p className="text-lg font-black text-white tabular-nums">{score}</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/30 bg-black/70 p-2 text-center backdrop-blur">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-yellow-400"><Trophy size={10} /> Record</div>
          <p className="text-lg font-black text-yellow-300 tabular-nums">{Math.max(best, score)}</p>
        </div>
        <div className="rounded-2xl border border-yellow-400/30 bg-black/70 p-2 text-center backdrop-blur">
          <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-yellow-400"><Star size={10} /> Étoiles</div>
          <p className="text-lg font-black text-yellow-300 tabular-nums">{liveStars}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-black/60 border border-primary/20">
        <div
          className="h-full bg-gradient-to-r from-primary via-orange-400 to-yellow-300 transition-[width] duration-300"
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Combo pill */}
      {combo >= 2 && status === "playing" && (
        <div className="mb-2 flex items-center justify-center">
          <div className="animate-pulse rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-1 text-xs font-black text-black shadow-flame">
            <Zap size={12} className="inline -mt-0.5 mr-1" />
            COMBO x{combo >= 5 ? 5 : combo >= 3 ? 3 : 2}
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-black shadow-flame">
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
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            {status === "idle" && (
              <div className="px-6 text-center animate-scale-in">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Prêt(e) ?</p>
                <h2 className="mt-2 text-3xl font-black text-white drop-shadow-[0_0_18px_rgba(255,140,0,0.6)]">
                  GLISSE & SHOOT
                </h2>
                <p className="mt-2 text-sm text-white/70">Vise le panier — combo & swish pour exploser ton score.</p>
                <div className="mt-3 flex justify-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/60">
                  <span className="rounded-full bg-white/10 px-2 py-1">+2 par panier</span>
                  <span className="rounded-full bg-orange-500/20 px-2 py-1 text-orange-300">x2 · x3 · x5</span>
                </div>
                <button
                  onClick={startGame}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-flame px-8 py-3.5 text-sm font-black text-primary-foreground shadow-flame hover-scale"
                >
                  <Play size={16} /> Démarrer
                </button>
              </div>
            )}
            {status === "ended" && endResult && (
              <div className="w-full max-w-xs animate-scale-in rounded-3xl bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-5 text-center text-white border border-primary/30 shadow-flame">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Fin de partie</p>
                <p className="mt-3 text-6xl font-black bg-gradient-to-b from-yellow-200 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,180,0,0.5)]">
                  {endResult.score}
                </p>
                <p className="text-xs text-white/60">points</p>

                {/* Stars */}
                <div className="mt-3 flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={22}
                      className={i <= endResult.stars ? "fill-yellow-300 text-yellow-300 drop-shadow-[0_0_6px_rgba(255,200,0,0.7)]" : "text-white/15"}
                    />
                  ))}
                </div>

                {endResult.newBest && (
                  <p className="mt-3 inline-block rounded-full bg-gradient-flame px-3 py-1 text-xs font-black text-primary-foreground animate-pulse">
                    🎉 Nouveau record perso !
                  </p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2 text-left">
                  <div className="rounded-2xl bg-white/5 p-2 text-center">
                    <p className="text-[9px] uppercase text-white/60">Record</p>
                    <p className="text-base font-black">{Math.max(endResult.score, best)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-2 text-center">
                    <p className="text-[9px] uppercase text-white/60">Global</p>
                    <p className="text-base font-black">#{endResult.rank || "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-2 text-center">
                    <p className="text-[9px] uppercase text-white/60">Équipe</p>
                    <p className="text-base font-black">#{endResult.teamRank || "—"}</p>
                  </div>
                </div>
                {endResult.overtookCoach && (
                  <p className="mt-3 text-sm font-black text-primary">🔥 Tu viens de dépasser un coach !</p>
                )}
                {endResult.overtookPlayer && (
                  <p className="mt-3 text-sm font-black text-primary">😎 Le coach reprend sa place.</p>
                )}
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={startGame}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-flame px-5 py-3 text-sm font-black text-primary-foreground shadow-flame hover-scale"
                  >
                    <RotateCcw size={16} /> Rejouer
                  </button>
                  <Link
                    to={user.type === "coach" ? "/coach-dashboard" : "/home"}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-black text-white hover-scale"
                  >
                    Retour
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <section className="mt-6 animate-fade-in">
        <div className="mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-primary" />
          <h3 className="text-lg font-black">Top 10</h3>
        </div>
        {leaderboard.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground shadow-card">
            Sois le/la premier(e) à marquer un score !
          </p>
        ) : (
          <ul className="space-y-2">
            {leaderboard.slice(0, 10).map((row, i) => {
              const me = row.utilisateur_id === user.id;
              const initial = (row.nom?.[0] || "?").toUpperCase();
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li
                  key={row.utilisateur_id}
                  className={`flex items-center gap-3 rounded-2xl p-3 shadow-card transition-transform hover-scale ${
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
                    {medal ?? i + 1}
                  </span>
                  <div className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${me ? "bg-black/30 text-white" : "bg-gradient-to-br from-primary/80 to-orange-700 text-white"}`}>
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">
                      {row.nom}
                      {row.utilisateur_type === "coach" && (
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black ${me ? "bg-black/30" : "bg-secondary text-secondary-foreground"}`}>
                          COACH
                        </span>
                      )}
                    </p>
                    <p className={`text-[10px] ${me ? "text-white/80" : "text-muted-foreground"}`}>Rang #{i + 1}</p>
                  </div>
                  <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-black tabular-nums">
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
