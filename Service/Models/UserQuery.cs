public class UserPrompt
{
    public string Prompt { get; set; } = default!;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
