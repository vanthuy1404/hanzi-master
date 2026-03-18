import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
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

  @Get('danh-sach')
  getFriendList(@Query('user_id') userId?: string) {
    return this.friendService.getFriendList(userId)
  }

  @Get('loi-moi')
  getPendingRequests(@Query('user_id') userId?: string) {
    return this.friendService.getPendingRequests(userId)
  }

  @Get('goi-y')
  getSuggestions(@Query('user_id') userId?: string, @Query('limit') limit?: string) {
    return this.friendService.getSuggestions(userId, limit)
  }

  @Post('chap-nhan/:requestId')
  acceptByRequestId(
    @Param('requestId') requestId: string,
    @Body('current_user_id') currentUserIdBody?: string,
    @Query('current_user_id') currentUserIdQuery?: string,
  ) {
    const current_user_id = currentUserIdBody ?? currentUserIdQuery
    return this.friendService.acceptFriendRequestById({
      request_id: requestId,
      current_user_id,
    })
  }
}
