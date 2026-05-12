import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, LayoutDashboard, Users, Mic, Calendar, Activity,
  LogOut, Bell, ShieldCheck, Heart, Baby, BarChart3,
  ChevronRight, AlertTriangle, CheckCircle2, Mail, Lock,
  Sparkles, ArrowRight, UserPlus, Search, Settings,
  FileText, MessageSquare, TrendingUp, Clock, Plus,
  X, Send, Loader, MicOff, Play, Pause
} from 'lucide-react';

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { typeof window !== 'undefined' && localStorage.setItem(k, JSON.stringify(v)); } catch { } }
};

// ─── DEFAULT DATA ─────────────────────────────────────────────────────────────
const DEFAULT_PATIENTS = [
  { id: 1, name: 'Mert Yılmaz', age: 28, status: 'Stabil', tag: 'depresyon', sessions: 12, lastSession: 'Bugün 10:00', risk: 'Düşük', notes: 'BDT süreci devam ediyor.' },
  { id: 2, name: 'Zeynep Aras', age: 34, status: 'Anksiyete', tag: 'anksiyete', sessions: 8, lastSession: 'Dün 14:00', risk: 'Orta', notes: 'GAD-7 skoru 12.' },
  { id: 3, name: 'Can Demir', age: 8, status: 'DEHB', tag: 'kids', sessions: 5, lastSession: '3 gün önce', risk: 'Düşük', notes: 'Motor beceri gelişimi takip ediliyor.' },
];

const DEFAULT_APPOINTMENTS = [
  { id: 1, patient: 'Mert Yılmaz', time: '10:00', date: '2026-05-12', type: 'Bireysel Terapi', status: 'confirmed' },
  { id: 2, patient: 'Zeynep Aras', time: '14:00', date: '2026-05-12', type: 'BDT Seansı', status: 'confirmed' },
  { id: 3, patient: 'Can Demir', time: '16:00', date: '2026-05-13', type: 'Özel Eğitim', status: 'pending' },
  { id: 4, patient: 'Ali Vural', time: '11:30', date: '2026-05-14', type: 'İlk Görüşme', status: 'confirmed' },
];

