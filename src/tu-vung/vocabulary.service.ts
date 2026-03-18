import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
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

  private normalizeOptionalTopicId(chuDeId: unknown) {
    if (chuDeId === undefined || chuDeId === null || chuDeId === '') {
      return undefined
    }
    return this.normalizeTopicId(chuDeId)
  }

  private normalizePositiveInt(
    value: unknown,
    {
      fallback,
      min,
      max,
      field,
    }: {
      fallback: number
      min: number
      max: number
      field: string
    },
  ) {
    if (value === undefined || value === null || value === '') {
      return fallback
    }

    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(`${field} khong hop le`)
    }

    return parsed
  }

  private normalizeUserId(userId: unknown, { required = false }: { required?: boolean } = {}) {
    if (userId === undefined || userId === null || userId === '') {
      if (required) {
        throw new BadRequestException('user_id la bat buoc')
      }
      return undefined
    }

    const parsed = Number(userId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }
    return parsed
  }

  private async ensureWritableTopic(chuDeId: number, userId?: number) {
    const topic = await this.prisma.chu_de.findUnique({
      where: { id: chuDeId },
      select: {
        id: true,
        user_id: true,
      },
    })

    if (!topic) {
      throw new NotFoundException('Khong tim thay chu de')
    }

    if (topic.user_id !== null && topic.user_id !== userId) {
      throw new ForbiddenException('Ban khong co quyen them tu vung vao chu de nay')
    }

    return topic
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

  private async findExistingByHanziOrPinyinInOwnerScope(
    hanzi: string | undefined,
    pinyin: string | undefined,
    ownerUserId: number | null,
  ) {
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
        AND: [
          {
            OR: conditions,
          },
          {
            chu_de: {
              is: {
                user_id: ownerUserId,
              },
            },
          },
        ],
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

  async findAll(userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)

    return this.prisma.tu_vung.findMany({
      where:
        parsedUserId === undefined
          ? {
              chu_de: {
                is: {
                  user_id: null,
                },
              },
            }
          : {
              chu_de: {
                is: {
                  OR: [{ user_id: null }, { user_id: parsedUserId }],
                },
              },
            },
      orderBy: {
        id: 'asc',
      },
    })
  }

  async findFlashCards(input: {
    user_id?: unknown
    chu_de_id?: unknown
    page?: unknown
    page_size?: unknown
  }) {
    const parsedUserId = this.normalizeUserId(input.user_id)
    const topicId = this.normalizeOptionalTopicId(input.chu_de_id)
    const page = this.normalizePositiveInt(input.page, {
      fallback: 1,
      min: 1,
      max: 100000,
      field: 'page',
    })
    const pageSize = this.normalizePositiveInt(input.page_size, {
      fallback: 9,
      min: 1,
      max: 60,
      field: 'page_size',
    })

    if (topicId !== undefined) {
      const topic = await this.prisma.chu_de.findUnique({
        where: { id: topicId },
        select: { id: true, user_id: true },
      })

      if (!topic) {
        throw new NotFoundException('Khong tim thay chu de')
      }

      if (topic.user_id !== null && topic.user_id !== parsedUserId) {
        throw new ForbiddenException('Ban khong co quyen truy cap chu de nay')
      }
    }

    const where =
      parsedUserId === undefined
        ? {
            ...(topicId !== undefined ? { chu_de_id: topicId } : {}),
            chu_de: {
              is: {
                user_id: null,
              },
            },
          }
        : {
            ...(topicId !== undefined ? { chu_de_id: topicId } : {}),
            chu_de: {
              is: {
                OR: [{ user_id: null }, { user_id: parsedUserId }],
              },
            },
          }

    const [totalItems, items] = await Promise.all([
      this.prisma.tu_vung.count({ where }),
      this.prisma.tu_vung.findMany({
        where,
        orderBy: {
          id: 'asc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    }
  }

  async findOne(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)
    const vocabulary = await this.prisma.tu_vung.findUnique({
      where: {
        id,
      },
      include: {
        chu_de: {
          select: {
            user_id: true,
          },
        },
      },
    })

    if (!vocabulary) {
      throw new NotFoundException('Khong tim thay tu vung')
    }

    const topicUserId = vocabulary.chu_de?.user_id
    if (topicUserId !== null && topicUserId !== undefined && topicUserId !== parsedUserId) {
      throw new ForbiddenException('Ban khong co quyen xem tu vung nay')
    }

    return vocabulary
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
    user_id?: number
  }) {
    const normalizedHanzi = this.normalizeString(data.hanzi)
    const normalizedPinyin = this.normalizeString(data.pinyin)

    if (!normalizedHanzi) {
      throw new BadRequestException('hanzi la bat buoc')
    }

    const topicId = this.normalizeTopicId(data.chu_de_id)
    const userId = this.normalizeUserId(data.user_id)
    const topic = await this.ensureWritableTopic(topicId, userId)

    const existing = await this.findExistingByHanziOrPinyinInOwnerScope(
      normalizedHanzi,
      normalizedPinyin,
      topic.user_id,
    )
    if (existing) {
      return {
        inserted: false,
        message: 'Tu vung da ton tai trong pham vi chu de cua user',
        existed: existing,
      }
    }

    return this.prisma.tu_vung.create({
      data: {
        hanzi: normalizedHanzi,
        pinyin: normalizedPinyin,
        pinyin_plain: this.normalizeString(data.pinyin_plain),
        nghia_vi: this.normalizeString(data.nghia_vi),
        nghia_en: this.normalizeString(data.nghia_en),
        example_cn: this.normalizeString(data.example_cn),
        example_vi: this.normalizeString(data.example_vi),
        chu_de_id: topicId,
      },
    })
  }

  async createBulk(data: VocabularyInputItem[], chuDeId: unknown, userId?: unknown) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new BadRequestException('Danh sach tu vung trong')
    }

    const topicId = this.normalizeTopicId(chuDeId)
    const parsedUserId = this.normalizeUserId(userId)
    const topic = await this.ensureWritableTopic(topicId, parsedUserId)
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
        AND: [
          {
            OR: [{ hanzi: { in: hanziList } }, { pinyin: { in: pinyinList } }],
          },
          {
            chu_de: {
              is: {
                user_id: topic.user_id,
              },
            },
          },
        ],
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

  async createBulkFromExcel(file: { buffer?: Buffer } | undefined, chuDeId: unknown, userId?: unknown) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui long gui file excel')
    }

    const items = this.parseVocabularyItemsFromExcel(file.buffer)
    return this.createBulk(items, chuDeId, userId)
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
    userId?: unknown,
  ) {
    const parsedUserId = this.normalizeUserId(userId, { required: true })
    const existing = await this.prisma.tu_vung.findUnique({
      where: { id },
      include: {
        chu_de: {
          select: {
            user_id: true,
          },
        },
      },
    })

    if (!existing) {
      throw new NotFoundException('Khong tim thay tu vung')
    }

    if (existing.chu_de?.user_id !== parsedUserId) {
      throw new ForbiddenException('Ban khong co quyen cap nhat tu vung nay')
    }

    if (data.chu_de_id !== undefined) {
      const nextTopicId = this.normalizeTopicId(data.chu_de_id)
      await this.ensureWritableTopic(nextTopicId, parsedUserId)
      data.chu_de_id = nextTopicId
    }

    return this.prisma.tu_vung.update({
      where: {
        id,
      },
      data: {
        ...data,
        hanzi: this.normalizeString(data.hanzi),
        pinyin: this.normalizeString(data.pinyin),
        pinyin_plain: this.normalizeString(data.pinyin_plain),
        nghia_vi: this.normalizeString(data.nghia_vi),
        nghia_en: this.normalizeString(data.nghia_en),
        example_cn: this.normalizeString(data.example_cn),
        example_vi: this.normalizeString(data.example_vi),
      },
    })
  }

  async remove(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId, { required: true })
    const existing = await this.prisma.tu_vung.findUnique({
      where: { id },
      include: {
        chu_de: {
          select: {
            user_id: true,
          },
        },
      },
    })

    if (!existing) {
      throw new NotFoundException('Khong tim thay tu vung')
    }

    if (existing.chu_de?.user_id !== parsedUserId) {
      throw new ForbiddenException('Ban khong co quyen xoa tu vung nay')
    }

    return this.prisma.tu_vung.delete({
      where: {
        id,
      },
    })
  }
}
