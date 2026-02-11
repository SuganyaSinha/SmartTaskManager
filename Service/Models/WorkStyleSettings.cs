using System.Text.Json.Serialization;

namespace SmartTaskManager.Models
{   
    public class WorkStyleSettings
    {
        public string WorkHourStart { get; set; } = string.Empty;

        public string WorkHourEnd { get; set; } = string.Empty;

        public List<ProductiveHours>? ProductiveHours { get; set; }

        public int PreferredTaskDuration { get; set; }
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum ProductiveHours
    {
        EarlyMorning,   
        Morning,
        LateMorning,
        Afternoon,
        Evening,
        Night
    }

}
