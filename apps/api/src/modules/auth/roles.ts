import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const APP_ROLES = ['ADMIN', 'HEAD_INSTRUCTOR', 'INSTRUCTOR', 'STUDENT', 'GUARDIAN'] as const;
export type AppRole = (typeof APP_ROLES)[number];
