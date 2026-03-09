using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
    public class TaskItem
    {
        public required string Id { get; set; }

        [Required(ErrorMessage = "Title is required.")]
        [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
        public string? Title { get; set; }

        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }

        [RegularExpression("^(low|medium|high)$", ErrorMessage = "Priority must be Low, Medium, or High.")]
        public string? Priority { get; set; }

        [MaxLength(1000, ErrorMessage = "Comments cannot exceed 1000 characters.")]
        public string? Comments { get; set; }

        public string? UserId { get; set; }

        public TaskStatus Status { get; set; } = TaskStatus.NotStarted;
    }
}
