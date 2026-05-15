using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Rently.Application.DTOs;

namespace Rently.Api.Tests.Integration;

public class AuthIntegrationTests
{
    [Fact]
    public async Task Register_ThenGetCurrentUser_ReturnsAuthenticatedUser()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"host-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Host User",
            "Host");

        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.NotNull(auth.User);
        Assert.Equal("Host User", auth.User!.FullName);

        TestAuthClient.UseBearerToken(client, auth.Token!);

        var meResponse = await client.GetAsync("/api/auth/me");

        meResponse.EnsureSuccessStatusCode();
        var me = await meResponse.Content.ReadFromJsonAsync<UserInfoDto>();
        Assert.NotNull(me);
        Assert.Equal(auth.User.Email, me!.Email);
        Assert.Equal("Host", me.Role);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsConflict()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        var email = $"dupe-{Guid.NewGuid():N}@example.com";

        await TestAuthClient.RegisterAsync(client, email, "Qwerty.123", "First User", "Guest");

        var duplicateResponse = await client.PostAsJsonAsync("/api/auth/register", new RegisterDto
        {
            Email = email,
            Password = "Qwerty.123",
            FullName = "Second User",
            Role = "Guest"
        });

        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        var payload = await duplicateResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("This email is already registered.", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Login_InvalidPassword_ReturnsUnauthorized()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();
        var email = $"login-{Guid.NewGuid():N}@example.com";
        await TestAuthClient.RegisterAsync(client, email, "Qwerty.123", "Login User", "Guest");

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = "WrongPassword.123"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Invalid email or password.", payload.GetProperty("message").GetString());
    }
}
