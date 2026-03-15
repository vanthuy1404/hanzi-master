import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body) {
    return this.authService.register(body)
  }

  @Post('login')
  login(@Body() body) {
    return this.authService.login(body)
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req) {
    return {
      user: req.user,
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return this.authService.getMe(req.user?.sub)
  }
}
