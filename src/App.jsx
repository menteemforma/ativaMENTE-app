import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from "firebase/storage";
import {
  BarChart3,
  Brain,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Dumbbell,
  Flag,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  NotebookPen,
  Search,
  Square,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Utensils,
  X,
  Zap,
} from "lucide-react";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const appId = import.meta.env.VITE_APP_ID || "ativamente";
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// --- CONSTANTES ---
const FRASES_ROBERTIANAS = [
  "Troque o P de perfeição pelo P de progresso.",
  "Repetição é a chave para o sucesso num processo de mudança.",
  "É a atitude que gera ânimo e o crédito próprio.",
  "Torne-se disponível.",
  "A autorregulação começa pela desautomatização.",
  "É impossível conquistar resultados diferentes se continuarmos fazendo tudo igual.",
  "Sem planejamento não há sucesso.",
  "O seu pior inimigo é o piloto automático.",
  "Precisamos aprender a pensar com consciência.",
  "Só existe autocontrole em ambientes de calma interna.",
];

const MOODS = [
  { id: "feliz", label: "Feliz", emoji: "😊" },
  { id: "calmo", label: "Calmo", emoji: "😌" },
  { id: "ansioso", label: "Ansioso", emoji: "😰" },
  { id: "triste", label: "Triste", emoji: "😢" },
  { id: "estressado", label: "Estressado", emoji: "😠" },
];

const MEAL_TYPES = [
  { label: "Café", id: "breakfast", icon: <Coffee size={18} /> },
  { label: "Lanche", id: "snack1", icon: <Zap size={18} /> },
  { label: "Almoço", id: "lunch", icon: <Sun size={18} /> },
  { label: "Lanche", id: "snack2", icon: <Zap size={18} /> },
  { label: "Jantar", id: "dinner", icon: <Moon size={18} /> },
  { label: "Ceia", id: "supper", icon: <Clock size={18} /> },
];

const EXERCISE_OPTIONS = [
  { id: "caminhada", label: "Caminhada", emoji: "🚶" },
  { id: "corrida", label: "Corrida", emoji: "🏃" },
  { id: "musculacao", label: "Musculação", emoji: "🏋️" },
  { id: "natacao", label: "Natação", emoji: "🏊" },
  { id: "ciclismo", label: "Ciclismo", emoji: "🚴" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
  { id: "pilates", label: "Pilates", emoji: "🤸" },
  { id: "danca", label: "Dança", emoji: "💃" },
  { id: "futebol", label: "Futebol", emoji: "⚽" },
  { id: "funcional", label: "Funcional", emoji: "⚡" },
  { id: "alongamento", label: "Alongamento", emoji: "🙆" },
  { id: "outro", label: "Outro", emoji: "🏅" },
];

// FIX 8: GOAL_OPTIONS agora usados no select do diagnóstico
const GOAL_OPTIONS = [
  "Beber mais água",
  "Comer com mais calma",
  "Fazer atividade física",
  "Evitar beliscar por impulso",
  "Dormir melhor",
  "Planejar minhas refeições",
  "Escrever no diário",
  "Praticar autocuidado",
];

const REQUIRED_DIAG_FIELDS = [
  "name",
  "whatsapp",
  "weight",
  "targetWeight",
  "height",
  "age",
  "gender",
  "activity",
  "dailyGoal",
  "weeklyGoal",
  "monthlyGoal",
  "weightUnit",
];

// --- HELPERS ---
function normalizeWhatsApp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function formatWhatsAppDisplay(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 2) return `+${digits}`;
  return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
}

function formatAuthError(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/missing-password": "Digite sua senha.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/popup-closed-by-user": "O login com Google foi fechado antes de concluir.",
    "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase Auth.",
    "auth/network-request-failed": "Falha de rede. Tente novamente.",
  };
  return map[code] || "Não foi possível concluir a autenticação.";
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDailyQuote() {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 0);
  const diff = today - yearStart;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return FRASES_ROBERTIANAS[dayOfYear % FRASES_ROBERTIANAS.length];
}

function kgToLb(value) {
  return Number(value || 0) * 2.20462;
}

function lbToKg(value) {
  return Number(value || 0) / 2.20462;
}

function convertWeightForStorage(value, unit) {
  return unit === "lb"
    ? Number(lbToKg(value).toFixed(2))
    : Number(value || 0);
}

function convertWeightForDisplay(valueKg, unit) {
  return unit === "lb"
    ? Number(kgToLb(valueKg).toFixed(1))
    : Number(Number(valueKg || 0).toFixed(1));
}

function formatWeight(valueKg, unit = "kg") {
  const value = convertWeightForDisplay(valueKg, unit);
  return `${value.toFixed(1)} ${unit === "lb" ? "lb" : "kg"}`;
}

function calculateUserMetrics(userData) {
  if (!userData?.weight || !userData?.height || !userData?.age) {
    return { imc: 0, bmr: 0, tdee: 0, targetCal: 2000 };
  }
  const weight = Number(userData.weight);
  const height = Number(userData.height);
  const age = Number(userData.age);
  const gender = userData.gender;
  const targetWeight = Number(userData.targetWeight || weight);
  const imc = Number((weight / ((height / 100) ** 2)).toFixed(1));
  const bmr =
    gender === "male"
      ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
      : 447.59 + 9.2 * weight + 3.1 * height - 4.3 * age;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  const tdee = Math.round(bmr * (multipliers[userData.activity] || 1.2));
  const adjustedTarget = targetWeight < weight ? tdee - 500 : tdee;
  const targetCal = Math.max(1200, adjustedTarget);
  return { imc, bmr: Math.round(bmr), tdee, targetCal };
}

function isDiagnosisComplete(form) {
  return REQUIRED_DIAG_FIELDS.every((field) => {
    const value = form[field];
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    return String(value || "").trim().length > 0;
  });
}

function formatLongDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function formatTime(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// FIX 1 + FIX 2: compatibilidade retroativa com logs salvos sem dateKey
function matchesDate(log, key) {
  if (log.dateKey) return log.dateKey === key;
  return String(log.timestamp || "").slice(0, 10) === key;
}

// FIX 3: getWeekSeries agora usa matchesDate — logs antigos aparecem nos gráficos
function getWeekSeries(logs, type) {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = formatDateKey(date);
    const dayLogs = logs.filter((log) => matchesDate(log, key) && log.type === type);
    let value = 0;
    if (type === "food") {
      value = dayLogs.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
    }
    if (type === "exercise") {
      value = dayLogs.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
    }
    if (type === "weight") {
      const latest = dayLogs.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      value = Number(latest?.weight || 0);
    }
    days.push({
      key,
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
        .format(date)
        .replace(".", ""),
      value,
    });
  }
  return days;
}

