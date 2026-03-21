export class CreateLiveSessionDto {
  courseId!: string;
  topic?: string;
  metadata?: Record<string, unknown>;
  meetingUrl?: string;
}

export class CreateLegacyLiveDto {
  instructorId!: string;
  language!: string;
  targetLevel!: string;
}

export class JoinLegacyDto {
  sessionId!: string;
  studentId!: string;
}

export class UpdateLiveSessionDto {
  status?: 'RUNNING' | 'PAUSED' | 'ENDED';
  isRecording?: boolean;
  activeSpeakerId?: string;
  topic?: string;
  metadata?: Record<string, unknown>;
}

export class ParticipantStateDto {
  userId!: string;
  role!: string;
  micOn?: boolean;
  cameraOn?: boolean;
  screenShare?: boolean;
}

export class PresentationRequestDto {
  sessionId!: string;
  notes?: string;
}

export class PresentationResponseDto {
  requestId!: string;
  approve!: boolean;
  notes?: string;
}

export class CommunicationDto {
  sessionId!: string;
  type?: 'CHAT' | 'ASSIGNMENT';
  content!: string;
  metadata?: Record<string, unknown>;
}

export class LiveChatDto {
  sessionId!: string;
  content!: string;
}
