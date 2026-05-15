using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Auth;

public class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    public RegisterDtoValidator()
    {
        RuleFor(dto => dto.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(dto => dto.Password)
            .NotEmpty()
            .MinimumLength(6);

        RuleFor(dto => dto.FullName)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(dto => dto.Role)
            .NotEmpty()
            .Must(role => role is "Guest" or "Host" or "Both")
            .WithMessage("Role must be Guest, Host, or Both.");
    }
}
