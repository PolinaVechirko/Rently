using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Auth;

public class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(dto => dto.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(dto => dto.Password)
            .NotEmpty();
    }
}
