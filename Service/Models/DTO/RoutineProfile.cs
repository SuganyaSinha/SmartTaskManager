using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
   public class RoutineProfile
    {
        public string Id { get; set; } = string.Empty;

        [RegularExpression(@"^$|^([01]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "WakeUpTime must be a valid time in HH:mm format.")]
        public string WakeUpTime { get; set; } = string.Empty;

        [RegularExpression(@"^$|^([01]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "SleepTime must be a valid time in HH:mm format.")]
        public string SleepTime { get; set; } = string.Empty;

        public WorkStyleSettings? WorkStyleSettings { get; set; } = null;

        public Constraints? Constraints { get; set; } = null;

        [MaxLength(500, ErrorMessage = "FreeTextDescription cannot exceed 500 characters.")]
        public string FreeTextDescription { get; set; } = string.Empty;

        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

}
