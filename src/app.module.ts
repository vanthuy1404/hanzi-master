import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { TopicsModule } from './chu-de/topic.module'
import { VocabulariesModule } from './tu-vung/vocabulary.module'
import { AuthModule } from './auth/auth.module'
import { FriendModule } from './ket-ban/friend.module'
import { ChatModule } from './chat/chat.module'
import { TranslationPracticeModule } from './luyen-tap-dich/translation-practice.module'
import { ExperienceModule } from './diem-kinh-nghiem/experience.module'
import { SentenceOrderingModule } from './sap-xep-cau/sentence-ordering.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TopicsModule,
    VocabulariesModule,
    AuthModule,
    FriendModule,
    ChatModule,
    TranslationPracticeModule,
    ExperienceModule,
    SentenceOrderingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
