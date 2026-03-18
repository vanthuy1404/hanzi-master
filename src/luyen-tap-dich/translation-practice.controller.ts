import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { TranslationPracticeService } from './translation-practice.service'

@Controller('luyen-tap-dich')
export class TranslationPracticeController {
  constructor(private readonly translationPracticeService: TranslationPracticeService) {}

  @Get()
  findAll(@Query('user_id') userId?: string) {
    return this.translationPracticeService.findAll(userId)
  }

  @Post('generate')
  generate(@Body() body, @Query('user_id') userIdQuery?: string) {
    return this.translationPracticeService.generate({
      topic_ids: body?.topic_ids,
      so_cau: body?.so_cau,
      level: body?.level,
      user_id: body?.user_id ?? userIdQuery,
    })
  }

  @Post('save')
  save(@Body() body, @Query('user_id') userIdQuery?: string) {
    return this.translationPracticeService.save({
      topic_ids: body?.topic_ids,
      so_cau: body?.so_cau,
      level: body?.level,
      items: body?.items,
      user_id: body?.user_id ?? userIdQuery,
    })
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body, @Query('user_id') userIdQuery?: string) {
    return this.translationPracticeService.update(Number(id), {
      topic_ids: body?.topic_ids,
      so_cau: body?.so_cau,
      level: body?.level,
      items: body?.items,
      user_id: body?.user_id ?? userIdQuery,
    })
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('user_id') userIdQuery?: string) {
    return this.translationPracticeService.remove(Number(id), userIdQuery)
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() body, @Query('user_id') userIdQuery?: string) {
    return this.translationPracticeService.submit(Number(id), {
      user_id: body?.user_id ?? userIdQuery,
      answers: body?.answers,
    })
  }
}
