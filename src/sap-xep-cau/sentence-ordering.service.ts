import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

type SentenceOrderingItem = {
  question: string[]
  answer: string[]
  nghia_vi: string
}

type GenerateSentenceOrderingResult = {
  items: SentenceOrderingItem[]
}

type GenerateInput = {
  topic_ids?: unknown
  so_cau?: unknown
  level?: unknown
  user_id?: unknown
}

type SaveInput = {
  topic_ids?: unknown
  so_cau?: unknown
  items?: unknown
  user_id?: unknown
}

type SubmitInput = {
  user_id?: unknown
  answers?: unknown
}

@Injectable()
export class SentenceOrderingService {
  private readonly promptCode = 'prompt-sap-xep'

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private normalizeUserId(userId: unknown) {
    if (userId === undefined || userId === null || userId === '') {
      return undefined
    }
    if (userId === 'null') {
      return null
    }
    const parsed = Number(userId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }
    return parsed
  }

  private normalizeQuestionCount(value: unknown) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 50) {
      throw new BadRequestException('so_cau phai la so nguyen trong khoang 1..50')
    }
    return parsed
  }

  private normalizeLevel(level: unknown) {
    const normalized = String(level ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')

    if (!normalized || normalized === 'trungbinh' || normalized === 'trung-binh') {
      return 'trung_binh'
    }
    if (normalized === 'de' || normalized === 'easy') {
      return 'de'
    }
    if (normalized === 'trung_binh' || normalized === 'medium') {
      return 'trung_binh'
    }
    if (normalized === 'kho' || normalized === 'hard') {
      return 'kho'
    }

    throw new BadRequestException('level khong hop le. Chi chap nhan: de, trung_binh, kho')
  }

  private normalizeTopicIds(topicIds: unknown) {
    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      throw new BadRequestException('topic_ids phai la mang va khong duoc rong')
    }
    const parsed = [
      ...new Set(
        topicIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0),
      ),
    ]
    if (!parsed.length) {
      throw new BadRequestException('topic_ids khong hop le')
    }
    return parsed
  }

  private cleanGeminiText(rawText: string) {
    return rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  }

  private normalizeGeneratedItems(payload: unknown, soCau: number) {
    const items = (payload as GenerateSentenceOrderingResult)?.items
    if (!Array.isArray(items) || !items.length) {
      throw new InternalServerErrorException('Gemini khong tra ve danh sach items hop le')
    }

    const normalized = items
      .map((item) => {
        const question = Array.isArray(item?.question)
          ? item.question.map((part) => String(part ?? '').trim()).filter((part) => part.length > 0)
          : []
        const answer = Array.isArray(item?.answer)
          ? item.answer.map((part) => String(part ?? '').trim()).filter((part) => part.length > 0)
          : []
        const nghiaVi = String((item as { nghia_vi?: unknown })?.nghia_vi ?? '').trim()

        if (
          question.length < 4 ||
          question.length > 7 ||
          answer.length < 4 ||
          answer.length > 7 ||
          question.length !== answer.length ||
          !nghiaVi
        ) {
          return null
        }

        return { question, answer, nghia_vi: nghiaVi }
      })
      .filter((item): item is SentenceOrderingItem => item !== null)

    if (!normalized.length) {
      throw new InternalServerErrorException('Khong co item hop le sau khi xu ly response tu Gemini')
    }

    return normalized.slice(0, soCau)
  }

  private normalizeItemsInput(items: unknown, soCau?: number) {
    if (!Array.isArray(items) || !items.length) {
      throw new BadRequestException('items phai la mang va khong duoc rong')
    }

    const normalized = items
      .map((item) => {
        const question = Array.isArray((item as SentenceOrderingItem)?.question)
          ? (item as SentenceOrderingItem).question
              .map((part) => String(part ?? '').trim())
              .filter((part) => part.length > 0)
          : []
        const answer = Array.isArray((item as SentenceOrderingItem)?.answer)
          ? (item as SentenceOrderingItem).answer
              .map((part) => String(part ?? '').trim())
              .filter((part) => part.length > 0)
          : []
        const nghiaVi = String((item as { nghia_vi?: unknown })?.nghia_vi ?? '').trim()
        if (
          question.length < 4 ||
          question.length > 7 ||
          answer.length < 4 ||
          answer.length > 7 ||
          question.length !== answer.length ||
          !nghiaVi
        ) {
          return null
        }
        return { question, answer, nghia_vi: nghiaVi }
      })
      .filter((item): item is SentenceOrderingItem => item !== null)

    if (!normalized.length) {
      throw new BadRequestException('items khong hop le')
    }
    if (soCau && normalized.length < soCau) {
      throw new BadRequestException('So luong items nho hon so_cau')
    }

    return soCau ? normalized.slice(0, soCau) : normalized
  }

  private normalizeSubmittedAnswers(input: unknown, expectedCount: number) {
    if (!Array.isArray(input)) {
      throw new BadRequestException('answers phai la mang')
    }
    if (input.length < expectedCount) {
      throw new BadRequestException('So luong answers khong du')
    }

    return input.slice(0, expectedCount).map((item) => {
      if (Array.isArray(item)) {
        return item.map((part) => String(part ?? '').trim()).filter((part) => part.length > 0)
      }
      const arr = Array.isArray((item as { answer?: unknown })?.answer)
        ? ((item as { answer?: unknown[] }).answer ?? [])
        : []
      return arr.map((part) => String(part ?? '').trim()).filter((part) => part.length > 0)
    })
  }

  private normalizeSegment(value: string) {
    return value
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.,!?;:'"`~@#$%^&*()_+\-=\[\]{}\\|<>/，。！？、；：·…]/g, '')
      .trim()
  }

  private async validateTopicAccess(topicIds: number[], userId: number | null | undefined) {
    const topics = await this.prisma.chu_de.findMany({
      where: { id: { in: topicIds } },
      select: { id: true, user_id: true },
    })

    if (topics.length !== topicIds.length) {
      throw new BadRequestException('Co topic_id khong ton tai')
    }

    const readable = topics.every((topic) => topic.user_id === null || topic.user_id === userId)
    if (!readable) {
      throw new ForbiddenException('Danh sach topic co chu de ban khong co quyen truy cap')
    }
  }

  private buildPrompt(
    vocabularies: Array<{ hanzi: string | null; pinyin: string | null; nghia_vi: string | null }>,
    soCau: number,
    level: string,
    basePrompt: string,
  ) {
    const vocabLines = vocabularies.map(
      (item, index) =>
        `${index + 1}. hanzi: ${item.hanzi ?? ''}; pinyin: ${item.pinyin ?? ''}; nghia_vi: ${item.nghia_vi ?? ''}`,
    )

    return [
      basePrompt,
      `Muc do de bai dang chon: ${level}.`,
      `Hay tao dung ${soCau} cau bai tap sap xep.`,
      'Moi item bat buoc co 3 truong: question, answer, nghia_vi.',
      'question la cac cum hanzi(pinyin) bi dao thu tu.',
      'answer la thu tu dung tuong ung.',
      'Moi cau phai co so cum linh hoat trong khoang 4 den 7 cum.',
      'nghia_vi la nghia tieng Viet cua cau sau khi sap xep dung.',
      'Tra ve DUNG JSON theo format: {"items":[{"question":["cum4(pinyin)","cum1(pinyin)","cum3(pinyin)","cum2(pinyin)"],"answer":["cum1(pinyin)","cum2(pinyin)","cum3(pinyin)","cum4(pinyin)"],"nghia_vi":"..."}]}. Khong them text nao ben ngoai JSON.',
      'Danh sach tu vung:',
      ...vocabLines,
    ].join('\n')
  }

  private getFallbackPromptByLevel(level: string) {
    if (level === 'de') {
      return 'Ban la tro ly tao bai tap sap xep cau cho nguoi moi bat dau. Tao cau ngan, don gian.'
    }
    if (level === 'kho') {
      return 'Ban la tro ly tao bai tap sap xep cau cho muc do kha gioi. Tao cau dai va da thanh phan.'
    }
    return 'Ban la tro ly tao bai tap sap xep cau cho muc do trung binh. Tao cau giao tiep tu nhien.'
  }

  private async getPromptTemplate(level: string) {
    const prompt = await this.prisma.danh_muc_prompt.findFirst({
      where: {
        ma: this.promptCode,
        level,
      },
      select: {
        noi_dung: true,
      },
    })

    return prompt?.noi_dung?.trim() || this.getFallbackPromptByLevel(level)
  }

  private async generateByGemini(prompt: string, soCau: number) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim()
    const apiUrl =
      this.configService.get<string>('GEMINI_API_URL')?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

    if (!apiKey) {
      throw new InternalServerErrorException('Thieu GEMINI_API_KEY trong env')
    }

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    const responseText = await response.text()
    if (!response.ok) {
      throw new InternalServerErrorException(`Gemini API loi (${response.status}): ${responseText}`)
    }

    let parsedApiResponse: any
    try {
      parsedApiResponse = JSON.parse(responseText)
    } catch (error) {
      throw new InternalServerErrorException(`Khong parse duoc JSON tu Gemini: ${String(error)}`)
    }

    const rawText = parsedApiResponse?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText || typeof rawText !== 'string') {
      throw new InternalServerErrorException('Gemini response khong dung dinh dang text')
    }

    const cleaned = this.cleanGeminiText(rawText)
    let payload: unknown
    try {
      payload = JSON.parse(cleaned)
    } catch (error) {
      throw new InternalServerErrorException(
        `Khong parse duoc JSON bai tap tu Gemini: ${String(error)} - raw: ${cleaned}`,
      )
    }

    return this.normalizeGeneratedItems(payload, soCau)
  }

  async generate(input: GenerateInput) {
    const topicIds = this.normalizeTopicIds(input.topic_ids)
    const soCau = this.normalizeQuestionCount(input.so_cau)
    const level = this.normalizeLevel(input.level)
    const userId = this.normalizeUserId(input.user_id)

    await this.validateTopicAccess(topicIds, userId)

    const vocabularies = await this.prisma.tu_vung.findMany({
      where: {
        chu_de_id: { in: topicIds },
        hanzi: { not: null },
      },
      select: {
        hanzi: true,
        pinyin: true,
        nghia_vi: true,
      },
      orderBy: { id: 'asc' },
      take: 250,
    })

    if (!vocabularies.length) {
      throw new BadRequestException('Khong tim thay tu vung hop le trong cac chu de da chon')
    }

    const basePrompt = await this.getPromptTemplate(level)
    const prompt = this.buildPrompt(vocabularies, soCau, level, basePrompt)
    const items = await this.generateByGemini(prompt, soCau)

    return {
      user_id: userId ?? null,
      topic_ids: topicIds,
      so_cau: soCau,
      level,
      items,
    }
  }

  async save(input: SaveInput) {
    const topicIds = this.normalizeTopicIds(input.topic_ids)
    const soCau = this.normalizeQuestionCount(input.so_cau)
    const userId = this.normalizeUserId(input.user_id)
    const items = this.normalizeItemsInput(input.items, soCau)

    await this.validateTopicAccess(topicIds, userId)

    return this.prisma.sap_xep_cau.create({
      data: {
        user_id: userId ?? null,
        topic_ids: topicIds,
        so_cau: soCau,
        noi_dung: items,
      },
    })
  }

  async findAll(userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)

    return this.prisma.sap_xep_cau.findMany({
      where:
        parsedUserId === undefined
          ? { user_id: null }
          : {
              OR: [{ user_id: null }, { user_id: parsedUserId }],
            },
      orderBy: {
        id: 'desc',
      },
    })
  }

  async submit(id: number, input: SubmitInput) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('id khong hop le')
    }

    const parsedUserId = this.normalizeUserId(input.user_id)
    if (parsedUserId === null || parsedUserId === undefined) {
      throw new BadRequestException('user_id phai la so nguyen duong')
    }

    const practice = await this.prisma.sap_xep_cau.findUnique({
      where: { id },
    })
    if (!practice) {
      throw new BadRequestException('Khong tim thay bai sap xep cau')
    }

    if (practice.user_id !== null && practice.user_id !== parsedUserId) {
      throw new ForbiddenException('Ban khong co quyen lam bai sap xep cau nay')
    }

    const items = this.normalizeItemsInput(practice.noi_dung, practice.so_cau)
    const submittedAnswers = this.normalizeSubmittedAnswers(input.answers, items.length)

    const details = items.map((item, index) => {
      const userAnswer = submittedAnswers[index] ?? []
      const normalizedUser = userAnswer.map((part) => this.normalizeSegment(part))
      const normalizedCorrect = item.answer.map((part) => this.normalizeSegment(part))
      const isCorrect =
        normalizedUser.length === normalizedCorrect.length &&
        normalizedUser.every((part, idx) => part === normalizedCorrect[idx])

      return {
        index: index + 1,
        question: item.question,
        user_answer: userAnswer,
        system_answer: item.answer,
        nghia_vi: item.nghia_vi,
        is_correct: isCorrect,
      }
    })

    const tongSoCau = details.length
    const soCauDung = details.filter((item) => item.is_correct).length
    const diem = Number(((soCauDung / tongSoCau) * 10).toFixed(2))
    const exp = Math.max(1, soCauDung)

    const [history, expRecord] = await this.prisma.$transaction([
      this.prisma.lich_su_hoc.create({
        data: {
          user_id: parsedUserId,
          luyen_tap_dich_id: null,
          sap_xep_cau_id: practice.id,
          tong_so_cau: tongSoCau,
          so_cau_dung: soCauDung,
          diem,
        },
      }),
      this.prisma.diem_kinh_nghiem.create({
        data: {
          user_id: parsedUserId,
          exp,
        },
      }),
    ])

    return {
      history_id: history.id,
      exp_id: expRecord.id,
      sap_xep_cau_id: practice.id,
      tong_so_cau: tongSoCau,
      so_cau_dung: soCauDung,
      diem,
      exp_cong_them: exp,
      details,
    }
  }
}
