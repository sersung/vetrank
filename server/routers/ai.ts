import { TRPCError } from "@trpc/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getQuestionById } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI service not configured" });
  return new Anthropic({ apiKey });
}

export const aiRouter = router({
  explainAnswer: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        selectedOption: z.string(),
        language: z.enum(["pt", "en"]).default("pt"),
      })
    )
    .mutation(async ({ input }) => {
      const question = await getQuestionById(input.questionId);
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });

      const client = getAnthropicClient();
      const options = question.options as Array<{ id: string; textPt: string; textEn?: string }>;
      const questionText = input.language === "pt" ? question.textPt : (question.textEn || question.textPt);
      const optionsText = options.map((o) => `${o.id}) ${input.language === "pt" ? o.textPt : (o.textEn || o.textPt)}`).join("\n");
      const selectedText = options.find((o) => o.id === input.selectedOption);
      const correctText = options.find((o) => o.id === question.correctOption);

      const systemPrompt = input.language === "pt"
        ? "Você é um professor especialista em medicina veterinária. Explique de forma clara, didática e detalhada por que a resposta correta está certa e por que a resposta selecionada (se incorreta) está errada. Use linguagem técnica mas acessível."
        : "You are an expert veterinary medicine professor. Explain clearly and in detail why the correct answer is right and why the selected answer (if incorrect) is wrong. Use technical but accessible language.";

      const userPrompt = input.language === "pt"
        ? `Questão: ${questionText}\n\nOpções:\n${optionsText}\n\nResposta selecionada: ${input.selectedOption}) ${selectedText?.textPt}\nResposta correta: ${question.correctOption}) ${correctText?.textPt}\n\nExplique detalhadamente.`
        : `Question: ${questionText}\n\nOptions:\n${optionsText}\n\nSelected answer: ${input.selectedOption}) ${selectedText?.textEn || selectedText?.textPt}\nCorrect answer: ${question.correctOption}) ${correctText?.textEn || correctText?.textPt}\n\nExplain in detail.`;

      const message = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      });

      const content = message.content[0];
      const explanation = content && content.type === "text" ? content.text : "";

      return { explanation };
    }),

  generateQuestion: protectedProcedure
    .input(
      z.object({
        disciplineId: z.number(),
        disciplineName: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        topic: z.string().optional(),
        language: z.enum(["pt", "en"]).default("pt"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const client = getAnthropicClient();

      const prompt = `Generate a multiple-choice veterinary medicine question about ${input.disciplineName}${input.topic ? ` specifically about ${input.topic}` : ""}. 
Difficulty: ${input.difficulty}.
Language: ${input.language === "pt" ? "Brazilian Portuguese" : "English"}.

Return ONLY valid JSON in this exact format:
{
  "textPt": "question text in Portuguese",
  "textEn": "question text in English",
  "options": [
    {"id": "A", "textPt": "option A in Portuguese", "textEn": "option A in English"},
    {"id": "B", "textPt": "option B in Portuguese", "textEn": "option B in English"},
    {"id": "C", "textPt": "option C in Portuguese", "textEn": "option C in English"},
    {"id": "D", "textPt": "option D in Portuguese", "textEn": "option D in English"}
  ],
  "correctOption": "A",
  "explanationPt": "detailed explanation in Portuguese",
  "explanationEn": "detailed explanation in English"
}`;

      const message = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
        system: "You are an expert veterinary medicine professor creating exam questions. Always respond with valid JSON only, no markdown.",
      });

      const content = message.content[0];
      if (!content || content.type !== "text") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      try {
        const generated = JSON.parse(content.text);
        return { question: { ...generated, disciplineId: input.disciplineId, difficulty: input.difficulty } };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
      }
    }),
});
