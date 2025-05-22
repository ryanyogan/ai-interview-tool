import { ErrorCodes, InterviewError } from "../errors";
import {
  InterviewData,
  InterviewSkill,
  InterviewStatus,
  InterviewTitle,
  Message,
} from "../types";

const CONFIG = {
  database: {
    tables: {
      interviews: "interviews",
      messages: "messages",
    },
    indexes: {
      messagesByInterview: "idx_messages_interviewId",
    },
  },
} as const;

export class InterviewDatabaseService {
  constructor(private sql: SqlStorage) {}

  createTables() {
    try {
      const cursor = this.sql.exec(`PRAGMA table_list`);
      const existingTables = new Set([...cursor].map((table) => table.name));

      if (!existingTables.has(CONFIG.database.tables.interviews)) {
        this.sql.exec(InterviewDatabaseService.QUERIES.CREATE_INTERVIEWS_TABLE);
      }

      if (!existingTables.has(CONFIG.database.tables.messages)) {
        this.sql.exec(InterviewDatabaseService.QUERIES.CREATE_MESSAGES_TABLE);
      }

      this.sql.exec(InterviewDatabaseService.QUERIES.CREATE_MESSAGES_INDEX);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new InterviewError(
        `Failed to create tables: ${message}`,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  createInterview(title: InterviewTitle, skills: InterviewSkill[]): string {
    try {
      const interviewId = crypto.randomUUID();
      const currentTime = Date.now();

      this.sql.exec(
        InterviewDatabaseService.QUERIES.INSERT_INTERVIEW,
        interviewId,
        title,
        JSON.stringify(skills),
        InterviewStatus.Created,
        currentTime,
        currentTime
      );

      return interviewId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      throw new InterviewError(
        `Failed to create interview: ${message}`,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  getAllInterviews(): InterviewData[] {
    try {
      const cursor = this.sql.exec(
        InterviewDatabaseService.QUERIES.GET_ALL_INTERVIEWS
      );

      return [...cursor].map(this.parseInterviewRecord);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new InterviewError(
        `Failed to get all interviews: ${message}`,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  getInterview(interviewId: string): InterviewData | null {
    try {
      const cursor = this.sql.exec(
        InterviewDatabaseService.QUERIES.GET_INTERVIEW,
        interviewId
      );

      const record = [...cursor][0];
      if (!record) return null;

      return this.parseInterviewRecord(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new InterviewError(
        `Failed to get interview: ${message}`,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  addMessage(
    interviewId: string,
    role: Message["role"],
    content: string,
    messageId: string
  ): Message {
    try {
      const timestamp = Date.now();

      this.sql.exec(
        InterviewDatabaseService.QUERIES.INSERT_MESSAGE,
        messageId,
        interviewId,
        role,
        content,
        timestamp
      );

      return {
        messageId,
        interviewId,
        role,
        content,
        timestamp,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new InterviewError(
        `Failed to add message: ${message}`,
        ErrorCodes.DATABASE_ERROR
      );
    }
  }

  private parseInterviewRecord(record: any): InterviewData {
    const interviewId = record.interviewId as string;
    const createdAt = Number(record.createdAt);
    const updatedAt = Number(record.updatedAt);

    if (!interviewId || !createdAt || !updatedAt) {
      throw new InterviewError(
        `Invalid interview data in database`,
        ErrorCodes.DATABASE_ERROR
      );
    }

    return {
      interviewId,
      title: record.title as InterviewTitle,
      skills: JSON.parse(record.skills) as InterviewSkill[],
      messages: record.messages
        ? JSON.parse(record.messages)
            .filter((message: any) => message !== null)
            .map((message: any) => ({
              messageId: message.messageId,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
            }))
        : [],
      status: record.status as InterviewStatus,
      createdAt,
      updatedAt,
    };
  }

  private static readonly QUERIES = {
    CREATE_INTERVIEWS_TABLE: `
      CREATE TABLE IF NOT EXISTS interviews (
        interviewId TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        skills TEXT NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        status TEXT NOT NULL DEFAULT 'pending'
     )
    `,

    CREATE_MESSAGES_TABLE: `
      CREATE TABLE IF NOT EXISTS messages (
        messageId TEXT PRIMARY KEY,
        interviewId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (interviewId) REFERENCES intervies(interviewId)
      )
    `,

    CREATE_MESSAGES_INDEX: `
      CREATE INDEX IF NOT EXISTS idx_messages_interviewId ON messages(interviewId)
    `,

    INSERT_INTERVIEW: `
      INSERT INTO ${CONFIG.database.tables.interviews}
      (interviewId, title, skills, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `,

    GET_ALL_INTERVIEWS: `
      SELECT interviewId, title, skills, status, createdAt, updatedAt
      FROM ${CONFIG.database.tables.interviews}
      ORDER BY createdAt DESC
    `,

    INSERT_MESSAGE: `
      INSERT INTO ${CONFIG.database.tables.messages}
      (messageId, interviewId, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `,

    GET_INTERVIEW: `
      SELECT
        i.interviewId,
        i.title,
        i.skills,
        i.status,
        i.createdAt,
        i.updatedAt,
        COALESCE(
          json_group_array(
            CASE WHEN m.messageId IS NOT NULL THEN
              json_object(
                'messageId', m.messageId,
                'role', m.role,
                'content', m.content,
                'timestamp', m.timestamp
              )
            END
          ), '[]'
        ) AS messages
      FROM ${CONFIG.database.tables.interviews} i
      LEFT JOIN ${CONFIG.database.tables.messages} m ON i.interviewId = m.interviewId
      WHERE i.interviewId = ?
      GROUP BY i.interviewId
    `,
  };
}
