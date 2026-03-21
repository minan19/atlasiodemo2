export class AiAgentFeedbackDto {
  score?: number;
  comment?: string;
}

export class AiContextDto {
  key!: string;
  value!: unknown;
}
