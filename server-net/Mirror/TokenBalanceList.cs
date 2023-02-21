﻿using Hashgraph;
using System.Text.Json.Serialization;
using VotingStream.Mappers;

namespace VotingStream.Mirror;
/// <summary>
/// Paged list of balance objects returned from the mirror node.
/// </summary>
public class TokenBalanceList : PagedList<TokenBalance>
{
    /// <summary>
    /// The timestamp at which this information was valid.
    /// </summary>
    [JsonPropertyName("timestamp")]
    [JsonConverter(typeof(ConsensusTimeStampConverter))]
    public ConsensusTimeStamp TimeStamp { get; set; }
    /// <summary>
    /// List of balances for returned by the mirror node query.
    /// </summary>
    [JsonPropertyName("balances")]
    public TokenBalance[]? Balances { get; set; }
    /// <summary>
    /// Enumerates the list of balances.
    /// </summary>
    /// <returns>
    /// Enumerator for the TokenBalance objects in the list.
    /// </returns>
    public override IEnumerable<TokenBalance> GetItems()
    {
        return Balances ?? Array.Empty<TokenBalance>();
    }
}