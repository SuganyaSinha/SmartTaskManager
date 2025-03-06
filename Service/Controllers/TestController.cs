using Microsoft.AspNetCore.Mvc;

namespace Service.Controllers{

    [ApiController]
    [Route("api/[controller]")] // Route: /api/test
    public class TestController : ControllerBase
    {
        // GET: api/test
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { message = "This is a test response from the GET endpoint!" });
        }
    }

}



