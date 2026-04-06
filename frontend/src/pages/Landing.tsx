import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen bg-white dark:bg-slate-900'>
      <Navbar />

      {/* ── Hero ── */}
      <section className='relative overflow-hidden'>
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary-50 dark:bg-primary-900/20 opacity-40 blur-3xl -z-10' />
        <div className='absolute top-40 right-0 w-[300px] h-[300px] rounded-full bg-blue-100 dark:bg-blue-900/20 opacity-30 blur-3xl -z-10' />

        <div className='max-w-4xl mx-auto text-center px-8 pt-24 pb-20'>
          <div className='inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 text-xs font-medium px-4 py-1.5 rounded-full mb-6'>
            <span className='w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse' />
            AI-powered product intelligence
          </div>
          <h1 className='text-6xl font-semibold tracking-tight text-gray-900 dark:text-slate-50 mb-6 leading-[1.1]'>
            Stop guessing what<br />customers <span className='text-primary-600 dark:text-primary-400'>actually think</span>
          </h1>
          <p className='text-gray-500 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed'>
            Insights reads thousands of reviews and tells you exactly which product features drive love
            and which cause churn — down to the specific aspect, with evidence.
          </p>
          <div className='flex items-center justify-center gap-3'>
            <button className='btn-primary text-base px-8 py-3.5' onClick={() => navigate('/signup')}>Start free →</button>
            <button className='btn-secondary text-base px-8 py-3.5' onClick={() => navigate('/login')}>Sign in</button>
          </div>
          <p className='text-xs text-gray-400 dark:text-slate-500 mt-4'>No credit card needed. Analyze your first product in under 2 minutes.</p>
        </div>
      </section>

      {/* ── Live demo preview ── */}
      <section className='max-w-5xl mx-auto px-8 -mt-4 mb-20'>
        <div className='bg-gray-900 rounded-2xl p-1.5 shadow-2xl'>
          <div className='flex items-center gap-1.5 px-4 py-2.5'>
            <div className='w-2.5 h-2.5 rounded-full bg-red-400' />
            <div className='w-2.5 h-2.5 rounded-full bg-amber-400' />
            <div className='w-2.5 h-2.5 rounded-full bg-green-400' />
            <span className='text-[10px] text-gray-500 ml-2'>insights-ai — dashboard</span>
          </div>
          <div className='bg-gray-50 dark:bg-slate-800 rounded-xl overflow-hidden'>
            <div className='p-6'>
              <div className='flex gap-4 mb-4'>
                {[
                  { label: 'Overall score', value: '7.8', cls: 'text-primary-600' },
                  { label: 'Reviews analyzed', value: '2,841', cls: 'text-gray-900 dark:text-slate-100' },
                  { label: 'Critical issues', value: '3', cls: 'text-red-600' },
                ].map((m, i) => (
                  <div key={i} className='w-40 bg-white dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 p-4'>
                    <p className='text-[10px] text-gray-400 dark:text-slate-400 mb-1'>{m.label}</p>
                    <p className={'text-2xl font-semibold ' + m.cls}>{m.value}</p>
                  </div>
                ))}
                <div className='flex-1 bg-white dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 p-4'>
                  <p className='text-[10px] text-gray-400 dark:text-slate-400 mb-1'>Top insight</p>
                  <p className='text-xs text-gray-700 dark:text-slate-300'>"Battery drain correlates with overheating in 73% of negative reviews"</p>
                </div>
              </div>
              <div className='bg-white dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-slate-600 p-4'>
                <p className='text-[10px] text-gray-400 dark:text-slate-400 font-medium mb-3'>ASPECT SENTIMENT BREAKDOWN</p>
                {[
                  { name: 'Camera', pos: 82, neg: 18 },
                  { name: 'Battery Life', pos: 34, neg: 66 },
                  { name: 'Display', pos: 91, neg: 9 },
                  { name: 'Performance', pos: 55, neg: 45 },
                  { name: 'Build Quality', pos: 78, neg: 22 },
                ].map((a, i) => (
                  <div key={i} className='flex items-center gap-3 mb-2 last:mb-0'>
                    <span className='text-[11px] text-gray-600 dark:text-slate-300 w-24 font-medium'>{a.name}</span>
                    <div className='flex-1 flex gap-0.5 h-2 rounded-full overflow-hidden'>
                      <div className='bg-green-500 rounded-l-full' style={{ width: a.pos + '%' }} />
                      <div className='bg-red-400 rounded-r-full'   style={{ width: a.neg + '%' }} />
                    </div>
                    <span className={'text-[10px] font-medium w-8 text-right ' + (a.neg > 50 ? 'text-red-600' : 'text-green-700')}>
                      {a.neg > 50 ? a.neg + '%' : a.pos + '%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem → Solution ── */}
      <section className='max-w-5xl mx-auto px-8 pb-20'>
        <div className='grid grid-cols-2 gap-12'>
          <div>
            <p className='text-xs text-red-500 font-medium uppercase tracking-wider mb-3'>The problem</p>
            <h2 className='text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-4'>You're drowning in reviews but starving for clarity</h2>
            <div className='space-y-3'>
              {[
                'Star ratings tell you nothing about why customers are unhappy',
                'Reading hundreds of reviews manually is slow and biased',
                'Issues escalate to social media before your team even notices',
                'Generic sentiment tools say "negative" but not what or why',
              ].map((p, i) => (
                <div key={i} className='flex items-start gap-2.5'>
                  <span className='text-red-400 mt-0.5 text-sm'>✕</span>
                  <p className='text-sm text-gray-600 dark:text-slate-400 leading-relaxed'>{p}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className='text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider mb-3'>The solution</p>
            <h2 className='text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-4'>Insights breaks reviews down to the feature level</h2>
            <div className='space-y-3'>
              {[
                'Aspect-based analysis scores every feature — camera, battery, UX — individually',
                'Root cause detection finds statistical correlations humans miss',
                'Every insight links back to real customer quotes as evidence',
                'Ask anything in plain English and get data-grounded answers',
              ].map((p, i) => (
                <div key={i} className='flex items-start gap-2.5'>
                  <span className='text-green-600 dark:text-green-400 mt-0.5 text-sm'>✓</span>
                  <p className='text-sm text-gray-600 dark:text-slate-400 leading-relaxed'>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className='bg-gray-50 dark:bg-slate-800 border-y border-gray-100 dark:border-slate-700'>
        <div className='max-w-5xl mx-auto px-8 py-20'>
          <p className='text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wider text-center mb-3'>How it works</p>
          <h2 className='text-3xl font-semibold text-gray-900 dark:text-slate-100 text-center mb-4'>From raw reviews to boardroom-ready insights</h2>
          <p className='text-gray-500 dark:text-slate-400 text-center max-w-xl mx-auto mb-14'>Upload a CSV, and our pipeline does the rest. No training, no config, no waiting for a data team.</p>
          <div className='grid grid-cols-4 gap-6'>
            {[
              { step: '01', title: 'Upload reviews', desc: 'Drop a CSV, Excel, or JSON file. We normalize columns automatically — author, rating, body, date.', light: 'bg-blue-50 text-blue-700', dark: 'dark:bg-blue-900/40 dark:text-blue-300' },
              { step: '02', title: 'Extract aspects', desc: 'DeBERTa-v3 ABSA model identifies specific features mentioned — battery, camera, display — and scores sentiment per aspect.', light: 'bg-violet-50 text-violet-700', dark: 'dark:bg-violet-900/40 dark:text-violet-300' },
              { step: '03', title: 'Detect patterns', desc: 'Co-occurrence analysis, conditional probability, and contrast signals surface which issues cluster together and why.', light: 'bg-amber-50 text-amber-700', dark: 'dark:bg-amber-900/40 dark:text-amber-300' },
              { step: '04', title: 'Query & act', desc: 'Ask questions in plain English. A RAG pipeline retrieves relevant reviews and patterns, then generates evidence-backed answers.', light: 'bg-green-50 text-green-700', dark: 'dark:bg-green-900/40 dark:text-green-300' },
            ].map((s, i) => (
              <div key={i} className='relative'>
                {i < 3 && (
                  <div className='absolute top-8 left-full w-6 flex items-center justify-center z-10'>
                    <svg className='w-4 h-4 text-gray-300 dark:text-slate-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </div>
                )}
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-semibold mb-4 ${s.light} ${s.dark}`}>{s.step}</div>
                <h3 className='text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2'>{s.title}</h3>
                <p className='text-xs text-gray-500 dark:text-slate-400 leading-relaxed'>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className='max-w-5xl mx-auto px-8 py-20'>
        <p className='text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wider text-center mb-3'>Features</p>
        <h2 className='text-3xl font-semibold text-gray-900 dark:text-slate-100 text-center mb-14'>Everything a PM needs to act on feedback</h2>
        <div className='grid grid-cols-3 gap-6'>
          {[
            { icon: 'M3 13h2l3-8 4 16 3-8h6', title: 'Aspect-based sentiment', desc: 'Not just "positive" or "negative". Know exactly which features customers love and which are bleeding.', detail: 'DeBERTa-v3-base fine-tuned for ABSA with 10 aspect categories.' },
            { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Root cause signals', desc: 'Conditional probability analysis reveals causal chains: "when users complain about X, 73% also report Y".', detail: 'Co-occurrence, conditional probability, and contrast pattern detection.' },
            { icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16h6M21 12a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Ask anything (RAG)', desc: '"Why is battery score dropping?" — get answers grounded in your actual review data, not hallucinations.', detail: 'Semantic search via Qdrant + Mistral LLM with review & pattern context.' },
            { icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zM9 12l2 2 4-4', title: 'Evidence trail', desc: 'Every insight traces back to actual customer quotes. No black box — click to see the reviews that shaped each signal.', detail: 'Semantic similarity scoring ensures the most relevant quotes surface.' },
            { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0z', title: 'Multi-tenant', desc: 'Samsung sees Samsung data. Apple sees Apple data. Each team gets their own isolated workspace.', detail: 'JWT-based auth with client_id scoping on every query.' },
            { icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', title: 'Drag & drop upload', desc: 'Upload CSV, JSON, or Excel files per SKU. Auto-deduplication, column normalization, and async processing.', detail: 'Celery pipeline: clean → embed → ABSA → pattern detect.' },
          ].map((f, i) => (
            <div key={i} className='group border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl p-6 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-sm transition-all'>
              <div className='w-10 h-10 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-600 group-hover:text-white transition-colors'>
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d={f.icon} />
                </svg>
              </div>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-slate-100 mb-2'>{f.title}</h3>
              <p className='text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-3'>{f.desc}</p>
              <p className='text-[10px] text-gray-400 dark:text-slate-500 leading-relaxed border-t border-gray-50 dark:border-slate-700 pt-2'>{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Query demo — always dark ── */}
      <section className='bg-gray-900'>
        <div className='max-w-4xl mx-auto px-8 py-20'>
          <p className='text-xs text-blue-400 font-medium uppercase tracking-wider text-center mb-3'>Ask Insights</p>
          <h2 className='text-3xl font-semibold text-white text-center mb-4'>Talk to your reviews like a colleague</h2>
          <p className='text-gray-400 text-center max-w-xl mx-auto mb-10'>Type a question, get an answer backed by real customer data and statistical patterns. Not vibes — evidence.</p>
          <div className='bg-gray-800 rounded-2xl p-6'>
            <div className='flex gap-2 mb-5'>
              <div className='flex-1 bg-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300'>Why are Galaxy S24 users complaining about overheating?</div>
              <div className='bg-primary-600 text-white rounded-lg px-4 py-3 text-sm font-medium'>Ask →</div>
            </div>
            <div className='border border-gray-700 rounded-xl p-5'>
              <p className='text-xs text-blue-400 font-medium uppercase tracking-wide mb-3'>Insights answer</p>
              <p className='text-sm text-gray-200 leading-relaxed mb-4'>
                Overheating reports correlate strongly with gaming sessions (73%) and extended camera use (61%). 48 out of 142 reviews mention thermal issues. The pattern co-occurs with battery drain complaints in 67% of cases, suggesting a shared root cause in power management.
              </p>
              <div className='flex gap-2'>
                {['Review #847: "Phone gets really hot when gaming..."', 'Review #1203: "Battery and heat both worse after update..."'].map((e, i) => (
                  <div key={i} className='flex-1 bg-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400'>{e}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className='border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'>
        <div className='max-w-5xl mx-auto px-8 py-16'>
          <p className='text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider text-center mb-8'>Built with</p>
          <div className='flex items-center justify-center gap-10 flex-wrap'>
            {['DeBERTa-v3 ABSA','Sentence Transformers','Qdrant Vector DB','Mistral LLM','FastAPI','Celery','PostgreSQL','React + Vite'].map((t, i) => (
              <span key={i} className='text-sm text-gray-400 dark:text-slate-500 font-medium'>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className='max-w-3xl mx-auto px-8 py-24 text-center'>
        <h2 className='text-3xl font-semibold text-gray-900 dark:text-slate-100 mb-4'>Ready to understand your customers?</h2>
        <p className='text-gray-500 dark:text-slate-400 mb-8 max-w-md mx-auto'>Upload your first review dataset and get aspect-level insights in minutes, not weeks.</p>
        <div className='flex items-center justify-center gap-3'>
          <button className='btn-primary text-base px-8 py-3.5' onClick={() => navigate('/signup')}>Create free account →</button>
          <button className='btn-secondary text-base px-8 py-3.5' onClick={() => navigate('/login')}>Sign in</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 py-8 px-8'>
        <div className='max-w-5xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <svg width='20' height='20' viewBox='0 0 28 28' fill='none'>
              <rect width='28' height='28' rx='6' fill='#185FA5'/>
              <polyline points='5,20 10,13 15,16 22,7' fill='none' stroke='#fff' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
              <circle cx='22' cy='7' r='2' fill='#60A5D4'/>
            </svg>
            <span className='text-sm font-medium text-gray-400 dark:text-slate-500'>Insights</span>
          </div>
          <p className='text-xs text-gray-400 dark:text-slate-500'>AI-powered product feedback analysis</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
