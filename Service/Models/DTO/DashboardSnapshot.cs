namespace SmartTaskManager.Models.DTO
{
    public class DashboardSnapshot
    {
        public string Headline { get; set; } = string.Empty;
        public string Detail { get; set; } = string.Empty;
        public List<string> Bullets { get; set; } = [];
        public string Tone { get; set; } = "calm";
        public bool IsAiGenerated { get; set; } = true;
    }
}
