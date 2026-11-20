import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight, KanbanSquare, PackageCheck, Wallet, Truck, ShieldCheck, Lock, Ruler, HardHat, Users, Sparkles, CheckCircle2,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { TONE, type Tone } from '../components/ui';

const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };
const stagger: Variants = { show: { transition: { staggerChildren: 0.08 } } };

const FEATURES: { icon: typeof Wallet; tone: Tone; title: string; text: string }[] = [
  { icon: KanbanSquare, tone: 'sky', title: 'Seguimiento de tareas', text: 'Tablero Kanban por obra: qué está por comenzar, en curso, en pausa o terminado. Arrastrás y listo.' },
  { icon: PackageCheck, tone: 'peach', title: 'Pedidos centralizados', text: 'Pedí materiales con ítems, cantidades y prioridad. Seguí cada pedido de pendiente a entregado.' },
  { icon: Wallet, tone: 'rose', title: 'Control financiero', text: 'Caja chica con saldo automático, jornales del personal y adicionales con su estado de aprobación.' },
  { icon: Truck, tone: 'lilac', title: 'Logística y servicios', text: 'Fletes, volquetes y pólizas de seguro con alertas antes de que algo venza.' },
  { icon: Ruler, tone: 'sage', title: 'Cálculos de obra', text: 'Hormigón, superficies, ladrillos por m² y desperdicio. El resultado pasa directo a un pedido.' },
  { icon: Lock, tone: 'sky', title: 'Tus datos, solo tuyos', text: 'Cada cuenta tiene su espacio aislado a nivel base de datos. Nadie más ve tus obras.' },
];

