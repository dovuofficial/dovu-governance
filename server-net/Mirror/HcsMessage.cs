﻿#pragma warning disable CS8618
using Hashgraph;
using System.Text.Json.Serialization;
using VotingStream.Mappers;

namespace VotingStream.Mirror;
/// <summary>
/// Represents an HCS Message retrieved from the mirror node.
/// </summary>
public class HcsMessage
{
    /// <summary>
    /// HCS Message Chunk Information.
    /// </summary>
    [JsonPropertyName("chunk_info")]
    public ChunkInfo? ChunkInfo { get; set; }
    /// <summary>
    /// HCS Message Consensus Timestamp.
    /// </summary>
    [JsonPropertyName("consensus_timestamp")]
    [JsonConverter(typeof(ConsensusTimeStampConverter))]
    public ConsensusTimeStamp TimeStamp { get; set; }
    /// <summary>
    /// Message Payload.
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; }
    /// <summary>
    /// The payer account submitting the message.
    /// </summary>
    [JsonPropertyName("payer_account_id")]
    [JsonConverter(typeof(AddressConverter))]
    public Address Payer { get; set; }
    /// <summary>
    /// The running hash of the message (for validation purposes)
    /// </summary>
    [JsonPropertyName("running_hash")]
    public string Hash { get; set; }
    /// <summary>
    /// The version of the running hash (for validation purposes).
    /// </summary>
    [JsonPropertyName("running_hash_version")]
    public int HashVersion { get; set; }
    /// <summary>
    /// Sequence number of this HCS message.
    /// </summary>
    [JsonPropertyName("sequence_number")]
    public ulong SequenceNumber { get; set; }
    /// <summary>
    /// The HCS message stream topic ID for this message.
    /// </summary>
    [JsonPropertyName("topic_id")]
    [JsonConverter(typeof(AddressConverter))]
    public Address TopicId { get; set; }
}
/// <summary>
/// HCS Chunk Information that may or may not be part of this message.
/// </summary>
public class ChunkInfo
{
    /// <summary>
    /// Corresponding initial transaction id.
    /// </summary>
    [JsonPropertyName("initial_transaction_id")]
    public string InitialTransactionId { get; set; }
    /// <summary>
    /// Chunk number.
    /// </summary>
    [JsonPropertyName("number")]
    public int Number { get; set; }
    /// <summary>
    /// Total number of chunks.
    /// </summary>
    [JsonPropertyName("total")]
    public int Total { get; set; }

}