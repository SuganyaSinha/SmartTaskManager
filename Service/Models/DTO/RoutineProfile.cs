using System;
using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
   public class RoutineProfile
    {
        public string Id { get; set; } = string.Empty;
        public string WakeUpTime { get; set; } = string.Empty;

        public string SleepTime { get; set; } = string.Empty;

        public WorkStyleSettings? WorkStyleSettings { get; set; } = null;

        public Constraints? Constraints { get; set; } = null;

        public string FreeTextDescription { get; set; } = string.Empty;

        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

}
