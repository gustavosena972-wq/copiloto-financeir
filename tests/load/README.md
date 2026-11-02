# Teste de carga do Copiloto Financeiro

Este teste mede a capacidade de leitura da API Supabase sob concorrência. Ele **não cria, altera ou apaga dados**. Use uma conta de teste e uma família de teste; nunca coloque tokens ou chaves no repositório.

## Requisitos
- k6 instalado: https://grafana.com/docs/k6/latest/set-up/install-k6/
- URL do projeto Supabase
- chave publishable/anon
- access token JWT de um usuário autenticado que pertença à família de teste
- UUID da família de teste

## Execução (PowerShell)
```powershell
$env:SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:SUPABASE_ANON_KEY="SUA_CHAVE_PUBLICA"
$env:SUPABASE_ACCESS_TOKEN="JWT_DA_CONTA_DE_TESTE"
$env:FAMILY_ID="UUID_DA_FAMILIA_DE_TESTE"
$env:PEAK_VUS="10"
k6 run tests/load/read-api.js
```

## Etapas graduais
Comece com 5–10 usuários virtuais. Depois repita com 25, 50, 100 e 200, aumentando somente se a etapa anterior estiver estável. Para cada rodada, registre VUs, duração, taxa de erro, p95/p99, throughput e consumo/limites do Supabase. Não salte diretamente para centenas de usuários.

Para personalizar duração:
```powershell
$env:RAMP_UP="2m"; $env:HOLD="5m"; $env:RAMP_DOWN="2m"
```

## Critérios iniciais
- erros HTTP abaixo de 1%;
- p95 abaixo de 1,5 s e p99 abaixo de 3 s;
- nenhuma resposta contendo dados de outra família;
- sem saturação de conexões, CPU, I/O ou limites de API.

Os limites são metas iniciais de engenharia, não garantia de capacidade. A carga deve ser aplicada em janela controlada e acompanhada no painel Supabase. Um único token representa uma sessão concorrente replicada, não usuários independentes; para teste de isolamento real, use tokens de duas famílias e confirme que cada token só enxerga os próprios registros.

## Limitações
Este script testa leituras RLS de `meses` e `lancamentos`. Não mede cadastro, escrita, upload, funções Edge, IA, nem a experiência completa do navegador. Não rode contra produção sem autorização e sem observar os limites do projeto.
