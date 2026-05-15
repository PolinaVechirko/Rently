using System.Net.Http.Headers;
using System.Net.Http.Json;
using Rently.Application.DTOs;

namespace Rently.Api.Tests.Integration;

internal static class TestAuthClient
{
    public static async Task<AuthResponseDto> RegisterAsync(
        HttpClient client,
        string email,
        string password,
        string fullName,
        string role)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = password,
            FullName = fullName,
            Role = role
        });

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponseDto>())!;
    }

    public static async Task<AuthResponseDto> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password
        });

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponseDto>())!;
    }

    public static void UseBearerToken(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
}
