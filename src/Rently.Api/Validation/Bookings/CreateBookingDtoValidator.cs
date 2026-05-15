using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Bookings;

public class CreateBookingDtoValidator : AbstractValidator<CreateBookingDto>
{
    public CreateBookingDtoValidator()
    {
        RuleFor(dto => dto.AccommodationId)
            .GreaterThan(0);

        RuleFor(dto => dto.CheckOutDate)
            .GreaterThan(dto => dto.CheckInDate)
            .WithMessage("Check-out date must be after check-in date.");
    }
}
