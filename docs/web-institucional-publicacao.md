# Web institucional: código e publicação

Auditoria de 8 de novembro de 2026, no repositório principal `copiloto-financeir`.
Nenhuma alteração no repositório separado da vitrine e nenhum CMS.

## Evidência observada antes da correção

O endereço `https://copiloto-financeir.gustavosena972.workers.dev/` respondeu HTTP 200.
O conteúdo da raiz coincide pelo hash Git do blob com `index.html`:
`eed9648cd3fe61a1b1fc700b1a8fa31ed247a732`.
A página apresenta o produto, recursos, planos Pro/Max/Ultra, privacidade e links
Google Play para `br.com.copiloto.financeiro`, sem formulário ou JavaScript.
Os preços exibidos são R$23,90/R$35,90/R$59,90 por 30 dias; a cobrança final
depende da loja. O link correto não comprova disponibilidade pública da ficha.

As páginas de privacidade, termos e exclusão também responderam 200 com os
mesmos blobs de main. Porém, as rotas abaixo igualmente responderam 200:
- `/admin.html`: formulário de acesso; blob `11eaf519d50ec277b4dc9817b71ef5ec1ae604d5`.
- `/demo.html`: aplicação demonstrativa; blob `1eff593537eaa37c9ae21c237c711563569e36da`.
- `/android-app/app/src/main/assets/mobile.html`: aplicativo; blob `76f20ace62c2611747d38f51afa2e6db1b8d2b03`.

Logo, a entrada é institucional, mas a publicação completa ainda oferece páginas
fora desse escopo. A comparação de bytes não identifica o deployment ID nem
prova qual commit inteiro foi publicado no Cloudflare.

## Pacote corrigido

Execute:
```sh
python3 tests/web_showcase_test.py
python3 scripts/build_web_showcase.py
```

Publique somente `_site/`, que contém os quatro HTML institucionais.
O build recria essa pasta para impedir resíduos de publicações anteriores.
O workflow de GitHub Pages passa a usar esse pacote, corrigindo também o
nome do arquivo de exclusão no filtro de alterações.
Os testes verificam isolamento do pacote, remoção de resíduos, navegação,
âncoras, destino Google Play e ausência de formulários/scripts nas páginas.

## Cloudflare Workers: ação operacional pendente

Não há configuração ou workflow Cloudflare na main auditada. Este PR não
altera o deployment em produção. No pipeline do Worker existente, configure
o comando de build acima e o diretório de assets `_site`, nunca a raiz.
Revise também qualquer handler/roteamento do Worker que ainda entregue arquivos
antigos. Não configure fallback SPA para páginas administrativas.
Após o deploy, confirme as quatro páginas públicas e que admin, demo e o caminho
do mobile retornam 404, sem conteúdo de login/cadastro ou do aplicativo.
Registre o deployment ID e o SHA efetivamente publicado.

## Limites e pendências de conteúdo

A política publicada declara IA desativada, mas main contém uma implementação
de bot; confirme seu estado operacional e os fornecedores reais antes de
atualizar política/termos. Este PR não presume que código existente esteja ativo.
Os testes Android/backend não comprovam isolamento da publicação web.
A visibilidade e as permissões do repositório não foram alteradas.
