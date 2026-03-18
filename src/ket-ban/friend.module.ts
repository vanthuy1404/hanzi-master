import { Module } from '@nestjs/common'
import { ChatModule } from '../chat/chat.module'
import { PrismaModule } from '../prisma/prisma.module'
import { FriendController } from './friend.controller'
import { FriendService } from './friend.service'

@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [FriendController],
  providers: [FriendService],
})
export class FriendModule {}
