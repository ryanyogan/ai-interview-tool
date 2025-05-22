import { Hono } from "hono";
import { BadRequestError } from "../errors";
import { requireAuth } from "../middleware/auth";
import {
  ApiContext,
  HonoCtx,
  InterviewInput,
  InterviewSkill,
  InterviewTitle,
} from "../types";

function getInterviewDO(ctx: HonoCtx) {
  const username = ctx.get("username");
  const id = ctx.env.INTERVIEW.idFromName(username);
  return ctx.env.INTERVIEW.get(id);
}

function validateInterviewInput(input: InterviewInput) {
  if (
    !input.title ||
    !input.skills ||
    !Array.isArray(input.skills) ||
    input.skills.length === 0
  ) {
    throw new BadRequestError("Invalid input");
  }
}

async function getAllInterviews(ctx: HonoCtx) {
  const interviewDO = getInterviewDO(ctx);
  const interviews = await interviewDO.getAllInterviews();
  return ctx.json(interviews);
}

async function createInterview(ctx: HonoCtx) {
  const body = await ctx.req.json<InterviewInput>();
  validateInterviewInput(body);

  const interviewDO = getInterviewDO(ctx);
  const interviewId = await interviewDO.createInterview(
    body.title as InterviewTitle,
    body.skills as InterviewSkill[]
  );

  return ctx.json({ success: true, interviewId });
}

async function streamInterviewProcess(ctx: HonoCtx) {
  const interviewDO = getInterviewDO(ctx);
  return await interviewDO.fetch(ctx.req.raw);
}

export function configureInterviewRoutes() {
  const router = new Hono<ApiContext>();
  router.use("*", requireAuth);
  router.get("/", getAllInterviews);
  router.post("/", createInterview);
  router.get("/:interviewId", streamInterviewProcess);
  return router;
}
