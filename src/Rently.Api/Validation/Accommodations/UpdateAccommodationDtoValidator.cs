using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Accommodations;

public class UpdateAccommodationDtoValidator : AbstractValidator<UpdateAccommodationDto>
{
    public UpdateAccommodationDtoValidator()
    {
        Include(new AccommodationWriteDtoValidator());
    }
}
