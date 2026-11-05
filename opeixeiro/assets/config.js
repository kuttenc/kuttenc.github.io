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
  // Teste do QR por mesa, enquanto a etiqueta não sai do app de validade: o ponto (bar) é escolha da
  // pessoa e fica guardado só na sessão (sessionStorage). Trocar o padrão aqui não precisa recompilar nada.
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
