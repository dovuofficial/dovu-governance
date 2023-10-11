import { MessageInfo, MirrorError } from '@bugbytes/hapi-mirror';
import { ConsensusTopicResponse } from '@bugbytes/hapi-proto';
import { EntityIdKeyString, TimestampKeyString, is_entity_id } from '@bugbytes/hapi-util';
import { Injectable, Logger } from '@nestjs/common';
import { Rule } from 'src/models/rules';
import { RulesDefinition } from 'src/models/rules-definition';
import { TokenSummary } from 'src/models/token-summary';
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
					try {
						const hcsToken = await this.getHcsTokenInfo(rule);

						rule.title = rule.title || hcsToken.symbol;
						rule.description = rule.description || hcsToken.name;
						this.verifyAccountList(rule.ineligibleAccounts);
						this.verifyAccountList(rule.ballotCreators);
						this.verifyMinVotingThreshold(rule);
						this.verifyMinimumVotingPeriod(rule);
						this.verifyMinimumStandoffPeriod(rule);

						this.dataService.setRule(rule);

						this.logger.verbose(`Message for ${hcsMessage.sequenceNumber} successfully added rule.`);
					} catch (ex) {
						this.logger.error(`Message ${hcsMessage.sequenceNumber} failed rule validation: ${ex.message}`);
					}
				}
			};
		}

		// Not a valid message, do nothing.
		return noop;
	}

	/**
	 * Helper function that queries the designated REST Mirror node for
	 * information describing the HCS token representing voting weights.
	 */
	private async getHcsTokenInfo(rule: Rule): Promise<TokenSummary> {
		this.logger.log(`Retrieving information for voting token ${rule.tokenId}.`);
		if (!rule.tokenId) {
			throw new Error('Voting Token ID is missing from configuration.');
		}
		if (!is_entity_id(rule.tokenId)) {
			throw new Error(`The value ${rule.tokenId} is not a valid token ID.`);
		}
		try {
			return this.mirrorClient.getTokenInfo(rule.tokenId);
		} catch (ex) {
			if (ex instanceof MirrorError && ex.status === 404) {
				throw new Error(`Voting Token with id ${rule.tokenId} does not appear to exist.`);
			}
			throw ex;
		}
	}

	/**
	 * Helper function that examines a list of addresses to ensure
	 * they conform to the 0.0.123 hedera addressing format.
	 */
	private verifyAccountList(accounts: string[] | null | undefined): EntityIdKeyString[] {
		if (!accounts) {
			return [];
		}
		if (Array.isArray(accounts)) {
			for (const account of accounts) {
				if (!is_entity_id(account)) {
					throw new Error(`${account} is not a valid account id.`);
				}
			}
			return accounts as EntityIdKeyString[];
		}
		throw new Error(`${JSON.stringify(accounts)} is not a valid list of account ids.`);
	}
	/**
	 * Helper function that validates the minimum voting threshold
	 * value (if specified), returns zero if not specified.
	 */
	private verifyMinVotingThreshold(rule: Rule): number {
		if (!rule.minVotingThreshold) {
			return 0;
		}
		if (Number.isNaN(rule.minVotingThreshold)) {
			throw new Error(`${rule.minVotingThreshold} is not a valid voting threshold value.`);
		}
		if (rule.minVotingThreshold < 0 || rule.minVotingThreshold > 1) {
			throw new Error('Voting threshold must be within the range of zero to one inclusive.');
		}
		return rule.minVotingThreshold;
	}
	/**
	 * Helper function that validates the minimum voting period
	 * (if specified), returns zero if not specified.
	 */
	private verifyMinimumVotingPeriod(rule: Rule): number {
		if (!rule.minimumVotingPeriod) {
			return 0;
		}
		if (Number.isNaN(rule.minimumVotingPeriod)) {
			throw new Error(`${rule.minimumVotingPeriod} is not a valid minimum voting period.`);
		}
		if (rule.minimumVotingPeriod < 0) {
			throw new Error('If specified, the minimum voting period must be non negative.');
		}
		return rule.minimumVotingPeriod;
	}
	/**
	 * Helper function that validates the minimum stand-off period
	 * (if specified), returns zero if not specified.
	 */
	private verifyMinimumStandoffPeriod(rule: Rule): number {
		if (!rule.minimumStandoffPeriod) {
			return 0;
		}
		if (Number.isNaN(rule.minimumStandoffPeriod)) {
			throw new Error(`${rule.minimumStandoffPeriod} is not a valid voting starting standoff period.`);
		}
		if (rule.minimumStandoffPeriod < 0) {
			throw new Error('If specified, the voting starting standoff period must be non negative.');
		}
		return rule.minimumStandoffPeriod;
	}
}
