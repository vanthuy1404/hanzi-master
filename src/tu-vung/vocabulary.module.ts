import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { VocabulariesController } from './vocabulary.controller'
import { VocabulariesService } from './vocabulary.service'

@Module({
  imports: [PrismaModule],
  controllers: [VocabulariesController],
  providers: [VocabulariesService],
})
export class VocabulariesModule {}