function Mock() {
  const cols = [
    { t: 'Por comenzar', tone: 'lilac' as Tone, cards: ['Instalación eléctrica P1', 'Cotizar aberturas'] },
    { t: 'En curso', tone: 'sky' as Tone, cards: ['Replanteo muros PB'] },
    { t: 'Terminada', tone: 'sage' as Tone, cards: ['Impermeabilización', 'Contrapiso PB'] },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 40, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-16 max-w-5xl rounded-3xl border border-line bg-white/80 p-3 shadow-lift backdrop-blur [perspective:1000px]">
      <div className="rounded-2xl bg-bone p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-bg" /><span className="h-3 w-3 rounded-full bg-peach-bg" /><span className="h-3 w-3 rounded-full bg-sage-bg" />
          <span className="ml-3 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-muted shadow-soft">Edificio Río 1820</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {cols.map((c, i) => (
            <div key={c.t} className="rounded-2xl bg-slate-100/70 p-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold"><span className={`rounded-full px-2 py-0.5 ${TONE[c.tone]}`}>{c.cards.length}</span>{c.t}</p>
              {c.cards.map((card, j) => (
                <motion.div key={card} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.15 + j * 0.1 }}
                  className="mb-2 rounded-xl border border-line bg-white p-3 text-left text-sm font-semibold shadow-soft">
                  {card}
                  <div className="mt-2 flex gap-1"><span className="h-1.5 w-10 rounded-full bg-lilac-bg" /><span className="h-1.5 w-6 rounded-full bg-sky-bg" /></div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
        className="absolute -right-3 -top-5 hidden rounded-2xl border border-line bg-white px-4 py-3 shadow-lift sm:block">
        <p className="text-xs text-muted">Saldo caja chica</p><p className="text-lg font-bold text-sage">$ 99.500</p>
      </motion.div>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 shadow-lift sm:flex">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-peach-bg text-peach"><PackageCheck size={16} /></span>
        <span className="text-sm font-semibold">Pedido #14 en camino</span>
      </motion.div>
    </motion.div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="overflow-x-hidden">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bone/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#que-hacemos" className="hover:text-ink">Qué hacemos</a>
            <a href="#quienes-somos" className="hover:text-ink">Quiénes somos</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app" className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-700">Ir al panel <ArrowRight size={16} /></Link>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Login</Link>
                <Link to="/registro" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-700">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[10%] top-10 h-72 w-72 rounded-full bg-lilac-bg blur-3xl" />
          <div className="absolute right-[8%] top-40 h-72 w-72 rounded-full bg-sky-bg blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-60 w-60 rounded-full bg-sage-bg blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px] opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        </div>
        <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-3xl text-center">
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-soft">
            <Sparkles size={14} className="text-lilac" /> Hecho para jefes de obra y estudios de arquitectura
          </motion.span>
          <motion.h1 variants={fadeUp} className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Orden, trazabilidad y <span className="bg-gradient-to-r from-lilac via-sky to-sage bg-clip-text text-transparent">calma</span> para el caos diario de la obra.
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
            Tareas, pedidos, caja chica, jornales, fletes y seguros en un solo lugar. Dejá el cuaderno, los audios y las planillas sueltas.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={user ? '/app' : '/registro'} className="group inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 font-semibold text-white shadow-lift transition hover:-translate-y-0.5">
              Empezar gratis <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <a href="#que-hacemos" className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-6 py-3.5 font-semibold shadow-soft hover:border-slate-300">Ver cómo funciona</a>
          </motion.div>
        </motion.div>
        <Mock />
      </section>

      {/* QUÉ HACEMOS */}
      <section id="que-hacemos" className="scroll-mt-20 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="mb-14 max-w-2xl">
            <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-[0.15em] text-lilac">Qué hacemos</motion.p>
            <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Todo lo que pasa en la obra, en un mismo tablero.</motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-slate-600">Centralizamos la operativa del jefe de obra para que el estudio sepa qué se pidió, qué se gastó y qué falta, sin llamar a nadie.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group rounded-3xl border border-line bg-white p-7 shadow-soft hover:shadow-lift">
                <div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${TONE[f.tone]} transition group-hover:scale-110`}><f.icon size={22} /></div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* QUIÉNES SOMOS */}
      <section id="quienes-somos" className="scroll-mt-20 bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-sm font-bold uppercase tracking-[0.15em] text-sage">Quiénes somos</motion.p>
            <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Arquitectos, jefes de obra y desarrolladores, en la misma mesa.</motion.h2>
            <motion.p variants={fadeUp} className="mt-5 leading-relaxed text-slate-600">
              Venimos del estudio y del pie de obra. Conocemos el remito que se pierde, la caja chica que no cierra y el volquete que nadie pidió retirar. Construimos la herramienta que nos hubiera gustado tener.
            </motion.p>
            <motion.ul variants={stagger} className="mt-6 space-y-3">
              {['Pensado para usar desde el celular, en la obra.', 'Sin capacitaciones eternas: se entiende en minutos.', 'Seguridad real: aislamiento de datos a nivel base de datos.'].map((t) => (
                <motion.li key={t} variants={fadeUp} className="flex items-start gap-3 text-slate-700"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-sage" />{t}</motion.li>
              ))}
            </motion.ul>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 gap-4">
            {[
              { icon: HardHat, tone: 'peach' as Tone, n: 'Pie de obra', t: 'Procesos diseñados con capataces y jefes de obra reales.' },
              { icon: Ruler, tone: 'lilac' as Tone, n: 'Estudio', t: 'Trazabilidad para la dirección de obra y el comitente.' },
              { icon: Users, tone: 'sky' as Tone, n: 'Equipo', t: 'Producto y soporte cercano, en tu idioma.' },
              { icon: ShieldCheck, tone: 'sage' as Tone, n: 'Técnica', t: 'Stack moderno, seguro y en la nube.' },
            ].map((c, i) => (
              <motion.div key={c.n} variants={fadeUp} className={`rounded-3xl border border-line bg-bone p-6 ${i % 2 ? 'translate-y-8' : ''}`}>
                <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl ${TONE[c.tone]}`}><c.icon size={20} /></div>
                <p className="font-bold">{c.n}</p>
                <p className="mt-1 text-sm text-slate-600">{c.t}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-24 sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="mx-auto max-w-4xl rounded-[2rem] bg-ink px-8 py-14 text-center text-white shadow-lift">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Tu próxima obra, bajo control desde el día uno.</h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-300">Creá tu cuenta en un minuto. Tu espacio es privado y aislado.</p>
          <Link to={user ? '/app' : '/registro'} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sage-bg px-6 py-3.5 font-semibold text-sage transition hover:-translate-y-0.5">
            Crear mi cuenta <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-line px-4 py-8 text-center text-sm text-muted">
        <Logo /> <p className="mt-2">© {new Date().getFullYear()} obrabase · Gestión y control de obra</p>
      </footer>
    </div>
  );
}
