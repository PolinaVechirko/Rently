using FluentValidation;
using Rently.Application.DTOs;
using Rently.Domain.Constants;

namespace Rently.Api.Validation.Accommodations;

public class AccommodationWriteDtoValidator : AbstractValidator<AccommodationWriteDto>
{
    public AccommodationWriteDtoValidator()
    {
        RuleFor(dto => dto.PropertyType)
            .IsInEnum();

        RuleFor(dto => dto.PricePerNight)
            .GreaterThan(0);

        RuleFor(dto => dto.RoomsCount)
            .GreaterThanOrEqualTo(0);

        RuleFor(dto => dto.BedsCount)
            .GreaterThanOrEqualTo(0);

        RuleFor(dto => dto.Title)
            .MaximumLength(FieldLengths.AccommodationTitle);

        RuleFor(dto => dto.Description)
            .MaximumLength(FieldLengths.AccommodationDescription);

        RuleFor(dto => dto.Country)
            .NotEmpty()
            .MaximumLength(FieldLengths.Country);

        RuleFor(dto => dto.City)
            .NotEmpty()
            .MaximumLength(FieldLengths.City);

        RuleForEach(dto => dto.PhotoUrls!)
            .NotEmpty()
            .When(dto => dto.PhotoUrls is { Count: > 0 });

        RuleForEach(dto => dto.AmenityIds!)
            .GreaterThan(0)
            .When(dto => dto.AmenityIds is { Count: > 0 });
    }
}
