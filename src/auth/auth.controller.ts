import { Body, Controller, Get, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { existsSync, mkdirSync } from 'fs'
import { extname, join } from 'path'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'

type AvatarUploadFile = {
  filename: string
  mimetype?: string
}

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

  @UseGuards(JwtAuthGuard)
  @Get('profile-summary')
  profileSummary(@Req() req) {
    return this.authService.getProfileSummary(req.user?.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req, @Body() body) {
    return this.authService.changePassword(req.user?.sub, body)
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const destinationDir = join(process.cwd(), 'public', 'avatars')
          if (!existsSync(destinationDir)) {
            mkdirSync(destinationDir, { recursive: true })
          }
          cb(null, destinationDir)
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname || '').toLowerCase() || '.jpg'
          const safeExtension = ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
            ? extension
            : '.jpg'
          const randomPart = Math.random().toString(36).slice(2, 10)
          cb(null, `${Date.now()}-${randomPart}${safeExtension}`)
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  uploadAvatar(@Req() req, @UploadedFile() avatarFile?: AvatarUploadFile) {
    return this.authService.uploadAvatar(req.user?.sub, avatarFile)
  }
}
