// Configuração da página Opeixeiro (QR code colado na mesa do cliente).
// modo "mesa": o pedido é da mesa fixa abaixo — o cliente não escreve endereço nem WhatsApp, o garçon atende.
// A cópia /opeixeirodelivery/ usa o mesmo app com modo "delivery" (assets/config.js dela).
// Não há chave aqui: a Edge Function `opeixeiro-site-chat` roda com verify_jwt desligado e usa a
// service role no servidor. As tabelas `opeixeiro_site_*` continuam fechadas para `anon`.
window.OPEIXEIRO_CONFIG = {
  supabaseUrl: "https://suipuquznkksgrkchqrv.supabase.co",
  functionName: "opeixeiro-site-chat",
  modo: "mesa",
  mesa: "14",
  // QR por mesa (etiqueta impressa no app de validade PT260). A URL chega como
  // /opeixeiro/P<ponto>mesa<numero> — P1mesa1, P7mesa150 — e o número também vale em base64
  // (mesaMTQ=). Mesa de 1 a mesaMaxima; quando a URL traz a mesa, ela manda no rótulo e o `mesa`
  // fixo acima deixa de valer.
  mesaMaxima: 150,
  // Entrega do cliente ao WhatsApp de atendimento: o navegador abre wa.me com
  // "Olá, sou o cliente da mesa N!". É o número do BAR, o mesmo que aparece no link clicado pelo
  // cliente — público por projeto, nunca chave de API. Enquanto estiver vazio, nada de wa.me:
  // a página continua só no chat. Preencher é decisão do dono.
  foneAtendimento: "",
  autoAbrirWhatsApp: true,
  // Teste do QR por mesa, enquanto a etiqueta não sai do app de validade: o ponto (bar) é escolha da
  // pessoa e fica guardado só na sessão (sessionStorage). Trocar o padrão aqui não precisa recompilar nada.
  // Quando a etiqueta trouxer o ponto no path (/opeixeiro/P7mesa150), ele chega automático e esta lista
  // passa a ser só o menu de correção para quem está em ponto errado. A lista é dado do negócio:
  // mexer aqui é decisão do dono, não do código.
  pontos: ["P1", "P2", "P3", "P4", "P5", "P6"],
  pontoPadrao: "P2",
  // Só o FINAL do WhatsApp do cliente, gravado uma vez no começo da sessão e enviado como anotação do
  // pedido. Nunca o número inteiro neste arquivo — ele é público.
  foneSessao: "6164",
  bebidasSempreAbertas: true,
  comidaAbertaDas: "11:00",
  comidaFechaAs: "22:00",
  fuso: "America/Sao_Paulo",
};
