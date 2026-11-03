# Smoke tests — Copiloto Financeiro

Use uma conta e família exclusivamente de teste. Não use dados financeiros reais. Registre navegador, horário, resultado e evidência sem expor e-mail, tokens ou valores privados.

## Autenticação
- [ ] Cadastrar com nome, usuário de 3 a 24 caracteres e senha de 8 a 128 caracteres.
- [ ] Usuário fora do padrão e senha abaixo de 8 ou acima de 128 caracteres devem ser recusados.
- [ ] Aceitar Termos e Política; sem aceite, o cadastro deve ser recusado.
- [ ] Confirmar que o cadastro cria a sessão sem exigir confirmação por e-mail.
- [ ] Guardar o código de recuperação exibido no cadastro; confirmar que ele não é exibido novamente após sair.
- [ ] Recuperar senha com código válido; código inválido deve ser recusado.
- [ ] Repetir cadastro com usuário já existente; resposta não deve expor dados de outra conta.
- [ ] Sair e entrar novamente com usuário e senha.
- [ ] Testar limite de tentativas e mensagens genéricas para usuário/senha incorretos.
- [ ] Confirmar que o requisito de 18 anos indicado nos Termos é tratado antes de abrir inscrições públicas; hoje o cadastro não valida idade.

## Família e permissões
- [ ] Criar família e confirmar criação do ano, meses e categorias iniciais.
- [ ] Criar convite, aceitar com segunda conta e verificar acesso.
- [ ] Usuário leitor não consegue criar, editar, apagar ou aprovar lançamentos.
- [ ] Usuário de uma família não consegue consultar dados de outra família.
- [ ] Conta sem família vê a tela de criação/convite sem erro.

## Financeiro
- [ ] Criar receita e despesa; validar totais e resumo anual.
- [ ] Editar descrição, valor, categoria, membro e vencimento.
- [ ] Marcar conta como paga e desfazer quando permitido.
- [ ] Criar parcelamento de 2 parcelas e confirmar valores/datas.
- [ ] Copiar mês anterior para mês aberto; confirmar que não duplica itens.
- [ ] Tentar copiar para mês fechado; deve ser recusado.
- [ ] Dividir despesa em partes iguais, proporcionais e valores fixos.
- [ ] Importar arquivo válido; testar arquivo vazio, estrutura inválida e mais de 1.000 itens.
- [ ] Fechar mês e verificar bloqueio de edição; reabrir e validar.
- [ ] Exportar CSV e JSON e conferir que os arquivos abrem.

## Pagamento e acesso
- [ ] Enviar aviso de pagamento sem conceder acesso automaticamente.
- [ ] Admin aprova pagamento pendente e concede o período configurado.
- [ ] Admin recusa pagamento e o cliente vê o estado correto.
- [ ] Acesso expirado mostra paywall; dados permanecem preservados.
- [ ] Testar duplicidade de aviso de pagamento.

## Navegadores e dispositivos
- [ ] Chrome desktop em largura 1366px.
- [ ] Chrome mobile em largura 390px.
- [ ] Navegação por teclado nos campos e botões.
- [ ] Mensagens de erro e sucesso legíveis; nenhum botão fica preso em estado de carregamento.

**Critério de aprovação:** todos os casos críticos de autenticação, isolamento entre famílias, permissões, lançamentos e pagamento passam. Falha de isolamento ou permissão bloqueia qualquer lançamento comercial.
