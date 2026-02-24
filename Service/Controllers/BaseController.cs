using Microsoft.AspNetCore.Mvc;

public abstract class BaseController : ControllerBase
{
    private string _userId;

    protected string UserId
    {
        get
        {
            if (string.IsNullOrEmpty(_userId))
            {
                _userId = User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(_userId))
                    throw new Exception("Could not get the User Id from the token");
            }
            return _userId;
        }
    }
}
