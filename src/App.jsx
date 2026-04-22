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
  Brain,
  Camera,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Flag,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  Search,
  Square,
  Sun,
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
];

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
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
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

  return {
    imc,
    bmr: Math.round(bmr),
    tdee,
    targetCal,
  };
}

function isDiagnosisComplete(form) {
  return REQUIRED_DIAG_FIELDS.every((field) => {
    const value = form[field];
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    return String(value || "").trim().length > 0;
  });
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
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
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
                setForm({
                  ...form,
                  whatsapp: normalizeWhatsApp(e.target.value),
                })
              }
              className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold placeholder-white/40 text-white outline-none"
              placeholder="+55 DDD + Número"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-40 ml-2">
                Peso Atual (kg)
              </label>
              <input
                type="number"
                value={form.weight}
                onChange={(e) =>
                  setForm({ ...form, weight: Number(e.target.value) || 0 })
                }
                className="w-full p-4 bg-white/10 rounded-2xl border border-white/10 font-bold text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase opacity-40 ml-2">
                Meta (kg)
              </label>
              <input
                type="number"
                value={form.targetWeight}
                onChange={(e) =>
                  setForm({ ...form, targetWeight: Number(e.target.value) || 0 })
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
              <option value="sedentary" className="text-slate-900">
                Sedentário
              </option>
              <option value="light" className="text-slate-900">
                Leve (1-2x semana)
              </option>
              <option value="moderate" className="text-slate-900">
                Moderado (3-5x semana)
              </option>
              <option value="active" className="text-slate-900">
                Intenso (6-7x semana)
              </option>
            </select>
          </div>

          <div className="bg-white/10 p-6 rounded-[40px] border border-white/10 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Flag size={16} />
              <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">
                Suas Metas Robertianas
              </h3>
            </div>
            <input
              value={form.dailyGoal}
              onChange={(e) => setForm({ ...form, dailyGoal: e.target.value })}
              className="w-full p-3 bg-white/5 rounded-xl border border-white/10 text-xs font-bold outline-none"
              placeholder="Meta do Dia"
            />
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

function HomePage({
  todayLogs,
  dailyQuote,
  moodLogged,
  onSaveMood,
  userMetrics,
}) {
  const consumed = todayLogs
    .filter((l) => l.type === "food")
    .reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);

  const progressPercent =
    userMetrics.targetCal > 0
      ? Math.min((consumed / userMetrics.targetCal) * 100, 100)
      : 0;

  return (
    <div className="p-6 pb-32 max-w-md mx-auto text-center">
      <div className="bg-emerald-50 w-16 h-16 rounded-[25px] flex items-center justify-center mx-auto mb-2 border border-emerald-100 shadow-sm">
        <Brain size={32} className="text-emerald-500" />
      </div>

      <h1 className="text-xl font-black tracking-tighter">
        <span className="text-slate-400">Ativa</span>
        <span className="text-emerald-600 font-black">MENTE</span>
      </h1>

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
          <p className="text-[9px] font-black uppercase text-slate-300">Metabolismo</p>
          <p className="text-2xl font-black text-emerald-600">{userMetrics.bmr}</p>
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

      <div className="mt-6 bg-white p-8 rounded-[45px] shadow-2xl text-left border border-emerald-50">
        <div className="flex justify-between items-end mb-4 gap-4">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">
              Meta Diária
            </p>
            <h2 className="text-4xl font-black text-emerald-600 leading-none">
              {userMetrics.targetCal}
            </h2>
            <p className="text-[10px] font-black uppercase text-slate-300 mt-2">
              kcal
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase text-slate-300">Consumido</p>
            <p className="text-xl font-black text-slate-700">{consumed} kcal</p>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
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
              className="bg-white p-5 rounded-[25px] shadow-sm text-left border border-slate-50 flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-slate-700 text-sm">{l.description}</p>
                <p className="text-[8px] font-black uppercase text-slate-300 mt-1">
                  {l.type === "food" ? l.mealId || "refeição" : l.label || "humor"}
                </p>
              </div>
              <span className="text-xs font-black text-emerald-500">
                {l.type === "food" ? `+${l.calories || 0}` : l.emoji}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DiaryPage({
  isCalculating,
  onSave,
  onImageUpload,
  image,
  setImage,
  foodInput,
  setFoodInput,
  selectedMeal,
  setSelectedMeal,
  diaryError,
}) {
  const fileRef = useRef(null);

  return (
    <div className="p-6 pb-32 max-w-md mx-auto text-center space-y-6">
      <h2 className="text-2xl font-black uppercase text-emerald-600 tracking-tighter">
        Novo Registro
      </h2>

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
            <img src={image} alt="Prévia da refeição" className="w-full h-full object-cover" />
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
            {isCalculating ? <Loader2 size={32} className="animate-spin" /> : <Camera size={32} />}
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
          Tirar Foto do Prato
        </p>
      </div>

      <textarea
        value={foodInput}
        onChange={(e) => setFoodInput(e.target.value)}
        className="w-full p-6 bg-white rounded-[35px] shadow-sm border-none font-bold text-slate-700 outline-none ring-1 ring-slate-100"
        placeholder="Descreva o que comeu..."
        rows="3"
      />

      {diaryError ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs font-bold">
          {diaryError}
        </div>
      ) : null}

      <button
        disabled={isCalculating}
        onClick={onSave}
        className="w-full bg-emerald-500 text-white p-6 rounded-[35px] font-black uppercase shadow-xl active:scale-95 transition-all text-xs tracking-widest disabled:opacity-70"
      >
        {isCalculating ? "IA analisando..." : "Guardar Refeição"}
      </button>
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
    const difference = current && target ? Number((current - target).toFixed(1)) : 0;

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
              Peso: {selectedPatient.weight} kg
            </p>
            <p className="text-xs font-bold text-slate-600">
              Meta: {selectedPatient.targetWeight} kg
            </p>
            <p className="text-xs font-bold text-slate-600">
              Progresso até a meta: {difference > 0 ? `${difference} kg acima da meta` : "Meta alcançada ou abaixo"}
            </p>
            <p className="text-xs font-bold text-slate-600">
              Meta semanal: {selectedPatient.weeklyGoal || "Não preenchida"}
            </p>
          </div>

          <a
            href={`https://wa.me/${String(selectedPatient.whatsapp || "").replace(/\D/g, "")}`}
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
                Meta: {p.targetWeight}kg
              </p>
            </div>
            <ChevronRight size={18} className="text-emerald-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

// --- APP ---
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

  const [email, setEmail] = useState(localStorage.getItem("ativamente_email") || "");
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
    dailyGoal: "",
    weeklyGoal: "",
    monthlyGoal: "",
  });

  const [image, setImage] = useState(null);
  const [foodInput, setFoodInput] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("lunch");

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
          }));
          setCurrentPage(data.initialDiagnosisComplete ? "home" : "diagnosis");
        } else {
          setUserData(null);
          setDiagForm((prev) => ({
            ...prev,
            name: firebaseUser.displayName || prev.name,
          }));
          setCurrentPage("diagnosis");
        }
      } catch (error) {
        // Auth funcionou, mas Firestore falhou.
        // Não exibir erro no login — redirecionar para diagnóstico.
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
          setUserData(snapshot.data());
        }
      },
      (error) => console.error(error)
    );

    let unsubPatients = null;
    if (isAdmin) {
      unsubPatients = onSnapshot(
        collection(db, "artifacts", appId, "public", "data", "profiles"),
        (snapshot) => {
          setPatients(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
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

  const todayKey = getTodayKey();
  const todayLogs = useMemo(
    () => logs.filter((l) => String(l.timestamp || "").slice(0, 10) === todayKey),
    [logs, todayKey]
  );
  const moodLogged = useMemo(() => todayLogs.find((l) => l.type === "mood"), [todayLogs]);
  const dailyQuote = getDailyQuote();

  async function handleEmailAuth() {
    setAuthLoading(true);
    setAuthError("");

    try {
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;

      await setPersistence(auth, persistence);

      if (!email.trim()) {
        throw { code: "auth/invalid-email" };
      }

      if (!password.trim()) {
        throw { code: "auth/missing-password" };
      }

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

      await setDoc(doc(db, "artifacts", appId, "users", user.uid), normalizedProfile, {
        merge: true,
      });

      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "profiles", user.uid),
        {
          ...normalizedProfile,
          id: user.uid,
        },
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

  async function uploadMealImage(uid, imageDataUrl) {
    if (!imageDataUrl) return "";

    const storageRef = ref(
      storage,
      `artifacts/${appId}/users/${uid}/meals/${Date.now()}.jpg`
    );

    await uploadString(storageRef, imageDataUrl, "data_url");
    return getDownloadURL(storageRef);
  }

  async function handleSaveMood(mood) {
    if (!user || moodLogged) return;

    try {
      await addDoc(collection(db, "artifacts", appId, "users", user.uid, "logs"), {
        type: "mood",
        moodId: mood.id,
        emoji: mood.emoji,
        label: mood.label,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSaveMeal() {
    setDiaryError("");

    if (!user) {
      setDiaryError("Usuário não autenticado.");
      return;
    }

    if (!foodInput.trim() && !image) {
      setDiaryError("Descreva a refeição ou envie uma foto.");
      return;
    }

    setIsCalculating(true);

    try {
      const uploadedImageUrl = await uploadMealImage(user.uid, image);

      const response = await fetch("/api/estimateCalories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: foodInput.trim(),
          imageBase64: image ? image.split(",")[1] : null,
          mimeType: image?.match(/^data:(.*?);base64,/)?.[1] || "image/jpeg",
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Falha ao estimar calorias.");
      }

      const payload = await response.json();
      const calorieCount = Number(payload.calories) || 350;

      await addDoc(collection(db, "artifacts", appId, "users", user.uid, "logs"), {
        type: "food",
        mealId: selectedMeal,
        description: foodInput.trim() || "Refeição por foto",
        calories: calorieCount,
        imageUrl: uploadedImageUrl,
        timestamp: new Date().toISOString(),
      });

      setFoodInput("");
      setImage(null);
      setCurrentPage("home");
    } catch (error) {
      console.error(error);
      setDiaryError(error.message || "Não foi possível salvar a refeição.");
    } finally {
      setIsCalculating(false);
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
        />
      ) : null}

      {currentPage === "diary" ? (
        <DiaryPage
          isCalculating={isCalculating}
          onSave={handleSaveMeal}
          onImageUpload={handleImageUpload}
          image={image}
          setImage={setImage}
          foodInput={foodInput}
          setFoodInput={setFoodInput}
          selectedMeal={selectedMeal}
          setSelectedMeal={setSelectedMeal}
          diaryError={diaryError}
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
        <nav className="fixed bottom-6 left-5 right-5 max-w-[400px] mx-auto bg-slate-900/95 backdrop-blur-lg flex justify-around p-4 rounded-[40px] shadow-2xl text-white border border-white/5 z-50">
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
            <Utensils size={22} />
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setCurrentPage("admin")}
              className={`p-2 transition-all ${
                currentPage === "admin" ? "text-emerald-400 scale-125" : "opacity-40"
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
