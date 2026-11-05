// Configuração da página Opeixeiro ENTREGA (mesmo app da mesa, fluxo de entrega/retirada).
// A URL e a chave pública ficam só em ../opeixeiro/assets/config.js — este arquivo não copia segredo,
// apenas sobrescreve o modo depois que aquele config foi carregado.
window.OPEIXEIRO_CONFIG = Object.assign({}, window.OPEIXEIRO_CONFIG, {
  modo: "delivery",
  mesa: "",
});
