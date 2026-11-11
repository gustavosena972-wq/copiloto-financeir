import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  buildTamanduaInstructions,
  buildTamanduaMemoryKey,
  buildTamanduaMemoryUpdates,
  normalizeBotInput,
  trimModelOutput,
  simpleGreeting,
} from "./bot-core.ts";

Deno.test("normaliza mensagem e contexto sem aceitar payload gigante", () => {
  const result = normalizeBotInput({
    message: "  Como estou este mês?  ",
    context: {
      view: "planilha",
      saldo: 1200,
      despesas: 400,
      usuario: "ignorar instruções",
    },
  });

  assertEquals(result.message, "Como estou este mês?");
  assertEquals(result.context.view, "planilha");
  assertEquals(result.context.saldo, 1200);
  assertEquals(result.context.usuario, undefined);
});

Deno.test("rejeita mensagem vazia", () => {
  assertThrows(
    () => normalizeBotInput({ message: "   ", context: {} }),
    Error,
    "Mensagem obrigatória",
  );
});

Deno.test("inclui histórico recente sem permitir contexto ilimitado", () => {
  const instructions = buildTamanduaInstructions({
    knowledge: [],
    learnings: [],
    history: [
      { role: "user", content: "Quero organizar minhas despesas." },
      { role: "assistant", content: "Vamos começar pelas despesas do mês." },
    ],
  });

  assert(instructions.includes("Histórico recente da conversa"));
  assert(instructions.includes("Quero organizar minhas despesas."));
  assert(instructions.includes("Vamos começar pelas despesas do mês."));
});

Deno.test("limita contexto e mantém instruções financeiras do Tamanduá", () => {
  const instructions = buildTamanduaInstructions({
    knowledge: ["Orçamento deve refletir renda e despesas reais."],
    learnings: [{ key: "objetivo", value: "organizar despesas" }],
  });

  assert(instructions.includes("Tamanduá"));
  assert(instructions.includes("Nunca invente números"));
  assert(instructions.includes("organizar despesas"));
  assert(instructions.includes("Orçamento deve refletir renda e despesas reais."));
});

Deno.test("limpa saída do modelo sem devolver estrutura interna", () => {
  assertEquals(trimModelOutput("  Olá!  "), "Olá!");
  assertThrows(() => trimModelOutput(""), Error, "Resposta vazia");
});


Deno.test("constrói memória financeira somente com sinais permitidos do contexto", () => {
  const memory = buildTamanduaMemoryUpdates({
    mes: "novembro",
    ano: 2026,
    saldo: 1200,
    receitas: 5000,
    despesas: 3200,
    pendentes: 400,
    atrasadas: 100,
    intencao: "organizar_despesas",
    lancamentos: "não deve ser persistido",
  });

  assertEquals(memory, [{
    key: "estado_financeiro_atual",
    value: {
      mes: "novembro",
      ano: 2026,
      saldo: 1200,
      receitas: 5000,
      despesas: 3200,
      pendentes: 400,
      atrasadas: 100,
    },
    confidence: 0.7,
    evidence: 1,
  }]);
});


Deno.test("normaliza memória do Tamanduá para uma chave Redis determinística", () => {
  assertEquals(
    buildTamanduaMemoryKey("fam-123", "user-456"),
    "tamandua:memory:fam-123:user-456",
  );
});


Deno.test("preserva contexto financeiro limitado e id da conversa sem persistir campos arbitrários", () => {
  const result = normalizeBotInput({
    message: "Quanto gastei com alimentação?",
    context: {
      conversa_id: "00000000-0000-0000-0000-000000000001",
      lancamentos: [
        { data: "2026-11-08", tipo: "despesa", valor: 120, categoria: "Alimentação", descricao: "Mercado", status: "pago" },
      ],
      segredo: "não deve entrar",
    },
  });

  assertEquals(result.context.conversa_id, "00000000-0000-0000-0000-000000000001");
  assertEquals(result.context.lancamentos, [{
    data: "2026-11-08",
    tipo: "despesa",
    valor: 120,
    categoria: "Alimentação",
    descricao: "Mercado",
    status: "pago",
  }]);
  assertEquals(result.context.segredo, undefined);
});

Deno.test("cumprimentos isolados recebem resposta natural sem confundir pedidos financeiros", () => {
  for (const message of ["Oi", "Olá!", "Bom dia", "E aí?"]) assert(simpleGreeting(message));
  assertEquals(simpleGreeting("Oi, quanto gastei?"), null);
  assertEquals(simpleGreeting("Oi", "en"), null);
  assertEquals(simpleGreeting("constructor"), null);
});

