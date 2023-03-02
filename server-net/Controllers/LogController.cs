using Microsoft.AspNetCore.Mvc;
using VotingStreamServer.Models;
using VotingStreamServer.Services;

namespace VotingStream.Controllers;
/// <summary>
/// Exposes a limited number of current log entries 
/// generated by the service.
/// </summary>
[ApiController]
[Route("api/v1/log")]
public partial class LogController : ControllerBase
{
    /// <summary>
    /// Reference to the cache of log entries.
    /// </summary>
    private readonly LogCache _logCache;
    /// <summary>
    /// Constructor, requires a log cache.
    /// </summary>
    /// <param name="logCache">
    /// The current cache of log entries.
    /// </param>
    public LogController(LogCache logCache)
    {
        _logCache = logCache;
    }
    /// <summary>
    /// Returns a limited number of current log entries
    /// generated by this server.
    /// </summary>
    /// <returns>
    /// The current log entries generated by this server.
    /// </returns>
    [HttpGet]
    [Produces("application/json")]
    public LogEntry[] Get()
    {
        return _logCache.Get();
    }
}