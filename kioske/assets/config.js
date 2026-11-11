// Configuração da página KIOSKE MARTIN — mesma etiqueta de mesa do Opeixeiro, casa diferente.
// A URL do Supabase, o cardápio e as regras ficam em ../opeixeiro/assets/config.js; este arquivo só
// sobrescreve o que é do quiosque, depois daquele config ter sido carregado. Nada de segredo aqui.
//
// A etiqueta imprime https://kuttenc.github.io/kioske/?m=mesa65 (sem ponto), então:
//  - `pontos: []` e `pontoPadrao: ""` tiram o chip e o seletor de ponto — o quiosque tem um bar só;
//  - `negocio` é o nome que a equipe lê no pedido: o servidor monta "Kioske Martin · Mesa 65";
//  - `mesa: ""` e `foneSessao: ""`: a mesa vem sempre do QR e o final do WhatsApp do cliente ainda
//    não é do Kioske — entra quando o robô de WhatsApp dele existir.
window.OPEIXEIRO_CONFIG = Object.assign({}, window.OPEIXEIRO_CONFIG, {
  negocio: "Kioske Martin",
  emojiNegocio: "🏪",
  mesa: "",
  pontos: [],
  pontoPadrao: "",
  foneSessao: "",
});
