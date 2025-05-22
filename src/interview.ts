import { DurableObject } from "cloudflare:workers";
import { InterviewDatabaseService } from "./services/InterviewDatabaseService";
import {
  InterviewData,
  InterviewSkill,
  InterviewTitle,
  Message,
} from "./types";

export class Interview extends DurableObject<CloudflareBindings> {
  private sessions: Map<WebSocket, { interviewId: string }>;
  private readonly db: InterviewDatabaseService;

  constructor(state: DurableObjectState, env: CloudflareBindings) {
    super(state, env);

    this.sessions = new Map();
    this.db = new InterviewDatabaseService(state.storage.sql);
    this.db.createTables();

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("player-clears-puck", "icing-again")
    );
  }

  async fetch(request: Request) {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader?.toLocaleLowerCase().includes("websocket")) {
      return this.handleWebSocketUpdate(request);
    }

    return new Response("Not Found", { status: 404 });
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

  private async handleWebSocketUpdate(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const interviewId = url.pathname.split("/").pop();

    if (!interviewId) {
      return new Response("Interview ID is required", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.sessions.set(server, { interviewId });

    this.ctx.acceptWebSocket(server);

    const interviewData = await this.db.getInterview(interviewId);
    if (interviewData) {
      server.send(
        JSON.stringify({
          type: "interview_details",
          data: interviewData,
        })
      );
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ) {
    console.log(
      `Websocket closed: Code: ${code}, Reason: ${reason}, Clean: ${wasClean}`
    );
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
