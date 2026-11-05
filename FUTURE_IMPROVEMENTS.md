# Kuttenc GitHub Pages — melhorias futuras

Atualizado em 05/11/2026.

1. Confirmar após cada deploy que raiz, `/urtador/` e uma rota curta encaminham ao mesmo fluxo esperado.
2. Manter mensagens de indisponibilidade sem detalhes de Supabase, mensageria ou credenciais.
3. Documentar qualquer novo subsite hospedado na raiz e sua relação com o backend correspondente.
4. Conferir redirecionamentos em navegador móvel e sem sessão antes de publicar.
5. Criar a tela da equipe/garçon: listar `public.opeixeiro_site_orders` com `status = 'novo'`, mostrar mesa, itens e `cobrado_total`, e responder escrevendo mensagem `equipe` em `opeixeiro_site_chat_messages` (o chat do cliente já mostra a resposta em cerca de 6 segundos). Sem essa tela o pedido é registrado mas ninguém vê.
6. Antes de colar QR code em qualquer mesa: escrever a política de privacidade e a página de exclusão de dados (a página grava nome, e no modo entrega também WhatsApp e endereço) e decidir o `order_group_chat_id` / `order_notify_url` em `public.opeixeiro_site_settings` se o salão quiser aviso no grupo.
7. Revisar o cardápio gerado em `opeixeiro/assets/menu.js` com o dono (rótulos de família, "Appia"/"Indica"/"Seleta"/"Salinas" e a ausência de preço) e regerar a partir do banco quando o estoque mudar.
8. Confirmar com o dono as duas escolhas ainda abertas da regra dos copos: quais rótulos de embalagem contam como latinha de 350 ml (hoje só quem tem "lata" no rótulo conta — "KS" e latinhas slim ficam fora) e se o CDB continua em R$ 2,00. Mudar isso não exige publicar página: `UPDATE public.opeixeiro_site_settings SET cups_per_can = …, cdb_price = …`.
9. Gerar os QR codes das mesas: o plano aprovado pelo dono é a etiqueta sair do **app de validade PT260**, com o ponto e a mesa já embutidos no link, e o "oi" no WhatsApp do robô identificando o cliente pelo final do telefone. Nada disso está codificado — ver `docs/PROXIMA_VERSAO_QRCODE_MESA_VALIDADE_PT260.md` no repositório do O Peixeiro. Enquanto isso `/opeixeiro/` usa o seletor de ponto da sessão (teste), o config continua com `mesa: "14"` fixo e o `app.js` segue ignorando parâmetros de URL (`?mesa=7` não funciona).
10. Criar página de privacidade e de exclusão de dados para os pedidos do site, e um painel da equipe responder as conversas e ver a mesa de cada pedido (as mensagens de `equipe` já aparecem no chat em cerca de 6 segundos).
