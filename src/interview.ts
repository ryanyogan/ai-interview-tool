import { DurableObject } from "cloudflare:workers";
import { InterviewDatabaseService } from "./services/InterviewDatabaseService";
import {
  InterviewData,
  InterviewSkill,
  InterviewTitle,
  Message,
} from "./types";

export class Interview extends DurableObject<CloudflareBindings> {
  private session: Map<WebSocket, { interviewId: string }>;
  private readonly db: InterviewDatabaseService;

  constructor(state: DurableObjectState, env: CloudflareBindings) {
    super(state, env);

    this.session = new Map();
    this.db = new InterviewDatabaseService(state.storage.sql);
    this.db.createTables();
  }

  async fetch(request: Request) {
    return new Response("Interview object working");
  }

  createInterview(title: InterviewTitle, skills: InterviewSkill[]): string {
    return this.db.createInterview(title, skills);
  }

  getAllInterviews(): InterviewData[] {
    return this.db.getAllInterviews();
  }

  addMessage(
    interviewId: string,
    role: "user" | "assistant",
    content: string,
    messageId: string
  ): Message {
    const newMessage = this.db.addMessage(
      interviewId,
      role,
      content,
      messageId
    );

    this.broadcast(
      JSON.stringify({
        ...newMessage,
        type: "message",
      })
    );

    return newMessage;
  }

  private broadcast(message: string) {
    this.ctx.getWebSockets().forEach((ws) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      } catch (error) {
        console.error("Error sending message to WebSocket:", error);
      }
    });
  }
}
