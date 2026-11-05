# Kuttenc GitHub Pages — melhorias futuras

Atualizado em 05/11/2026.

1. Confirmar após cada deploy que raiz, `/urtador/` e uma rota curta encaminham ao mesmo fluxo esperado.
2. Manter mensagens de indisponibilidade sem detalhes de Supabase, mensageria ou credenciais.
3. Documentar qualquer novo subsite hospedado na raiz e sua relação com o backend correspondente.
4. Conferir redirecionamentos em navegador móvel e sem sessão antes de publicar.
5. Preencher `opeixeiro/assets/config.js` (URL + chave pública do Supabase do O Peixeiro) antes de divulgar `/opeixeiro/` e `/opeixeirodelivery/`; é o único arquivo com a URL — a página de entrega herda e só muda o `modo`. Sem esses dois valores as duas páginas ficam em modo local e não registram pedido.
6. Publicar a migration `202611050002_site_bebidas_chatbot.sql` (já com `service_mode`, `table_label`, `cobrado_total`, `cups_per_can`, `cdb_price` e `repeat_guard_minutes`) e a função `opeixeiro-site-chat` no projeto do O Peixeiro, com `verify_jwt = false`, e só então testar o fluxo real de pedido.
7. Revisar o cardápio gerado em `opeixeiro/assets/menu.js` com o dono (rótulos de família, "Appia"/"Indica"/"Seleta"/"Salinas" e a ausência de preço) e regerar a partir do banco quando o estoque mudar.
8. Confirmar com o dono as duas escolhas ainda abertas da regra dos copos: quais rótulos de embalagem contam como latinha de 350 ml (hoje só quem tem "lata" no rótulo conta — "KS" e latinhas slim ficam fora) e se o CDB continua em R$ 2,00. Mudar isso não exige publicar página: `UPDATE public.opeixeiro_site_settings SET cups_per_can = …, cdb_price = …`.
9. Gerar os QR codes das mesas: cada mesa precisa de um arquivo com a própria pasta/parâmetro ou de um config por mesa, porque hoje `/opeixeiro/` atende fixamente a `mesa: "14"`. Decidir se o QR leva `?mesa=7` (o app ainda não lê a URL) ou se cada mesa ganha uma cópia da pasta.
10. Criar página de privacidade e de exclusão de dados para os pedidos do site, e um painel da equipe responder as conversas e ver a mesa de cada pedido (as mensagens de `equipe` já aparecem no chat em cerca de 6 segundos).
