import { MessageInfo } from '@bugbytes/hapi-mirror';
import { ConsensusTopicResponse } from '@bugbytes/hapi-proto';
import { EntityIdKeyString, TimestampKeyString } from '@bugbytes/hapi-util';
import { Injectable, Logger } from '@nestjs/common';
import { Rule } from 'src/models/rules';
import { RulesDefinition } from 'src/models/rules-definition';
import { noop } from 'src/util/noop';
import { DataService } from './data.service';
import { MirrorClientService } from './mirror-client.service';
/**
 * Specialized service instance that validates the rules added to the HCS topic,
 * and records valid rules with the data storage service.
 */
@Injectable()
export class HcsRulesProcessingService {
	/**
	 * The service's logger instance.
	 */
	private readonly logger = new Logger(HcsRulesProcessingService.name);
	/**
	 * Public constructor, called by the NextJS runtime dependency injection services.
	 *
	 * @param mirrorClient Data service for retrieving additional information
	 * from the mirror node via its REST interface.
	 *
	 * @param dataService The rules data storage (state) service.
	 */
	constructor(private readonly mirrorClient: MirrorClientService, private readonly dataService: DataService) {}
	/**
	 * Process a potential define-rules HCS native message.  If the message
	 * passes validation it is forwarded to the data service for storage.
	 *
	 * @param hcsMessage The raw hcsMessage to be processed.
	 *
	 * @param hcsMirrorRecord The raw HCS mirror record associated with this
	 * message, useful for retrieving the payer account associated with the message.
	 *
	 * @param hcsPayload The parsed message payload of the raw message, should
	 * contain metadata defining the rules of the governance (to be validated by this method).
	 *
	 * A payload might typically look like this:
	 * {
	 *      "type": "define-rules",
	 *      "title": "Governance Voting Platform",
	 *      "description": "A decentralized voting platform for Hedera Hashgraph",
	 *      "tokenId": "0.0.123456",
	 *      "minVotingThreshold": 0.1,
	 *      "minimumVotingPeriod": 7,
	 *      "minimumStandoffPeriod": 0
	 * }
	 *
	 * @returns A promise that when completed indicates processing of this message
	 * is complete (regardless of whether it was found to be valid and added to the
	 * list of rules).
	 */
	processMessage(hcsMessage: ConsensusTopicResponse, hcsMirrorRecord: MessageInfo, hcsPayload: RulesDefinition): () => Promise<void> {
		const rule: Rule = {
			...hcsPayload,
			consensusTimestamp: hcsMirrorRecord.consensus_timestamp as unknown as TimestampKeyString,
			payerId: hcsMirrorRecord.payer_account_id as unknown as EntityIdKeyString,
		};

		const firstRule = this.dataService.getFirstRule();

		if (firstRule && firstRule.payerId !== rule.payerId) {
			this.logger.verbose(`Message ${hcsMessage.sequenceNumber} failed rule validation: Rule wasn't submitted by the first rule submitter.`);
		} else {
			return async () => {
				if (this.dataService.getRule(rule.consensusTimestamp)) {
					this.logger.verbose(`Message ${hcsMessage.sequenceNumber} failed rule validation: Rule already exists.`);
				} else {
					this.dataService.setRule(rule);
					this.logger.log(`Message for ${hcsMessage.sequenceNumber} successfully added rule.`);
				}
			};
		}

		// Not a valid message, do nothing.
		return noop;
	}
}
