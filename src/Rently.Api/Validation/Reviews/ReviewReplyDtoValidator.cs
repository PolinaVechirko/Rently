using FluentValidation;
using Rently.Application.DTOs;
using Rently.Domain.Constants;

namespace Rently.Api.Validation.Reviews;

public class ReviewReplyDtoValidator : AbstractValidator<ReviewReplyDto>
{
    public ReviewReplyDtoValidator()
    {
        RuleFor(dto => dto.Reply)
            .NotEmpty()
            .MaximumLength(FieldLengths.ReviewReply);
    }
}
