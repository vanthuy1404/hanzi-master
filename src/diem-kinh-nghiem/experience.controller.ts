import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ExperienceService } from './experience.service'

@Controller('diem-kinh-nghiem')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get()
  findAll(@Query('user_id') userId?: string) {
    return this.experienceService.findAll(userId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('user_id') userId?: string) {
    return this.experienceService.findOne(Number(id), userId)
  }

  @Post()
  create(@Body() body) {
    return this.experienceService.create({
      user_id: body?.user_id,
      exp: body?.exp,
    })
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body, @Query('user_id') userIdQuery?: string) {
    return this.experienceService.update(Number(id), {
      user_id: body?.user_id ?? userIdQuery,
      exp: body?.exp,
    })
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('user_id') userId?: string) {
    return this.experienceService.remove(Number(id), userId)
  }
}
