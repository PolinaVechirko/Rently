using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Accommodations;

public class CreateAccommodationDtoValidator : AbstractValidator<CreateAccommodationDto>
{
    public CreateAccommodationDtoValidator()
    {
        RuleFor(dto => dto.PricePerNight)
            .GreaterThan(0);

        RuleFor(dto => dto.RoomsCount)
            .GreaterThan(0)
            .When(dto => dto.RoomsCount.HasValue);

        RuleFor(dto => dto.BedsCount)
            .GreaterThan(0)
            .When(dto => dto.BedsCount.HasValue);

        RuleFor(dto => dto.Country)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(dto => dto.City)
            .NotEmpty()
            .MaximumLength(100);

        RuleForEach(dto => dto.PhotoUrls!)
            .NotEmpty()
            .When(dto => dto.PhotoUrls is { Count: > 0 });
    }
}