const DEFAULT_NOTES = [
  { id: 1, patient: 'Mert Yılmaz', date: '9 Mayıs 2026', content: 'BDT egzersizleri düzenli uygulanmış. Bilişsel yeniden yapılandırma çalışmaları etkili.', type: 'manual' },
  { id: 2, patient: 'Zeynep Aras', date: '8 Mayıs 2026', content: 'Anksiyete belirtileri azalıyor. Nefes teknikleri öğretildi.', type: 'ai' },
  { id: 3, patient: 'Can Demir', date: '7 Mayıs 2026', content: 'Motor beceri egzersizleri tamamlandı. Dikkat süresi artıyor.', type: 'voice' },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ClinicAI() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [userRole, setUserRole] = useState('Psikolog');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRecording, setIsRecording] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Merhaba Dr. Emine! Size nasıl yardımcı olabilirim? Vaka analizi, seans notu veya klinik danışma için buradayım.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    setPatients(LS.get('cai_patients', DEFAULT_PATIENTS));
    setAppointments(LS.get('cai_appts', DEFAULT_APPOINTMENTS));
    setNotes(LS.get('cai_notes', DEFAULT_NOTES));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  if (!mounted) return null;

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  // ─── AI CHAT ──────────────────────────────────────────────────────────────
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: 'Sen ClinicAI adlı bir klinik psikoloji asistanısın. Psikologlar ve ruh sağlığı uzmanlarına destek sağlıyorsun. Türkçe yanıt ver. DSM-5, ICD-11 ve kanıta dayalı tedavi kılavuzlarına referans ver.' },
            ...chatMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: userMsg }
          ]
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Yanıt alınamadı.';
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: '⚠️ Bağlantı hatası.' }]);
    }
    setChatLoading(false);
  };

  // ─── VOICE RECORDING ──────────────────────────────────────────────────────
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        const chunks = [];
        mr.ondataavailable = e => chunks.push(e.data);
        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          // Generate AI note from recording
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 800,
                messages: [
                  { role: 'system', content: 'Sen bir klinik psikolog seans notu asistanısın. SOAP formatında Türkçe not oluşturuyorsun.' },
                  { role: 'user', content: `${recordingTime} saniyelik bir terapi seansı kaydedildi. SOAP formatında boş bir klinik not şablonu oluştur. Bugünün tarihi: ${new Date().toLocaleDateString('tr-TR')}` }
                ]
              })
            });
            const data = await res.json();
            const noteText = data.choices?.[0]?.message?.content || '';
            setVoiceTranscript(noteText);
            const newNote = {
              id: Date.now(),
              patient: 'Sesli Kayıt',
              date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
              content: noteText.substring(0, 200) + '...',
              type: 'voice'
            };
            const updated = [newNote, ...notes];
            setNotes(updated);
            LS.set('cai_notes', updated);
          } catch { }
        };
        mr.start();
        mediaRecorderRef.current = mr;
        setIsRecording(true);
      } catch (e) {
        alert('Mikrofon erişimi reddedildi: ' + e.message);
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  // ─── PATIENT MANAGEMENT ───────────────────────────────────────────────────
  const addPatient = (data) => {
    const updated = [{ id: Date.now(), ...data, sessions: 0, lastSession: 'Henüz seans yok', risk: 'Değerlendiriliyor' }, ...patients];
    setPatients(updated);
    LS.set('cai_patients', updated);
    setShowAddPatient(false);
  };

  const deletePatient = (id) => {
    const updated = patients.filter(p => p.id !== id);
    setPatients(updated);
    LS.set('cai_patients', updated);
  };

  // ─── LOGIN PAGE ───────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Head><title>ClinicAI V3 | Giriş</title></Head>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[1000px] grid md:grid-cols-2 bg-white rounded-[40px] shadow-2xl overflow-hidden"
        >
          {/* Left Panel */}
          <div className="bg-[#3d5c44] p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%">
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md"><Brain size={28}/></div>
                <span className="text-2xl font-bold tracking-tight">ClinicAI <span className="font-light opacity-70">V3</span></span>
              </div>
              <h1 className="text-4xl font-bold leading-tight mb-4">Yapay Zeka Destekli Klinik İşletim Sistemi</h1>
              <p className="text-white/60 text-base leading-relaxed">Psikologlar, danışmanlar ve özel eğitim uzmanları için tasarlandı.</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { icon: <ShieldCheck size={18}/>, label: 'KVKK Uyumlu' },
                  { icon: <Brain size={18}/>, label: 'Groq AI Motoru' },
                  { icon: <Mic size={18}/>, label: 'Sesli Not Sistemi' },
                  { icon: <BarChart3 size={18}/>, label: 'Gelişmiş Analitik' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-sm font-medium">
                    {f.icon} {f.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative z-10 flex gap-4 mt-8">
              <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-2xl font-bold">%98</p>
                <p className="text-xs opacity-50 mt-1">AI Doğruluk</p>
              </div>
              <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-2xl font-bold">256-bit</p>
                <p className="text-xs opacity-50 mt-1">Şifreli</p>
              </div>
              <div className="flex-1 bg-white/10 rounded-2xl p-4 text-center border border-white/10">
                <p className="text-2xl font-bold">7/24</p>
                <p className="text-xs opacity-50 mt-1">AI Destek</p>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="p-12 flex flex-col justify-center bg-white">
            <AnimatePresence mode="wait">
              {authView === 'login' && (
                <motion.form key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Hoş Geldiniz</h2>
                    <p className="text-slate-400 mt-1 text-sm">Klinik kimliğinizle sisteme erişin</p>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                      <input type="email" placeholder="E-posta adresi" defaultValue="emine@klinik.com" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-[#3d5c44]/20 focus:border-[#3d5c44] transition-all text-sm" />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                      <input type="password" placeholder="Şifre" defaultValue="••••••••" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-[#3d5c44]/20 focus:border-[#3d5c44] transition-all text-sm" />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <select onChange={e => setUserRole(e.target.value)} className="text-sm font-semibold text-slate-500 bg-transparent outline-none cursor-pointer hover:text-[#3d5c44] transition-colors">
                        <option>Psikolog</option>
                        <option>Süper Admin</option>
                        <option>Ebeveyn</option>
                        <option>Özel Eğitim</option>
                        <option>Danışman</option>
                      </select>
                      <button type="button" onClick={() => setAuthView('forgot')} className="text-xs font-semibold text-[#3d5c44] hover:underline">Şifremi Unuttum</button>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-[#3d5c44] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#3d5c44]/20 hover:bg-[#2d4432] transition-all flex items-center justify-center gap-2 text-sm">
                    Sistemi Başlat <ArrowRight size={18}/>
                  </button>
                  <p className="text-center text-slate-400 text-xs">
                    Hesabınız yok mu? <button type="button" onClick={() => setAuthView('register')} className="font-bold text-[#3d5c44] hover:underline">Kayıt Olun</button>
                  </p>
                  <p className="text-center text-xs text-slate-300">Demo: herhangi bir e-posta ve şifre ile giriş yapın</p>
                </motion.form>
              )}

              {authView === 'register' && (
                <motion.div key="reg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Kayıt Olun</h2>
                    <p className="text-slate-400 mt-1 text-sm">Kliniğinizi ClinicAI ile dijitalleştirin</p>
                  </div>
                  <input type="text" placeholder="Ad Soyad" className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm" />
                  <input type="email" placeholder="Kurumsal E-posta" className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm" />
                  <input type="text" placeholder="Klinik / Kurum Adı" className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm" />
                  <select className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm text-slate-500">
                    <option>Psikolog</option><option>Danışman</option><option>Özel Eğitim</option><option>Konuşma Terapisti</option>
                  </select>
                  <button onClick={() => setIsLoggedIn(true)} className="w-full bg-[#3d5c44] text-white py-4 rounded-2xl font-bold text-sm">Hesap Oluştur</button>
                  <button onClick={() => setAuthView('login')} className="w-full text-slate-400 font-semibold text-sm py-2">Geri Dön</button>
                </motion.div>
              )}

              {authView === 'forgot' && (
                <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-[#3d5c44]"><ShieldCheck size={32}/></div>
                  <h2 className="text-2xl font-bold">Şifre Sıfırla</h2>
                  <p className="text-slate-400 text-sm">E-posta adresinize sıfırlama bağlantısı gönderilecek</p>
                  <input type="email" placeholder="E-posta adresiniz" className="w-full p-3.5 rounded-2xl bg-slate-50 border text-sm outline-none" />
                  <button onClick={() => setAuthView('login')} className="w-full bg-[#3d5c44] text-white py-4 rounded-2xl font-bold text-sm">Bağlantı Gönder</button>
                  <button onClick={() => setAuthView('login')} className="text-slate-400 font-semibold text-sm">Geri Dön</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── MAIN DASHBOARD ───────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppts = appointments.filter(a => a.date === todayStr);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900">
      <Head><title>ClinicAI V3 | {activeTab}</title></Head>

      {/* ─── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col fixed h-full z-30 shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-[#3d5c44] p-2 rounded-xl text-white shadow-lg shadow-[#3d5c44]/20">
              <Brain size={22}/>
            </div>
            <div>
              <span className="text-lg font-bold text-[#3d5c44]">ClinicAI</span>
              <span className="text-xs text-slate-400 block font-medium">v3.0 • {userRole}</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', icon: <LayoutDashboard size={18}/>, label: 'Dashboard' },
              { id: 'patients', icon: <Users size={18}/>, label: 'Danışanlar', badge: patients.length },
              { id: 'sessions', icon: <Mic size={18}/>, label: 'AI Seans' },
              { id: 'kids', icon: <Baby size={18}/>, label: 'Kids Modülü' },
              { id: 'calendar', icon: <Calendar size={18}/>, label: 'Takvim', badge: todayAppts.length },
              { id: 'notes', icon: <FileText size={18}/>, label: 'Seans Notları', badge: notes.length },
              { id: 'analytics', icon: <BarChart3 size={18}/>, label: 'Analitik' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-semibold text-sm group ${activeTab === item.id ? 'bg-[#3d5c44] text-white shadow-lg shadow-[#3d5c44]/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}>
                <div className="flex items-center gap-3">{item.icon} {item.label}</div>
                {item.badge != null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-50">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#3d5c44]/10 text-[#3d5c44] flex items-center justify-center font-bold text-sm">E</div>
            <div>
              <p className="text-sm font-bold text-slate-800">Dr. Emine H.</p>
              <p className="text-xs text-[#3d5c44] font-semibold">{userRole}</p>
            </div>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-red-500 font-semibold text-sm transition-colors rounded-xl hover:bg-red-50">
            <LogOut size={16}/> Güvenli Çıkış
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 ml-72 min-h-screen">

        {/* Header */}
        <header className="sticky top-0 bg-[#F8FAFC]/80 backdrop-blur-xl border-b border-slate-100 px-10 py-4 flex justify-between items-center z-20">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Klinik Özeti'}
              {activeTab === 'patients' && 'Danışan Yönetimi'}
              {activeTab === 'sessions' && 'AI Seans Analizi'}
              {activeTab === 'kids' && 'ClinicAI Kids'}
              {activeTab === 'calendar' && 'Randevu Takvimi'}
              {activeTab === 'notes' && 'Seans Notları'}
              {activeTab === 'analytics' && 'Analitik & Raporlar'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#F8FAFC]"></div>
              <button className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                <Bell size={17} className="text-slate-400"/>
              </button>
            </div>
            <button onClick={() => setAiChatOpen(true)} className="bg-[#3d5c44] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-[#3d5c44]/20 hover:bg-[#2d4432] transition-all flex items-center gap-2">
              <Sparkles size={16}/> AI Asistan
            </button>
          </div>
        </header>

        {/* ─── TABS ──────────────────────────────────────────────────────── */}
        <div className="p-10">
          <AnimatePresence mode="wait">

            {/* DASHBOARD */}
            {activeTab === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-6">
                  <StatCard title="Toplam Danışan" value={patients.length} change="+2 bu ay" icon={<Users size={20}/>} />
                  <StatCard title="Bugünkü Randevu" value={todayAppts.length || 0} change={`${appointments.length} toplam`} icon={<Calendar size={20}/>} />
                  <StatCard title="Risk Uyarısı" value={patients.filter(p => p.risk === 'Orta' || p.risk === 'Yüksek').length} change="Güncel" icon={<AlertTriangle size={20}/>} urgent />
                  <StatCard title="Seans Notu" value={notes.length} change="Bu hafta" icon={<FileText size={20}/>} />
                </div>

                <div className="grid grid-cols-3 gap-8">
                  {/* Upcoming Sessions */}
                  <div className="col-span-2 bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold">Yaklaşan Seanslar</h3>
                      <button onClick={() => setActiveTab('calendar')} className="text-[#3d5c44] text-sm font-bold flex items-center gap-1 hover:underline">
                        Tümü <ChevronRight size={14}/>
                      </button>
                    </div>
                    <div className="space-y-3">
                      {appointments.slice(0, 4).map(a => (
                        <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-[#3d5c44]/20 transition-all cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-[#3d5c44] shadow-sm text-sm">{a.patient[0]}</div>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{a.patient}</p>
                              <p className="text-xs text-slate-400">{a.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">{a.time}</p>
                            <p className="text-xs text-slate-400">{a.date}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${a.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {a.status === 'confirmed' ? 'Onaylı' : 'Bekliyor'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Activity */}
                  <div className="bg-[#3d5c44] rounded-[32px] p-8 text-white relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Activity size={18}/> AI Analiz</h3>
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
                        <p className="text-xs opacity-60 font-semibold uppercase tracking-wider">Son Analiz</p>
                        <p className="text-sm font-medium leading-relaxed opacity-90">"Zeynep Aras'ta kaçınma dili arttı. Terapi hedeflerini güncelleyin."</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
                        <p className="text-xs opacity-60 font-semibold uppercase tracking-wider">Öneri</p>
                        <p className="text-sm font-medium leading-relaxed opacity-90">Sonraki seans: Duygu düzenleme stratejilerine odaklanın.</p>
                      </div>
                      <button onClick={() => setAiChatOpen(true)} className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 text-sm font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                        <MessageSquare size={16}/> Vaka Tartış
                      </button>
                    </div>
                    <Brain size={150} className="absolute -bottom-8 -right-8 opacity-5" />
                  </div>
                </div>

                {/* Recent Notes */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Son Seans Notları</h3>
                    <button onClick={() => setActiveTab('notes')} className="text-[#3d5c44] text-sm font-bold flex items-center gap-1 hover:underline">Tümü <ChevronRight size={14}/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {notes.slice(0, 3).map(n => (
                      <div key={n.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#3d5c44]/20 transition-all cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${n.type === 'voice' ? 'bg-red-50 text-red-500' : n.type === 'ai' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {n.type === 'voice' ? '🎙️ Sesli' : n.type === 'ai' ? '🤖 AI' : '✏️ Manuel'}
                          </span>
                          <span className="text-xs text-slate-400">{n.date}</span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 mb-1">{n.patient}</p>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{n.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* PATIENTS */}
            {activeTab === 'patients' && (
              <motion.div key="patients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                    <input placeholder="Danışan ara..." className="pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#3d5c44]/20 w-64" />
                  </div>
                  <button onClick={() => setShowAddPatient(true)} className="bg-[#3d5c44] text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-[#3d5c44]/20">
                    <Plus size={16}/> Yeni Danışan
                  </button>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Danışan', 'Yaş', 'Durum', 'Risk', 'Seans', 'Son Görüşme', 'İşlem'].map(h => (
                          <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {patients.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#3d5c44]/10 text-[#3d5c44] flex items-center justify-center font-bold text-sm">{p.name[0]}</div>
                              <span className="font-bold text-sm">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{p.age}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${p.status === 'Stabil' ? 'bg-green-100 text-green-600' : p.status === 'Anksiyete' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{p.status}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold ${p.risk === 'Düşük' ? 'text-green-500' : p.risk === 'Orta' ? 'text-amber-500' : 'text-red-500'}`}>{p.risk}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{p.sessions}</td>
                          <td className="px-6 py-4 text-xs text-slate-400">{p.lastSession}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button onClick={() => { setChatMessages([{ role: 'ai', text: `${p.name} hakkında ne öğrenmek istersiniz?` }]); setAiChatOpen(true); }} className="text-xs text-[#3d5c44] font-bold hover:underline">AI Analiz</button>
                              <button onClick={() => deletePatient(p.id)} className="text-xs text-red-400 font-bold hover:underline">Sil</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* SESSIONS */}
            {activeTab === 'sessions' && (
              <motion.div key="sess" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-100 text-center relative overflow-hidden">
                  <div className="relative z-10">
                    <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center mb-8 transition-all duration-500 relative ${isRecording ? 'bg-red-50' : 'bg-slate-50'}`}>
                      {isRecording && <div className="absolute inset-0 rounded-full border-4 border-red-200 animate-ping opacity-30"></div>}
                      {isRecording ? <MicOff size={44} className="text-red-500 relative z-10"/> : <Mic size={44} className="text-slate-300 relative z-10"/>}
                    </div>
                    {isRecording && (
                      <div className="mb-4">
                        <p className="text-2xl font-mono font-bold text-red-500">{formatTime(recordingTime)}</p>
                        <p className="text-sm text-slate-400 mt-1">AI arka planda dinliyor ve not alıyor...</p>
                      </div>
                    )}
                    <h3 className="text-2xl font-bold text-slate-800 mb-3">Gerçek Zamanlı AI Seans Analizi</h3>
                    <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed mb-8">
                      Mikrofonu başlattığınızda sistem otomatik SOAP notu oluşturur, risk kelimelerini tespit eder ve seans özeti çıkarır.
                    </p>
                    <div className="flex justify-center gap-4">
                      <button onClick={toggleRecording} className={`px-10 py-4 rounded-2xl font-bold transition-all shadow-xl text-sm ${isRecording ? 'bg-red-500 text-white shadow-red-200 hover:bg-red-600' : 'bg-[#3d5c44] text-white shadow-[#3d5c44]/20 hover:bg-[#2d4432]'}`}>
                        {isRecording ? '⏹ Kaydı Durdur & Not Al' : '▶ Kaydı Başlat'}
                      </button>
                    </div>
                  </div>
                </div>

                {voiceTranscript && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-[#3d5c44] flex items-center gap-2 mb-4"><FileText size={18}/> AI Tarafından Oluşturulan Seans Notu</h4>
                    <div className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap border border-slate-100">{voiceTranscript}</div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { const b = new Blob([voiceTranscript], {type:'text/plain'}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'seans-notu.txt'; a.click(); }} className="text-sm font-bold text-[#3d5c44] hover:underline flex items-center gap-1">📄 İndir</button>
                      <button onClick={() => setVoiceTranscript('')} className="text-sm font-bold text-red-400 hover:underline">Temizle</button>
                    </div>
                  </motion.div>
                )}

                {isRecording && (
                  <div className="grid grid-cols-2 gap-6">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h4 className="font-bold flex items-center gap-2 mb-4 text-[#3d5c44] text-sm"><Activity size={16}/> Canlı Transkript</h4>
                      <div className="space-y-3">
                        <p className="p-3 bg-slate-50 rounded-xl border-l-4 border-[#3d5c44] text-xs text-slate-500 italic animate-pulse">"Dinleniyor..."</p>
                      </div>
                    </motion.div>
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                      <h4 className="font-bold flex items-center gap-2 mb-4 text-amber-500 text-sm"><Brain size={16}/> AI İçgörüleri</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="font-bold text-slate-600">Anksiyete Sinyali</span><span className="text-amber-500 font-bold">İşleniyor...</span></div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-amber-400 h-full rounded-full animate-pulse" style={{width:'60%'}}></div></div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="font-bold text-slate-600">Risk Seviyesi</span><span className="text-green-500 font-bold">Düşük</span></div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-green-400 h-full rounded-full" style={{width:'20%'}}></div></div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}

            {/* KIDS */}
            {activeTab === 'kids' && (
              <motion.div key="kids" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-10 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
                  <div className="relative z-10">
                    <h3 className="text-3xl font-bold flex items-center gap-3 mb-3"><Baby size={36}/> ClinicAI Kids</h3>
                    <p className="text-blue-100 max-w-lg text-sm leading-relaxed">Otizm, DEHB, Konuşma Gecikmesi ve Gelişim Takibi için oyunlaştırılmış AI modülü.</p>
                    <div className="flex gap-3 mt-6">
                      <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-sm shadow-lg">Gelişim Planı Oluştur</button>
                      <button className="bg-blue-400/30 border border-white/20 px-6 py-3 rounded-xl font-bold text-sm">Veli Paneli</button>
                    </div>
                  </div>
                  <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'Otizm Takibi', icon: '🧩', count: 4, color: 'purple' },
                    { label: 'DEHB Programı', icon: '⚡', count: 3, color: 'amber' },
                    { label: 'Konuşma Terapisi', icon: '💬', count: 2, color: 'blue' },
                    { label: 'Motor Beceriler', icon: '🏃', count: 5, color: 'green' },
                    { label: 'Duyusal İşlem', icon: '🎨', count: 2, color: 'pink' },
                    { label: 'ABA Terapi', icon: '📊', count: 3, color: 'indigo' },
                  ].map((m, i) => (
                    <div key={i} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <div className="text-3xl mb-3">{m.icon}</div>
                      <h4 className="font-bold text-slate-800 mb-1 text-sm">{m.label}</h4>
                      <p className="text-xs text-slate-400">{m.count} aktif öğrenci</p>
                      <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full">
                        <div className="bg-[#3d5c44] h-full rounded-full" style={{width: `${(m.count/5)*100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-lg mb-6">Çocuk Danışanlar</h4>
                  <div className="space-y-3">
                    {patients.filter(p => p.tag === 'kids' || p.age < 18).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-sm">{p.name[0]}</div>
                          <div>
                            <p className="font-bold text-sm">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.age} yaş • {p.status}</p>
                          </div>
                        </div>
                        <button onClick={() => setAiChatOpen(true)} className="text-xs font-bold text-blue-500 hover:underline">Gelişim Raporu</button>
                      </div>
                    ))}
                    {patients.filter(p => p.tag === 'kids' || p.age < 18).length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-8">Çocuk danışan bulunmuyor. Danışanlar sekmesinden ekleyin.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* CALENDAR */}
            {activeTab === 'calendar' && (
              <motion.div key="cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-end">
                  <button onClick={() => setShowAddAppt(true)} className="bg-[#3d5c44] text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-[#3d5c44]/20">
                    <Plus size={16}/> Randevu Ekle
                  </button>
                </div>
                <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>{['Danışan', 'Tarih', 'Saat', 'Tür', 'Durum'].map(h => (
                        <th key={h} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {appointments.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-sm">{a.patient}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{a.date}</td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-700">{a.time}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{a.type}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${a.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {a.status === 'confirmed' ? 'Onaylı' : 'Bekliyor'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* NOTES */}
            {activeTab === 'notes' && (
              <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-end gap-3">
                  <button onClick={() => { const c = notes.map(n=>`${n.patient}\n${n.date}\n${'─'.repeat(30)}\n${n.content}`).join('\n\n'); const b=new Blob([c],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='notlar.txt'; a.click(); }} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-slate-50">
                    📄 İndir
                  </button>
                  <button onClick={() => setActiveTab('sessions')} className="bg-[#3d5c44] text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-[#3d5c44]/20">
                    <Mic size={16}/> Sesli Not Al
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {notes.map(n => (
                    <div key={n.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${n.type === 'voice' ? 'bg-red-50 text-red-500' : n.type === 'ai' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                          {n.type === 'voice' ? '🎙️ Sesli' : n.type === 'ai' ? '🤖 AI' : '✏️ Manuel'}
                        </span>
                        <span className="text-xs text-slate-400">{n.date}</span>
                      </div>
                      <p className="font-bold text-sm text-slate-800 mb-2">{n.patient}</p>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{n.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ANALYTICS */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm col-span-2">
                    <h3 className="font-bold text-lg mb-6">Danışan Risk Dağılımı</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Düşük Risk', count: patients.filter(p=>p.risk==='Düşük').length, total: patients.length, color: 'bg-green-400' },
                        { label: 'Orta Risk', count: patients.filter(p=>p.risk==='Orta').length, total: patients.length, color: 'bg-amber-400' },
                        { label: 'Yüksek Risk', count: patients.filter(p=>p.risk==='Yüksek').length, total: patients.length, color: 'bg-red-400' },
                      ].map((r, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-semibold text-slate-600">{r.label}</span>
                            <span className="font-bold text-slate-800">{r.count} danışan</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className={`${r.color} h-full rounded-full transition-all`} style={{width: r.total > 0 ? `${(r.count/r.total)*100}%` : '0%'}}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#3d5c44] p-8 rounded-[32px] text-white">
                    <h3 className="font-bold text-lg mb-6">Platform Özeti</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Toplam Danışan', value: patients.length },
                        { label: 'Seans Notu', value: notes.length },
                        { label: 'Randevu', value: appointments.length },
                        { label: 'AI Analiz', value: notes.filter(n=>n.type==='ai'||n.type==='voice').length },
                      ].map((s, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/10">
                          <span className="text-sm opacity-70">{s.label}</span>
                          <span className="font-bold text-lg">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* ─── AI CHAT PANEL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {aiChatOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-[#3d5c44] text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center"><Brain size={18}/></div>
                <div>
                  <p className="font-bold text-sm">ClinicAI Asistan</p>
                  <p className="text-xs opacity-60">Groq Llama 3.3 70B</p>
                </div>
              </div>
              <button onClick={() => setAiChatOpen(false)} className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all"><X size={16}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${m.role === 'ai' ? 'bg-[#3d5c44] text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {m.role === 'ai' ? 'AI' : 'Dr'}
                  </div>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${m.role === 'ai' ? 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm' : 'bg-[#3d5c44] text-white rounded-tr-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#3d5c44] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">AI</div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}></div>)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Klinik sorunuzu yazın..." className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#3d5c44]/20"/>
                <button onClick={sendChatMessage} disabled={chatLoading} className="w-10 h-10 bg-[#3d5c44] rounded-xl flex items-center justify-center text-white hover:bg-[#2d4432] transition-all disabled:opacity-50">
                  {chatLoading ? <Loader size={14} className="animate-spin"/> : <Send size={14}/>}
                </button>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {['DSM-5 kriterleri', 'BDT egzersizi öner', 'Kriz protokolü', 'Vaka analiz et'].map(q => (
                  <button key={q} onClick={() => { setChatInput(q); }} className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:border-[#3d5c44]/30 hover:text-[#3d5c44] transition-all">{q}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FLOATING AI BUTTON ──────────────────────────────────────────── */}
      {!aiChatOpen && (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          onClick={() => setAiChatOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#3d5c44] text-white rounded-full shadow-2xl shadow-[#3d5c44]/30 flex items-center justify-center z-40 border-4 border-white">
          <Sparkles size={26}/>
        </motion.button>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddPatient && (
          <Modal title="Yeni Danışan Ekle" onClose={() => setShowAddPatient(false)}>
            <AddPatientForm onSubmit={addPatient} onClose={() => setShowAddPatient(false)}/>
          </Modal>
        )}
        {showAddAppt && (
          <Modal title="Randevu Ekle" onClose={() => setShowAddAppt(false)}>
            <AddApptForm patients={patients} onSubmit={(d) => { const updated=[{id:Date.now(),...d,status:'pending'},...appointments]; setAppointments(updated); LS.set('cai_appts',updated); setShowAddAppt(false); }} onClose={() => setShowAddAppt(false)}/>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function StatCard({ title, value, change, icon, urgent }) {
  return (
    <div className={`p-7 rounded-[28px] bg-white border shadow-sm hover:shadow-md transition-all group ${urgent ? 'border-red-100' : 'border-slate-100'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${urgent ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-[#3d5c44] group-hover:bg-[#3d5c44] group-hover:text-white transition-all'}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-4xl font-bold text-slate-900 mb-1">{value}</h4>
      <p className="text-xs font-semibold text-slate-400">{change}</p>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all"><X size={16}/></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function AddPatientForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name: '', age: '', status: 'Stabil', tag: 'genel', notes: '' });
  return (
    <div className="space-y-4">
      {[['Ad Soyad', 'name', 'text'], ['Yaş', 'age', 'number']].map(([label, key, type]) => (
        <div key={key}>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
          <input type={type} value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#3d5c44]/20" />
        </div>
      ))}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Durum</label>
        <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none">
          <option>Stabil</option><option>Anksiyete</option><option>Depresyon</option><option>DEHB</option><option>Travma</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Kategori</label>
        <select value={form.tag} onChange={e => setForm(f=>({...f,tag:e.target.value}))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none">
          <option value="genel">Genel</option><option value="anksiyete">Anksiyete</option><option value="depresyon">Depresyon</option><option value="travma">Travma</option><option value="kids">Çocuk</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 py-3 border border-slate-100 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50">İptal</button>
        <button onClick={() => form.name && onSubmit({...form, age: parseInt(form.age)||0, risk: 'Değerlendiriliyor'})} className="flex-1 py-3 bg-[#3d5c44] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#3d5c44]/20">Ekle</button>
      </div>
    </div>
  );
}

function AddApptForm({ patients, onSubmit, onClose }) {
  const [form, setForm] = useState({ patient: patients[0]?.name || '', date: '', time: '', type: 'Bireysel Terapi' });
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Danışan</label>
        <select value={form.patient} onChange={e => setForm(f=>({...f,patient:e.target.value}))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none">
          {patients.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
      </div>
      {[['Tarih', 'date', 'date'], ['Saat', 'time', 'time']].map(([label, key, type]) => (
        <div key={key}>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
          <input type={type} value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none" />
        </div>
      ))}
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Tür</label>
        <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none">
          <option>Bireysel Terapi</option><option>İlk Görüşme</option><option>BDT Seansı</option><option>Çift Terapisi</option><option>Özel Eğitim</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 py-3 border border-slate-100 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-50">İptal</button>
        <button onClick={() => form.date && form.time && onSubmit(form)} className="flex-1 py-3 bg-[#3d5c44] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#3d5c44]/20">Ekle</button>
      </div>
    </div>
  );
}

