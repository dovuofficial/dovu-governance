import { EntityIdKeyString, TimestampKeyString } from '@bugbytes/hapi-util';
import { RulesDefinition } from './rules-definition';
import { TokenSummary } from './token-summary';
/**
 * Stores the details of a single rule on the HCS topic.
 */
export interface Rule extends RulesDefinition {
	/**
	 * Represents details of the voting token attached to this server instance.
	 */
	hcsToken?: TokenSummary;
	/**
	 * The date and time this rule was submitted,
	 * in hedera 0000.0000 epoch string format.
	 */
	consensusTimestamp: TimestampKeyString;
	/**
	 * The hedera account that submitted the rule,
	 * in 0.0.123 string format.
	 */
	payerId: EntityIdKeyString;
}
/**
 * Array of rules for the HCS topic.
 */
export interface Rules {
	/**
	 * Array of rules for the HCS topic.
	 */
	votes: Rule[];
}
