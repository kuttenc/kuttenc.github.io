# Kuttenc GitHub Pages — estado atual

Atualizado em 05/11/2026.

## Função deste repositório

- Este repositório controla a raiz `https://kuttenc.github.io/`.
- A raiz encaminha para a interface canônica do Urtador em `/urtador/`.
- Rotas curtas acessadas pela raiz são encaminhadas para `/urtador/<slug>`, preservando uma implementação única de redirecionamento.

## Subsistema Opeixeiro (05/11/2026)

- Duas páginas, um só app: `/opeixeiro/` é o QR code colado na **mesa** do salão (o pedido é da mesa fixa, o garçon atende) e `/opeixeirodelivery/` é a cópia com **entrega ou retirada no balcão**. Arquivos: `opeixeiro/index.html`, `opeixeiro/assets/{config.js,menu.js,acessorios.js,app.js,styles.css}` e `opeixeirodelivery/index.html` + `opeixeirodelivery/assets/config.js`. A página de entrega carrega os scripts de `../opeixeiro/assets/` e só sobrescreve `modo`; ela não repete URL nem chave. As duas entradas estão no `sitemap.xml`.
- O modo vem de `window.OPEIXEIRO_CONFIG` (`modo: "mesa"`, `mesa: "14"` na mesa; `modo: "delivery"` na entrega) e muda o atendimento: na mesa o checkout pede só o nome (sem WhatsApp e sem endereço), o resumo mostra a mesa, o `place_order` leva `modo` e `table_label`, e o `open_chat` registra a mesa na conversa para o painel. Trocar a mesa do QR é editar `mesa` no config daquela pasta.
- `localStorage` tem chave por modo (`opeixeiro.chat.v1.mesa` / `opeixeiro.chat.v1.delivery`), porque as duas páginas dividem a mesma origem no GitHub Pages.
- Cardápio de bebidas congelado em `opeixeiro/assets/menu.js`: 77 bebidas em 7 famílias, gerado de `public.opeixeiro_products` e `public.opeixeiro_bar_availability_catalog` do projeto do O Peixeiro. Polpas, taças, gelo, jarras, laranja e limão ficaram fora — não são bebidas vendidas. Nenhum preço de bebida é exibido.
- Copos (05/11/2026), em `opeixeiro/assets/acessorios.js`: cada latinha de 350 ml dá direito a 4 copos — GLA (gelo e laranja), GL (gelo e limão), CPG (só gelo), CPLE (limão espremido) saem sem custo; CDB (shot de limão espremido com sal na borda) é **cobrado R$ 2,00 cada**, e a página avisa o valor antes de anotar. A página mostra o limite ("8 de 16 usados"), recusa copo sem latinha e trava o excedente; a Edge Function refaz a conta e o preço nunca vem do navegador — `cobrado_total` do pedido é calculado no servidor. Ajuste sem recompilar: `UPDATE public.opeixeiro_site_settings SET cups_per_can = 6, cdb_price = 3.00`.
- Persistência: cada mensagem, o carrinho e o pedido vão para a Edge Function `opeixeiro-site-chat` do Supabase do O Peixeiro (tabelas `opeixeiro_site_chats`, `opeixeiro_site_chat_messages`, `opeixeiro_site_orders`, `opeixeiro_site_settings`), que escreve com a service role. A página não tem acesso direto às tabelas.
- Regras de horário ficam no servidor: bebida a qualquer hora; comida só entre `food_open_at` e `food_close_at` (padrão 11:00–22:00) e com `foods_enabled = false` até o cardápio de comidas entrar. O front-end repete a regra só para a conversa ficar coerente.
- Trava de item repetido (05/11/2026): o mesmo WhatsApp, **a mesma mesa** ou a mesma conversa não registram de novo um item que já está em pedido `novo`/`confirmado` há menos de `repeat_guard_minutes` (padrão 8 minutos, em `public.opeixeiro_site_settings`). A decisão é da Edge Function; o pedido recusado devolve `aguardar_segundos` e a página mostra só a espera — "Aguarde 4:12 para finalizar.", sem dizer o motivo, para não virar pergunta no caixa. O item bloqueado aparece com "· aguarde" no carrinho e o botão "Finalizar pedido" vira a contagem regressiva; tirar o item travado libera o botão na hora, porque a regra é por item e não por sessão. Na mesa a trava é desejada entre celulares: duas pessoas da mesma mesa escaneiam o mesmo QR. O IP não entra no critério: rede de operadora e Wi-Fi de prédio compartilham endereço entre clientes diferentes. `UPDATE public.opeixeiro_site_settings SET repeat_guard_minutes = 0` desliga a trava sem recompilar a página.
- `opeixeiro/assets/config.js` está com `supabaseUrl` e `publishableKey` vazios de propósito: sem esses dois valores as duas páginas continuam funcionando em "modo local" (escolhe, monta carrinho, não registra). Preencher **só nesse arquivo** — a página de entrega herda a URL e o modo dela.
- O nome, o WhatsApp, o endereço de entrega e a mesa do pedido são gravados no banco do O Peixeiro. Ainda não há página de privacidade/exclusão específica deste formulário — enquanto ela não existir, não divulgar os links fora do círculo de clientes.

## Limites

- GitHub Pages hospeda somente HTML, CSS e JavaScript estáticos.
- Cadastro, autenticação, OTP, sessões, links, cliques e pagamentos pertencem ao backend do Urtador no Supabase.
- A sessão do navegador é compartilhada por estarem sob a mesma origem, mas a autorização continua sendo decidida pelo backend.

## Projeto relacionado

- Aplicação e documentação operacional: `../urtador/`.
- Antes de alterar a raiz, verificar o impacto no caminho canônico `/urtador/` e nos links curtos antigos.
- Não colocar tokens, dados pessoais ou regras privadas neste repositório público.
