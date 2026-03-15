import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as XLSX from 'xlsx'

type VocabularyInputItem = {
  hanzi: string
  pinyin?: string
  pinyin_plain?: string
  nghia_vi?: string
  nghia_en?: string
  example_cn?: string
  example_vi?: string
}

@Injectable()
export class VocabulariesService {
  constructor(private prisma: PrismaService) {}

  private normalizeString(value: unknown) {
    if (value === undefined || value === null) {
      return undefined
    }

    const result = String(value).trim()
    return result.length > 0 ? result : undefined
  }

  private normalizeTopicId(chuDeId: unknown) {
    const parsed = Number(chuDeId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('chu_de_id khong hop le')
    }
    return parsed
  }

  private normalizeBulkItem(item: VocabularyInputItem, chuDeId: number) {
    return {
      hanzi: this.normalizeString(item.hanzi),
      pinyin: this.normalizeString(item.pinyin),
      pinyin_plain: this.normalizeString(item.pinyin_plain),
      nghia_vi: this.normalizeString(item.nghia_vi),
      nghia_en: this.normalizeString(item.nghia_en),
      example_cn: this.normalizeString(item.example_cn),
      example_vi: this.normalizeString(item.example_vi),
      chu_de_id: chuDeId,
    }
  }

  private async findExistingByHanziOrPinyin(hanzi?: string, pinyin?: string) {
    const conditions: Array<{ hanzi?: string; pinyin?: string }> = []

    if (hanzi) {
      conditions.push({ hanzi })
    }
    if (pinyin) {
      conditions.push({ pinyin })
    }

    if (!conditions.length) {
      return null
    }

    return this.prisma.tu_vung.findFirst({
      where: {
        OR: conditions,
      },
    })
  }

  private normalizeHeader(value: unknown) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
  }

  private mapHeaderToField(header: string) {
    const normalized = this.normalizeHeader(header)
    const map: Record<string, keyof VocabularyInputItem> = {
      hanzi: 'hanzi',
      pinyin: 'pinyin',
      pinyin_plain: 'pinyin_plain',
      nghia_vi: 'nghia_vi',
      nghia_en: 'nghia_en',
      example_cn: 'example_cn',
      example_vi: 'example_vi',
    }
    return map[normalized]
  }

  private parseVocabularyItemsFromExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      throw new BadRequestException('File excel khong co sheet')
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
    })

    if (!rows.length) {
      throw new BadRequestException('File excel rong')
    }

    const headerRow = rows[0]
    const headerMap = headerRow.map((header) => this.mapHeaderToField(String(header)))

    if (!headerMap.some((field) => field === 'hanzi')) {
      throw new BadRequestException('Thieu cot hanzi trong header')
    }

    const items: VocabularyInputItem[] = []

    rows.slice(1).forEach((row) => {
      const item: Partial<VocabularyInputItem> = {}

      row.forEach((cell, columnIndex) => {
        const field = headerMap[columnIndex]
        if (!field) {
          return
        }
        item[field] = this.normalizeString(cell)
      })

      const hasData = Object.values(item).some((value) => value !== undefined)
      if (hasData) {
        items.push(item as VocabularyInputItem)
      }
    })

    return items
  }

  async findAll() {
    return this.prisma.tu_vung.findMany({
      orderBy: {
        id: 'asc',
      },
    })
  }

  async findOne(id: number) {
    return this.prisma.tu_vung.findUnique({
      where: {
        id,
      },
    })
  }

  async create(data: {
    hanzi: string
    pinyin?: string
    pinyin_plain?: string
    nghia_vi?: string
    nghia_en?: string
    example_cn?: string
    example_vi?: string
    chu_de_id?: number
  }) {
    const normalizedHanzi = this.normalizeString(data.hanzi)
    const normalizedPinyin = this.normalizeString(data.pinyin)

    if (!normalizedHanzi) {
      throw new BadRequestException('hanzi la bat buoc')
    }

    const existing = await this.findExistingByHanziOrPinyin(normalizedHanzi, normalizedPinyin)
    if (existing) {
      return {
        inserted: false,
        message: 'Tu vung da ton tai',
        existed: existing,
      }
    }

    return this.prisma.tu_vung.create({
      data: {
        ...data,
        hanzi: normalizedHanzi,
        pinyin: normalizedPinyin,
        pinyin_plain: this.normalizeString(data.pinyin_plain),
        nghia_vi: this.normalizeString(data.nghia_vi),
        nghia_en: this.normalizeString(data.nghia_en),
        example_cn: this.normalizeString(data.example_cn),
        example_vi: this.normalizeString(data.example_vi),
      },
    })
  }

  async createBulk(data: VocabularyInputItem[], chuDeId: unknown) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new BadRequestException('Danh sach tu vung trong')
    }

    const topicId = this.normalizeTopicId(chuDeId)
    const normalizedData = data
      .map((item) => this.normalizeBulkItem(item, topicId))
      .filter((item) => item.hanzi !== undefined)

    if (!normalizedData.length) {
      throw new BadRequestException('Khong co dong hop le de insert')
    }

    const hanziList = [
      ...new Set(
        normalizedData
          .map((item) => item.hanzi)
          .filter((value): value is string => value !== undefined),
      ),
    ]
    const pinyinList = [
      ...new Set(
        normalizedData
          .map((item) => item.pinyin)
          .filter((value): value is string => value !== undefined),
      ),
    ]

    const existingList = await this.prisma.tu_vung.findMany({
      where: {
        OR: [{ hanzi: { in: hanziList } }, { pinyin: { in: pinyinList } }],
      },
      select: {
        hanzi: true,
        pinyin: true,
      },
    })

    const existingHanziSet = new Set(
      existingList.map((item) => item.hanzi).filter((value): value is string => Boolean(value)),
    )
    const existingPinyinSet = new Set(
      existingList.map((item) => item.pinyin).filter((value): value is string => Boolean(value)),
    )

    const uniqueHanziSet = new Set<string>()
    const uniquePinyinSet = new Set<string>()
    const dataToInsert = normalizedData.filter((item) => {
      if (!item.hanzi || existingHanziSet.has(item.hanzi) || uniqueHanziSet.has(item.hanzi)) {
        return false
      }

      if (item.pinyin && (existingPinyinSet.has(item.pinyin) || uniquePinyinSet.has(item.pinyin))) {
        return false
      }

      uniqueHanziSet.add(item.hanzi)
      if (item.pinyin) {
        uniquePinyinSet.add(item.pinyin)
      }
      return true
    })

    if (!dataToInsert.length) {
      return {
        count: 0,
        skipped: normalizedData.length,
      }
    }

    const result = await this.prisma.tu_vung.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    })

    return {
      ...result,
      skipped: normalizedData.length - result.count,
    }
  }

  async createBulkFromExcel(file: { buffer?: Buffer } | undefined, chuDeId: unknown) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui long gui file excel')
    }

    const items = this.parseVocabularyItemsFromExcel(file.buffer)
    return this.createBulk(items, chuDeId)
  }

  async update(
    id: number,
    data: {
      hanzi?: string
      pinyin?: string
      pinyin_plain?: string
      nghia_vi?: string
      nghia_en?: string
      example_cn?: string
      example_vi?: string
      chu_de_id?: number
    },
  ) {
    return this.prisma.tu_vung.update({
      where: {
        id,
      },
      data,
    })
  }

  async remove(id: number) {
    return this.prisma.tu_vung.delete({
      where: {
        id,
      },
    })
  }
}
