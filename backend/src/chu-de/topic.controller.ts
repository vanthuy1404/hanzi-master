import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common'
import { TopicsService } from './topic.service'

@Controller('chu-de')
export class TopicsController {

    constructor(private topicsService: TopicsService) {}

    @Get()
    findAll() {
        return this.topicsService.findAll()
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.topicsService.findOne(Number(id))
    }

    @Post()
    create(@Body() body) {
        return this.topicsService.create(body)
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() body) {
        return this.topicsService.update(Number(id), body)
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.topicsService.remove(Number(id))
    }

}