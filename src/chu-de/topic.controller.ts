import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { TopicsService } from './topic.service'

@Controller('chu-de')
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  @Get()
  findAll(@Query('user_id') userId?: string) {
    return this.topicsService.findAll(userId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('user_id') userId?: string) {
    return this.topicsService.findOne(Number(id), userId)
  }

  @Post()
  create(@Body() body) {
    return this.topicsService.create(body)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body, @Query('user_id') userId?: string) {
    return this.topicsService.update(Number(id), body, userId)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('user_id') userId?: string) {
    return this.topicsService.remove(Number(id), userId)
  }
}
