import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { TranslationPracticeController } from './translation-practice.controller'
import { TranslationPracticeService } from './translation-practice.service'

@Module({
  imports: [PrismaModule],
  controllers: [TranslationPracticeController],
  providers: [TranslationPracticeService],
})
export class TranslationPracticeModule {}