function buildPolylinePoints(series, height = 120, width = 280) {
  const values = series.map((item) => Number(item.value) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return series
    .map((item, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - ((item.value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function estimateCaloriesFallback(text) {
  const content = String(text || "").toLowerCase();
  const rules = [
    { words: ["salada", "legumes", "verduras"], value: 180 },
    { words: ["frango", "arroz", "feijão"], value: 420 },
    { words: ["hamburg", "batata", "pizza", "pastel"], value: 650 },
    { words: ["bolo", "doce", "sorvete", "chocolate"], value: 320 },
    { words: ["café", "pão", "ovo"], value: 280 },
  ];
  const match = rules.find((rule) =>
    rule.words.some((word) => content.includes(word))
  );
  return match?.value || 350;
}

function medalFromPoints(points) {
  if (points >= 80) return { label: "Ouro", color: "text-amber-500", bg: "bg-amber-50" };
  if (points >= 45) return { label: "Prata", color: "text-slate-500", bg: "bg-slate-100" };
  return { label: "Bronze", color: "text-orange-700", bg: "bg-orange-50" };
}

function getDailyStats(dayLogs, targetCal) {
  const foodCalories = dayLogs
    .filter((item) => item.type === "food")
    .reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
  const exerciseMinutes = dayLogs
    .filter((item) => item.type === "exercise")
    .reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);
  const weightLogs = dayLogs.filter((item) => item.type === "weight");
  const latestWeight = weightLogs.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )[0];
  const diaryEntry = dayLogs.find((item) => item.type === "journal");
  // FIX 4: .find() em lista já ordenada por timestamp desc → pega o mais recente
  const goalStatus = dayLogs.find((item) => item.type === "goalStatus");

  let points = 0;
  if (foodCalories > 0) points += 20;
  if (exerciseMinutes > 0) points += 20;
  if (diaryEntry?.content) points += 20;
  if (latestWeight?.weight) points += 20;
  if (goalStatus?.completed === true) points += 20;
  if (goalStatus?.completed === false) points += 5;
  if (targetCal && foodCalories > 0 && foodCalories <= targetCal) points += 10;

  return {
    foodCalories,
    exerciseMinutes,
    latestWeight,
    diaryEntry,
    goalStatus,
    points: Math.min(points, 100),
  };
}

// --- COMPONENTES ---

function AuthPage({
  authMode,
  setAuthMode,
  onGoogle,
  onAuth,
  email,
  setEmail,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  error,
  authLoading,
}) {
  return (
    <div className="min-h-screen bg-emerald-600 text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-white/10 w-24 h-24 rounded-[40px] flex items-center justify-center mb-8 border border-white/20 shadow-2xl">
        <Brain size={56} className="text-white" />
      </div>

      <div className="mb-10 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100 opacity-80">
          Seja Bem-Vindo ao AtivaMENTE
        </p>
        <h1 className="text-5xl font-black tracking-tighter leading-none">
          <span className="text-slate-300">Ativa</span>
          <span className="text-white font-black">MENTE</span>
        </h1>
        <p className="text-sm italic opacity-80 font-medium tracking-wide">
          App do Mente em Forma
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <button
          type="button"
          onClick={onGoogle}
          disabled={authLoading}
          className="w-full bg-white text-emerald-700 p-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all disabled:opacity-70"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Entrar com Google
        </button>

        <div className="flex items-center gap-4 my-2 opacity-30">
          <div className="h-px bg-white flex-1" />
          <span className="text-[8px] font-bold">OU</span>
          <div className="h-px bg-white flex-1" />
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold placeholder-white/30 text-white outline-none text-center"
          placeholder="E-mail"
          autoComplete="email"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold placeholder-white/30 text-white outline-none text-center"
          placeholder="Senha"
          autoComplete={authMode === "login" ? "current-password" : "new-password"}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAuth();
          }}
        />

        <button
          type="button"
          onClick={() => setRememberMe(!rememberMe)}
          className="flex items-center gap-2 text-[10px] font-black uppercase opacity-80 transition-all ml-1"
        >
          {rememberMe ? <CheckSquare size={16} /> : <Square size={16} />}
          Salvar e-mail
        </button>

        {error ? (
          <div className="bg-rose-500/20 p-3 rounded-xl text-[10px] font-black uppercase text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={authLoading}
          onClick={onAuth}
          className="w-full bg-white text-emerald-700 p-5 rounded-3xl font-black uppercase shadow-xl text-xs disabled:opacity-70"
        >
          {authLoading
            ? "Aguarde..."
            : authMode === "login"
            ? "Entrar Agora"
            : "Finalizar Registro"}
        </button>

        <button
          type="button"
          onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
          className="text-[10px] font-black uppercase opacity-60 pt-4 block mx-auto underline"
        >
          {authMode === "login"
            ? "Não tem conta? Registre-se"
            : "Já tem conta? Login"}
        </button>
      </div>
    </div>
  );
}

// FIX 8: dailyGoal agora é um select com GOAL_OPTIONS
function DiagnosisPage({ form, setForm, onSave, isSaving, diagError }) {
  const completion = useMemo(() => {
    const total = REQUIRED_DIAG_FIELDS.length;
    const done = REQUIRED_DIAG_FIELDS.filter((field) => {
      const value = form[field];
      if (typeof value === "number") return Number.isFinite(value) && value > 0;
      return String(value || "").trim().length > 0;
    }).length;
    return Math.round((done / total) * 100);
  }, [form]);

  return (
    <div className="min-h-screen bg-emerald-600 text-white p-6 pb-32 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100 opacity-80">
            Seja Bem-Vindo ao AtivaMENTE
          </p>
          <h1 className="text-4xl font-black tracking-tighter mb-2">
            <span className="text-slate-300">Ativa</span>
            <span className="text-white font-black">MENTE</span>
          </h1>
          <p className="text-sm italic opacity-80 font-medium tracking-wide">
            App do Mente em Forma
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-4">
            Diagnóstico de Perfil
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-[10px] font-black uppercase">
            <span>Diagnóstico</span>
            <span>{completion}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold placeholder-white/40 text-white outline-none"
            placeholder="Nome Completo"
          />

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase opacity-40 ml-2">
              WhatsApp
            </label>
            <input
              value={formatWhatsAppDisplay(form.whatsapp)}
              onChange={(e) =>
                setForm({ ...form, whatsapp: normalizeWhatsApp(e.target.value) })
              }
              className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold placeholder-white/40 text-white outline-none"
              placeholder="+55 DDD + Número"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase opacity-40 ml-2">
              Unidade do Peso
            </label>
            <div className="flex gap-2">
              {[
                { id: "kg", label: "Kg" },
                { id: "lb", label: "Libras" },
              ].map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setForm({ ...form, weightUnit: unit.id })}
                  className={`flex-1 p-4 rounded-2xl font-bold uppercase text-[10px] transition-all ${
                    form.weightUnit === unit.id
                      ? "bg-white text-emerald-700"
                      : "bg-white/10"
                  }`}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-40 ml-2">
                Peso Atual ({form.weightUnit})
              </label>
              <input
                type="number"
                step="0.1"
                value={convertWeightForDisplay(form.weight, form.weightUnit)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weight: convertWeightForStorage(e.target.value, form.weightUnit),
                  })
                }
                className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-40 ml-2">
                Meta ({form.weightUnit})
              </label>
              <input
                type="number"
                step="0.1"
                value={convertWeightForDisplay(form.targetWeight, form.weightUnit)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    targetWeight: convertWeightForStorage(
                      e.target.value,
                      form.weightUnit
                    ),
                  })
                }
                className="w-full p-4 bg-white text-emerald-700 rounded-2xl font-bold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-40 ml-2">
                Altura (cm)
              </label>
              <input
                type="number"
                value={form.height}
                onChange={(e) =>
                  setForm({ ...form, height: Number(e.target.value) || 0 })
                }
                className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-40 ml-2">
                Idade
              </label>
              <input
                type="number"
                value={form.age}
                onChange={(e) =>
                  setForm({ ...form, age: Number(e.target.value) || 0 })
                }
                className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold text-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase opacity-40 ml-2">
              Gênero
            </label>
            <div className="flex gap-2">
              {[
                { id: "female", label: "Feminino" },
                { id: "male", label: "Masculino" },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g.id })}
                  className={`flex-1 p-4 rounded-2xl font-bold uppercase text-[10px] transition-all ${
                    form.gender === g.id
                      ? "bg-white text-emerald-700"
                      : "bg-white/10"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase opacity-40 ml-2">
              Nível de Atividade
            </label>
            <select
              value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
              className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold text-white outline-none appearance-none"
            >
              <option value="sedentary" className="text-slate-900">Sedentário</option>
              <option value="light" className="text-slate-900">Leve (1-2x semana)</option>
              <option value="moderate" className="text-slate-900">Moderado (3-5x semana)</option>
              <option value="active" className="text-slate-900">Intenso (6-7x semana)</option>
            </select>
          </div>

          <div className="bg-white/10 p-6 rounded-[40px] border border-white/10 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Flag size={16} />
              <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">
                Suas Metas Robertianas
              </h3>
            </div>

            {/* FIX 8: dailyGoal como select com opções reais */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-40 ml-2">
                Meta do Dia
              </label>
              <select
                value={form.dailyGoal}
                onChange={(e) => setForm({ ...form, dailyGoal: e.target.value })}
                className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-xs font-bold outline-none text-white appearance-none"
              >
                <option value="" className="text-slate-900">Escolha uma meta...</option>
                {GOAL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="text-slate-900">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <input
              value={form.weeklyGoal}
              onChange={(e) => setForm({ ...form, weeklyGoal: e.target.value })}
              className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-xs font-bold outline-none"
              placeholder="Meta da Semana"
            />
            <input
              value={form.monthlyGoal}
              onChange={(e) => setForm({ ...form, monthlyGoal: e.target.value })}
              className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-xs font-bold outline-none"
              placeholder="Meta do Mês"
            />
          </div>
        </div>

        {diagError ? (
          <div className="bg-rose-500/20 p-3 rounded-xl text-[10px] font-black uppercase text-rose-100">
            {diagError}
          </div>
        ) : null}

        <button
          disabled={isSaving || completion < 100}
          onClick={onSave}
          className="w-full bg-white text-emerald-700 p-6 rounded-[35px] font-black uppercase shadow-2xl active:scale-95 transition-all text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : "Ativar meu Plano"}
        </button>
      </div>
    </div>
  );
}

function LineChartCard({ title, subtitle, series, suffix = "" }) {
  const points = buildPolylinePoints(series);
  const latest = series[series.length - 1]?.value || 0;

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {title}
          </p>
          <p className="text-xs text-slate-400 font-bold mt-1">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-emerald-600">
            {Number(latest).toFixed(1).replace(".0", "")}
            {suffix}
          </p>
        </div>
      </div>

      <svg viewBox="0 0 280 140" className="w-full h-36">
        <line x1="0" y1="120" x2="280" y2="120" stroke="#e2e8f0" strokeWidth="2" />
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {series.map((item, index) => {
          const values = series.map((entry) => Number(entry.value) || 0);
          const max = Math.max(...values, 1);
          const min = Math.min(...values, 0);
          const range = Math.max(max - min, 1);
          const x = (index / Math.max(series.length - 1, 1)) * 280;
          const y = 120 - ((item.value - min) / range) * 120;
          return <circle key={item.key} cx={x} cy={y} r="4.5" fill="#10b981" />;
        })}
      </svg>

      <div className="grid grid-cols-7 gap-1 mt-3 text-center">
        {series.map((item) => (
          <div key={item.key}>
            <p className="text-[9px] font-black uppercase text-slate-300">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomePage({
  todayLogs,
  dailyQuote,
  moodLogged,
  onSaveMood,
  userMetrics,
  userData,
  dailyStats,
  onGoalStatus,
}) {
  const consumed = dailyStats.foodCalories;
  const progressPercent =
    userMetrics.targetCal > 0
      ? Math.min((consumed / userMetrics.targetCal) * 100, 100)
      : 0;
  const goalCompletionPercent = Math.min(dailyStats.points, 100);
  const medal = medalFromPoints(dailyStats.points);
  const dateLabel = formatLongDate(getTodayKey());

  return (
    <div className="p-6 pb-32 max-w-md mx-auto text-center">
      <div className="bg-emerald-50 w-16 h-16 rounded-[25px] flex items-center justify-center mx-auto mb-2 border border-emerald-100 shadow-sm">
        <Brain size={32} className="text-emerald-500" />
      </div>

      <h1 className="text-xl font-black tracking-tighter">
        <span className="text-slate-400">Ativa</span>
        <span className="text-emerald-600 font-black">MENTE</span>
      </h1>
      <p className="text-[11px] font-bold text-slate-400 capitalize mt-2">
        {dateLabel}
      </p>

      <div className="mt-6 bg-emerald-500 p-8 rounded-[45px] text-white font-bold italic shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none" />
        "{dailyQuote}"
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        <div className="bg-white p-5 rounded-[25px] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-300">IMC</p>
          <p className="text-2xl font-black text-emerald-600">{userMetrics.imc}</p>
        </div>
        <div className="bg-white p-5 rounded-[25px] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-300">Peso Atual</p>
          <p className="text-lg font-black text-emerald-600">
            {formatWeight(userData?.weight || 0, userData?.weightUnit || "kg")}
          </p>
        </div>
      </div>

      <div className={`mt-6 ${medal.bg} p-6 rounded-[32px] border border-slate-100 text-left`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Pontuação do dia
            </p>
            <p className="text-3xl font-black text-slate-800">
              {dailyStats.points}/100
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Medalha:{" "}
              <span className={medal.color}>{medal.label}</span>
            </p>
          </div>
          <Trophy className={medal.color} size={38} />
        </div>
        <div className="mt-4 w-full bg-white/70 h-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${goalCompletionPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-6 bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm text-left">
        <div className="flex items-center gap-2 mb-2">
          <Target size={18} className="text-emerald-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Meta do dia
          </p>
        </div>
        <p className="font-black text-slate-800 text-lg">
          {userData?.dailyGoal || "Escolha sua meta no diagnóstico"}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            onClick={() => onGoalStatus(true)}
            className={`p-4 rounded-2xl font-black text-xs uppercase transition-all ${
              dailyStats.goalStatus?.completed === true
                ? "bg-emerald-500 text-white"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            Consegui hoje
          </button>
          <button
            type="button"
            onClick={() => onGoalStatus(false)}
            className={`p-4 rounded-2xl font-black text-xs uppercase transition-all ${
              dailyStats.goalStatus?.completed === false
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Ainda não
          </button>
        </div>
      </div>

      <div className="mt-6 bg-white p-8 rounded-[45px] shadow-2xl text-left border border-emerald-50">
        <div className="flex justify-between items-end mb-4 gap-4">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">
              Meta Calórica
            </p>
            <h2 className="text-4xl font-black text-emerald-600 leading-none">
              {userMetrics.targetCal}
            </h2>
            <p className="text-[10px] font-black uppercase text-slate-300 mt-2">
              kcal
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-slate-300">
              Consumido
            </p>
            <p className="text-xl font-black text-slate-700">{consumed} kcal</p>
          </div>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 font-bold mt-4 leading-relaxed">
          O cálculo de calorias é uma estimativa média automática e não substitui
          avaliação individual, nutricional ou médica.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        <div className="bg-white p-5 rounded-[25px] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-300">Exercício</p>
          <p className="text-2xl font-black text-emerald-600">
            {dailyStats.exerciseMinutes}
          </p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">min hoje</p>
        </div>
        <div className="bg-white p-5 rounded-[25px] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-300">Diário</p>
          <p className="text-sm font-black text-emerald-600">
            {dailyStats.diaryEntry?.content ? "Preenchido" : "Opcional"}
          </p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Espaço do dia</p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Como está o seu humor?
        </p>
        <div className="flex justify-between gap-1">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSaveMood(m)}
              disabled={Boolean(moodLogged)}
              className={`flex-1 p-2 rounded-2xl transition-all ${
                moodLogged?.moodId === m.id
                  ? "bg-emerald-500 text-white scale-110 shadow-md"
                  : "text-slate-300 bg-slate-50"
              } disabled:cursor-not-allowed`}
            >
              <span className="text-xl block">{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-left ml-4">
          Histórico de Hoje
        </h3>
        {todayLogs.length === 0 ? (
          <div className="bg-white p-10 rounded-[35px] border border-slate-100 border-dashed text-slate-300 uppercase font-black text-[10px]">
            Nada registrado ainda.
          </div>
        ) : (
          todayLogs.map((l) => (
            <div
              key={l.id}
              className="bg-white p-5 rounded-[25px] shadow-sm text-left border border-slate-50 flex justify-between items-center gap-4"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-700 text-sm truncate">
                  {l.type === "goalStatus"
                    ? `Meta: ${l.completed ? "concluída ✓" : "não concluída"}`
                    : l.description || l.content || l.label || "Registro"}
                </p>
                <p className="text-[8px] font-black uppercase text-slate-300 mt-1">
                  {l.type} • {formatTime(l.timestamp)}
                </p>
              </div>
              <span className="text-xs font-black text-emerald-500 whitespace-nowrap">
                {l.type === "food"
                  ? `${l.calories || 0} kcal`
                  : l.type === "exercise"
                  ? `${l.duration || 0} min`
                  : l.type === "weight"
                  ? formatWeight(l.weight || 0, userData?.weightUnit || "kg")
                  : l.type === "mood"
                  ? l.emoji
                  : <CheckCircle2 size={16} />}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// FIX 6: DiaryPage recebe dayLogs e exibe mini-histórico do dia selecionado
function DiaryPage({
  isCalculating,
  onSaveFood,
  onSaveExercise,
  onSaveJournal,
  onSaveWeight,
  onImageUpload,
  image,
  setImage,
  foodInput,
  setFoodInput,
  selectedMeal,
  setSelectedMeal,
  diaryError,
  exerciseInput,
  setExerciseInput,
  exerciseDuration,
  setExerciseDuration,
  journalInput,
  setJournalInput,
  weightInput,
  setWeightInput,
  selectedDate,
  setSelectedDate,
  userData,
  dayLogs,
}) {
  const fileRef = useRef(null);
  const [entryTab, setEntryTab] = useState("food");
  const dateLabel = formatLongDate(selectedDate);

  const typeLabel = { food: "refeição", exercise: "exercício", journal: "diário", weight: "peso", mood: "humor", goalStatus: "meta" };

  return (
    <div className="p-6 pb-32 max-w-md mx-auto text-center space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase text-emerald-600 tracking-tighter">
          Registros do Dia
        </h2>
        <p className="text-sm text-slate-400 font-bold capitalize mt-2">{dateLabel}</p>
      </div>

      <div className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm text-left">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
          Calendário
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full p-4 rounded-2xl border border-slate-200 font-bold outline-none"
        />
      </div>

      {/* FIX 6: mini-histórico do dia selecionado */}
      {dayLogs.length > 0 ? (
        <div className="bg-emerald-50 p-4 rounded-[24px] border border-emerald-100 text-left space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">
            Já registrado neste dia
          </p>
          {dayLogs.map((l) => (
            <div key={l.id} className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 truncate">
                {l.description || l.content || l.label || "Registro"}
              </span>
              <span className="text-[10px] font-black text-emerald-500 ml-2 whitespace-nowrap">
                {typeLabel[l.type] || l.type}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2">
        {[
          { id: "food", label: "Alimento", icon: <Utensils size={16} /> },
          { id: "exercise", label: "Exercício", icon: <Dumbbell size={16} /> },
          { id: "journal", label: "Diário", icon: <NotebookPen size={16} /> },
          { id: "weight", label: "Peso", icon: <TrendingUp size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setEntryTab(tab.id)}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
              entryTab === tab.id
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-white border-slate-100 text-slate-400"
            }`}
          >
            {tab.icon}
            <span className="text-[9px] font-black uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      {entryTab === "food" ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPES.map((meal) => (
              <button
                key={meal.id}
                type="button"
                onClick={() => setSelectedMeal(meal.id)}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1 border-2 transition-all ${
                  selectedMeal === meal.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                    : "border-white bg-white text-slate-300 opacity-60"
                }`}
              >
                {meal.icon}
                <span className="text-[8px] font-black uppercase">{meal.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white p-6 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center gap-4">
            {image ? (
              <div className="relative w-full h-48 rounded-3xl overflow-hidden">
                <img
                  src={image}
                  alt="Prévia da refeição"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all"
              >
                {isCalculating ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : (
                  <Camera size={32} />
                )}
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileRef}
              className="hidden"
              onChange={onImageUpload}
            />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Foto do prato (opcional)
            </p>
          </div>

          <textarea
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            className="w-full p-6 bg-white rounded-[35px] shadow-sm border-none font-bold text-slate-700 outline-none ring-1 ring-slate-100"
            placeholder="Descreva o que comeu..."
            rows="3"
          />

          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl text-xs font-bold text-left leading-relaxed">
            O cálculo de calorias é uma média automática e não substitui consulta
            médica, nutricional ou avaliação individual.
          </div>

          <button
            disabled={isCalculating}
            onClick={onSaveFood}
            className="w-full bg-emerald-500 text-white p-6 rounded-[35px] font-black uppercase shadow-xl active:scale-95 transition-all text-xs tracking-widest disabled:opacity-70"
          >
            {isCalculating ? "IA analisando..." : "Guardar Refeição"}
          </button>
        </>
      ) : null}

      {entryTab === "exercise" ? (
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left ml-2">
            Selecione a atividade
          </p>
          <div className="grid grid-cols-3 gap-2">
            {EXERCISE_OPTIONS.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setExerciseInput(ex.id === "outro" ? "" : ex.label)}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1 border-2 transition-all ${
                  exerciseInput === ex.label || (ex.id === "outro" && !EXERCISE_OPTIONS.slice(0, -1).some((o) => o.label === exerciseInput))
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md"
                    : "border-white bg-white text-slate-400 opacity-70"
                }`}
              >
                <span className="text-xl">{ex.emoji}</span>
                <span className="text-[8px] font-black uppercase">{ex.label}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={exerciseInput}
            onChange={(e) => setExerciseInput(e.target.value)}
            className="w-full p-5 bg-white rounded-[28px] shadow-sm font-bold text-slate-700 outline-none ring-1 ring-slate-100"
            placeholder="Ou descreva outra atividade..."
          />
          <input
            type="number"
            min="0"
            value={exerciseDuration}
            onChange={(e) => setExerciseDuration(e.target.value)}
            className="w-full p-5 bg-white rounded-[28px] shadow-sm font-bold text-slate-700 outline-none ring-1 ring-slate-100"
            placeholder="Duração em minutos"
          />
          <button
            onClick={onSaveExercise}
            className="w-full bg-emerald-500 text-white p-6 rounded-[35px] font-black uppercase shadow-xl text-xs tracking-widest"
          >
            Guardar Exercício
          </button>
        </div>
      ) : null}

      {entryTab === "journal" ? (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 text-left shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Diário opcional
            </p>
            <p className="text-sm font-bold text-slate-500">
              Espaço para registrar pensamentos, emoções, vitórias, escorregões e
              percepções do dia.
            </p>
          </div>
          <textarea
            value={journalInput}
            onChange={(e) => setJournalInput(e.target.value)}
            className="w-full p-6 bg-white rounded-[35px] shadow-sm font-bold text-slate-700 outline-none ring-1 ring-slate-100"
            placeholder="Escreva aqui seu diário do dia..."
            rows="8"
          />
          <button
            onClick={onSaveJournal}
            className="w-full bg-emerald-500 text-white p-6 rounded-[35px] font-black uppercase shadow-xl text-xs tracking-widest"
          >
            Guardar Diário
          </button>
        </div>
      ) : null}

      {entryTab === "weight" ? (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-[28px] border border-slate-100 text-left shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Peso do dia
            </p>
            <p className="text-sm font-bold text-slate-500 mt-2">
              Registre com casas decimais. Exemplo: 78,5 ou 79,4.
            </p>
          </div>
          <input
            type="number"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="w-full p-5 bg-white rounded-[28px] shadow-sm font-bold text-slate-700 outline-none ring-1 ring-slate-100"
            placeholder={`Peso em ${userData?.weightUnit || "kg"}`}
          />
          <button
            onClick={onSaveWeight}
            className="w-full bg-emerald-500 text-white p-6 rounded-[35px] font-black uppercase shadow-xl text-xs tracking-widest"
          >
            Guardar Peso
          </button>
        </div>
      ) : null}

      {diaryError ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs font-bold">
          {diaryError}
        </div>
      ) : null}
    </div>
  );
}

