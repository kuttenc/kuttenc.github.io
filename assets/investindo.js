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
})();
