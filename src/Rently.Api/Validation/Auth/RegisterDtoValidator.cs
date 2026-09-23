using FluentValidation;
using Rently.Application.DTOs;
using Rently.Domain.Constants;

namespace Rently.Api.Validation.Auth;

public class RegisterDtoValidator : AbstractValidator<RegisterDto>
{
    public RegisterDtoValidator()
    {
        RuleFor(dto => dto.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(FieldLengths.Email);

        RuleFor(dto => dto.Password)
            .NotEmpty()
            .MinimumLength(6);

        RuleFor(dto => dto.FullName)
            .NotEmpty()
            .MaximumLength(FieldLengths.FullName);

        RuleFor(dto => dto.Role)
            .NotEmpty()
            .Must(role => role is "Guest" or "Host" or "Both")
            .WithMessage("Role must be Guest, Host, or Both.");
    }
}
