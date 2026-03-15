import { Module } from '@nestjs/common'
import { TopicsController } from './topic.controller'
import { TopicsService } from './topic.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
    imports: [PrismaModule],
    controllers: [TopicsController],
    providers: [TopicsService]
})
export class TopicsModule {}