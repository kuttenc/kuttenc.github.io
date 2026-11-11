(() => {
  const cfg = Object.assign({
    fuso: "America/Sao_Paulo",
    functionName: "opeixeiro-site-chat",
    bebidasSempreAbertas: true,
    comidaAbertaDas: "11:00",
    comidaFechaAs: "22:00",
    modo: "mesa",
    mesa: "",
    pontos: [],
    pontoPadrao: "",
    foneSessao: "",
    mesaMaxima: 150,
    peixeiroMaximo: 7,
    // Casa que fala com o cliente. Vazio = Opeixeiro, como é hoje. A cópia /kioske/ usa
    // { negocio: "Kioske Martin", emojiNegocio: "🏪" } e o pedido sai no banco como
    // "Kioske Martin · Mesa 65", porque o rótulo canônico é montado no servidor com esse nome.
    negocio: "",
    emojiNegocio: "",
    foneAtendimento: "",
    autoAbrirWhatsApp: true,
  }, window.OPEIXEIRO_CONFIG || {});
  const emMesa = cfg.modo !== "delivery";
  // QR colado na mesa (app de validade PT260, mesas 1 a 150): a etiqueta traz o ponto (peixeiro) e
  // o número no path — /opeixeiro/P1mesa1, /opeixeiro/P7mesa150. Também vale sem ponto
  // (/opeixeiro/mesa14) e com o número em base64 (/opeixeiro/mesaMTQ=). O Pages é estático, então o
  // 404.html do site (ou o do Urtador, no prefixo /urtador/) repassa o segmento como ?m= antes daqui.
  const mesaDaUrl = (() => {
    const params = new URLSearchParams(window.location.search);
    const bruto = (/^\/opeixeiro\/((?:p\s*\d{1,2}\s*)?mesa[^/?#]*)$/i.exec(window.location.pathname) || [])[1]
      || params.get("m")
      || params.get("mesa")
      || "";
    return decodeURIComponent(String(bruto || ""));
  })();
  // Espelho de supabase/functions/_shared/mesa-qr.mjs — mudar um, mudar o outro.
  // "P7mesa150": o prefixo é o ponto, não parte do número; sem tirá-lo, "P7mesa150" não é número nem
  // base64 e a mesa se perderia. O lookahead exige o "mesa" logo depois para não comer um base64 em "P".
  const SEM_PONTO = (s) => s.replace(/^p\s*\d{1,2}(?=\s*mesa)/i, "").trim();
  const numeroDeMesa = (bruto) => {
    const s = SEM_PONTO(String(bruto || "").trim()).replace(/^mesa/i, "").trim();
    if (!s) return 0;
    if (/^\d{1,4}$/.test(s)) return Number(s);
    const base = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    if (!/^[A-Za-z0-9+/]{1,8}$/.test(base)) return 0;
    let decodificado = "";
    try {
      decodificado = atob(base + "=".repeat((4 - (base.length % 4)) % 4)).trim();
    } catch {
      return 0;
    }
    return /^\d{1,4}$/.test(decodificado) ? Number(decodificado) : 0;
  };
  const mesaMaxima = Number(cfg.mesaMaxima) || 150;
  const mesaValida = (n) => Number.isInteger(n) && n >= 1 && n <= mesaMaxima;
  const mesaVindaDoQr = numeroDeMesa(mesaDaUrl);
  // O ponto (peixeiro) vem antes da mesa no path: /opeixeiro/P7mesa150. De P1 a P7 é o mesmo limite
  // do servidor (pontoDoPedido) — fora disso não há bar cadastrado, e a escolha volta para a sessão.
  const peixeiroMaximo = Number(cfg.peixeiroMaximo) || 7;
  const peixeiroDoQr = (() => {
    const m = /^p\s*(\d{1,2})(?=\s*(?:mesa|$))/i.exec(mesaDaUrl.trim());
    if (!m) return { ponto: "", fora: false };
    const n = Number(m[1]);
    return n >= 1 && n <= peixeiroMaximo ? { ponto: `P${n}`, fora: false } : { ponto: "", fora: true };
  })();
  // QR que traz um segmento de mesa manda no rótulo: número válido vira a mesa da conversa.
  // Qualquer outra coisa (151, 999, "mesaabc") fica sem mesa nenhuma — seria pedir ao garçon a
  // mesa errada, a do config — e a página avisa o cliente para chamar a equipe. Base64 é formato
  // da etiqueta, não trava: por isso a faixa é conferida aqui e no servidor.
  const qrTrouxeMesa = mesaDaUrl !== "";
  const nomeCasa = String(cfg.negocio || "").trim() || "Opeixeiro";
  const emojiCasa = String(cfg.emojiNegocio || "").trim() || "🐟";
  const avisoQr = [
    !qrTrouxeMesa || mesaValida(mesaVindaDoQr)
      ? ""
      : mesaVindaDoQr > 0
        ? `Este QR code aponta para a mesa ${mesaVindaDoQr}, que não existe aqui — só de 1 a ${mesaMaxima}. Chame a equipe do ${nomeCasa}.`
        : `Este QR code não traz uma mesa reconhecível. Chame a equipe do ${nomeCasa}.`,
    peixeiroDoQr.fora
      ? `Este QR code traz um ponto que não existe aqui — só de P1 a P${peixeiroMaximo}. Chame a equipe do ${nomeCasa}.`
      : "",
  ].filter(Boolean).join(" ");
  if (mesaValida(mesaVindaDoQr)) cfg.mesa = String(mesaVindaDoQr);
  else if (qrTrouxeMesa) cfg.mesa = "";
  const mesaNumero = mesaValida(mesaVindaDoQr)
    ? mesaVindaDoQr
    : (mesaValida(numeroDeMesa(cfg.mesa)) ? numeroDeMesa(cfg.mesa) : 0);
  const mesaSlug = mesaValida(mesaVindaDoQr) ? mesaDaUrl.slice(0, 40) : "";
  // Tudo que a página guarda vive dentro do escopo da mesa que o QR trouxe. Sem o número na chave,
  // o celular que abriu a Mesa 14 e depois escaneou a Mesa 7 continuaria na conversa, no ponto e no
  // final de telefone da 14 — e o pedido chegaria na mesa errada.
  const escopo = emMesa ? `${cfg.modo}.m${mesaNumero || 0}` : cfg.modo;
  const sessao = {
    ler(nome) { try { return window.sessionStorage.getItem(`opeixeiro.${escopo}.${nome}`) || ""; } catch { return ""; } },
    gravar(nome, valor) { try { window.sessionStorage.setItem(`opeixeiro.${escopo}.${nome}`, valor); } catch { /* aba particular */ } },
  };
  // Ponto (bar) da conversa: o que a etiqueta trouxe chega em primeiro lugar; a escolha da sessão e
  // o padrão do config só valem quando o QR não trouxe ponto (ou trouxe um que não existe).
  let ponto = emMesa ? peixeiroDoQr.ponto || sessao.ler("ponto") || String(cfg.pontoPadrao || "") : "";
  // O final do WhatsApp entra uma única vez, no começo da sessão, e nunca é perguntado ao cliente.
  const fone = (() => {
    if (!emMesa) return "";
    const salvo = sessao.ler("fone");
    if (salvo) return salvo;
    const inicio = String(cfg.foneSessao || "").replace(/\D/g, "").slice(-4);
    if (inicio) sessao.gravar("fone", inicio);
    return inicio;
  })();
  const rotuloMesa = () => {
    const bruto = String(cfg.mesa || "").trim();
    const base = /^\d+$/.test(bruto) ? `Mesa ${bruto}` : bruto;
    if (base && ponto) return `${base} · ${ponto}`;
    return base || (ponto ? `Ponto ${ponto}` : "");
  };
  let mesaLabel = rotuloMesa();
  const menu = window.OPEIXEIRO_MENU || { categorias: [], itens: [] };
  const chatEl = document.getElementById("chat");
  const chipsEl = document.getElementById("rapidinhos");
  const formEl = document.getElementById("composer");
  const inputEl = document.getElementById("entrada");
  const cartEl = document.getElementById("carrinho");
  const pedirEl = document.getElementById("btnPedir");
  const cartListEl = document.getElementById("carrinhoLista");
  const cartEmptyEl = document.getElementById("carrinhoVazio");
  const dotEl = document.getElementById("salvando");
  const dotTextEl = document.getElementById("salvandoTexto");
  const horarioEl = document.getElementById("abertoChip");
  const andamentoEl = document.getElementById("andamento");
  const zapEl = document.getElementById("zap");
  const zapTextoEl = document.getElementById("zapTexto");
  const zapBotaoEl = document.getElementById("zapBotao");
  const zapAquiEl = document.getElementById("zapAqui");
  const chaveLocal = `opeixeiro.chat.v1.${escopo}`;
  const hora = (t) => String(t).replace(":", "h");
  const subEl = document.querySelector(".sub");
  const rodapeEl = document.querySelector(".rodape");
  function pintaRotulos() {
    if (subEl) subEl.textContent = emMesa ? `${mesaLabel || "Na sua mesa"} · o garçon traz` : "Bebidas geladas, pedido pelo chat";
    if (rodapeEl) rodapeEl.textContent = emMesa
      ? `Pedido da ${mesaLabel || "sua mesa"} — confirme no chat e o garçon recebe na tela dele. Comidas: das ${hora(cfg.comidaAbertaDas)} às ${hora(cfg.comidaFechaAs)}, quando o cardápio abrir.`
      : "Bebidas: pedido a qualquer hora. Comidas: das 11h às 22h, quando o cardápio abrir.";
  }
  pintaRotulos();

  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const curto = (t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
  const palavras = (s) => norm(s).split(" ").filter(Boolean).map(curto);

  const indice = menu.itens.map((item) => ({
    item,
    set: new Set(palavras([item.nome, item.busca, ...item.variantes.map((v) => `${v.nome} ${v.rotulo}`)].join(" "))),
  }));

  let restaurando = false;

  const estado = {
    chatId: "",
    token: "",
    cursor: 0,
    passo: "escolhendo",
    cart: [],
    cliente: { nome: "", telefone: "", endereco: "", retirada: false },
    protocolo: "",
    historico: [],
    vigiando: false,
    bloqueadoAte: 0,
    bloqueados: [],
    indisponiveis: [],
    faltas: [],
    pedido: null,
    perguntaVista: "",
  };

  function setSalvando(modo) {
    dotEl.className = `dot${modo === "ok" ? " ok" : modo === "erro" ? " erro" : ""}`;
    dotTextEl.textContent = { ok: "salvo", erro: "sem salvar", off: "modo local", conectando: "conectando" }[modo] || modo;
  }

  function call(action, payload) {
    const semSessao = action !== "open_chat" && !estado.chatId;
    if (!cfg.supabaseUrl || semSessao) {
      setSalvando("off");
      return Promise.resolve(null);
    }
    return fetch(`${String(cfg.supabaseUrl).replace(/\/$/, "")}/functions/v1/${cfg.functionName}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.assign({ action, chat_id: estado.chatId, token: estado.token }, payload || {})),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) {
          const erro = new Error(data.error || `HTTP ${res.status}`);
          Object.assign(erro, data);
          throw erro;
        }
        setSalvando("ok");
        return data;
      })
      .catch((erro) => {
        setSalvando("erro");
        throw erro;
      });
  }

  function registrar(texto, sender) {
    call("message", { text: texto, sender: sender || "cliente" }).catch(() => {});
  }

  let rascunhoTimer = 0;
  function salvarRascunho() {
    window.clearTimeout(rascunhoTimer);
    rascunhoTimer = window.setTimeout(() => {
      call("draft", {
        cart: estado.cart,
        customer_name: estado.cliente.nome,
        customer_phone: estado.cliente.telefone,
        delivery_address: estado.cliente.retirada ? "Retirada no balcão" : estado.cliente.endereco,
      }).catch(() => {});
    }, 600);
  }

  function guardarLocal() {
    try {
      localStorage.setItem(chaveLocal, JSON.stringify({
        chatId: estado.chatId,
        token: estado.token,
        cursor: estado.cursor,
        passo: estado.passo,
        cart: estado.cart,
        cliente: estado.cliente,
        protocolo: estado.protocolo,
        historico: estado.historico.slice(-60),
        bloqueadoAte: estado.bloqueadoAte,
        bloqueados: estado.bloqueados,
        perguntaVista: estado.perguntaVista,
      }));
    } catch { /* navegação particular */ }
  }

  function lerLocal() {
    try { return JSON.parse(localStorage.getItem(chaveLocal) || "null"); } catch { return null; }
  }

  const esperaRestante = () => Math.max(0, Math.ceil((estado.bloqueadoAte - Date.now()) / 1000));
  const emEspera = () => esperaRestante() > 0;
  const emBloqueio = (linha) => estado.bloqueados.some((n) => norm(n) === norm(linha.nome));
  const carrinhoTravado = () => estado.cart.some(emBloqueio);
  const travado = () => emEspera() && carrinhoTravado();

  function rotuloEspera() {
    const s = esperaRestante();
    if (s <= 0) return "";
    if (s <= 90) return `Aguarde ${s}s`;
    return `Aguarde ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  const rotuloEsperaCompleto = () => `${rotuloEspera()} para finalizar.`;

  function chipFinalizar() {
    return travado()
      ? { chave: "espera", label: `${rotuloEspera()} para finalizar`, onClick: () => diz(rotuloEsperaCompleto()), primario: true }
      : { chave: "espera", label: "Finalizar pedido", onClick: iniciarCheckout, primario: true };
  }

  let ultimaLista = [];
  let timerEspera = 0;

  function pintarEspera() {
    const esperado = travado();
    const texto = esperado ? `${rotuloEspera()} para finalizar` : "Finalizar pedido";
    chipsEl.querySelectorAll("[data-espera]").forEach((b) => {
      b.textContent = texto;
      b.classList.toggle("espera", esperado);
    });
    pedirEl.textContent = texto;
    pedirEl.classList.toggle("espera", esperado);
    if (!esperado && timerEspera) {
      window.clearInterval(timerEspera);
      timerEspera = 0;
      estado.bloqueados = [];
      desenharCarrinho();
      chips(ultimaLista);
      guardarLocal();
    }
  }

  function vigiarEspera() {
    window.clearInterval(timerEspera);
    timerEspera = 0;
    if (!emEspera()) {
      if (estado.bloqueados.length) {
        estado.bloqueados = [];
        desenharCarrinho();
        guardarLocal();
      }
      pintarEspera();
      return;
    }
    pintarEspera();
    timerEspera = window.setInterval(pintarEspera, 1000);
  }

  function marcarEspera(segundos, nomes) {
    estado.bloqueadoAte = Date.now() + Math.max(1, Math.ceil(Number(segundos) || 0)) * 1000 + 1000;
    estado.bloqueados = Array.isArray(nomes) ? nomes.slice(0, 60).map(String) : [];
    desenharCarrinho();
    guardarLocal();
    vigiarEspera();
  }

  function horaSp() {
    try {
      const texto = new Intl.DateTimeFormat("en-GB", { timeZone: cfg.fuso, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
      const [bruto, minuto] = texto.split(":").map(Number);
      const h = bruto % 24;
      return { hhmm: `${String(h).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`, h };
    } catch {
      const d = new Date();
      return { hhmm: `${d.getHours()}:${d.getMinutes()}`, h: d.getHours() };
    }
  }

  const saudacao = () => {
    const { h } = horaSp();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  };

  const comidaAberta = () => {
    const { hhmm } = horaSp();
    return String(cfg.comidaAbertaDas) <= hhmm && hhmm < String(cfg.comidaFechaAs);
  };

  function desenhar(texto, tipo) {
    const div = document.createElement("div");
    div.className = `bolha ${tipo}`;
    div.textContent = texto;
    chatEl.appendChild(div);
    if (tipo !== "sistema" && !restaurando) {
      estado.historico.push({ texto, tipo });
      guardarLocal();
    }
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function diz(texto, atras) {
    window.setTimeout(() => {
      desenhar(texto, "bot");
      registrar(texto, "bot");
    }, atras || 150);
  }

  function cartao(titulo, linhas) {
    const box = document.createElement("div");
    box.className = "cartao";
    box.innerHTML = `<h3></h3>`;
    box.querySelector("h3").textContent = titulo;
    if (linhas.length) {
      const ul = document.createElement("ul");
      linhas.forEach((l) => {
        const li = document.createElement("li");
        li.textContent = l;
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    chatEl.appendChild(box);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function chips(lista) {
    ultimaLista = lista;
    chipsEl.innerHTML = "";
    chipsEl.hidden = !lista.length;
    lista.forEach((entrada) => {
      const { label, onClick, primario } = entrada.chave === "espera" ? chipFinalizar() : entrada;
      const b = document.createElement("button");
      b.type = "button";
      b.className = `burger${primario ? " primario" : ""}${entrada.chave === "espera" && travado() ? " espera" : ""}`;
      b.textContent = label;
      if (entrada.chave === "espera") b.dataset.espera = "1";
      b.addEventListener("click", onClick);
      chipsEl.appendChild(b);
    });
  }

  function ranquear(texto) {
    const ignoradas = new Set(["oi", "ola", "tem", "vc", "voce", "quero", "me", "da", "de", "por", "pra", "a", "o", "as", "os", "uma", "um", "dois", "duas", "e", "pro", "no", "na", "gelado", "gelada", "tem", "cadê", "cade", "algum", "alguma", "você", "preciso"]);
    const tokens = palavras(texto).filter((t) => !ignoradas.has(t) && !/^\d+$/.test(t));
    if (!tokens.length) return [];
    const marcados = indice.map(({ item, set }) => {
      const grupo = [...set];
      const cobertos = tokens.filter((t) => grupo.some((p) => p === t || p.startsWith(t) || (t.length > 3 && t.startsWith(p))));
      const doNome = palavras(item.nome);
      const extras = doNome.filter((p) => !tokens.some((t) => p === t || p.startsWith(t) || t.startsWith(p))).length;
      return { item, acertos: cobertos.length, extras, completo: cobertos.length === tokens.length };
    });
    const plenos = marcados.filter((m) => m.completo);
    const base = (plenos.length ? plenos : marcados.filter((m) => m.acertos > 0))
      .sort((a, b) => (b.acertos - a.acertos) || (a.extras - b.extras) || (a.item.nome.length - b.item.nome.length));
    return base;
  }

  const buscar = (texto) => ranquear(texto).map((m) => m.item);

  // Duas fontes de "acabou". A principal é o checklist *5* do grupo OTP: ele desliga a linha exata
  // do cardápio e o servidor devolve a chave `id::variante`, que não depende de acertar nome —
  // "Skol Garrafa 600 ml" desativada deixa a "Skol Lata 350 ml" na prateleira. A segunda é o
  // catálogo do Bar, riscada pelo nome (ex: "brahma lata"): um nome só é coberto quando a falta
  // cobre todas as palavras dele e não sobra produto diferente — "coca cola lata" não risca a Coca
  // Zero. Embalagem e tamanho são rótulo, não produto: "350 ml" e "lata" não salvam um item acabado.
  const embalagens = new Set(["lata", "latas", "garrafa", "garrafas", "long", "neck", "ml", "litro", "litros", "kg", "g", "un", "unidade", "unidades", "uds", "pack", "caixa", "padrao"]);
  const soTamanho = (p) => /^\d+$/.test(p) || /^\d+(ml|cl|l|kg|g|un|uds)$/.test(p);
  const semTamanho = (s) => palavras(s).filter((p) => !soTamanho(p));
  const cobertoPelaFalta = (nome) => {
    const alvo = semTamanho(nome);
    const alvoSet = new Set(alvo);
    return (estado.indisponiveis || []).some((rotulo) => {
      const tokens = new Set(semTamanho(rotulo));
      if (!tokens.size || ![...tokens].every((t) => alvoSet.has(t))) return false;
      return alvo.every((p) => tokens.has(p) || embalagens.has(p));
    });
  };
  const chaveDaLinha = (id, variante) => `${String(id || "").trim()}::${String(variante || "padrão").trim()}`;
  const nomeDaLinha = (l) => (l.variante && l.variante !== "padrão" ? `${l.nome} ${l.variante}` : l.nome);
  const chaveDesligada = (id, variante) => (estado.faltas || []).includes(chaveDaLinha(id, variante));
  const varianteAcabada = (item, variante) => chaveDesligada(item.id, variante.rotulo)
    || cobertoPelaFalta(`${variante.nome || item.nome} ${variante.rotulo || ""}`);
  const estaAcabado = (item) => item.variantes.every((v) => varianteAcabada(item, v));
  const sugestoesDoPonto = (item) => menu.itens
    .filter((i) => i.categoria === item.categoria && i.id !== item.id && !estaAcabado(i))
    .slice(0, 4);

  // O servidor é dono da lista: no open_chat e no poll ela vem completa e substitui o risco que a
  // página tem. Na recusa do pedido ele manda só o que faltava naquele carrinho, e aí se soma.
  // Retorna as linhas que precisaram sair do carrinho.
  function aplicarFaltas(rotulos, recusados, completa, chaves) {
    const novos = (Array.isArray(rotulos) ? rotulos : []).map((r) => String(r).trim()).filter(Boolean);
    const atuais = estado.indisponiveis || [];
    estado.indisponiveis = completa ? novos : novos.concat(atuais.filter((r) => !novos.some((n) => norm(n) === norm(r))));
    const novas = (Array.isArray(chaves) ? chaves : []).map(String);
    estado.faltas = completa ? novas : [...new Set((estado.faltas || []).concat(novas))];
    const ids = new Set((Array.isArray(recusados) ? recusados : []).map((i) => String(i)));
    const sumidas = estado.cart.filter((l) => estado.faltas.includes(chaveDaLinha(l.id, l.variante))
      || (!ehCopo(l) && (ids.has(String(l.id)) || cobertoPelaFalta(`${l.nome} ${l.variante || ""}`))));
    if (sumidas.length) estado.cart = estado.cart.filter((l) => !sumidas.includes(l));
    desenharCarrinho();
    salvarRascunho();
    return sumidas;
  }

  function recusarAcabado(item, variante) {
    const sug = sugestoesDoPonto(item);
    diz(`${item.nome}${variante ? ` ${variante.rotulo}` : ""} acabou.${sug.length ? "No lugar, dá pra levar:" : "Escolhe outra que eu já anoto."}`, 120);
    window.setTimeout(() => chips(sug.length
      ? chipsItens(sug, [{ label: "← categorias", onClick: () => chips(chipsCategorias()) }, { label: "Ver carrinho", onClick: mostrarCarrinho }])
      : chipsCategorias()), 300);
  }

  const acessorios = window.OPEIXEIRO_ACESSORIOS || [];
  const regraCopos = Object.assign({ coposPorLatinha: 4, rotuloLatinha: "lata" }, window.OPEIXEIRO_REGRA_COPOS || {});
  const ehCopo = (l) => l.tipo === "copo";
  const ehLatinha = (l) => !ehCopo(l) && new RegExp(regraCopos.rotuloLatinha, "i").test(`${l.variante || ""} ${l.nome || ""}`);
  const latinhas = () => estado.cart.filter(ehLatinha).reduce((s, l) => s + l.qtd, 0);
  const bebidas = () => estado.cart.filter((l) => !ehCopo(l)).reduce((s, l) => s + l.qtd, 0);
  const coposNoCarrinho = () => estado.cart.filter(ehCopo).reduce((s, l) => s + l.qtd, 0);
  const limiteCopos = () => latinhas() * regraCopos.coposPorLatinha;
  const cdbNoCarrinho = () => estado.cart.filter((l) => l.id === "cdb").reduce((s, l) => s + l.qtd, 0);
  const reais = (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
  const buscaCopo = (texto) => {
    const t = palavras(texto);
    const tokens = new Set(t);
    const marcados = acessorios.map((a) => {
      const grupo = new Set(palavras(`${a.sigla} ${a.nome} ${a.busca}`));
      const cobertos = t.filter((p) => grupo.has(p)).length;
      return { a, cobertos };
    }).filter((m) => m.cobertos > 0).sort((x, y) => (y.cobertos - x.cobertos) || (x.a.id === "cdb" ? -1 : 0));
    const exata = acessorios.find((a) => tokens.has(norm(a.sigla)) || tokens.has(norm(a.nome)));
    return exata || (marcados.length ? marcados[0].a : null);
  };

  function coposPorTexto(texto) {
    const alvo = buscaCopo(texto);
    if (!alvo) {
      diz("Não achei esse copo. Tenho GLA (gelo e laranja), GL (gelo e limão), CPG (só gelo), CPLE (limão espremido) e CDB (limão espremido com sal na borda).");
      chips(chipsCopos());
      return;
    }
    confirmarCopo(alvo, quantidade(texto));
  }

  function chipsCopos(extra) {
    return acessorios.map((a) => ({
      label: `${a.sigla}${a.preco ? ` (${reais(a.preco)})` : ""}${chaveDesligada(a.id, "padrão") ? " · acabou" : ""}`,
      onClick: () => { desenhar(a.sigla, "eu"); registrar(a.sigla); confirmarCopo(a, 1); },
    })).concat(extra || []);
  }

  function confirmarCopo(acessorio, qtd) {
    if (chaveDesligada(acessorio.id, "padrão")) {
      diz(`${acessorio.nome} acabou neste ponto. ${acessorios.some((a) => a.id !== acessorio.id && !chaveDesligada(a.id, "padrão")) ? "No lugar:" : "O que sobrou está no cardápio."}`, 120);
      window.setTimeout(() => chips(chipsCopos([{ label: "Ver carrinho", onClick: mostrarCarrinho }, chipFinalizar()])), 300);
      return;
    }
    if (!bebidas()) {
      diz("Copo vai junto com uma bebida. Me diz primeiro o que você vai beber — cerveja em lata, garrafa ou KS serve.");
      chips(chipsCategorias());
      return;
    }
    adicionarCopo(acessorio, qtd);
    const aviso = acessorio.preco
      ? `${acessorio.sigla} é cobrado à parte: ${reais(acessorio.preco)} cada. ${qtd} ${qtd === 1 ? "unidade" : "unidades"} = ${reais(acessorio.preco * qtd)}.`
      : `${acessorio.nome} anotado, sem custo.`;
    const coberto = latinhas() ? `\n\nAs ${latinhas()} ${latinhas() === 1 ? "latinha" : "latinhas"} de 350 ml cobrem ${limiteCopos()} copos, e qualquer copo a mais também sai sem custo.` : "";
    diz(`${aviso} Você tem ${coposNoCarrinho()} ${coposNoCarrinho() === 1 ? "copo" : "copos"} no carrinho.${coberto}`);
    chips(chipsCopos([{ label: "Ver carrinho", onClick: mostrarCarrinho }, chipFinalizar()]));
  }

  function adicionarCopo(acessorio, qtd) {
    const existente = estado.cart.find((l) => l.id === acessorio.id);
    if (existente) existente.qtd = Math.min(999, existente.qtd + qtd);
    else estado.cart.push({ id: acessorio.id, nome: acessorio.nome, tipo: "copo", variante: "padrão", preco: acessorio.preco, qtd });
    desenharCarrinho();
    salvarRascunho();
  }

  const numerais = { um: 1, uma: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };

  function quantidade(texto) {
    const t = norm(texto);
    if (/(^|\s)meia duzia(\s|$)/.test(t)) return 6;
    if (/(^|\s)duzia(\s|$)/.test(t)) return 12;
    const dig = t.match(/(?:^|\D)(\d{1,3})(?=\s|$|x)/);
    if (dig) return Math.min(999, Number(dig[1]));
    const palavra = t.split(" ").find((w) => numerais[w] > 1);
    return palavra ? numerais[palavra] : 1;
  }

  function varianteFalando(item, texto) {
    const faladas = new Set(palavras(texto));
    let melhor = null;
    let acertos = 0;
    for (const v of item.variantes) {
      const t = palavras(v.rotulo).filter((p) => p !== "padrao" && p.length > 2);
      const cobertos = t.filter((p) => faladas.has(p)).length;
      if (cobertos > acertos || (cobertos === acertos && cobertos > 0 && t.length < palavras(melhor.rotulo).length)) {
        melhor = v;
        acertos = cobertos;
      }
    }
    return acertos > 0 ? melhor : null;
  }

  function adicionar(item, variante, qtd) {
    const escolhida = variante || item.variantes[0];
    const existente = estado.cart.find((l) => l.id === item.id && l.variante === escolhida.rotulo);
    if (existente) existente.qtd = Math.min(999, existente.qtd + qtd);
    else estado.cart.push({ id: item.id, nome: item.nome, tipo: "bebida", variante: escolhida.rotulo, qtd });
    desenharCarrinho();
    salvarRascunho();
    return escolhida;
  }

  const rotulo = (l) => `${l.qtd}× ${l.nome}${l.variante && l.variante !== "padrão" ? ` (${l.variante})` : ""}${l.preco ? ` · ${reais(l.preco)} cada` : ""}`;

  function desenharCarrinho() {
    cartListEl.innerHTML = "";
    cartEmptyEl.hidden = estado.cart.length > 0;
    cartEl.hidden = !estado.cart.length;
    estado.cart.forEach((linha, i) => {
      const li = document.createElement("li");
      const nome = document.createElement("span");
      nome.textContent = `${rotulo(linha)}${emBloqueio(linha) ? " · aguarde" : ""}`;
      const caixa = document.createElement("div");
      caixa.className = "qtd";
      const criar = (texto, acao) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "burger tiny";
        b.textContent = texto;
        b.addEventListener("click", acao);
        return b;
      };
      caixa.append(
        criar("−", () => { linha.qtd -= 1; if (linha.qtd < 1) estado.cart.splice(i, 1); desenharCarrinho(); salvarRascunho(); }),
        criar("+", () => { linha.qtd = Math.min(999, linha.qtd + 1); desenharCarrinho(); salvarRascunho(); }),
        criar("tirar", () => { estado.cart.splice(i, 1); desenharCarrinho(); salvarRascunho(); }),
      );
      li.append(nome, caixa);
      cartListEl.appendChild(li);
    });
    guardarLocal();
    pintarEspera();
  }

  const daCategoria = (id) => menu.itens.filter((i) => i.categoria === id);

  function chipsCategorias() {
    const pontoChip = emMesa && (cfg.pontos || []).length
      ? [{ label: `📍 ${ponto || "escolher ponto"}`, onClick: perguntarPonto }]
      : [];
    return pontoChip.concat(menu.categorias.map((c) => ({
      label: `${c.emoji} ${c.label}`,
      onClick: () => { desenhar(c.label, "eu"); registrar(c.label); abrirCategoria(c); },
    })).concat([{
      label: "🧊 Copos",
      onClick: () => { desenhar("Copos", "eu"); registrar("Copos"); mostrarCopos(); },
    }]));
  }

  // Escolha do ponto só existe enquanto o QR não traz a mesa: o valor vive na sessão da aba.
  function perguntarPonto() {
    diz("Em qual ponto é o pedido? Eu guardo a escolha nesta sessão e ela vale para os próximos pedidos.");
    chips((cfg.pontos || []).map((p) => ({
      label: p === ponto ? `${p} ✓` : p,
      onClick: () => trocarPonto(p),
    })).concat([{ label: "Voltar ao cardápio", onClick: () => chips(chipsCategorias()) }]));
  }

  function trocarPonto(novo) {
    ponto = String(novo || "");
    sessao.gravar("ponto", ponto);
    mesaLabel = rotuloMesa();
    pintaRotulos();
    desenhar(`Ponto ${ponto}`, "eu");
    registrar(`Ponto ${ponto}`);
    diz(`Anotado — ${mesaLabel || "seu ponto"}. ${fone ? `Este pedido sai no nome de quem está no WhatsApp final ${fone}.` : ""}`.trim());
    chips(chipsCategorias());
    guardarLocal();
  }

  function chipsItens(itens, extra) {
    return itens.slice(0, 16).map((i) => ({ label: `${i.nome}${estaAcabado(i) ? " · acabou" : ""}`, onClick: () => escolherProduto(i) })).concat(extra || []);
  }

  function mostrarCopos() {
    const cdb = acessorios.find((a) => a.id === "cdb");
    if (!bebidas()) diz(`Todo copo acompanha uma bebida — cerveja em lata, garrafa ou KS. Escolha primeiro o que você vai beber.`);
    else {
      const cobertura = latinhas()
        ? `As ${latinhas()} ${latinhas() === 1 ? "latinha" : "latinhas"} de 350 ml cobrem ${limiteCopos()} copos, e o que passar disso também vem sem custo.`
        : `Copo à parte é liberado com qualquer cerveja, sem custo.`;
      diz(`${cobertura} No carrinho: ${coposNoCarrinho()} ${coposNoCarrinho() === 1 ? "copo" : "copos"}.${cdb ? ` ${cdb.sigla} é cobrado à parte: ${reais(cdb.preco)} cada.` : ""}`);
    }
    chips(chipsCopos([
      { label: "← categorias", onClick: () => chips(chipsCategorias()) },
      { label: "Ver carrinho", onClick: mostrarCarrinho },
    ]));
  }

  function abrirCategoria(c) {
    const itens = daCategoria(c.id);
    diz(`${c.emoji} ${c.label} — ${itens.length} ${itens.length === 1 ? "opção" : "opções"}. Toque em uma ou escreva o que procura.`, 100);
    window.setTimeout(() => chips(chipsItens(itens, [
      { label: "← categorias", onClick: () => chips(chipsCategorias()) },
      { label: "🧊 Copos", onClick: () => { desenhar("Copos", "eu"); registrar("Copos"); mostrarCopos(); } },
      { label: "Ver carrinho", onClick: mostrarCarrinho },
    ])), 260);
  }

  function escolherProduto(item) {
    desenhar(item.nome, "eu");
    registrar(item.nome);
    if (estaAcabado(item)) { recusarAcabado(item); return; }
    if (item.variantes.length > 1) {
      diz(`${item.nome} vem em: ${item.variantes.map((v) => v.rotulo).join(", ")}. Qual tamanho?`, 120);
      const pega = (v, qtd) => () => {
        registrar(`${item.nome} ${v.rotulo}${qtd > 1 ? ` × ${qtd}` : ""}`);
        if (varianteAcabada(item, v)) { recusarAcabado(item, v); return; }
        confirmar(item, adicionar(item, v, qtd));
      };
      window.setTimeout(() => chips(item.variantes.map((v) => ({
        label: `${v.rotulo}${varianteAcabada(item, v) ? " · acabou" : ""}`,
        onClick: pega(v, 1),
      })).concat([{ label: "× 6", onClick: pega(item.variantes[0], 6) }])), 300);
      return;
    }
    confirmar(item, adicionar(item, item.variantes[0], 1));
  }

  function confirmar(item, variante) {
    const total = estado.cart.reduce((s, l) => s + l.qtd, 0);
    const lata = ehLatinha({ tipo: "bebida", nome: item.nome, variante: variante.rotulo });
    diz(`Anotado: ${item.nome}${variante.rotulo !== "padrão" ? ` (${variante.rotulo})` : ""}. ${total} ${total === 1 ? "item" : "itens"} no carrinho. Mais alguma coisa?${lata ? ` Cada ${latinhas() === 1 ? "latinha" : `${latinhas()} latinhas`} de 350 ml já dá direito a 4 copos.` : ""}`, 120);
    window.setTimeout(() => chips([
      { label: "Adicionar outro", onClick: () => chips(chipsCategorias()) },
      { label: "🧊 Escolher copos", onClick: () => { desenhar("Escolher copos", "eu"); registrar("Escolher copos"); mostrarCopos(); } },
      { label: "Ver carrinho", onClick: mostrarCarrinho },
      chipFinalizar(),
    ]), 300);
  }

  function mostrarCarrinho() {
    desenharCarrinho();
    if (!estado.cart.length) {
      diz("Seu carrinho está vazio. Me diz o que você quer beber.");
      chips(chipsCategorias());
      return;
    }
    cartao("Seu carrinho", estado.cart.map(rotulo));
    chips([
      { label: "Adicionar outro", onClick: () => chips(chipsCategorias()) },
      chipFinalizar(),
    ]);
  }

  function iniciarCheckout() {
    if (travado()) {
      diz(rotuloEsperaCompleto() + " Enquanto isso posso anotar outra bebida.");
      chips([{ label: "Adicionar outra", onClick: () => chips(chipsCategorias()) }, chipFinalizar()]);
      return;
    }
    if (!estado.cart.length) {
      diz("Antes de finalizar, escolha pelo menos uma bebida.");
      chips(chipsCategorias());
      return;
    }
    estado.passo = "nome";
    cartao("Fechando o pedido", estado.cart.map(rotulo));
    diz(emMesa ? `Fechado! Na ${mesaLabel || "sua mesa"} eu anoto no seu nome. Qual é o seu nome?` : "Fechado! Qual é o seu nome?");
    chips([]);
    inputEl.placeholder = "Seu nome…";
    inputEl.focus();
    guardarLocal();
  }

  function resumo() {
    const linhas = [`Nome: ${estado.cliente.nome}`];
    if (emMesa) linhas.push(`Local: ${mesaLabel || "sua mesa"}`);
    else {
      linhas.push(`WhatsApp: ${estado.cliente.telefone}`);
      linhas.push(`Entrega: ${estado.cliente.retirada ? "retirar no balcão" : estado.cliente.endereco}`);
    }
    linhas.push(`Itens: ${estado.cart.map(rotulo).join(" · ")}`);
    if (coposNoCarrinho()) linhas.push(`Copos: ${coposNoCarrinho()} à parte (sem custo, só CDB é cobrado)`);
    const cobrado = estado.cart.filter((l) => l.preco).reduce((s, l) => s + l.preco * l.qtd, 0);
    if (cobrado) linhas.push(`CDB: ${reais(cobrado)} à parte (${cdbNoCarrinho()} × ${reais(acessorios.find((a) => a.id === "cdb")?.preco || 2)})`);
    linhas.push("Valor: a equipe confirma na resposta");
    return linhas;
  }

  function pedirConfirmacao() {
    estado.passo = "confirmar";
    cartao("Confirma esse pedido?", resumo());
    diz(emMesa
      ? "Está certo? Confirmando, o garçon já vê o pedido na tela dele e traz as bebidas aqui na mesa."
      : "Está certo? Confirmando, a equipe já vê o pedido e responde aqui em cima.");
    chips([
      { label: "Confirmar pedido", onClick: enviarPedido, primario: true },
      { label: "Mudar algo", onClick: () => { estado.passo = "escolhendo"; diz("Bora ajustar. O que muda?"); chips(chipsCategorias()); } },
    ]);
    guardarLocal();
  }

  async function enviarPedido() {
    if (travado()) {
      diz(rotuloEsperaCompleto());
      chips([{ label: "Adicionar outra bebida", onClick: () => chips(chipsCategorias()) }, chipFinalizar()]);
      return;
    }
    chips([{ label: "registrando…", onClick: () => {} }]);
    try {
      const r = await call("place_order", {
        kind: "bebidas",
        modo: emMesa ? "mesa" : estado.cliente.retirada ? "balcao" : "delivery",
        table_label: emMesa ? mesaLabel : "",
        // Só as páginas com casa própria (Kioske Martin) mandam isto aqui. Vazio = rótulo de sempre.
        negocio: emMesa ? String(cfg.negocio || "").trim().slice(0, 18) : "",
        items: estado.cart.map((l) => ({ id: l.id, nome: l.nome, qtd: l.qtd, variante: l.variante, tipo: l.tipo || "bebida", preco: l.preco || 0 })),
        customer_name: estado.cliente.nome,
        customer_phone: estado.cliente.telefone,
        delivery_address: estado.cliente.retirada ? "" : estado.cliente.endereco,
        pickup: estado.cliente.retirada ? "retirada" : "",
        notes: fone ? `WhatsApp final ${fone}` : "",
      });
      if (!r || !r.ok || !r.protocolo) throw new Error("o serviço não devolveu o pedido");
      estado.protocolo = r.protocolo;
      estado.passo = "finalizado";
      atualizarHorario(r);
      const cobrado = Number(r.cobrado_total) || 0;
      const andamento = Number(r.outros_abertos) > 0
        ? "🚴 Seu novo pedido já está a caminho."
        : "⏳ Seu pedido está sendo preparado, aguarde...";
      diz(`Pedido ${r.protocolo} registrado ✅\n\n${r.item_count} ${r.item_count === 1 ? "item" : "itens"} · ${emMesa ? mesaLabel || "sua mesa" : estado.cliente.retirada ? "retirada no balcão" : "entrega"}.${cobrado ? `\n${reais(cobrado)} de CDB à parte; os outros copos são cortesia.` : ""} ${emMesa ? "O garçon já viu e está trazendo." : "A equipe confirma disponibilidade e valor e responde nesta conversa."}\n\n${andamento}`, 200);
      window.setTimeout(() => chips([
        { label: "Ver meu pedido", onClick: () => cartao(`Pedido ${r.protocolo}`, resumo()) },
        { label: "Fazer outro pedido", onClick: recomecar },
      ]), 400);
      guardarLocal();
    } catch (erro) {
      if (Array.isArray(erro.em_falta) && erro.em_falta.length) {
        const sumidas = aplicarFaltas(erro.em_falta, erro.em_falta_ids, false, erro.em_falta_chaves);
        const sug = [];
        sumidas.forEach((linha) => {
          const item = menu.itens.find((i) => i.id === linha.id);
          if (item) sugestoesDoPonto(item).forEach((s) => { if (!sug.some((x) => x.id === s.id)) sug.push(s); });
        });
        const nomes = sumidas.map(nomeDaLinha);
        diz(`${erro.message}${sug.length ? "\n\nNo lugar, dá pra levar:" : nomes.length ? `\n\nTirei do carrinho: ${nomes.join(", ")}.` : "\n\nSeu carrinho continua aqui."}`, 200);
        chips(sug.length
          ? chipsItens(sug, [{ label: "Ver carrinho", onClick: mostrarCarrinho }, chipFinalizar()])
          : [{ label: "Adicionar outra bebida", onClick: () => chips(chipsCategorias()) }, chipFinalizar()]);
        return;
      }
      if (Number(erro.aguardar_segundos) > 0) {
        marcarEspera(erro.aguardar_segundos, erro.repetidos);
        diz(`${rotuloEsperaCompleto()}\n\nSeu carrinho continua salvo aqui.`, 200);
        chips([{ label: "Adicionar outra bebida", onClick: () => chips(chipsCategorias()) }, chipFinalizar()]);
        return;
      }
      diz(`Ainda não consegui registrar: ${erro.message}\n\nSeu carrinho está salvo aqui.`, 200);
      chips([{ label: "Tentar de novo", onClick: enviarPedido, primario: true }, { label: "Continuar escolhendo", onClick: () => chips(chipsCategorias()) }]);
    }
  }

  function recomecar() {
    estado.cart = [];
    estado.protocolo = "";
    estado.passo = "escolhendo";
    estado.historico = [];
    chatEl.innerHTML = "";
    desenharCarrinho();
    salvarRascunho();
    abrirConversa();
  }

  function atualizarHorario(dados) {
    if (dados && (Array.isArray(dados.indisponiveis) || Array.isArray(dados.indisponiveis_chaves))) {
      const sumiram = aplicarFaltas(dados.indisponiveis, [], true, dados.indisponiveis_chaves).map(nomeDaLinha);
      if (sumiram.length) diz(`Acabou de sair do balcão: ${sumiram.join(", ")}. Tirei do carrinho, escolhe outra.`, 200);
    }
    aplicarAviso(dados);
    if (!dados || !dados.food_window) return;
    const bebidas = dados.bebidas === false ? "fechadas agora" : "o dia todo";
    const comidas = dados.comidas ? `abertas ${dados.food_window}` : `fechadas ${dados.food_window}`;
    horarioEl.textContent = `bebidas: ${bebidas} · comidas: ${comidas}`;
  }

  // Quem conta o tempo do pedido é o servidor: `open_chat`, `poll` e `place_order` devolvem
  // `pedido` com a frase pronta ("sendo preparado há X minutos") e a pergunta de mais uma cerveja
  // quando já passaram 30 minutos. A linha de andamento é reescrita no mesmo lugar — não é
  // mensagem nova a cada poll — e cada pergunta aparece uma única vez, marcada pela `pergunta_id`.
  function pintarAndamento() {
    if (!andamentoEl) return;
    const texto = (estado.pedido && estado.pedido.texto) || "";
    andamentoEl.hidden = !texto;
    andamentoEl.textContent = texto;
  }

  function aplicarAviso(dados) {
    estado.pedido = dados && dados.pedido ? dados.pedido : null;
    pintarAndamento();
    const p = estado.pedido;
    if (!p || !p.pergunta_id || !p.pergunta_item || estado.perguntaVista === p.pergunta_id) return;
    estado.perguntaVista = p.pergunta_id;
    guardarLocal();
    diz(`🍻 ${p.pergunta}`, 120);
    window.setTimeout(() => chips([
      { label: "Quero, manda +1", onClick: () => pedirMaisUma(p), primario: true },
      { label: "Agora não", onClick: recusaMaisUma },
    ]), 400);
  }

  function recusaMaisUma() {
    diz("Fechado. Quando bater a sede de novo é só pedir por aqui.", 120);
    window.setTimeout(() => chips([chipFinalizar(), { label: "Ver cardápio", onClick: () => chips(chipsCategorias()) }]), 400);
  }

  function pedirMaisUma(p) {
    const linha = p.pergunta_item;
    const item = menu.itens.find((i) => i.id === linha.id);
    const variante = item ? item.variantes.find((v) => v.rotulo === linha.variante) : null;
    desenhar(`Quero mais uma ${linha.nome}`, "eu");
    registrar(`Quero mais uma ${linha.nome}`);
    if (!item) {
      diz("Essa bebida saiu do cardápio de hoje. Escolhe outra que eu já anoto.", 120);
      window.setTimeout(() => chips(chipsCategorias()), 400);
      return;
    }
    if (estaAcabado(item) || (variante && varianteAcabada(item, variante))) {
      recusarAcabado(item, variante);
      return;
    }
    adicionar(item, variante, 1);
    diz(`Anotado: mais uma ${linha.nome}. Confirmando, o garçon já vê o pedido novo.`, 120);
    window.setTimeout(() => chips([
      { label: "Finalizar pedido", onClick: iniciarCheckout, primario: true },
      { label: "Adicionar outra", onClick: () => chips(chipsCategorias()) },
      { label: "Ver carrinho", onClick: mostrarCarrinho },
    ]), 400);
  }

  function coletar(texto) {
    if (estado.passo === "nome") {
      const nome = texto.replace(/[^\p{L}\p{M}\s'.-]/gu, " ").replace(/\s+/g, " ").trim();
      if (nome.length < 2) { diz("Não entendi o nome. Pode escrever de novo?"); return; }
      estado.cliente.nome = nome.slice(0, 60);
      if (emMesa) { pedirConfirmacao(); guardarLocal(); return; }
      estado.passo = "telefone";
      diz(`Obrigado, ${estado.cliente.nome.split(" ")[0]}! Agora me manda o WhatsApp com DDD, só os números.`);
      inputEl.placeholder = "(11) 9…. …..";
      guardarLocal();
      return;
    }
    if (estado.passo === "telefone") {
      const digitos = texto.replace(/\D/g, "");
      if (digitos.length < 10 || digitos.length > 13) { diz("Esse número parece incompleto. Me manda com DDD, ex: 11988887777."); return; }
      estado.cliente.telefone = digitos;
      estado.passo = "endereco";
      diz("É entrega ou retirada no balcão? Se for entrega, escreve rua, número e bairro.");
      chips([{ label: "Retirar no balcão", onClick: () => { desenhar("Retirar no balcão", "eu"); registrar("Retirar no balcão"); estado.cliente.retirada = true; estado.cliente.endereco = ""; pedirConfirmacao(); } }]);
      inputEl.placeholder = "Endereço de entrega…";
      guardarLocal();
      return;
    }
    if (estado.passo === "endereco") {
      if (estado.cliente.retirada) { pedirConfirmacao(); return; }
      if (texto.length < 8) { diz("Preciso de um endereço mais completo: rua, número e bairro."); return; }
      estado.cliente.endereco = texto.slice(0, 300);
      estado.cliente.retirada = false;
      pedirConfirmacao();
      guardarLocal();
      return;
    }
    if (estado.passo === "confirmar") {
      if (/^(sim|confirmo|confirmar|pode|ok|esta certo|é isso)/i.test(norm(texto))) { enviarPedido(); return; }
      estado.passo = "escolhendo";
      diz("Beleza, vamos mudar. O que você quer ajustar?");
      chips(chipsCategorias());
      return;
    }
    if (estado.passo === "finalizado") {
      if (/outro|mais|adicionar|pedir/.test(norm(texto))) { recomecar(); return; }
      diz(`O pedido ${estado.protocolo} já está com a equipe. Se quiser começar outro, toque em “Fazer outro pedido”.`);
      chips([{ label: "Fazer outro pedido", onClick: recomecar }]);
      return;
    }
    interpretar(texto);
  }

  function interpretar(texto) {
    const t = norm(texto);
    if (t.split(" ").length <= 3 && /^(oi|ola|opa|eai|e ai|bom dia|boa tarde|boa noite|bds)\b/.test(t)) {
      diz(`${saudacao()}! O que vai ser hoje?`, 100);
      chips(chipsCategorias());
      return;
    }
    if (/^(comida|almoco|jantar|lanche|salgado|prato|marmita|espetinho|tostada|porcao)/.test(t)) {
      const entrega = emMesa ? "Se quiser comer, chama o garçon que ele vê o que tem na cozinha." : "Por enquanto este chat aceita só bebidas — e bebida a gente registra a qualquer hora.";
      diz(`${entrega} ${comidaAberta() ? "O cardápio de comidas ainda não está no ar." : `Comidas entram das ${hora(cfg.comidaAbertaDas)} às ${hora(cfg.comidaFechaAs)}, e fora disso o sistema nem deixa registrar.`} Quer uma bebida agora?`);
      chips(chipsCategorias());
      return;
    }
    if (/^mesa\b/.test(t) || /\bmesa[es]?\s*\d+/.test(t)) {
      diz(emMesa
        ? (emMesa && (cfg.pontos || []).length
          ? `Este pedido está saindo como ${mesaLabel || "sua mesa"}. Se você estiver em outra mesa, toque no 📍 ${ponto || "escolher ponto"} para trocar.`
          : `Este pedido é da ${mesaLabel || "sua mesa"}. Se você estiver em outra mesa, o QR code da sua é que traz o pedido certo pro garçon.`)
        : "Aqui o pedido chega por entrega ou retirada no balcão, não por mesa.");
      chips(estado.cart.length ? [{ label: "Ver carrinho", onClick: mostrarCarrinho }, chipFinalizar()] : chipsCategorias());
      return;
    }
    if (/^(limpar|apagar tudo|zerar)/.test(t)) {
      estado.cart = [];
      desenharCarrinho();
      salvarRascunho();
      diz("Carrinho limpo. Do que você vai querer agora?", 100);
      chips(chipsCategorias());
      return;
    }
    if (/^(remover|tirar|trocar)\b/.test(t)) {
      const alvo = buscar(t.replace(/^(remover|tirar|trocar)\s*/, ""))[0];
      if (!alvo) {
        diz("Não descobri qual item tirar. Abra o carrinho e use o botão “tirar”.");
        mostrarCarrinho();
        return;
      }
      estado.cart = estado.cart.filter((l) => l.id !== alvo.id);
      desenharCarrinho();
      salvarRascunho();
      diz(`Tirei ${alvo.nome} do carrinho.`, 100);
      chips([{ label: "Ver carrinho", onClick: mostrarCarrinho }, { label: "Adicionar outra", onClick: () => chips(chipsCategorias()) }]);
      return;
    }
    if (/^(carrinho|meu carrinho|o que eu tenho|ver itens)/.test(t)) { mostrarCarrinho(); return; }
    if (/^(finalizar|fechar|chegou de mais|nao quero mais|chegar de mais)/.test(t)) { iniciarCheckout(); return; }
    if (/^(catalogo|cardapio|tudo|todos|lista)/.test(t) || /o que voces tem/.test(t)) {
      diz("Trabalhamos com estas famílias de bebida:", 100);
      window.setTimeout(() => chips(menu.categorias.map((c) => ({
        label: `${c.emoji} ${c.label} (${daCategoria(c.id).length})`,
        onClick: () => { desenhar(c.label, "eu"); registrar(c.label); abrirCategoria(c); },
      }))), 260);
      return;
    }
    if (/^(ajuda|como funciona|nao entendi)/.test(t)) {
      diz("Escreva o que você quer, tipo “2 cocas lata”, “tem heineken long neck?” ou “guaraná zero”. Eu somo no carrinho e no fim é só finalizar.");
      chips(chipsCategorias());
      return;
    }
    const marcados = ranquear(texto);
    const copo = buscaCopo(texto);
    if (copo && /\b(copos?|gla|gl|cpg|cple|cdb)\b/.test(t) && !(marcados.length && marcados[0].completo)) {
      if (/^(?:\d+\s+)?copos?$/.test(t)) { mostrarCopos(); return; }
      coposPorTexto(texto);
      return;
    }
    const categoria = menu.categorias.find((c) => palavras(c.label).some((p) => p.length > 3 && t.includes(p)) || t.includes(c.id));
    const pleno = marcados.length && marcados[0].completo;
    if (categoria && !pleno && t.split(" ").length <= 3) { abrirCategoria(categoria); return; }

    if (!marcados.length) {
      diz(`Não encontrei “${texto.trim()}” no cardápio de bebidas. Quer ver por categoria?`, 120);
      chips(chipsCategorias());
      return;
    }
    const [primeiro, segundo] = marcados;
    const empate = segundo && primeiro.acertos === segundo.acertos && primeiro.extras === segundo.extras;
    if (marcados.length > 1 && empate) {
      diz(`Achei ${Math.min(marcados.length, 12)} parecidas com “${texto.trim()}”. Qual você quer?`, 100);
      chips(chipsItens(marcados.map((m) => m.item)));
      return;
    }
    const item = primeiro.item;
    const falada = varianteFalando(item, texto);
    if (estaAcabado(item)) { recusarAcabado(item); return; }
    if (falada && varianteAcabada(item, falada)) { recusarAcabado(item, falada); return; }
    if (item.variantes.length > 1 && !falada) { escolherProduto(item); return; }
    confirmar(item, adicionar(item, falada || item.variantes[0], quantidade(texto)));
  }

  // Entrega do cliente da mesa ao WhatsApp do atendimento, só no navegador: a mensagem que ele
  // mesmo manda ("Olá, sou o cliente da mesa 14!") é o gancho para o Green API reconhecer cada
  // cliente mais tarde. Nada é gravado no backend por enquanto — sem `foneAtendimento` no config,
  // o bloco inteiro fica escondido e o cliente segue conversando aqui.
  const foneAtendimento = String(cfg.foneAtendimento || "").replace(/\D/g, "");
  const textoZap = `Olá, sou o cliente da mesa ${mesaNumero}!`;
  const linkZap = emMesa && mesaNumero && foneAtendimento
    ? `https://wa.me/${foneAtendimento}?text=${encodeURIComponent(textoZap)}`
    : "";
  const chaveZapSessao = `opeixeiro.zap.${cfg.modo}.${mesaNumero || 0}`;
  let zapContador = 0;

  function marcaZapVisto() {
    try { window.sessionStorage.setItem(chaveZapSessao, "1"); } catch { /* aba particular */ }
  }

  function entregaZap() {
    window.clearTimeout(zapContador);
    marcaZapVisto();
    window.location.assign(linkZap);
  }

  function montaZap() {
    if (!zapEl || !linkZap) return;
    zapEl.hidden = false;
    if (zapBotaoEl) {
      zapBotaoEl.href = linkZap;
      zapBotaoEl.addEventListener("click", marcaZapVisto);
    }
    if (zapAquiEl) {
      zapAquiEl.addEventListener("click", () => {
        window.clearTimeout(zapContador);
        marcaZapVisto();
        zapEl.hidden = true;
      });
    }
    let visto = "";
    try { visto = window.sessionStorage.getItem(chaveZapSessao) || ""; } catch { /* aba particular */ }
    if (cfg.autoAbrirWhatsApp === false || visto) {
      if (zapTextoEl) {
        zapTextoEl.textContent = `📱 Mesa ${mesaNumero} lida do QR code. Toque em "Falar no WhatsApp" e mande: "${textoZap}"`;
      }
      return;
    }
    let falta = 4;
    const conta = () => {
      if (zapTextoEl) {
        zapTextoEl.textContent = `📱 Mesa ${mesaNumero} lida do QR code. Abrindo o WhatsApp em ${falta}s com a mensagem "${textoZap}" — ou continue aqui no chat.`;
      }
      if (falta <= 0) { entregaZap(); return; }
      falta -= 1;
      zapContador = window.setTimeout(conta, 1000);
    };
    conta();
  }

  function abrirConversa() {
    const { h } = horaSp();
    if (avisoQr) {
      desenhar(avisoQr, "sistema");
    }
    if (estado.historico.length) {
      restaurando = true;
      estado.historico.forEach(({ texto, tipo }) => desenhar(texto, tipo));
      restaurando = false;
      chips(estado.cart.length ? [
        { label: "Ver carrinho", onClick: mostrarCarrinho },
        { label: "Adicionar bebida", onClick: () => chips(chipsCategorias()) },
        chipFinalizar(),
      ] : chipsCategorias());
      return;
    }
    diz(emMesa
      ? `${saudacao()}! Este QR code é o pedido da ${mesaLabel || "sua mesa"} no ${nomeCasa} ${emojiCasa}\n\n${h < 6 ? "Madrugada também é hora de bebida gelada. " : ""}Escolhe aqui e o garçon traz pra vocês.${(cfg.pontos || []).length ? `\n\n📍 Está no ponto errado? Toque em "${ponto || "escolher ponto"}" para trocar.` : ""}`
      : `${saudacao()}! Aqui é o atendimento do ${nomeCasa} ${emojiCasa}\n\n${h < 6 ? "Madrugada também é hora de bebida gelada." : "Me diz o que você quer beber."}`, 200);
    window.setTimeout(() => { if (!estado.historico.some((x) => x.tipo === "eu")) chips(chipsCategorias()); }, 700);
  }

  async function conectar() {
    const salvo = lerLocal();
    if (salvo) {
      estado.chatId = salvo.chatId || "";
      estado.token = salvo.token || "";
      estado.cursor = salvo.cursor || 0;
      estado.passo = salvo.passo || "escolhendo";
      estado.cart = Array.isArray(salvo.cart) ? salvo.cart : [];
      estado.cliente = Object.assign(estado.cliente, salvo.cliente || {});
      estado.protocolo = salvo.protocolo || "";
      estado.historico = Array.isArray(salvo.historico) ? salvo.historico : [];
      estado.bloqueadoAte = Number(salvo.bloqueadoAte) || 0;
      estado.bloqueados = Array.isArray(salvo.bloqueados) ? salvo.bloqueados : [];
      estado.perguntaVista = String(salvo.perguntaVista || "");
    }
    desenharCarrinho();
    abrirConversa();
    montaZap();
    vigiarEspera();
    if (!estado.chatId || !estado.token) {
      try {
        const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || cfg.fuso).slice(0, 60);
        const r = await call("open_chat", {
          timezone: tz,
          modo: cfg.modo,
          table_label: emMesa ? mesaLabel : "",
          negocio: emMesa ? String(cfg.negocio || "").trim().slice(0, 18) : "",
          mesa_slug: mesaSlug,
          mesa_numero: mesaNumero || null,
        });
        if (r && r.ok) {
          estado.chatId = r.chat_id;
          estado.token = r.token;
          atualizarHorario(r);
          guardarLocal();
        }
      } catch (erro) {
        desenhar(`Agora não consegui abrir linha com a equipe (${erro.message}). Você escolhe as bebidas e eu registro quando voltar.`, "sistema");
      }
    }
    if (!estado.vigiando && estado.chatId) {
      estado.vigiando = true;
      vigiar();
    }
  }

  async function vigiar() {
    for (;;) {
      if (!document.hidden && estado.chatId) {
        try {
          const r = await call("poll", { after_id: estado.cursor });
          if (r) {
            (r.messages || []).forEach((m) => {
              estado.cursor = Math.max(estado.cursor, Number(m.id) || 0);
              if (m.sender === "equipe") diz(`Equipe: ${m.text}`, 60);
            });
            atualizarHorario(r);
            guardarLocal();
          }
        } catch { /* nova tentativa no próximo ciclo */ }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 6000));
    }
  }

  function enviar(evento) {
    evento.preventDefault();
    const texto = inputEl.value.trim();
    if (!texto) return;
    inputEl.value = "";
    inputEl.placeholder = "Escreva o que você quer beber…";
    desenhar(texto, "eu");
    registrar(texto);
    coletar(texto);
  }

  document.getElementById("btnPedir").addEventListener("click", iniciarCheckout);
  document.getElementById("btnContinuar").addEventListener("click", () => { cartEl.hidden = true; chips(chipsCategorias()); });
  formEl.addEventListener("submit", enviar);
  conectar();
})();
