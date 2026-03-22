import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { SentenceOrderingService } from './sentence-ordering.service'

@Controller('sap-xep-cau')
export class SentenceOrderingController {
  constructor(private readonly sentenceOrderingService: SentenceOrderingService) {}

  @Get()
  findAll(@Query('user_id') userId?: string) {
    return this.sentenceOrderingService.findAll(userId)
  }

  @Post('generate')
  generate(@Body() body, @Query('user_id') userIdQuery?: string) {
    return this.sentenceOrderingService.generate({
      topic_ids: body?.topic_ids,
      so_cau: body?.so_cau,
      level: body?.level,
      user_id: body?.user_id ?? userIdQuery,
    })
  }

  @Post('save')
  save(@Body() body, @Query('user_id') userIdQuery?: string) {
    return this.sentenceOrderingService.save({
      topic_ids: body?.topic_ids,
      so_cau: body?.so_cau,
      items: body?.items,
      user_id: body?.user_id ?? userIdQuery,
    })
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() body, @Query('user_id') userIdQuery?: string) {
    return this.sentenceOrderingService.submit(Number(id), {
      user_id: body?.user_id ?? userIdQuery,
      answers: body?.answers,
    })
  }
}
