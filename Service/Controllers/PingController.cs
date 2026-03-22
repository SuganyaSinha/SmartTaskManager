using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Data;

[ApiController]
[Route("api/[controller]")]
public class PingController : ControllerBase
{
    [HttpGet]
    public IActionResult Ping() => Ok(new { status = "ok", message = "API is reachable", timestamp = DateTime.UtcNow });

    [HttpGet("db")]
    public async Task<IActionResult> PingDb([FromServices] MongoDbContext context)
    {
        try
        {
            await context.TaskCollection.Database
                .RunCommandAsync<MongoDB.Bson.BsonDocument>(new MongoDB.Bson.BsonDocument("ping", 1));
            return Ok(new { status = "ok", message = "MongoDB is reachable", timestamp = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { status = "error", message = ex.Message, timestamp = DateTime.UtcNow });
        }
    }
}
