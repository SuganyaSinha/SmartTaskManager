using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Interfaces;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
public class UserProfileController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;

    public UserProfileController(IUserProfileService userProfileService)
    {
        _userProfileService = userProfileService;
    }

    [HttpGet]
    [Authorize] // Requires a valid token
    public IActionResult Get()
    {
var claims = User.Claims.Select(c => new { c.Type, c.Value });
    var sub = User.FindFirst("sub")?.Value; // Explicitly check sub
    return Ok(new { Claims = claims, Sub = sub });
    /*
        var userId = User.FindFirst("sub")?.Value; // Extract user ID from token
        return Ok(new { Message = "Hello, authenticated user!", UserId = userId });
        */
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserProfileById(string id)
    {
        var profile = await _userProfileService.GetUserProfileByIdAsync(id);
        return profile == null ? NotFound() : Ok(profile);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUserProfile([FromBody] UserProfile profile)
    {
        if (profile == null)
        {
            return BadRequest("profile is null");
        }

        await _userProfileService.CreateUserProfileAsync(profile);
        return NoContent();
    }

    [HttpPut]
    public async Task<IActionResult> UpdateUserProfile([FromBody] UserProfile profile)
    {
        if (profile == null)
        {
            return BadRequest("profile is null");
        }

        if(string.IsNullOrEmpty(profile.Id))
             return BadRequest("Id is not present");

        await _userProfileService.UpdateUserProfileAsync(profile.Id, profile);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(string id)
    {
        await _userProfileService.DeleteUserProfileAsync(id);
   
        return NoContent();
    }
}
