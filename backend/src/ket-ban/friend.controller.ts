import { Body, Controller, Post } from '@nestjs/common'
import { FriendService } from './friend.service'

@Controller('ket-ban')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('gui-loi-moi')
  sendFriendRequest(@Body() body) {
    return this.friendService.sendFriendRequest(body)
  }

  @Post('chap-nhan')
  acceptFriendRequest(@Body() body) {
    return this.friendService.acceptFriendRequest(body)
  }
}
