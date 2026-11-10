# Copiloto Financeiro Android — revisão de integração e experiência

Escopo: Android, contexto financeiro, memória, isolamento, planos e arquivos. Não altera web pública, Workers, CMS, preços ou cobrança do teste interno. Revisão estática do inventário de 105 arquivos fonte, inspeção dos fluxos centrais, contratos presentes no banco, testes e leitura da função publicada. Isso não equivale a prova manual de todas as linhas nem a teste autenticado de ponta a ponta em aparelho físico.

## Bancos e código publicado

O projeto Supabase `familiar` está ativo. O aplicativo Android aponta para ele. O projeto separado `ANT-LIFE-DATABASE` está inativo e a consulta às suas tabelas não foi possível; não foi reativado nem houve cópia de registros. O fluxo atual não usa dois bancos independentes: finanças, conversas, mensagens, preferências e memória pessoal estão no banco ativo, separadas em tabelas e protegidas por RLS.

Foram conferidos 25 nomes de tabelas/views e 29 nomes de RPCs usados pelo runtime Android: nenhum ausente no banco ativo. A verificação de nomes não comprova todas as assinaturas, todos os dados nem todas as combinações de permissões.

`tamandua-bot` está ACTIVE, versão 7, com verificação JWT. Os dois arquivos publicados correspondem ao código revisado no PR #87, desconsiderando apenas o final de linha. O bot valida o usuário no servidor, resolve o vínculo de família e consulta `tamandua_contexto_financeiro`; não confia em identificadores familiares nem em totais financeiros fornecidos pelo cliente. A RPC usa security invoker. Memória e conversas exigem usuário e família; mensagens dependem do dono da conversa. As quatro tabelas privadas têm RLS. A memória usa unicidade `(familia_id,usuario_id,chave)` e preferências têm chave `(usuario_id,familia_id)`.

O PR #87 contém o backend já publicado. Ele precisa ser revisado e incorporado junto aos pré-requisitos de release; a linha antiga do repositório não deve substituir acidentalmente a função v7 num deploy posterior. Esta etapa não republicou nem modificou o backend.

## Inteligência, memória e autonomia

O Tamanduá usa contexto financeiro atualizado em cada pergunta, histórico da própria conversa e até as preferências pessoais salvas. A configuração grava um perfil explícito do usuário. Isso é personalização; não há treinamento automático do modelo, pesquisa contínua ou evolução ilimitada fora do aplicativo. O código não transforma conversas de uma família em memória de outra.

Os lembretes opcionais de vencimentos continuam locais e limitados; não representam uma IA em execução contínua. Não foi implementado pagamento autônomo. A base de conhecimento é curada e o modelo depende do fornecedor/configuração do servidor.

## Entrada e presença no produto

A apresentação/configuração é disparada após autenticação e entrada no workspace autorizado, antes de interagir com o produto, por um dialog modal. É opcional e possui Pular. O estado de conclusão é por usuário/família. Trocar identidade fecha o diálogo e não marca o perfil anterior como concluído. Quem já concluiu não recebe a apresentação a cada abertura. A prévia possui um caminho específico de configuração com identidade fictícia nova.

Tamanduá é um destino próprio, disponível pela navegação do aplicativo. Foi adicionado acesso Meu Tamanduá ao cabeçalho das áreas do workspace. O servidor consulta o mês selecionado e também metas, dívidas, patrimônio e vencimentos autorizados; isso não significa que o bot possa executar todas as ações dessas áreas. Login, contratação e páginas públicas não recebem contexto privado antes da autorização.

## Alterações desta etapa

- Ultra passa a declarar todos os recursos básicos de Pro e Max, além dos avançados; a apresentação explicita essa inclusão. Valores e capacidades anteriores são preservados. Três testes cobrem herança, limites e comunicação.
- Ferramentas da planilha abrem em gaveta lateral: arquivos, rotina do mês e ações avançadas. Os botões originais e suas permissões são preservados, assim como o seletor nativo. Não há ação financeira executada pela abertura do menu.
- Chat em cacau/creme refinado, texto mais legível, menos controles redundantes e rosto renderizado do próprio personagem no ditado. A voz continua sendo uma ação explícita com revisão antes de enviar.
- Modelo 3D refinado com postura, mangas, lapelas, costuras e óculos; enquadramento e luz do viewer ajustados. Um novo rosto PNG de 1024 px é renderizado da mesma cena. UVs das lapelas e golas foram corrigidos antes da validação GLB. O recurso mantém alternativa de imagem e controles por arraste/setas.

## Evidências e limites

50 testes Node de Android/interface/cálculos/sessão/planos; 12 testes de parsing e contexto do bot; 10 testes PostgreSQL/PGlite de isolamento entre famílias e usuários. A função publicada foi comparada ao PR revisado. O modelo GLB final não possui erros nem avisos no validador glTF. A suíte Kotlin e as assinaturas são conferidas pelo workflow da versão 1.0.42.

Na revisão de navegação foi corrigida uma referência antiga do botão Áreas no chat após reconstruir o workspace. O botão agora resolve a gaveta da tela atual; dois testes cobrem a reconstrução e a impossibilidade de abrir um menu antigo após sair da conta.

Persistem dois avisos anteriores do Supabase: proteção contra senhas vazadas desativada e tabela privada com RLS sem políticas (sem acesso liberado por isso). Nenhuma proteção foi reduzida. A ativação de proteção de senhas e as políticas operacionais de retenção exigem revisão da configuração de operação.

Ainda faltam autenticação real e chamada autenticada ao modelo com uma conta de teste, teclado/TalkBack, seletor de arquivos, voz, GPU e entrega dos lembretes sob restrições de bateria em aparelho físico. Não foram lidos lançamentos ou mensagens reais para montar a prévia. Não há garantia de ausência total de falhas. A política pública segue com a equipe da web e precisa receber o texto já incluído no Android antes de publicação pública.

Na conferência das áreas foi corrigido um rótulo ausente em Categorias e grupos. A navegação para o chat é imediata para evitar que uma transição de captura do workspace remova a gaveta aberta em seguida. Conferência final realizada em 10/11/2026.
