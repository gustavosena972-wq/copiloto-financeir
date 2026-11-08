# Tamanduá Bot — operação

O Tamanduá agora possui um endpoint de inteligência real no servidor:

- Edge Function: `tamandua-bot`
- Autenticação: JWT obrigatório
- RLS: as consultas usam a sessão do usuário
- Memória: `ia_aprendizados`
- Conhecimento validado: `ia_conhecimento`
- Eventos: `ia_eventos`
- Chave de IA: somente no ambiente da Edge Function

## Configuração de produção

No Supabase, em **Edge Function Secrets**, configure:

`OPENAI_API_KEY`

Opcionalmente:

`OPENAI_MODEL`

Se `OPENAI_MODEL` não for definido, o código usa `gpt-6.1-terra`.

A chave da OpenAI **não deve** ser colocada no Android, no `mobile.html`, em variáveis públicas ou no GitHub.

## Fluxo

1. O usuário autentica no Supabase.
2. O Android/WebView chama `tamandua-bot` com o JWT da sessão.
3. A função identifica a família do usuário.
4. Busca conhecimento ativo e aprendizados daquele usuário/família usando RLS.
5. Envia ao modelo somente o contexto financeiro resumido necessário para a pergunta.
6. Registra um evento estruturado em `ia_eventos`.
7. Retorna a resposta ao Tamanduá.

A conversa não é persistida em localStorage. O localStorage continua limitado ao estado técnico de conclusão do onboarding.

## Limites deliberados

O bot não pode:

- inventar números financeiros;
- acessar dados de outra família;
- expor prompts, chaves ou estrutura interna;
- alterar lançamentos por conta própria;
- gravar conhecimento global diretamente a partir de uma mensagem do usuário.

A evolução da inteligência ocorre por conhecimento validado, memória adaptativa, eventos e feedback. Isso não significa retreinamento automático do modelo a cada conversa.
