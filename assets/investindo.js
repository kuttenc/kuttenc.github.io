(() => {
  const list = document.querySelector('#news-list');
  const stamp = document.querySelector('#news-updated');
  const fallback = document.querySelector('#news-fallback');
  const refresh = document.querySelector('#refresh-news');
  const clock = document.querySelector('#market-clock');
  const sessionLabel = document.querySelector('#session-label');
  const themeButtons = [...document.querySelectorAll('[data-theme]')];
  const filterButtons = [...document.querySelectorAll('[data-news-topic]')];
  const formatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hourCycle: 'h23' });
  const topics = { mercado: '(forex OR currencies OR EURUSD OR GBPUSD)', dolar: '(dollar OR USD OR BRL OR "Brazilian real")', bancos: '("central bank" OR Fed OR ECB OR "Bank of England" OR "Bank of Japan")', brasil: '(Brazil OR Brasil OR BCB OR Copom OR real)' };
  let activeTopic = 'mercado';
  const escaped = (value = '') => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const formatDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Notícia recente' : formatter.format(date); };
  function sessionOpen(hour, start, end) { return start <= end ? hour >= start && hour < end : hour >= start || hour < end; }
  function updateMarketClock() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).formatToParts(now);
    const hour = Number(parts.find(part => part.type === 'hour')?.value || 0);
    clock.textContent = `Brasília · ${timeFormatter.format(now)}`;
    const sessions = { sydney: sessionOpen(hour, 18, 3), tokyo: sessionOpen(hour, 20, 5), london: sessionOpen(hour, 4, 13), newyork: sessionOpen(hour, 9, 18) };
    const open = Object.values(sessions).filter(Boolean).length;
    document.querySelectorAll('[data-session]').forEach(item => { const active = sessions[item.dataset.session]; item.classList.toggle('open', active); item.querySelector('i').textContent = active ? 'ABERTA' : 'FECHADA'; });
    sessionLabel.textContent = open ? `${open} SESS${open === 1 ? 'ÃO ABERTA' : 'ÕES ABERTAS'}` : 'MERCADO FORA DA JANELA PRINCIPAL';
  }
  function applyTheme(theme) { document.body.dataset.theme = theme; localStorage.setItem('kuttenc-investindo-theme', theme); themeButtons.forEach(button => button.classList.toggle('is-active', button.dataset.theme === theme)); }
  async function loadNews() {
    refresh.disabled = true; refresh.textContent = 'Atualizando…'; list.innerHTML = '<p class="news-loading">Buscando notícias recentes de mercado…</p>'; fallback.hidden = true;
    try {
      const query = encodeURIComponent(topics[activeTopic]);
      const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&maxrecords=12`, { cache: 'no-store' });
      if (!response.ok) throw new Error('news_provider_unavailable');
      const data = await response.json();
      const articles = Array.isArray(data.articles) ? data.articles.filter(article => article.title && article.url).slice(0, 8) : [];
      if (!articles.length) throw new Error('no_articles');
      list.innerHTML = articles.map(article => `<article class="news-card"><time datetime="${escaped(article.seendate || '')}">${formatDate(article.seendate)}</time><h3>${escaped(article.title)}</h3><a href="${escaped(article.url)}" target="_blank" rel="noopener noreferrer">Ler fonte</a></article>`).join('');
      stamp.textContent = `Atualizado ${formatter.format(new Date())}`;
    } catch (_) { list.innerHTML = ''; stamp.textContent = 'Atualização indisponível agora.'; fallback.hidden = false; }
    finally { refresh.disabled = false; refresh.textContent = 'Atualizar cobertura'; }
  }
  themeButtons.forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.theme)));
  filterButtons.forEach(button => button.addEventListener('click', () => { activeTopic = button.dataset.newsTopic; filterButtons.forEach(item => item.classList.toggle('active', item === button)); loadNews(); }));
  refresh.addEventListener('click', loadNews);
  applyTheme(localStorage.getItem('kuttenc-investindo-theme') || 'noite'); updateMarketClock(); window.setInterval(updateMarketClock, 30000); loadNews();
  const canvas = document.querySelector('#candle-canvas');
  const timeframe = document.querySelector('#candle-timeframe');
  const session = document.querySelector('#candle-session');
  const volatility = document.querySelector('#candle-volatility');
  const simulationMeta = document.querySelector('#simulation-meta');
  const newSimulation = document.querySelector('#new-candle-simulation');
  const simulatorKey = 'kuttenc-investindo-candle-simulation';
  const savedSimulation = JSON.parse(sessionStorage.getItem(simulatorKey) || '{}');
  const selected = { timeframe: savedSimulation.timeframe || '5m', session: savedSimulation.session || 'london', volatility: savedSimulation.volatility || 'medium', nonce: Number(savedSimulation.nonce || 1) };
  timeframe.value = selected.timeframe; session.value = selected.session; volatility.value = selected.volatility;
  const hash = value => [...value].reduce((total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0, 5381) >>> 0;
  const randomFactory = seedValue => { let seed = seedValue >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
  function drawCandles() {
    const context = canvas.getContext('2d'); const width = canvas.width; const height = canvas.height;
    const computed = getComputedStyle(document.body); const accent = computed.getPropertyValue('--accent').trim();
    const muted = computed.getPropertyValue('--muted').trim(); const line = computed.getPropertyValue('--line').trim();
    const sessionName = { asia: 'Ásia · Tóquio', london: 'Londres', ny: 'Nova York', overlap: 'Londres + Nova York' }[selected.session];
    const vol = { low: .52, medium: 1, high: 1.75 }[selected.volatility]; const drift = { asia: .015, london: .04, ny: -.02, overlap: .075 }[selected.session];
    const random = randomFactory(hash(`${selected.timeframe}/${selected.session}/${selected.volatility}/${selected.nonce}`)); const candles = []; let price = 100;
    for (let index = 0; index < 58; index += 1) { const open = price; const move = ((random() - .5) * 3.25 * vol) + drift; const close = Math.max(84, open + move); const wick = (.35 + random() * 1.4) * vol; candles.push({ open, close, high: Math.max(open, close) + wick, low: Math.min(open, close) - wick }); price = close; }
    const allPrices = candles.flatMap(candle => [candle.high, candle.low]); const maximum = Math.max(...allPrices); const minimum = Math.min(...allPrices); const range = Math.max(maximum - minimum, 1); const padding = { top: 28, right: 24, bottom: 32, left: 48 }; const chartWidth = width - padding.left - padding.right; const chartHeight = height - padding.top - padding.bottom;
    context.clearRect(0, 0, width, height); context.fillStyle = '#070c15'; context.fillRect(0, 0, width, height);
    context.strokeStyle = line; context.lineWidth = 1; for (let grid = 0; grid <= 5; grid += 1) { const y = padding.top + chartHeight * (grid / 5); context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke(); context.fillStyle = muted; context.font = '11px system-ui'; context.textAlign = 'right'; context.fillText((maximum - range * grid / 5).toFixed(2), padding.left - 9, y + 4); }
    const step = chartWidth / candles.length; const bodyWidth = Math.max(4, step * .61); const position = value => padding.top + (maximum - value) / range * chartHeight;
    const averages = []; candles.forEach((candle, index) => { const x = padding.left + index * step + step / 2; const up = candle.close >= candle.open; const color = up ? accent : '#ff6680'; context.strokeStyle = color; context.lineWidth = 1.4; context.beginPath(); context.moveTo(x, position(candle.high)); context.lineTo(x, position(candle.low)); context.stroke(); const bodyY = position(Math.max(candle.open, candle.close)); const bodyHeight = Math.max(2, Math.abs(position(candle.open) - position(candle.close))); context.fillStyle = color; context.fillRect(x - bodyWidth / 2, bodyY, bodyWidth, bodyHeight); const start = Math.max(0, index - 6); averages.push(candles.slice(start, index + 1).reduce((sum, item) => sum + item.close, 0) / (index - start + 1)); });
    context.strokeStyle = '#75bbff'; context.setLineDash([5, 5]); context.lineWidth = 1.3; context.beginPath(); averages.forEach((average, index) => { const x = padding.left + index * step + step / 2; const y = position(average); if (index === 0) context.moveTo(x, y); else context.lineTo(x, y); }); context.stroke(); context.setLineDash([]);
    context.fillStyle = muted; context.font = '11px system-ui'; context.textAlign = 'left'; context.fillText(`Cenário ${selected.timeframe} · ${sessionName}`, padding.left, height - 11); context.textAlign = 'right'; context.fillText('SIMULAÇÃO', width - padding.right, height - 11);
    simulationMeta.textContent = `${selected.timeframe.toUpperCase()} · ${sessionName.toUpperCase()} · ${({ low: 'BAIXA', medium: 'MODERADA', high: 'ALTA' })[selected.volatility]} VOL.`;
  }
  function saveAndDraw() { selected.timeframe = timeframe.value; selected.session = session.value; selected.volatility = volatility.value; sessionStorage.setItem(simulatorKey, JSON.stringify(selected)); drawCandles(); }
  [timeframe, session, volatility].forEach(element => element.addEventListener('change', saveAndDraw));
  newSimulation.addEventListener('click', () => { selected.nonce += 1; saveAndDraw(); });
  drawCandles();
})();
