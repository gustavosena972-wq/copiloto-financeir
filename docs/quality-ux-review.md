# Revisão inicial de qualidade e experiência

Data: 02/11/2026

## Ajuste aplicado
- O texto do campo de senha na tela de cadastro/login foi atualizado de "mín. 6" para "mín. 8", alinhando a orientação visual à configuração Auth salva no Supabase.

## Pontos identificados para validar
1. **Cadastro e confirmação:** a interface deve explicar que o usuário precisa confirmar o e-mail se a confirmação estiver habilitada. Testar também o caso em que o Supabase cria a conta sem sessão ativa.
2. **Acessibilidade:** validar foco visível, ordem de tabulação, rótulos associados aos campos, contraste dos textos secundários e leitura em zoom de 200%.
3. **Mobile:** conferir a tabela financeira com rolagem horizontal, navegação por abas e modais em telas estreitas.
4. **Erros:** garantir que falhas de rede, sessão expirada e falta de permissão apresentem mensagem clara sem apagar campos ou dados digitados.
5. **Ações destrutivas:** manter confirmação explícita para exclusão de lançamentos, mês, ano e conta; testar restauração/backup antes de produção.
6. **Estados vazios:** verificar telas sem família, sem ano, sem lançamentos e sem sugestões.
7. **Privacidade:** evitar expor dados financeiros em logs, mensagens de erro, URLs ou notificações.

## Limite desta revisão
Foi feita inspeção estática do HTML/JavaScript e aplicado o ajuste de texto da senha. Não foi executado teste visual em navegador nem teste automatizado end-to-end. Marcar os itens acima somente após execução real.
