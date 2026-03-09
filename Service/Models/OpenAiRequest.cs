using System.ComponentModel.DataAnnotations;

public class OpenAiRequestBody
{
    [Required(ErrorMessage = "UserInput is required.")]
    [MaxLength(2000, ErrorMessage = "UserInput cannot exceed 2000 characters.")]
    public string UserInput { get; set; }

    public string CurrentDate { get; set; }
    public string TimeZone { get; set; }
}