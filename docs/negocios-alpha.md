# Android 1.0.53 e piloto Negócios

O cadastro oferece uso individual, em família ou de negócio. O modo é salvo no servidor e só o responsável pode alterá-lo. Um espaço com lançamentos, dívidas, metas ou patrimônio não pode ser convertido entre uso doméstico e negócio. Cada conta mantém um vínculo de espaço por vez. Os membros do espaço podem consultar a configuração sob RLS.

No Android, **Mais → Negócio** reúne recebido, pago, a receber, a pagar, recebimentos com data vencida e categorias de custo do mês selecionado. O registro de venda ou serviço usa o formulário autenticado da Planilha. A baixa exige confirmação, permissão de edição e mês aberto.

A formação de preço considera materiais, tempo, custo da hora, custo fixo por venda, taxas e margem desejada. A projeção de 30 dias pede um saldo informado e busca vencimentos do próprio espaço, inclusive de outros meses. Dados inválidos ou mais de 500 vencimentos impedem o cálculo. A descrição mostra as premissas.

O preço proposto do plano Negócios é R$ 69,90 por passe de 30 dias. O produto futuro é `copiloto_negocios_30d`. Nesta entrega, o acesso empresarial é um piloto para testadores habilitados no servidor. A contratação depende da configuração comercial na Play e da validação de compras, restauração, expiração e estorno. O catálogo validado existente permanece com Pro, Max e Ultra.

O Tamanduá recebe o modo do servidor e adapta a orientação a pessoa, família ou pequeno negócio. Quando o modelo externo está indisponível, pedidos de análise podem usar um resumo calculado dos totais autorizados. O resumo identifica pendências, diferença de caixa no período, dados ausentes e a área correspondente do app. A memória continua vinculada a usuário e espaço.

## Validação

Testes cobrem cálculo de preço, separação de caixa e receitas pendentes, proprietário e leitor, acesso de outro espaço, acesso anônimo, edição direta da configuração e conversão de espaço com registros. A compilação assinada roda os testes Kotlin e as verificações do pacote.

Verificação manual após liberar o Alpha:

1. Criar uma conta de teste e escolher Individual. Registrar uma receita e uma conta e conferir o resumo.
2. Em outro cadastro de teste, escolher Em família e verificar convite de leitor e editor.
3. Num cadastro vazio dedicado ao negócio, escolher Negócio. Registrar um serviço pendente e um custo e conferir os indicadores.
4. Confirmar um recebimento, conferir que o valor sai de a receber e entra em recebido, e tentar repetir a baixa.
5. Simular material de R$ 10, 60 minutos a R$ 20/h, R$ 5 de fixos, 5% de taxas e 20% de margem. O preço calculado é R$ 46,67.
6. Usar vencimentos de dois meses na previsão de 30 dias e conferir saldo, menor ponto e datas.
7. Trocar sessão e tentar acessar registros do cadastro anterior. Leitor consulta sem conseguir baixar recebimento.
8. Conferir teclado, rolagem, fonte ampliada e TalkBack no aparelho.

## Fontes de produto consultadas

