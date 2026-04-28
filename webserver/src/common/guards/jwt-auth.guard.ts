import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';
import { AppClsStore } from '../logging/cls-store';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly cls: ClsService<AppClsStore>) {
    super();
  }

  handleRequest<TUser = { user_id: string; email: string }>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    const result: TUser = super.handleRequest(err, user, info, context, status);
    if (result && this.cls.isActive()) {
      const userId = (result as unknown as { user_id?: string }).user_id;
      if (userId) {
        this.cls.set('userId', Number(userId) || undefined);
      }
    }
    return result;
  }
}
