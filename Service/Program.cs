using TaskManagerApi.Data;
using SmartTaskManager.Interfaces;
using SmartTaskManager.Services;
using SmartTaskManager.Data;
using SmartTaskManager.Repositary;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Register the config settings
builder.Services.Configure<OpenAiConfig>(builder.Configuration.GetSection("OpenAI"));
builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDB"));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["JwtSettings:Authority"]; // Auth0 domain
        options.Audience = builder.Configuration["JwtSettings:Audience"]; // Match Auth0 API audience
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,   // Ensure token is from Auth0
            ValidateAudience = true, // Ensure token is for this API
            ValidateLifetime = true, // Check token expiration
            ValidateIssuerSigningKey = true, // Verify signature
        };
        options.MapInboundClaims = false;
    });

// Add Authorization (to use [Authorize] attribute)
builder.Services.AddAuthorization();

builder.Services.AddHttpClient();

builder.Services.AddSingleton<MongoDbContext>();

// Register Repositaries
builder.Services.AddScoped<ITaskRepository, TaskRepositary>();
builder.Services.AddScoped<IPromptRepositary, PromptRepositary>();
builder.Services.AddScoped<IUserProfileRepositary, UserProfileRepositary>();

// Register Services
builder.Services.AddScoped<OpenAiService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IPromptService, PromptService>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();

builder.Services.AddControllers();

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000") // React app URL
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials();
        });
});

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Enable Authentication and Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp"); // Apply CORS policy
app.UseHttpsRedirection();
app.MapControllers();
/*

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.WithOpenApi();
*/

app.Run();

/*
record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
*/
