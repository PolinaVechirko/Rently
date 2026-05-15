using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Availability;

public class CreateAvailabilityBlockDtoValidator : AbstractValidator<CreateAvailabilityBlockDto>
{
    public CreateAvailabilityBlockDtoValidator()
    {
        RuleFor(dto => dto.EndDate)
            .GreaterThan(dto => dto.StartDate)
            .WithMessage("End date must be after start date.");
    }
}
