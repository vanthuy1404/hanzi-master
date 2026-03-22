import { NestFactory } from '@nestjs/core';
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  const publicDir = join(process.cwd(), 'public')
  const avatarDir = join(publicDir, 'avatars')

  if (!existsSync(avatarDir)) {
    mkdirSync(avatarDir, { recursive: true })
  }

  app.useStaticAssets(publicDir, {
    prefix: '/public/',
  })

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
