// TODO: this controller is no longer used and can be deleted.
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Interfaces;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserProfileController : BaseController
{
    private readonly IUserProfileService _userProfileService;

    public UserProfileController(IUserProfileService userProfileService)
    {
        _userProfileService = userProfileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUserProfile()
    {
        var profile = await _userProfileService.GetUserProfileByIdAsync(UserId);
        return profile == null ? NotFound() : Ok(profile);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUserProfile([FromBody] UserProfile profile)
    {
        if (profile == null)
            return BadRequest("Profile is required.");

        profile.Id = UserId;
        await _userProfileService.CreateUserProfileAsync(profile);
        return CreatedAtAction(nameof(GetUserProfile), null, profile);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateUserProfile([FromBody] UserProfile profile)
    {
        if (profile == null)
            return BadRequest("Profile is required.");

        profile.Id = UserId;
        await _userProfileService.UpdateUserProfileAsync(UserId, profile);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteUserProfile()
    {
        await _userProfileService.DeleteUserProfileAsync(UserId);
        return NoContent();
    }
}
