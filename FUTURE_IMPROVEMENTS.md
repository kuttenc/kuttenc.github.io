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
9. Gerar os QR codes das mesas: cada mesa precisa de um arquivo com a própria pasta/parâmetro ou de um config por mesa, porque hoje `/opeixeiro/` atende fixamente a `mesa: "14"`. Decidir se o QR leva `?mesa=7` (o app ainda não lê a URL) ou se cada mesa ganha uma cópia da pasta.
10. Criar página de privacidade e de exclusão de dados para os pedidos do site, e um painel da equipe responder as conversas e ver a mesa de cada pedido (as mensagens de `equipe` já aparecem no chat em cerca de 6 segundos).
