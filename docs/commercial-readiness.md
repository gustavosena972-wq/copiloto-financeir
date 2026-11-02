# Preparação comercial — Copiloto Financeiro

## Situação atual conhecida
- Acesso apresentado por pagamento Pix com conferência manual.
- A liberação é feita por administrador via função de aprovação; não há confirmação automática por webhook bancário.
- A proteção Supabase contra senhas vazadas exige plano Pro ou superior e está indisponível no plano atual.
- O projeto usa Supabase Auth e exige confirmação de e-mail conforme a configuração atual.
- A política de privacidade e os termos exibidos no app precisam de revisão jurídica e operacional antes de cobrar clientes.

## Antes de aceitar clientes pagantes
- [ ] Definir claramente preço, período de acesso, renovação, cancelamento e reembolso.
- [ ] Informar que o Pix é conferido manualmente e qual o prazo de liberação.
- [ ] Configurar chave Pix, nome do recebedor e contato de suporte reais; conferir com pagamento de teste.
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
Só iniciar cobrança pública depois de concluir os testes críticos, revisar os textos legais, testar recuperação de backup e documentar o processo manual de pagamentos.
