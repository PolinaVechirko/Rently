using System.Text.RegularExpressions;
using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Auth;

public partial class UpdateProfileDtoValidator : AbstractValidator<UpdateProfileDto>
{
    public UpdateProfileDtoValidator()
    {
        RuleFor(dto => dto.FullName)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(dto => dto.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(dto => dto.PhoneNumber)
            .Must(BeARealisticPhoneNumber)
            .When(dto => !string.IsNullOrWhiteSpace(dto.PhoneNumber))
            .WithMessage("Please enter a realistic phone number.");
    }

    private static bool BeARealisticPhoneNumber(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return true;
        }

        var trimmed = phoneNumber.Trim();
        if (!PhoneRegex().IsMatch(trimmed))
        {
            return false;
        }

        var digitCount = trimmed.Count(char.IsDigit);
        return digitCount is >= 7 and <= 15;
    }

    [GeneratedRegex(@"^\+?[0-9\s\-()]{7,20}$", RegexOptions.CultureInvariant)]
    private static partial Regex PhoneRegex();
}
