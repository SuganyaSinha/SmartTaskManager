using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SmartTaskManager.Models
{
    public class WorkStyleSettings
    {
        [RegularExpression(@"^$|^([01]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "WorkHourStart must be a valid time in HH:mm format.")]
        public string WorkHourStart { get; set; } = string.Empty;

        [RegularExpression(@"^$|^([01]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "WorkHourEnd must be a valid time in HH:mm format.")]
        public string WorkHourEnd { get; set; } = string.Empty;

        public List<ProductiveHours>? ProductiveHours { get; set; }

        [Range(0, 480, ErrorMessage = "PreferredTaskDuration must be between 0 and 480 minutes.")]
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
