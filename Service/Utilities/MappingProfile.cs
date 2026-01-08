using AutoMapper;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Models.Entities; 

namespace SmartTaskManager.Utilities
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<TaskEntity, TaskItem>();  // Entity to DTO
            CreateMap<TaskItem, TaskEntity>(); // DTO to Entity
            CreateMap<CreateTaskItem, TaskItem>();
            CreateMap<TaskItem, CreateTaskItem>();  
            CreateMap<CreateTaskItem, TaskEntity>(); // DTO to Entity
            CreateMap<TaskEntity, CreateTaskItem>();  // Entity to DTO  
        }
    }
}