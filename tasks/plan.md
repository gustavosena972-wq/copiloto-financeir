# Evolução Android do Copiloto Financeiro

Aprovado pelo usuário em 08/11/2026: todas as melhorias do relatório em etapas.
Escopo: android-app, infraestrutura do app, testes e distribuição interna.
Web pública, CMS, Cloudflare e copiloto-financeiro-vitrine fora do escopo.

## Base e decisões
- Main auditada: 1.0.39; o relatório cita 1.0.33 e PR73 aberto, já superados.
- PR86 prepara 1.0.40, corrige scripts inválidos e pipeline. 90 testes e build passaram.
- Personagem com aparência 3D renderizada e animação leve; modelo 3D interativo não comprovado.
- Mesma identidade nos estágios Pro (lenço), Max (colete), Ultra (paletó/óculos).
- Cálculos determinísticos em centavos; separar caixa realizado de projeção e competência.
- Dados financeiros do backend sob RLS são autoridade; contexto enviado pelo cliente não é prova.
- Memória pessoal corrigível/excluível, não treinamento contínuo do modelo.
- Conversas pessoais isoladas por usuário e família. Não usar cache como memória após exclusão.
- Proatividade em segundo plano por jobs do servidor, somente com adesão explícita e limite de frequência.
- Conhecimento externo com fontes, versão e revisão; sem enviar informações pessoais a buscadores.
- Dados financeiros nunca são alterados automaticamente por uma sugestão do assistente.
- Não habilitar cobrança para testadores internos.

## Referências de produto pesquisadas
- YNAB: metas e aporte necessário — https://www.ynab.com/features/goal-tracking
- Monarch: explicação de fluxo — https://help.monarch.com/hc/en-us/articles/20504904768020-Cash-Flow
- Copilot Money: recorrências — https://help.copilot.money/en/articles/3760068-creating-recurrings

## Entregas e aceitação
O acompanhamento e os critérios detalhados estão em todo.md.
1. Inicialização e pacote reproduzível.
2. IA: resposta real, contexto financeiro confiável e privacidade.
3. Personagem 3D visual, planos, voz e memória no aplicativo.
4. Análises preventivas, precisão financeira e simulações.
5. Jobs de acompanhamento fora do app, notificações e controle do usuário.
6. Conhecimento revisado, observabilidade e segurança.
7. Compras, assinatura, teste interno e validação física.

## Limites de validação
Não declarar compra real, teste físico, entrega push, ativação de cron ou IA ponta a ponta
como concluídos sem evidência. Credenciais nunca vão para o chat, app ou repositório.
A proteção de senhas vazadas continua desabilitada no projeto, conforme advisor.
Não alterar visibilidade do repositório sem pedido explícito.
