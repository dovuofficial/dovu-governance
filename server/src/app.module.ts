import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppConfiguration, loadAppConfiguration } from './models/app-configuration';
import { DataService } from './services/data.service';
import { HcsBallotProcessingService } from './services/hcs-ballot-processing.service';
import { HcsMessageListenerService } from './services/hcs-message-listener.service';
import { HcsMessageProcessingService } from './services/hcs-message-processing.service';
import { HcsRulesProcessingService } from './services/hcs-rules-processing.service';
import { HcsVoteProcessingService } from './services/hcs-vote-processing.service';
import { MirrorClientService } from './services/mirror-client.service';
/**
 * Main NestJS application module.
 */
@Module({
	imports: [ConfigModule.forRoot(), ScheduleModule.forRoot()],
	controllers: [AppController],
	providers: [
		{
			provide: AppConfiguration,
			useFactory: loadAppConfiguration,
			inject: [ConfigService],
		},
		HcsMessageListenerService,
		HcsMessageProcessingService,
		HcsBallotProcessingService,
		HcsVoteProcessingService,
		HcsRulesProcessingService,
		MirrorClientService,
		DataService,
	],
})
export class AppModule {}
