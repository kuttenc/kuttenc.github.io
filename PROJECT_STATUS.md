# Kuttenc GitHub Pages — estado atual

Atualizado em 22/10/2026.

## Função deste repositório

- Este repositório controla a raiz `https://kuttenc.github.io/`.
- A raiz encaminha para a interface canônica do Urtador em `/urtador/`.
- Rotas curtas acessadas pela raiz são encaminhadas para `/urtador/<slug>`, preservando uma implementação única de redirecionamento.

## Limites

- GitHub Pages hospeda somente HTML, CSS e JavaScript estáticos.
- Cadastro, autenticação, OTP, sessões, links, cliques e pagamentos pertencem ao backend do Urtador no Supabase.
- A sessão do navegador é compartilhada por estarem sob a mesma origem, mas a autorização continua sendo decidida pelo backend.

## Projeto relacionado

- Aplicação e documentação operacional: `../urtador/`.
- Antes de alterar a raiz, verificar o impacto no caminho canônico `/urtador/` e nos links curtos antigos.
- Não colocar tokens, dados pessoais ou regras privadas neste repositório público.
