import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization as string | undefined

    if (!authHeader) {
      throw new UnauthorizedException('thieu Authorization header')
    }

    const [type, token] = authHeader.split(' ')
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('token khong hop le')
    }

    try {
      const payload = await this.jwtService.verifyAsync(token)
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('token het han hoac khong hop le')
    }
  }
}
