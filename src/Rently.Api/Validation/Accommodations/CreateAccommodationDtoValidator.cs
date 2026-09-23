using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Accommodations;

public class CreateAccommodationDtoValidator : AbstractValidator<CreateAccommodationDto>
{
    public CreateAccommodationDtoValidator()
    {
        Include(new AccommodationWriteDtoValidator());
    }
}