- [Conta Azul — gestão financeira](https://contaazul.com/funcionalidades/gestao-financeira/)
- [QuickBooks — visão geral dos agentes de IA](https://quickbooks.intuit.com/learn-support/en-us/help-article/accounting-bookkeeping/overview-agents-quickbooks-online/L9irCAtK4_US_en_US)
- [Bling — planos e preços](https://www.bling.com.br/planos-e-precos)

As referências orientam o escopo de contas, fluxo, tarefas revisadas e preço de serviço. Emissão fiscal, agenda, folha e estoque exigem módulos e integrações próprios antes de serem oferecidos aos clientes.


## Catálogo de serviços — Android 1.0.54

Em Negócio, o catálogo guarda nome, duração, materiais, custo da hora, parcela de custos fixos, taxas estimadas e margem desejada. O banco calcula o preço; a prévia local usa centavos inteiros para evitar arredondamento binário. O limite é de 200 serviços ativos por espaço, sem nomes ativos repetidos. Nome e valores podem ser editados por dono ou editor. Arquivar preserva os lançamentos antigos.

“Preparar lançamento” abre uma receita pendente na Planilha com nome e preço preenchidos. A pessoa confere vencimento, categoria e recebimento e só então salva. O catálogo não marca atendimentos, movimenta dinheiro ou cria vendas automaticamente. Um leitor apenas consulta. A base exige acesso de teste, modo Negócio e autorização no espaço em toda gravação, bloqueia alterações diretas na tabela e protege a consulta por RLS. Trocar a sessão limpa o catálogo carregado. Não é possível converter um espaço com serviços para uso doméstico.

Testes adicionais: cálculo no banco; precisão de centavos; edição e arquivamento; dados inválidos e nomes duplicados; leitura e gravação entre espaços; leitor; usuário sem acesso ao piloto; sessão anônima; preparação sem inserção automática. No aparelho, conferir o cadastro, teclado, foco, rolagem e receita preparada antes de salvar. Esses testes físicos continuam pendentes.

Referências: [Fresha — preços e duração no catálogo](https://www.fresha.com/help-center/knowledge-base/catalog/76-set-advanced-pricing-and-durations-) e [Trinks — comissão e precificação](https://sistema.trinks.com/academia/financeiro/comissao-e-precificacao). A implementação usa conceitos de organização de serviços e custos; não oferece todas as funções dessas plataformas.


## Gestão por áreas — Android 1.0.55

O negócio passa a ter seis áreas: Caixa, Movimentações, Vencimentos, Resultados, Planejamento e Serviços. A troca entre áreas preserva os campos ainda não enviados do formulário visível. Cadastro e alteração de lançamentos continuam na Planilha; a lista empresarial abre diretamente o registro escolhido, preservando as permissões do responsável, editor ou leitor.

- Movimentações: busca por descrição, filtro de tipo, categoria e situação, paginação de 25 registros e totais de todo o filtro.
- Vencimentos: recebíveis e contas a pagar, agrupados em a vencer, 1–7 dias, 8–30 dias, mais de 30 dias e sem data. A baixa de despesa exige confirmação e atualiza somente o lançamento autorizado do mês. Não executa pagamento bancário.
- Resultados: entradas e saídas realizadas, receitas e despesas registradas, composição dos custos por categoria, quantidade e média por lançamento de receita. Categorias são resolvidas a partir do cadastro autorizado. Não se presume que toda receita seja venda ou que a diferença seja lucro contábil.
- Revisão: falta de categoria, pendência sem vencimento, registros inválidos e possíveis duplicações por descrição, tipo, valor, vencimento e categoria. Nada é mesclado ou excluído automaticamente.
- Planejamento: cenário com custos fixos, faturamento previsto, percentuais estimados de custos variáveis e taxas, objetivo mensal e dias de trabalho. Calcula contribuição, faturamento para cobrir custos e buscar o objetivo, meta diária e diferença para o faturamento previsto. O cenário permanece somente na sessão e não altera lançamentos.
- Caixa: prioridades calculadas dos dados atuais, com ações para abrir a área correspondente. Aportes, empréstimos, retiradas e custos ausentes exigem revisão antes de interpretar os resultados.

Os relatórios carregam páginas de 500 lançamentos, limitadas por família e mês; não param silenciosamente na primeira página da API. Acima de 10 mil registros, a leitura falha com uma explicação e nenhum relatório parcial é apresentado. Consulta por várias páginas não equivale a um snapshot contábil: durante edição simultânea, atualize o mês antes de decisões ou fechamento. Filtros, cenário e área ativa são limpos na troca de sessão.

Exemplo testado: custos fixos de R$ 3.000; custos variáveis de 30%; taxas de 10%; objetivo de R$ 2.000 e 20 dias de trabalho. Contribuição estimada de 60%, cobertura dos fixos em R$ 5.000, faturamento-alvo de R$ 8.333,34 e meta diária de R$ 416,67. Com R$ 10.000 de faturamento previsto, o cenário apresenta R$ 3.000 após esses custos informados. Valores monetários usam centavos inteiros e metas são arredondadas para cima.

### Referências e limites

[Conta Azul](https://contaazul.com/funcionalidades/gestao-financeira/) e [Bling](https://www.bling.com.br/funcionalidades/gerenciador-financeiro) orientam a separação de contas, caixa e análise. O [planejador do QuickBooks](https://quickbooks.intuit.com/learn-support/en-us/help-article/budget-forecast-reports/use-cash-flow-planner-quickbooks-online/L2l59mIqe_US_en_US) orienta cenários separados dos registros reais. A fórmula de cobertura de custos segue o [material do Sebrae](https://sebrae.com.br/Sebrae/Portal%20Sebrae/UFs/MS/Anexos/2024/como_calcular_o_ponto_de_equilibrio.pdf).

Este incremento entrega gestão e simulação financeira. Conciliação bancária, estoque, integração fiscal, folha, agenda, CRM e DRE com classificação contábil ainda exigem módulos próprios e validação. Eles não são apresentados como disponíveis. A cobrança do plano Negócios continua pendente de catálogo e validação na Play; o Alpha permanece restrito a quem tem acesso ao piloto. O escopo não inclui alterações na web, ícone ou peças da loja.
