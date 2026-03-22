import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module'
import { SentenceOrderingController } from './sentence-ordering.controller'
import { SentenceOrderingService } from './sentence-ordering.service'

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SentenceOrderingController],
  providers: [SentenceOrderingService],
})
export class SentenceOrderingModule {}
