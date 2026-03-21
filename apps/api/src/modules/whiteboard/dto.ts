import { IsEnum, IsOptional, IsString } from 'class-validator';

export class StartWhiteboardDto {
  @IsString()
  liveSessionId!: string;
}

export class CreateLayerDto {
  @IsString()
  sessionId!: string;

  @IsString()
  name!: string;
}

export class DeleteLayerDto {
  @IsString()
  sessionId!: string;

  @IsString()
  name!: string;
}

export enum WhiteboardActionType {
  DRAW = 'DRAW',
  ERASE = 'ERASE',
  CLEAR = 'CLEAR',
  UNDO = 'UNDO',
  REDO = 'REDO',
  SHAPE = 'SHAPE',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  GRID = 'GRID',
  GRANT = 'GRANT',
  REVOKE = 'REVOKE',
}

export class WhiteboardActionDto {
  @IsString()
  sessionId!: string;

  @IsEnum(WhiteboardActionType)
  type!: WhiteboardActionType;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  payload?: any;

  @IsOptional()
  @IsString()
  requestId?: string; // audit/trace

  @IsOptional()
  @IsString()
  targetActionId?: string; // UNDO/REDO hedefi

  @IsOptional()
  @IsString()
  layerId?: string; // katman adı/id
}
