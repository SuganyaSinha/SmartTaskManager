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

            // RoutineProfile to routineProfileEntity
            CreateMap<RoutineProfile, RoutineProfileEntity>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.UserId, opt => opt.Ignore())
            .ForMember(dest => dest.LastUpdated,opt => opt.MapFrom(_ => DateTime.UtcNow));

             CreateMap<Models.WorkStyleSettings, WorkStyleSettings>()
            .ForMember(dest => dest.ProductiveHours,
                opt => opt.MapFrom(src =>
                    src.ProductiveHours == null
                        ? null
                        : src.ProductiveHours.Select(ph =>
                            (SmartTaskManager.Models.Entities.ProductiveHours)ph).ToList()));

            CreateMap<Models.Constraints, Constraints>();

            // RoutineProfileEntity to RoutineProfile
            CreateMap<RoutineProfileEntity, RoutineProfile>()
            .ForMember(dest => dest.LastUpdated,opt => opt.MapFrom(src => src.LastUpdated));

            CreateMap<WorkStyleSettings, Models.WorkStyleSettings>()
                .ForMember(dest => dest.ProductiveHours,
                    opt => opt.MapFrom(src =>
                        src.ProductiveHours == null
                            ? null
                            : src.ProductiveHours.Select(ph =>
                                (Models.ProductiveHours)ph).ToList()));

            CreateMap<Constraints, Models.Constraints>();
        }
    }
}