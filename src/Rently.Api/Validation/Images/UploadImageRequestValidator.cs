using FluentValidation;
using Rently.Application.DTOs;

namespace Rently.Api.Validation.Images;

public class UploadImageRequestValidator : AbstractValidator<UploadImageRequest>
{
    public UploadImageRequestValidator()
    {
        RuleFor(dto => dto.DataUrl)
            .NotEmpty()
            .Must(dataUrl => dataUrl.TrimStart().StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Invalid image format.");
    }
}
