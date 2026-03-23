export class CreateLtiToolDto {
  name!: string;
  issuer!: string;
  clientId!: string;
  publicKey!: string;
  description?: string;
}

export class UpdateLtiToolDto {
  name?: string;
  issuer?: string;
  publicKey?: string;
  description?: string;
}

export class CreateLtiDeploymentDto {
  toolId!: string;
  courseId!: string;
  instructors?: string[];
  learners?: string[];
}

export class LtiLaunchDto {
  deploymentId!: string;
  userId!: string;
  role!: string;
  rawPayload!: Record<string, unknown>;
}
