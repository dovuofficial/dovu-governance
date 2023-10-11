import { EntityIdKeyString, TimestampKeyString, date_to_keyString, is_entity_id, is_timestamp } from '@bugbytes/hapi-util';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
/**
 * Service instance that parses and validates configuration information
 * used during startup and for other system functions.
 */
export class AppConfiguration {
	/**
	 * The Mirror Node’s gRPC endpoint.
	 */
	public readonly mirrorGrpc: string;
	/**
	 * The Mirror Node’s REST API endpoint.
	 */
	public readonly mirrorRest: string;
	/**
	 * The HCS Topic message stream source, in 0.0.123 format.
	 */
	public readonly hcsTopic: EntityIdKeyString;
	/**
	 * The consensus time at which to start processing HCS messages.
	 */
	public readonly hcsStartDate: TimestampKeyString;
}
/**
 * Loads the configuration properties for this HCS voting stream.
 * Retrieves the HCS mirror gRPC endpoint (MIRROR_GRPC), mirror
 * REST endpoint (MIRROR_REST) and the HCS topic (HCS_TOPIC), and
 * optional starting time filter (HCS_START_DATE) from the environment.
 * The method retrieves the remainder of the voting stream configuration
 * from message one of the HCS topic.  If the first message of the
 * stream is not identifiable as a configuration message, an error is
 * thrown.  This is intended to cause server startup to fail as the
 * process can not validate ballots and votes without configuration rules.
 *
 * @param configService The nestjs configuration service providing access
 * to the proper environmental variables.
 *
 * @returns the application configuration.
 */
export async function loadAppConfiguration(configService: ConfigService): Promise<AppConfiguration> {
	const logger = new Logger(AppConfiguration.name);
	try {
		logger.log('Loading Configuration from Environment');
		const mirrorGrpc = configService.get<string>('MIRROR_GRPC');
		const mirrorRest = configService.get<string>('MIRROR_REST');
		const hcsTopic = configService.get<string>('HCS_TOPIC');
		if (!is_entity_id(hcsTopic)) {
			throw new Error('Invalid HCS Topic in configuration.');
		}
		const hcsStartDate = computeStartDateFilter();

		// For good measure, echo the computed
		// configuration into the startup log
		// to help troubleshooting when thing
		// don't work as expected.
		logger.log(`Configuration Loaded`);
		logger.log(`HCS Topic: ${hcsTopic}`);
		if (hcsStartDate !== '0.0') {
			logger.log(`Starting Timestamp: ${hcsStartDate}`);
		} else {
			logger.log('Starting Timestamp: none, replay entire stream');
		}
		logger.log(`GRPC Mirror Endpoint: ${mirrorGrpc}`);
		logger.log(`REST Mirror Endpoint: ${mirrorRest}`);

		return {
			mirrorGrpc,
			mirrorRest,
			hcsTopic,
			hcsStartDate,
		};

		/**
		 * Helper function that computes the starting date/time filter for the processing
		 * the HCS voting stream, it is the later of either the time of message one
		 * (the configuration) or (if specified) the time designated in the environment
		 * variable (HCS_START_DATE).  The system will ignore all ballots created before
		 * the computed starting filter time.
		 */
		function computeStartDateFilter(): TimestampKeyString {
			const override = configService.get<string>('HCS_START_DATE');
			if (override) {
				if (!is_timestamp(override)) {
					throw new Error('Invalid HCS Starting Date in configuration.');
				}
				if (override > date_to_keyString(new Date())) {
					throw new Error('Invalid HCS Starting Date, value can not be in the future.');
				}
				return override;
			}
			return '0.0';
		}
	} catch (configError) {
		logger.error('Loading Configuration Failed.', configError);
		throw configError;
	}
}
