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
  findAll() {
    return this.vocabulariesService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vocabulariesService.findOne(Number(id))
  }

  @Post()
  create(@Body() body) {
    return this.vocabulariesService.create(body)
  }

  @Post('bulk')
  createBulk(@Body() body, @Query('chu_de_id') chuDeIdQuery?: string) {
    const data = Array.isArray(body) ? body : body?.items ?? []
    const chuDeId = body?.chu_de_id ?? chuDeIdQuery
    return this.vocabulariesService.createBulk(data, chuDeId)
  }

  @Post('bulk/excel')
  @UseInterceptors(FileInterceptor('file'))
  createBulkFromExcel(
    @UploadedFile() file,
    @Body('chu_de_id') chuDeIdBody?: string,
    @Query('chu_de_id') chuDeIdQuery?: string,
  ) {
    const chuDeId = chuDeIdBody ?? chuDeIdQuery
    return this.vocabulariesService.createBulkFromExcel(file, chuDeId)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body) {
    return this.vocabulariesService.update(Number(id), body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vocabulariesService.remove(Number(id))
  }
}
