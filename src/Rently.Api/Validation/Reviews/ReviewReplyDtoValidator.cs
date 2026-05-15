using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Reviews;

public class ReviewReplyDtoValidator : AbstractValidator<ReviewReplyDto>
{
    public ReviewReplyDtoValidator()
    {
        RuleFor(dto => dto.Reply)
            .NotEmpty()
            .MaximumLength(2000);
    }
}
