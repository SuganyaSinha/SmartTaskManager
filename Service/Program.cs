using TaskManagerApi.Data;
using SmartTaskManager.Interfaces;
using SmartTaskManager.Services;
using SmartTaskManager.Data;
using SmartTaskManager.Repositary;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using AutoMapper;
using SmartTaskManager.Utilities;
using Microsoft.SemanticKernel;
using Microsoft.OpenApi.Models;
using Serilog;

var isProduction = (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production") == "Production";

var logConfig = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}");

if (!isProduction)
    logConfig = logConfig.WriteTo.File(
        path: "logs/app-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} [{Level:u3}] {Message:lj}{NewLine}{Exception}");

Log.Logger = logConfig.CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

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
    //System.Diagnostics.Debugger.Break();

// Add Authorization (to use [Authorize] attribute)
builder.Services.AddAuthorization();

builder.Services.AddHttpClient();

builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddSingleton<Kernel>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();

    var apiKey = builder.Configuration["OpenAI:ApiKey"];
    var model = builder.Configuration["OpenAI:Model"];

    var kernelBuilder = Kernel.CreateBuilder();

    kernelBuilder.AddOpenAIChatCompletion(
        modelId: model,
        apiKey: apiKey
    );

    return kernelBuilder.Build();
});

// Chat kernel uses gpt-4o-mini (16x cheaper) for conversational task management
builder.Services.AddKeyedSingleton<Kernel>("chat", (sp, _) =>
{
    var apiKey = builder.Configuration["OpenAI:ApiKey"];
    var chatModel = builder.Configuration["OpenAI:ChatModel"] ?? "gpt-4o-mini";

    var kernelBuilder = Kernel.CreateBuilder();
    kernelBuilder.AddOpenAIChatCompletion(
        modelId: chatModel,
        apiKey: apiKey
    );

    return kernelBuilder.Build();
});

// Grok chat kernel — non-reasoning model for ConversationalChatService
builder.Services.AddKeyedSingleton<Kernel>("grok-chat", (sp, _) =>
{
    var apiKey = builder.Configuration["Grok:ApiKey"]!;
    var model = builder.Configuration["Grok:ChatModel"] ?? "grok-4-1-fast-non-reasoning";
    var baseUrl = builder.Configuration["Grok:BaseUrl"] ?? "https://api.x.ai/v1";

    var openAIClient = new OpenAI.OpenAIClient(
        new System.ClientModel.ApiKeyCredential(apiKey),
        new OpenAI.OpenAIClientOptions { Endpoint = new Uri(baseUrl) }
    );

    var kernelBuilder = Kernel.CreateBuilder();
    kernelBuilder.AddOpenAIChatCompletion(model, openAIClient);

    return kernelBuilder.Build();
});

// Grok scheduler kernel — reasoning model for SmartSchedulerService intent extraction
builder.Services.AddKeyedSingleton<Kernel>("grok-scheduler", (sp, _) =>
{
    var apiKey = builder.Configuration["Grok:ApiKey"]!;
    var model = builder.Configuration["Grok:SchedulerModel"] ?? "grok-4-1-fast-reasoning";
    var baseUrl = builder.Configuration["Grok:BaseUrl"] ?? "https://api.x.ai/v1";

    var openAIClient = new OpenAI.OpenAIClient(
        new System.ClientModel.ApiKeyCredential(apiKey),
        new OpenAI.OpenAIClientOptions { Endpoint = new Uri(baseUrl) }
    );

    var kernelBuilder = Kernel.CreateBuilder();
    kernelBuilder.AddOpenAIChatCompletion(model, openAIClient);

    return kernelBuilder.Build();
});

// Register Repositaries
builder.Services.AddScoped<ITaskRepository, TaskRepositary>();
builder.Services.AddScoped<IPromptRepositary, PromptRepositary>();
builder.Services.AddScoped<IUserProfileRepositary, UserProfileRepositary>();
builder.Services.AddScoped<IUserRoutineRepositary, UserRoutineRepositary>();
builder.Services.AddScoped<IChatSessionRepository, ChatSessionRepository>();


// Register Services
builder.Services.AddScoped<OpenAiService>(); // tdb this could be singleton
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IPromptService, PromptService>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();
builder.Services.AddScoped<IUserRoutineService, UserRoutineService>();
builder.Services.AddScoped<AIPlannerService>();
builder.Services.AddScoped<SmartSchedulerService>();
builder.Services.AddScoped<ConversationalChatService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();

builder.Services.AddAutoMapper(typeof(MappingProfile));

builder.Services.AddControllers();

// Add CORS policy
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?.Split(',') ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials();
        });
});

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer {token}'"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// Enable Authentication and Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseSerilogRequestLogging();
app.UseCors("FrontendCors");

if (!app.Environment.IsProduction())
    app.UseHttpsRedirection();

app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://0.0.0.0:{port}");


