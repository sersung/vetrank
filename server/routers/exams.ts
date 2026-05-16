import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  completeExam,
  createExam,
  getExamAnswers,
  getExamById,
  getQuestionById,
  getRandomQuestions,
  getUserExams,
  submitExamAnswer,
  updateLoginStreak,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const examsRouter = router({
  start: protectedProcedure
    .input(
      z.object({
        disciplineId: z.number().optional(),
        disciplineIds: z.array(z.number()).optional(),
        subjectId: z.number().optional(),
        author: z.string().optional(),
        year: z.number().optional(),
        difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
        questionCount: z.number().min(5).max(100).default(20),
        timeLimitMinutes: z.number().min(5).max(180).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const questions = await getRandomQuestions({
        disciplineId: input.disciplineId,
        disciplineIds: input.disciplineIds,
        subjectId: input.subjectId,
        author: input.author,
        year: input.year,
        difficulty: input.difficulty,
        count: input.questionCount,
      });

      if (questions.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "No questions found for the selected filters" });

      const timeLimitSeconds = input.timeLimitMinutes ? input.timeLimitMinutes * 60 : undefined;
      const examId = await createExam({
        userId: ctx.user.id,
        disciplineId: input.disciplineId,
        difficulty: input.difficulty,
        questionCount: input.questionCount,
        timeLimitSeconds,
        questionIds: questions.map((q) => q.id),
      });

      // Update login streak
      await updateLoginStreak(ctx.user.id);

      // Strip answer key — client must not receive correctOption before completing the exam
      const questionsForClient = questions.map(({ correctOption, explanationPt, explanationEn, ...rest }) => rest);
      return { examId, questions: questionsForClient };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const exam = await getExamById(input.id);
      if (!exam) throw new TRPCError({ code: "NOT_FOUND" });
      if (exam.userId !== ctx.user.id && ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN" });

      const questionIds = exam.questionIds as number[];
      const questions = await Promise.all(questionIds.map((id) => getQuestionById(id)));
      const answers = await getExamAnswers(input.id);

      return { exam, questions: questions.filter(Boolean), answers };
    }),

  submitAnswer: protectedProcedure
    .input(
      z.object({
        examId: z.number(),
        questionId: z.number(),
        selectedOption: z.string(),
        timeSpentSeconds: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const exam = await getExamById(input.examId);
      if (!exam) throw new TRPCError({ code: "NOT_FOUND" });
      if (exam.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (exam.status !== "in_progress") throw new TRPCError({ code: "BAD_REQUEST", message: "Exam already completed" });

      const question = await getQuestionById(input.questionId);
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });

      const isCorrect = question.correctOption === input.selectedOption;
      await submitExamAnswer({
        examId: input.examId,
        questionId: input.questionId,
        selectedOption: input.selectedOption,
        isCorrect,
        timeSpentSeconds: input.timeSpentSeconds,
      });

      return { isCorrect, correctOption: question.correctOption };
    }),

  complete: protectedProcedure
    .input(z.object({ examId: z.number(), timeSpentSeconds: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const exam = await getExamById(input.examId);
      if (!exam) throw new TRPCError({ code: "NOT_FOUND" });
      if (exam.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (exam.status !== "in_progress") throw new TRPCError({ code: "BAD_REQUEST", message: "Exam already completed" });

      const result = await completeExam(input.examId, ctx.user.id, input.timeSpentSeconds);
      return result;
    }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return getUserExams(ctx.user.id, input.limit);
    }),

  myHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return getUserExams(ctx.user.id, input.limit);
    }),

  results: protectedProcedure
    .input(z.object({ examId: z.number() }))
    .query(async ({ input, ctx }) => {
      const exam = await getExamById(input.examId);
      if (!exam) throw new TRPCError({ code: "NOT_FOUND" });
      if (exam.userId !== ctx.user.id && ctx.user.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN" });

      const questionIds = exam.questionIds as number[];
      const [questions, answers] = await Promise.all([
        Promise.all(questionIds.map((id) => getQuestionById(id))),
        getExamAnswers(input.examId),
      ]);

      return { exam, questions: questions.filter(Boolean), answers };
    }),
});
