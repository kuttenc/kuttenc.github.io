(() => {
  const list = document.querySelector('#news-list');
  const stamp = document.querySelector('#news-updated');
  const fallback = document.querySelector('#news-fallback');
  const refresh = document.querySelector('#refresh-news');
  const clock = document.querySelector('#market-clock');
  const formatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
  const escaped = (value = '') => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const formatDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Notícia recente' : formatter.format(date); };
  const updateClock = () => { clock.textContent = `Horário de Brasília: ${formatter.format(new Date())}`; };
  updateClock(); window.setInterval(updateClock, 30000);
  async function loadNews() {
    refresh.disabled = true; refresh.textContent = 'Atualizando…'; list.innerHTML = '<p class="news-loading">Buscando notícias recentes de mercado…</p>'; fallback.hidden = true;
    try {
      const query = encodeURIComponent('(forex OR currencies OR "central bank" OR EURUSD)');
      const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&maxrecords=8`, { cache: 'no-store' });
      if (!response.ok) throw new Error('news_provider_unavailable');
      const data = await response.json();
      const articles = Array.isArray(data.articles) ? data.articles.filter(article => article.title && article.url).slice(0, 8) : [];
      if (!articles.length) throw new Error('no_articles');
      list.innerHTML = articles.map(article => `<article class="news-card"><time datetime="${escaped(article.seendate || '')}">${formatDate(article.seendate)}</time><h3>${escaped(article.title)}</h3><a href="${escaped(article.url)}" target="_blank" rel="noopener noreferrer">Ler fonte</a></article>`).join('');
      stamp.textContent = `Atualizado em ${formatter.format(new Date())}`;
    } catch (_) { list.innerHTML = ''; stamp.textContent = 'Não foi possível atualizar as manchetes agora.'; fallback.hidden = false; }
    finally { refresh.disabled = false; refresh.textContent = 'Atualizar notícias'; }
  }
  refresh.addEventListener('click', loadNews); loadNews();
})();
