using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Reviews;

public class CreateReviewDtoValidator : AbstractValidator<CreateReviewDto>
{
    public CreateReviewDtoValidator()
    {
        RuleFor(dto => dto.AccommodationId)
            .GreaterThan(0);

        RuleFor(dto => dto.Rating)
            .InclusiveBetween(1, 5);

        RuleFor(dto => dto.Comment)
            .NotEmpty()
            .MaximumLength(2000);
    }
}
