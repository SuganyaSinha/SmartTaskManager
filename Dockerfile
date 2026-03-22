FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Service/Service.csproj Service/
RUN dotnet restore Service/Service.csproj
COPY Service/ Service/
WORKDIR /src/Service
RUN dotnet publish Service.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Service.dll"]
