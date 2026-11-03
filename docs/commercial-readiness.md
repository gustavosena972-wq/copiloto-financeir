# Preparação comercial — Copiloto Financeiro

## Situação atual conhecida
- Acesso apresentado por pagamento Pix com conferência manual, como decisão operacional do produto.
- Uma pessoa responsável pelo atendimento confere o recebimento e aceita ou recusa a solicitação; a liberação é registrada no painel administrativo pela função de aprovação. Não há confirmação automática por webhook bancário, e isso não é requisito do fluxo definido.
- A proteção Supabase contra senhas vazadas exige plano Pro ou superior e está indisponível no plano atual.
- O cadastro atual usa nome de usuário e senha via Edge Function; não depende de confirmação de e-mail. A recuperação é feita por código exibido no cadastro e guardado pelo usuário, não por link enviado por e-mail.
- A política de privacidade e os termos exibidos no app precisam de revisão jurídica e operacional antes de cobrar clientes.

## Antes de aceitar clientes pagantes
- [ ] Definir claramente preço, período de acesso, renovação, cancelamento e reembolso.
- [ ] Definir a escala/canal do atendimento responsável por conferir o Pix e aprovar ou recusar solicitações, incluindo prazo de liberação.
- [ ] Configurar chave Pix, nome do recebedor e contato de suporte reais; validar o procedimento de conferência manual.
- [ ] Publicar Termos de Uso e Política de Privacidade completos, com identificação do controlador, finalidade, base legal, retenção, direitos do titular e canal de contato.
- [ ] Definir procedimento para solicitação de acesso, correção, exportação e exclusão de dados.
- [ ] Definir rotina de backup, restauração e resposta a incidentes.
- [ ] Fazer testes de isolamento de dados entre famílias e permissões leitor/editor/administrador.
- [ ] Fazer testes completos de cadastro, confirmação de e-mail, login, pagamento, aprovação, expiração e renovação.
- [ ] Definir canal de suporte e prazo de resposta.
- [ ] Verificar custos e limites do Supabase, hospedagem e serviços externos.
- [ ] Revisar obrigações legais aplicáveis, inclusive LGPD e regras de consumo, com profissional qualificado.

## Não anunciar como pronto ainda
Não prometer integração bancária, confirmação automática de Pix, segurança absoluta, disponibilidade garantida, suporte 24h ou capacidade para centenas de usuários sem testes e infraestrutura que comprovem isso.

## Go/no-go
Só iniciar cobrança pública depois de concluir os testes críticos aplicáveis, revisar os textos legais, testar recuperação de backup e documentar o processo de atendimento e conferência manual do Pix.

## Estado observado em 03/11/2026

- A página de entrada e a imagem completa foram publicadas no GitHub Pages. A imagem está marcada como conceitual e identifica explicitamente IA, suporte VIP e análise preditiva como elementos ilustrativos.
- A sintaxe do JavaScript principal foi validada estaticamente. Não foi feito teste ponta a ponta em navegador, nem teste visual real em desktop e mobile.
- Cada conta fica vinculada a uma única família; não anunciar alternância entre famílias como recurso do Ultra.
- O plano Ultra não apresenta limite de membros definido no código; não anunciar quantidade ilimitada sem definir e testar essa regra.
- Os Termos indicam idade mínima de 18 anos, mas o cadastro atual não confirma idade. Antes de cobrar clientes, definir um operador adulto responsável por contratos, recebimentos, suporte e dados pessoais; revisar a estrutura com profissional qualificado.
- O Pix é manual por decisão operacional: a pessoa responsável pelo atendimento confere o recebimento e autoriza ou recusa a entrada do cliente; a aprovação é registrada no painel administrativo. A ausência de webhook ou liberação automática é intencional no fluxo definido.
- O Supabase mantém RLS nas tabelas públicas. As tabelas privadas de mapeamento de usuário e recuperação não têm políticas RLS; a auditoria de privilégios confirmou que não concedem acesso direto a `anon` ou `authenticated`, sendo usadas pelo serviço de autenticação. A proteção contra senhas vazadas continua desativada no plano atual.
- Não foram comprovados teste de restauração de backup, teste de carga, isolamento entre contas em navegador real, processamento Pix real, ou revisão jurídica dos Termos e da Política.

**Situação:** publicado para demonstração e testes controlados; não declarar pronto para cobrança pública até fechar os itens críticos acima.
