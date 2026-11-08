import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  buildTamanduaInstructions,
  normalizeBotInput,
  trimModelOutput,
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
