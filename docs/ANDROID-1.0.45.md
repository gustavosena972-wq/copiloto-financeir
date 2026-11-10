# Android 1.0.45 — produto violeta e espaço do Tamanduá

Escopo: somente o produto Android. A apresentação e os planos da 1.0.44 permanecem.
Painel em grafite/violeta, blocos separados por grupos e respiros de 12–22 px,
sem trocar informações financeiras por métricas fictícias de outra empresa.

Chat ocupa toda a tela; histórico, sugestões, voz/idioma e Configure seu app
ficam na lateral (gaveta no celular). O cabeçalho não monta mais o GLB. O botão
de ditado e o fundo usam o mesmo PNG de alta resolução dos planos, com recorte
do rosto adequado ao plano. Três faixas do fundo se recompõem em 700 ms, uma
única vez ao entrar na conversa; não há loop nem captura de rolagem. O movimento
é desativado pela preferência do app ou por redução de movimento do sistema.

Tarefas reais: organizar até 50 lançamentos sem categoria por revisão, registrar
receita/despesa pendente por formulário e abrir a importação existente. Comandos
como Organize minha planilha abrem a revisão, sem depender de aprender um prompt.
Categorias ambíguas exigem escolha; categorias existentes não são sobrescritas.
As sugestões só usam categorias existentes e compatíveis com receita/despesa.
Nenhum texto gerado pelo modelo vira código ou comando arbitrário de banco.

Toda gravação exige confirmação, usuário/família/mês estáveis, editor/dono e
mês aberto. UPDATE filtra família, mês, identificador e estado anterior; o RLS
do servidor exige pode_editar e mês aberto, com trigger de bloqueio de mês fechado
e auditoria. Essas regras foram conferidas por metadados, sem ler lançamentos.
Falhas parciais informam quantos itens foram alterados; novos registros usam UUID
reutilizado em repetição do mesmo rascunho. O cadastro sempre é pendente.
Não executa pagamentos, transferências ou treinamento autônomo do modelo.
Resultados das tarefas aparecem na conversa aberta e nos lançamentos/auditoria;
este incremento não adiciona persistência separada dessas mensagens locais.

Áudio: SpeechRecognizer nativo com RECORD_AUDIO solicitado somente no toque;
declaração de visibilidade do serviço, estados distintos de permissão/sem fala/
rede/serviço indisponível, cancelamento no segundo toque e ao sair do app, limite
de 30 segundos. Texto transcrito é revisado antes de enviar. Sem gravação de
arquivo pelo app, microfone contínuo ou concessão indiscriminada à WebView.
A política Android foi ajustada para descrever o pedido de permissão.

Verificação: 62 testes Node Android, incluindo isolamento e validação das tarefas,
uso do bridge de voz e recuperação quando indisponível; regressão PostgreSQL,
parser de ativos, suíte Kotlin e compilação/assinatura em CI. Testes visuais usam
somente dados fictícios. Microfone, IME e execução autenticada de tarefas precisam
de validação física com uma conta de teste autorizada; nenhuma operação foi feita
em dados financeiros reais durante esta implementação.

Pacote br.com.copiloto.financeiro, versão 1.0.45/código 45. Teste interno sem compras.
