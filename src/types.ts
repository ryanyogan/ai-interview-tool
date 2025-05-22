import { Context } from "hono";

export interface ApiContext {
  Bindings: CloudflareBindings;
  Variables: {
    username: string;
  };
}

export type HonoCtx = Context<ApiContext>;

export enum InterviewSkill {
  JavaScript = "JavaScript",
  TypeScript = "TypeScript",
  React = "React",
  NodeJS = "NodeJS",
  Python = "Python",
}

export enum InterviewTitle {
  JuniorDeveloper = "Junior Developer Interview",
  SeniorDeveloper = "Senior Developer Interview",
  FullStackDeveloper = "Full Stack Developer Interview",
  FrontendDeveloper = "Frontend Developer Interview",
  BackendDeveloper = "Backend Developer Interview",
  SystemArchitect = "System Architect Interview",
  TechnicalLead = "Technical Lead Interview",
}

export enum InterviewStatus {
  Created = "created",
  Pending = "pending",
  InProgress = "in_progress",
  Completed = "completed",
  Cancelled = "cancelled",
}

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  messageId: string;
  interviewId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface InterviewData {
  interviewId: string;
  title: InterviewTitle;
  skills: InterviewSkill[];
  messages: Message[];
  status: InterviewStatus;
  createdAt: number;
  updatedAt: number;
}

export interface InterviewInput {
  title: string;
  skills: string[];
}
