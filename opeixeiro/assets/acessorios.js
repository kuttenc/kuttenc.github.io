// Copos que acompanham as latinhas. A regra é do bar: cada latinha de 350 ml dá direito a 4 copos.
// CDB é o único cobrado (R$ 2,00 cada) porque leva limão espremido e sal na borda.
window.OPEIXEIRO_REGRA_COPOS = {
  coposPorLatinha: 4,
  rotuloLatinha: "lata",
};

window.OPEIXEIRO_ACESSORIOS = [
  {
    id: "gla",
    sigla: "GLA",
    nome: "Copo com gelo e laranja",
    preco: 0,
    busca: "gla copo gelo laranja laranja gelo",
  },
  {
    id: "gl",
    sigla: "GL",
    nome: "Copo com gelo e limão",
    preco: 0,
    busca: "gl copo gelo limao limão gelo",
  },
  {
    id: "cpg",
    sigla: "CPG",
    nome: "Copo com gelo",
    preco: 0,
    busca: "cpg copo gelo só gelo",
  },
  {
    id: "cple",
    sigla: "CPLE",
    nome: "Copo com limão espremido",
    preco: 0,
    busca: "cple copo limao espremido limão espremido",
  },
  {
    id: "cdb",
    sigla: "CDB",
    nome: "CDB — shot de limão espremido com sal na borda",
    preco: 2,
    busca: "cdb copo limao sal borda shot espremido salgado",
  },
];
