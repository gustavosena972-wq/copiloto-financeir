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