// FIX 7: ResultsPage agora recebe selectedDateStats (dados do dia navegado)
function ResultsPage({ logs, userData, userMetrics, selectedDateStats, selectedDate }) {
  const caloriesSeries = useMemo(() => getWeekSeries(logs, "food"), [logs]);
  const exerciseSeries = useMemo(() => getWeekSeries(logs, "exercise"), [logs]);
  const weightSeries = useMemo(() => getWeekSeries(logs, "weight"), [logs]);
  const medal = medalFromPoints(selectedDateStats.points);
  const currentWeight =
    weightSeries[weightSeries.length - 1]?.value || userData?.weight || 0;
  const targetWeight = Number(userData?.targetWeight || 0);
  const toGoal =
    currentWeight && targetWeight
      ? Math.max(currentWeight - targetWeight, 0)
      : 0;

  return (
    <div className="p-6 pb-32 max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase text-emerald-600 tracking-tighter">
          Resultados
        </h2>
        <p className="text-sm font-bold text-slate-400 mt-2 capitalize">
          Visão geral de {formatLongDate(selectedDate)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Pontuação
          </p>
          <p className="text-3xl font-black text-emerald-600 mt-2">
            {selectedDateStats.points}
          </p>
          <p className="text-xs font-bold text-slate-400">de 100</p>
        </div>
        <div className={`p-5 rounded-[28px] border border-slate-100 shadow-sm ${medal.bg}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Medalha
          </p>
          <p className={`text-2xl font-black mt-2 ${medal.color}`}>
            {medal.label}
          </p>
          <p className="text-xs font-bold text-slate-400">Gamificação</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Resumo do dia
            </p>
            <h3 className="text-xl font-black text-slate-800 mt-2">
              Tudo em uma visão
            </h3>
          </div>
          <BarChart3 className="text-emerald-500" size={28} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-slate-300">Calorias</p>
            <p className="text-lg font-black text-slate-700 mt-1">
              {selectedDateStats.foodCalories} kcal
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-slate-300">Exercícios</p>
            <p className="text-lg font-black text-slate-700 mt-1">
              {selectedDateStats.exerciseMinutes} min
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-slate-300">Peso</p>
            <p className="text-lg font-black text-slate-700 mt-1">
              {formatWeight(currentWeight, userData?.weightUnit || "kg")}
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-slate-300">
              Meta restante
            </p>
            <p className="text-lg font-black text-slate-700 mt-1">
              {formatWeight(toGoal, userData?.weightUnit || "kg")}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-bold mt-4 leading-relaxed">
          As calorias exibidas são médias automáticas e não substituem orientação
          médica ou nutricional.
        </p>
      </div>

      <LineChartCard
        title="Calorias"
        subtitle={`Meta média de ${userMetrics.targetCal} kcal`}
        series={caloriesSeries}
        suffix=""
      />
      <LineChartCard
        title="Exercício"
        subtitle="Minutos nos últimos 7 dias"
        series={exerciseSeries}
        suffix=" min"
      />
      <LineChartCard
        title="Peso"
        subtitle={`Acompanhamento em ${userData?.weightUnit || "kg"}`}
        series={weightSeries.map((item) => ({
          ...item,
          value: convertWeightForDisplay(item.value, userData?.weightUnit || "kg"),
        }))}
        suffix={` ${userData?.weightUnit || "kg"}`}
      />
    </div>
  );
}

function AdminPage({ patients, selectedPatient, setSelectedPatient, onBack }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [patients, search]);

  if (selectedPatient) {
    const current = Number(selectedPatient.weight || 0);
    const target = Number(selectedPatient.targetWeight || 0);
    const difference =
      current && target ? Number((current - target).toFixed(1)) : 0;

    return (
      <div className="p-6 pb-32 max-w-md mx-auto space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px]"
        >
          <ChevronLeft size={16} /> Voltar
        </button>

        <div className="bg-white p-8 rounded-[40px] shadow-xl text-center border border-emerald-50">
          <h2 className="text-xl font-black uppercase text-slate-800">
            {selectedPatient.name}
          </h2>
          <div className="mt-4 p-4 bg-emerald-50 rounded-2xl text-left space-y-2">
            <p className="text-xs font-bold text-slate-600">
              WhatsApp: {formatWhatsAppDisplay(selectedPatient.whatsapp)}
            </p>
            <p className="text-xs font-bold text-slate-600">
              Peso:{" "}
              {formatWeight(
                selectedPatient.weight || 0,
                selectedPatient.weightUnit || "kg"
              )}
            </p>
            <p className="text-xs font-bold text-slate-600">
              Meta:{" "}
              {formatWeight(
                selectedPatient.targetWeight || 0,
                selectedPatient.weightUnit || "kg"
              )}
            </p>
            <p className="text-xs font-bold text-slate-600">
              Progresso até a meta:{" "}
              {difference > 0
                ? `${difference.toFixed(1)} kg acima da meta`
                : "Meta alcançada ou abaixo"}
            </p>
            <p className="text-xs font-bold text-slate-600">
              Meta semanal: {selectedPatient.weeklyGoal || "Não preenchida"}
            </p>
          </div>
          <a
            href={`https://wa.me/${String(selectedPatient.whatsapp || "").replace(
              /\D/g,
              ""
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 w-full bg-emerald-500 text-white p-4 rounded-3xl flex items-center justify-center gap-2 font-black uppercase text-[10px]"
          >
            <MessageCircle size={18} /> Chamar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-32 max-w-md mx-auto text-center space-y-6">
      <h2 className="text-2xl font-black uppercase text-emerald-600 tracking-tighter">
        Gestão de Alunos
      </h2>
      <div className="relative">
        <Search size={18} className="absolute left-5 top-5 text-slate-300" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procurar aluno..."
          className="w-full pl-14 p-5 bg-white rounded-[35px] font-bold border-none outline-none shadow-sm focus:ring-2 ring-emerald-500"
        />
      </div>
      <div className="space-y-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPatient(p)}
            className="w-full bg-white p-6 rounded-[35px] flex items-center justify-between shadow-sm border border-transparent active:scale-95 transition-all text-left"
          >
            <div>
              <p className="font-black uppercase text-xs text-slate-700">{p.name}</p>
              <p className="text-[8px] text-slate-300 uppercase font-black">
                Meta:{" "}
                {formatWeight(p.targetWeight || 0, p.weightUnit || "kg")}
              </p>
            </div>
            <ChevronRight size={18} className="text-emerald-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

// --- APP PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isSavingDiag, setIsSavingDiag] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const [currentPage, setCurrentPage] = useState("auth");
  const [authMode, setAuthMode] = useState("login");

  const [email, setEmail] = useState(
    localStorage.getItem("ativamente_email") || ""
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(
    Boolean(localStorage.getItem("ativamente_email"))
  );

  const [authError, setAuthError] = useState("");
  const [diagError, setDiagError] = useState("");
  const [diaryError, setDiaryError] = useState("");

  const [diagForm, setDiagForm] = useState({
    name: "",
    whatsapp: "",
    weight: 70,
    targetWeight: 65,
    height: 170,
    age: 30,
    gender: "female",
    activity: "moderate",
    dailyGoal: GOAL_OPTIONS[0],
    weeklyGoal: "",
    monthlyGoal: "",
    weightUnit: "kg",
  });

  const [image, setImage] = useState(null);
  const [foodInput, setFoodInput] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("lunch");
  const [exerciseInput, setExerciseInput] = useState("");
  const [exerciseDuration, setExerciseDuration] = useState("");
  const [journalInput, setJournalInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayKey());

  const isAdmin = userData?.role === "admin";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      try {
        if (!firebaseUser) {
          setUserData(null);
          setLogs([]);
          setCurrentPage("auth");
          return;
        }
        const userRef = doc(db, "artifacts", appId, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          setDiagForm((prev) => ({
            ...prev,
            ...data,
            name: data.name || firebaseUser.displayName || prev.name,
            whatsapp: data.whatsapp || prev.whatsapp,
            weightUnit: data.weightUnit || prev.weightUnit,
          }));
          setCurrentPage(data.initialDiagnosisComplete ? "home" : "diagnosis");
          setWeightInput(
            String(
              convertWeightForDisplay(data.weight || 0, data.weightUnit || "kg")
            )
          );
        } else {
          setUserData(null);
          setDiagForm((prev) => ({
            ...prev,
            name: firebaseUser.displayName || prev.name,
          }));
          setCurrentPage("diagnosis");
        }
      } catch (error) {
        console.error("Erro ao ler Firestore:", error);
        setCurrentPage("diagnosis");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const unsubLogs = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "logs"),
      (snapshot) => {
        const nextLogs = snapshot.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(nextLogs);
      },
      (error) => console.error(error)
    );

    const unsubUser = onSnapshot(
      doc(db, "artifacts", appId, "users", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserData(data);
          setWeightInput(
            String(
              convertWeightForDisplay(data.weight || 0, data.weightUnit || "kg")
            )
          );
        }
      },
      (error) => console.error(error)
    );

    let unsubPatients = null;
    if (isAdmin) {
      unsubPatients = onSnapshot(
        collection(db, "artifacts", appId, "public", "data", "profiles"),
        (snapshot) => {
          setPatients(
            snapshot.docs.map((docItem) => ({
              id: docItem.id,
              ...docItem.data(),
            }))
          );
        },
        (error) => console.error(error)
      );
    }

    return () => {
      unsubLogs();
      unsubUser();
      if (unsubPatients) unsubPatients();
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (rememberMe && email) {
      localStorage.setItem("ativamente_email", email);
    } else if (!rememberMe) {
      localStorage.removeItem("ativamente_email");
    }
  }, [rememberMe, email]);

  const userMetrics = useMemo(() => calculateUserMetrics(userData), [userData]);
  const dailyQuote = getDailyQuote();

  // FIX 1+2: todayLogs e selectedDateLogs com matchesDate (compatibilidade retroativa)
  const todayLogs = useMemo(
    () => logs.filter((l) => matchesDate(l, getTodayKey())),
    [logs]
  );
  const selectedDateLogs = useMemo(
    () => logs.filter((l) => matchesDate(l, selectedDate)),
    [logs, selectedDate]
  );

  const moodLogged = useMemo(
    () => todayLogs.find((l) => l.type === "mood"),
    [todayLogs]
  );
  const dailyStats = useMemo(
    () => getDailyStats(todayLogs, userMetrics.targetCal),
    [todayLogs, userMetrics.targetCal]
  );
  // FIX 7: stats separados para a data navegada em Resultados
  const selectedDateStats = useMemo(
    () => getDailyStats(selectedDateLogs, userMetrics.targetCal),
    [selectedDateLogs, userMetrics.targetCal]
  );

  async function handleEmailAuth() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistence);
      if (!email.trim()) throw { code: "auth/invalid-email" };
      if (!password.trim()) throw { code: "auth/missing-password" };
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) {
      console.error(error);
      setAuthError(formatAuthError(error.code));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      setAuthError(formatAuthError(error.code));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSaveDiagnosis() {
    setDiagError("");
    if (!user) {
      setDiagError("Usuário não autenticado.");
      return;
    }
    if (!isDiagnosisComplete(diagForm)) {
      setDiagError("Preencha todo o diagnóstico antes de continuar.");
      return;
    }
    setIsSavingDiag(true);
    try {
      const normalizedProfile = {
        ...diagForm,
        whatsapp: normalizeWhatsApp(diagForm.whatsapp),
        initialDiagnosisComplete: true,
        lastSeen: new Date().toISOString(),
        role: userData?.role || "user",
        email: user.email || "",
      };
      await setDoc(
        doc(db, "artifacts", appId, "users", user.uid),
        normalizedProfile,
        { merge: true }
      );
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "profiles",
          user.uid
        ),
        { ...normalizedProfile, id: user.uid },
        { merge: true }
      );
      setCurrentPage("home");
    } catch (error) {
      console.error(error);
      setDiagError("Não foi possível salvar o diagnóstico.");
    } finally {
      setIsSavingDiag(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setImage(result);
    };
    reader.readAsDataURL(file);
  }

  // FIX 5: upload de imagem isolado — falha não bloqueia salvamento da refeição
  async function uploadMealImage(uid, imageDataUrl) {
    if (!imageDataUrl) return "";
    try {
      const storageRef = ref(
        storage,
        `artifacts/${appId}/users/${uid}/meals/${Date.now()}.jpg`
      );
      await uploadString(storageRef, imageDataUrl, "data_url");
      return await getDownloadURL(storageRef);
    } catch (uploadError) {
      console.error("Upload de imagem falhou, continuando sem foto:", uploadError);
      return "";
    }
  }

  async function handleSaveMood(mood) {
    if (!user || moodLogged) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "logs"),
        {
          type: "mood",
          moodId: mood.id,
          emoji: mood.emoji,
          label: mood.label,
          dateKey: getTodayKey(),
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSaveFood() {
    setDiaryError("");
    if (!user) return setDiaryError("Usuário não autenticado.");
    if (!foodInput.trim() && !image)
      return setDiaryError("Descreva a refeição ou envie uma foto.");

    setIsCalculating(true);
    try {
      // FIX 5: upload isolado — não bloqueia mais o salvamento
      const uploadedImageUrl = await uploadMealImage(user.uid, image);

      let calorieCount = estimateCaloriesFallback(foodInput);
      let estimationMode = "média local";

      try {
        const response = await fetch("/api/estimateCalories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: foodInput.trim(),
            imageBase64: image ? image.split(",")[1] : null,
            mimeType:
              image?.match(/^data:(.*?);base64,/)?.[1] || "image/jpeg",
          }),
        });
        if (response.ok) {
          const payload = await response.json();
          calorieCount = Number(payload.calories) || calorieCount;
          estimationMode = "IA";
        }
      } catch (apiError) {
        console.error("API de calorias indisponível, usando média local:", apiError);
      }

      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "logs"),
        {
          type: "food",
          mealId: selectedMeal,
          description: foodInput.trim() || "Refeição por foto",
          calories: calorieCount,
          estimationMode,
          imageUrl: uploadedImageUrl,
          dateKey: selectedDate,
          timestamp: new Date().toISOString(),
        }
      );

      setFoodInput("");
      setImage(null);
      setCurrentPage(selectedDate === getTodayKey() ? "home" : "results");
    } catch (error) {
      console.error(error);
      setDiaryError(error.message || "Não foi possível salvar a refeição.");
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleSaveExercise() {
    setDiaryError("");
    if (!user) return setDiaryError("Usuário não autenticado.");
    if (!exerciseInput.trim()) return setDiaryError("Descreva a atividade física.");
    try {
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "logs"),
        {
          type: "exercise",
          description: exerciseInput.trim(),
          duration: Number(exerciseDuration) || 0,
          dateKey: selectedDate,
          timestamp: new Date().toISOString(),
        }
      );
      setExerciseInput("");
      setExerciseDuration("");
      setCurrentPage(selectedDate === getTodayKey() ? "home" : "results");
    } catch (error) {
      console.error(error);
      setDiaryError("Não foi possível salvar o exercício.");
    }
  }

  async function handleSaveJournal() {
    setDiaryError("");
    if (!user) return setDiaryError("Usuário não autenticado.");
    if (!journalInput.trim())
      return setDiaryError("Escreva algo no diário antes de salvar.");
    try {
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "logs"),
        {
          type: "journal",
          content: journalInput.trim(),
          description: "Diário do dia",
          dateKey: selectedDate,
          timestamp: new Date().toISOString(),
        }
      );
      setJournalInput("");
      setCurrentPage(selectedDate === getTodayKey() ? "home" : "results");
    } catch (error) {
      console.error(error);
      setDiaryError("Não foi possível salvar o diário.");
    }
  }

  async function handleSaveWeight() {
    setDiaryError("");
    if (!user) return setDiaryError("Usuário não autenticado.");
    if (!weightInput) return setDiaryError("Digite o peso do dia.");
    try {
      const weightKg = convertWeightForStorage(
        weightInput,
        userData?.weightUnit || "kg"
      );
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "logs"),
        {
          type: "weight",
          description: "Peso do dia",
          weight: weightKg,
          dateKey: selectedDate,
          timestamp: new Date().toISOString(),
        }
      );
      await setDoc(
        doc(db, "artifacts", appId, "users", user.uid),
        { weight: weightKg },
        { merge: true }
      );
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "profiles",
          user.uid
        ),
        { weight: weightKg },
        { merge: true }
      );
      setCurrentPage(selectedDate === getTodayKey() ? "home" : "results");
    } catch (error) {
      console.error(error);
      setDiaryError("Não foi possível salvar o peso.");
    }
  }

  // FIX 4: handleGoalStatus ignora clique se o status já é igual ao atual
  async function handleGoalStatus(completed) {
    if (!user) return;
    if (dailyStats.goalStatus?.completed === completed) return;
    try {
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "logs"),
        {
          type: "goalStatus",
          description: userData?.dailyGoal || "Meta do dia",
          completed,
          dateKey: getTodayKey(),
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function handleLogout() {
    const confirmed = window.confirm("Sair do AtivaMENTE?");
    if (!confirmed) return;
    await signOut(auth);
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-emerald-600 text-white font-black animate-pulse uppercase tracking-widest">
        AtivaMENTE...
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 overflow-x-hidden">
      {currentPage === "auth" ? (
        <AuthPage
          authMode={authMode}
          setAuthMode={setAuthMode}
          onGoogle={handleGoogleAuth}
          onAuth={handleEmailAuth}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
          error={authError}
          authLoading={authLoading}
        />
      ) : null}

      {currentPage === "diagnosis" ? (
        <DiagnosisPage
          form={diagForm}
          setForm={setDiagForm}
          onSave={handleSaveDiagnosis}
          isSaving={isSavingDiag}
          diagError={diagError}
        />
      ) : null}

      {currentPage === "home" ? (
        <HomePage
          todayLogs={todayLogs}
          dailyQuote={dailyQuote}
          moodLogged={moodLogged}
          onSaveMood={handleSaveMood}
          userMetrics={userMetrics}
          userData={userData}
          dailyStats={dailyStats}
          onGoalStatus={handleGoalStatus}
        />
      ) : null}

      {currentPage === "diary" ? (
        <DiaryPage
          isCalculating={isCalculating}
          onSaveFood={handleSaveFood}
          onSaveExercise={handleSaveExercise}
          onSaveJournal={handleSaveJournal}
          onSaveWeight={handleSaveWeight}
          onImageUpload={handleImageUpload}
          image={image}
          setImage={setImage}
          foodInput={foodInput}
          setFoodInput={setFoodInput}
          selectedMeal={selectedMeal}
          setSelectedMeal={setSelectedMeal}
          diaryError={diaryError}
          exerciseInput={exerciseInput}
          setExerciseInput={setExerciseInput}
          exerciseDuration={exerciseDuration}
          setExerciseDuration={setExerciseDuration}
          journalInput={journalInput}
          setJournalInput={setJournalInput}
          weightInput={weightInput}
          setWeightInput={setWeightInput}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          userData={userData}
          dayLogs={selectedDateLogs}
        />
      ) : null}

      {currentPage === "results" ? (
        <ResultsPage
          logs={logs}
          userData={userData}
          userMetrics={userMetrics}
          selectedDateStats={selectedDateStats}
          selectedDate={selectedDate}
        />
      ) : null}

      {currentPage === "admin" && isAdmin ? (
        <AdminPage
          patients={patients}
          selectedPatient={selectedPatient}
          setSelectedPatient={setSelectedPatient}
          onBack={() => setSelectedPatient(null)}
        />
      ) : null}

      {currentPage !== "auth" && currentPage !== "diagnosis" ? (
        <nav className="fixed bottom-6 left-5 right-5 max-w-[420px] mx-auto bg-slate-900/95 backdrop-blur-lg flex justify-around p-4 rounded-[40px] shadow-2xl text-white border border-white/5 z-50">
          <button
            type="button"
            onClick={() => setCurrentPage("home")}
            className={`p-2 transition-all ${
              currentPage === "home" ? "text-emerald-400 scale-125" : "opacity-40"
            }`}
          >
            <Home size={22} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage("diary")}
            className={`p-2 transition-all ${
              currentPage === "diary" ? "text-emerald-400 scale-125" : "opacity-40"
            }`}
          >
            <NotebookPen size={22} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage("results")}
            className={`p-2 transition-all ${
              currentPage === "results"
                ? "text-emerald-400 scale-125"
                : "opacity-40"
            }`}
          >
            <BarChart3 size={22} />
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setCurrentPage("admin")}
              className={`p-2 transition-all ${
                currentPage === "admin"
                  ? "text-emerald-400 scale-125"
                  : "opacity-40"
              }`}
            >
              <Users size={22} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 opacity-40 hover:opacity-100"
          >
            <LogOut size={22} />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
