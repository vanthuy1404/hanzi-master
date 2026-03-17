import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { VocabulariesService } from './vocabulary.service'

@Controller('tu-vung')
export class VocabulariesController {
  constructor(private vocabulariesService: VocabulariesService) {}

  @Get()
  findAll(@Query('user_id') userId?: string) {
    return this.vocabulariesService.findAll(userId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('user_id') userId?: string) {
    return this.vocabulariesService.findOne(Number(id), userId)
  }

  @Post()
  create(@Body() body, @Query('user_id') userIdQuery?: string) {
    const userId = body?.user_id ?? userIdQuery
    return this.vocabulariesService.create({
      ...body,
      user_id: userId,
    })
  }

  @Post('bulk')
  createBulk(
    @Body() body,
    @Query('chu_de_id') chuDeIdQuery?: string,
    @Query('user_id') userIdQuery?: string,
  ) {
    const data = Array.isArray(body) ? body : body?.items ?? []
    const chuDeId = body?.chu_de_id ?? chuDeIdQuery
    const userId = body?.user_id ?? userIdQuery
    return this.vocabulariesService.createBulk(data, chuDeId, userId)
  }

  @Post('bulk/excel')
  @UseInterceptors(FileInterceptor('file'))
  createBulkFromExcel(
    @UploadedFile() file,
    @Body('chu_de_id') chuDeIdBody?: string,
    @Query('chu_de_id') chuDeIdQuery?: string,
    @Body('user_id') userIdBody?: string,
    @Query('user_id') userIdQuery?: string,
  ) {
    const chuDeId = chuDeIdBody ?? chuDeIdQuery
    const userId = userIdBody ?? userIdQuery
    return this.vocabulariesService.createBulkFromExcel(file, chuDeId, userId)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body, @Query('user_id') userId?: string) {
    return this.vocabulariesService.update(Number(id), body, body?.user_id ?? userId)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('user_id') userId?: string) {
    return this.vocabulariesService.remove(Number(id), userId)
  }
}
