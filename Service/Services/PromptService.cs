using MongoDB.Driver;
using SmartTaskManager.Models;
using TaskManagerApi.Data;
using Microsoft.Extensions.Options;
using SmartTaskManager.Interfaces;
using SmartTaskManager.Repositary;

namespace SmartTaskManager.Services
{
    public class PromptService : IPromptService
    {
        private readonly IPromptRepositary _promptRepositary;

        public PromptService(IPromptRepositary promptRepositary)
        {
            _promptRepositary = promptRepositary;
         }

        public async Task<Prompt> GetPromptByIdAsync(string id)
        {
            return await _promptRepositary.GetPromptByIdAsync(id);
        } 

        public async Task CreatePromptAsync(Prompt prompt)
        {
            await _promptRepositary.CreatePromptAsync(prompt);
        }

        public async Task<bool> DeletePromptAsync(string id)
        {
            return await _promptRepositary.DeletePromptAsync(id);
        }

        public async Task<List<Prompt>> GetPromptsByUserAsync(string userId)
        {
            return await _promptRepositary.GetPromptsByUserAsync(userId);
        }
    }
}
