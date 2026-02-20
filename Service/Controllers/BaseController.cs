using Microsoft.AspNetCore.Mvc;

public abstract class BaseController : ControllerBase
{
    protected string GetUserId()
    {
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            throw new Exception("Could not get the User Id from the token");
        return userId;
    }
}
